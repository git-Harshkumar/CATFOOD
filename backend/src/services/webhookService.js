const crypto = require('crypto');
const prisma = require('../utils/prisma');

/**
 * Register a new webhook endpoint for an event.
 */
const registerWebhook = async ({ eventId, url, events, secret, currentUser }) => {
  const parsedEventId = parseInt(eventId, 10);
  const event = await prisma.event.findUnique({ where: { id: parsedEventId } });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isOrganizer = currentUser?.isGlobalAdmin || event.organizerId === currentUser?.id;
  if (!isOrganizer) {
    const error = new Error('Forbidden. Only event organizers can register webhooks.');
    error.statusCode = 403;
    throw error;
  }

  if (!url || !url.startsWith('http')) {
    const error = new Error('A valid HTTP/HTTPS webhook URL is required.');
    error.statusCode = 400;
    throw error;
  }

  const webhookSecret = secret || crypto.randomBytes(24).toString('hex');
  const eventList = Array.isArray(events) ? events.join(',') : (events || '*');

  const webhook = await prisma.webhook.create({
    data: {
      eventId: parsedEventId,
      url: url.trim(),
      secret: webhookSecret,
      events: eventList,
      isActive: true,
    },
  });

  return webhook;
};

/**
 * List all registered webhooks for an event.
 */
const getWebhooksByEvent = async (eventId, currentUser) => {
  const parsedEventId = parseInt(eventId, 10);
  const event = await prisma.event.findUnique({ where: { id: parsedEventId } });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isOrganizer = currentUser?.isGlobalAdmin || event.organizerId === currentUser?.id;
  if (!isOrganizer) {
    const error = new Error('Forbidden. Only organizers can view webhooks.');
    error.statusCode = 403;
    throw error;
  }

  return prisma.webhook.findMany({
    where: { eventId: parsedEventId },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Delete a registered webhook.
 */
const deleteWebhook = async (id, currentUser) => {
  const parsedId = parseInt(id, 10);
  const webhook = await prisma.webhook.findUnique({
    where: { id: parsedId },
    include: { event: true },
  });

  if (!webhook) {
    const error = new Error('Webhook not found.');
    error.statusCode = 404;
    throw error;
  }

  const isOrganizer = currentUser?.isGlobalAdmin || webhook.event.organizerId === currentUser?.id;
  if (!isOrganizer) {
    const error = new Error('Forbidden. Only organizers can delete webhooks.');
    error.statusCode = 403;
    throw error;
  }

  await prisma.webhook.delete({ where: { id: parsedId } });
  return { success: true, message: 'Webhook deleted successfully.' };
};

/**
 * Dispatch an event payload to all matching active webhooks with HMAC-SHA256 signature.
 */
const dispatchEvent = async (eventName, eventId, payload) => {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: {
        eventId: parseInt(eventId, 10),
        isActive: true,
      },
    });

    const matching = webhooks.filter((wh) => {
      const allowed = wh.events.split(',').map((e) => e.trim());
      return allowed.includes('*') || allowed.includes(eventName);
    });

    const deliveryResults = [];

    for (const wh of matching) {
      const timestamp = Date.now();
      const body = JSON.stringify({
        event: eventName,
        eventId,
        timestamp,
        payload,
      });

      const signature = crypto
        .createHmac('sha256', wh.secret)
        .update(body)
        .digest('hex');

      // Attempt async HTTP POST delivery with timeout
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(wh.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Dogfood-Event': eventName,
            'X-Dogfood-Signature': signature,
            'X-Dogfood-Timestamp': String(timestamp),
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout);
        deliveryResults.push({
          webhookId: wh.id,
          url: wh.url,
          status: response.status,
          success: response.ok,
        });
      } catch (err) {
        deliveryResults.push({
          webhookId: wh.id,
          url: wh.url,
          error: err.message,
          success: false,
        });
      }
    }

    return deliveryResults;
  } catch (err) {
    console.error('[Webhooks] Dispatch error:', err);
    return [];
  }
};

module.exports = {
  registerWebhook,
  getWebhooksByEvent,
  deleteWebhook,
  dispatchEvent,
};
