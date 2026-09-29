const crypto = require('crypto');
const prisma = require('../utils/prisma');
const { canManageWebhooks } = require('../utils/permissions');
const { validateWebhookUrl, validateId } = require('../utils/validation');

/**
 * Register a new outbound webhook endpoint for an event.
 */
const registerWebhook = async ({ eventId, url, events, secret, currentUser }) => {
  const parsedEventId = validateId(eventId, 'Event ID');

  const event = await prisma.event.findUnique({ where: { id: parsedEventId } });
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isAllowed = await canManageWebhooks(currentUser, parsedEventId);
  if (!isAllowed) {
    const error = new Error('Forbidden. Only event organizers can register webhooks.');
    error.statusCode = 403;
    throw error;
  }

  // Validate URL against SSRF and private IP ranges
  const safeUrl = await validateWebhookUrl(url);

  const webhookSecret = secret && secret.trim() ? secret.trim() : `whsec_${crypto.randomBytes(24).toString('hex')}`;
  const eventList = Array.isArray(events) ? events.join(',') : (events || '*');

  const webhook = await prisma.webhook.create({
    data: {
      eventId: parsedEventId,
      url: safeUrl,
      secret: webhookSecret,
      events: eventList,
      isActive: true,
      failureCount: 0,
    },
  });

  // Return the secret only upon creation
  return {
    ...webhook,
    secret: webhookSecret,
    note: 'Store this secret securely. It will not be shown again.',
  };
};

/**
 * List all registered webhooks for an event (masks secret).
 */
const getWebhooksByEvent = async (eventId, currentUser) => {
  const parsedEventId = validateId(eventId, 'Event ID');

  const isAllowed = await canManageWebhooks(currentUser, parsedEventId);
  if (!isAllowed) {
    const error = new Error('Forbidden. Only organizers can view webhooks.');
    error.statusCode = 403;
    throw error;
  }

  const webhooks = await prisma.webhook.findMany({
    where: { eventId: parsedEventId },
    orderBy: { createdAt: 'desc' },
  });

  // Mask secrets in listing for security
  return webhooks.map((wh) => ({
    ...wh,
    secret: wh.secret ? `whsec_${'•'.repeat(16)}${wh.secret.slice(-4)}` : null,
  }));
};

/**
 * Delete a registered webhook.
 */
const deleteWebhook = async (id, currentUser) => {
  const parsedId = validateId(id, 'Webhook ID');
  const webhook = await prisma.webhook.findUnique({
    where: { id: parsedId },
    include: { event: true },
  });

  if (!webhook) {
    const error = new Error('Webhook not found.');
    error.statusCode = 404;
    throw error;
  }

  const isAllowed = await canManageWebhooks(currentUser, webhook.eventId);
  if (!isAllowed) {
    const error = new Error('Forbidden. Only organizers can delete webhooks.');
    error.statusCode = 403;
    throw error;
  }

  await prisma.webhook.delete({ where: { id: parsedId } });
  return { success: true, message: 'Webhook deleted successfully.' };
};

/**
 * Toggle webhook status or update events.
 */
const updateWebhook = async (id, updates, currentUser) => {
  const parsedId = validateId(id, 'Webhook ID');
  const webhook = await prisma.webhook.findUnique({ where: { id: parsedId } });

  if (!webhook) {
    const error = new Error('Webhook not found.');
    error.statusCode = 404;
    throw error;
  }

  const isAllowed = await canManageWebhooks(currentUser, webhook.eventId);
  if (!isAllowed) {
    const error = new Error('Forbidden. Only organizers can update webhooks.');
    error.statusCode = 403;
    throw error;
  }

  const data = {};
  if (updates.isActive !== undefined) data.isActive = Boolean(updates.isActive);
  if (updates.events !== undefined) {
    data.events = Array.isArray(updates.events) ? updates.events.join(',') : updates.events;
  }
  if (updates.url) {
    data.url = await validateWebhookUrl(updates.url);
  }

  const updated = await prisma.webhook.update({
    where: { id: parsedId },
    data,
  });

  return {
    ...updated,
    secret: `whsec_${'•'.repeat(16)}${updated.secret.slice(-4)}`,
  };
};

/**
 * Deliver a single WebhookDelivery record asynchronously.
 */
const deliverWebhook = async (deliveryId) => {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: true },
  });

  if (!delivery || !delivery.webhook || !delivery.webhook.isActive) {
    return;
  }

  const startTime = Date.now();
  const timestamp = Date.now();
  const payloadString = delivery.payload;

  // Compute HMAC signature: timestamp + '.' + payload
  const signature = crypto
    .createHmac('sha256', delivery.webhook.secret)
    .update(`${timestamp}.${payloadString}`)
    .digest('hex');

  let responseStatus = null;
  let responseBody = null;
  let errorMsg = null;
  let success = false;

  try {
    // Re-verify URL immediately before dispatch
    await validateWebhookUrl(delivery.webhook.url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(delivery.webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-ID': delivery.id,
        'X-Webhook-Event': delivery.eventType,
        'X-Webhook-Timestamp': String(timestamp),
        'X-Webhook-Signature': signature,
        'User-Agent': 'CATFOOD-Webhooks/1.0',
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    responseStatus = res.status;
    success = res.ok;

    try {
      const text = await res.text();
      responseBody = text.slice(0, 1000); // Store up to 1000 chars of response
    } catch (e) {
      responseBody = null;
    }

    if (!res.ok) {
      errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    }
  } catch (err) {
    errorMsg = err.message;
    success = false;
  }

  const durationMs = Date.now() - startTime;
  const attempts = delivery.attempts + 1;

  if (success) {
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'SUCCESS',
        attempts,
        responseStatus,
        responseBody,
        durationMs,
        error: null,
      },
    });

    // Reset webhook failure count on success
    if (delivery.webhook.failureCount > 0) {
      await prisma.webhook.update({
        where: { id: delivery.webhook.id },
        data: { failureCount: 0 },
      });
    }
  } else {
    // Check if retry is appropriate
    const isPermanentClientError = responseStatus >= 400 && responseStatus < 500 && responseStatus !== 429;
    const maxAttempts = 5;

    if (isPermanentClientError || attempts >= maxAttempts) {
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'FAILED',
          attempts,
          responseStatus,
          responseBody,
          durationMs,
          error: errorMsg,
          nextRetryAt: null,
        },
      });

      // Increment webhook failure count
      const updatedWh = await prisma.webhook.update({
        where: { id: delivery.webhook.id },
        data: { failureCount: { increment: 1 } },
      });

      // Circuit breaker: auto-disable webhook after 10 consecutive failures
      if (updatedWh.failureCount >= 10) {
        await prisma.webhook.update({
          where: { id: delivery.webhook.id },
          data: { isActive: false },
        });
      }
    } else {
      // Exponential backoff: ~1s, ~3s, ~9s, ~27s... capped at 1hr
      const backoffSec = Math.min(Math.pow(3, attempts), 3600);
      const nextRetryAt = new Date(Date.now() + backoffSec * 1000);

      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'PENDING',
          attempts,
          responseStatus,
          responseBody,
          durationMs,
          error: errorMsg,
          nextRetryAt,
        },
      });
    }
  }

  return {
    deliveryId: delivery.id,
    webhookId: delivery.webhookId,
    url: delivery.webhook.url,
    success,
    status: responseStatus,
    error: errorMsg,
  };
};

/**
 * Dispatch an event to all matching webhooks asynchronously via the Outbox.
 * Supports both call signatures:
 *   dispatchEvent(eventName, eventId, payload)
 *   dispatchEvent(eventId, eventName, payload)
 */
const dispatchEvent = async (arg1, arg2, arg3) => {
  let eventName;
  let eventId;
  let payload;

  if (typeof arg1 === 'string' && (typeof arg2 === 'number' || !isNaN(parseInt(arg2, 10)))) {
    eventName = arg1;
    eventId = parseInt(arg2, 10);
    payload = arg3 || {};
  } else if ((typeof arg1 === 'number' || !isNaN(parseInt(arg1, 10))) && typeof arg2 === 'string') {
    eventId = parseInt(arg1, 10);
    eventName = arg2;
    payload = arg3 || {};
  } else {
    eventName = String(arg1 || 'event.general');
    eventId = parseInt(arg2, 10) || 1;
    payload = arg3 || {};
  }

  try {
    const webhooks = await prisma.webhook.findMany({
      where: {
        eventId,
        isActive: true,
      },
    });

    const matching = webhooks.filter((wh) => {
      const allowed = wh.events.split(',').map((e) => e.trim());
      return allowed.includes('*') || allowed.includes(eventName);
    });

    if (matching.length === 0) return [];

    const envelope = {
      id: `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      eventId,
      eventType: eventName,
      eventVersion: 1,
      timestamp: Date.now(),
      data: payload,
    };
    const payloadString = JSON.stringify(envelope);

    const deliveryPromises = matching.map(async (wh) => {
      const delivery = await prisma.webhookDelivery.create({
        data: {
          webhookId: wh.id,
          eventId,
          eventType: eventName,
          payload: payloadString,
          status: 'PENDING',
          attempts: 0,
        },
      });

      // Dispatch delivery asynchronously (out-of-band)
      return deliverWebhook(delivery.id);
    });

    // In background or test context, settle all deliveries
    return await Promise.allSettled(deliveryPromises);
  } catch (err) {
    console.error('[Webhooks] Dispatch error:', err);
    return [];
  }
};

/**
 * Query delivery logs for a webhook.
 */
const getWebhookDeliveries = async (webhookId, currentUser, limit = 50) => {
  const parsedId = validateId(webhookId, 'Webhook ID');
  const webhook = await prisma.webhook.findUnique({ where: { id: parsedId } });

  if (!webhook) {
    const error = new Error('Webhook not found.');
    error.statusCode = 404;
    throw error;
  }

  const isAllowed = await canManageWebhooks(currentUser, webhook.eventId);
  if (!isAllowed) {
    const error = new Error('Forbidden. Only organizers can view webhook delivery logs.');
    error.statusCode = 403;
    throw error;
  }

  return prisma.webhookDelivery.findMany({
    where: { webhookId: parsedId },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit, 10) || 50,
  });
};

module.exports = {
  registerWebhook,
  getWebhooksByEvent,
  deleteWebhook,
  updateWebhook,
  deliverWebhook,
  dispatchEvent,
  getWebhookDeliveries,
};
