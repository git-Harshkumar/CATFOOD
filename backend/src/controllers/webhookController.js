const webhookService = require('../services/webhookService');
const { success } = require('../utils/response');

const registerWebhook = async (req, res, next) => {
  try {
    const { url, events, secret } = req.body;
    const eventId = req.params.eventId || req.body.eventId;

    const webhook = await webhookService.registerWebhook({
      eventId,
      url,
      events,
      secret,
      currentUser: req.user,
    });

    return success(res, webhook, 'Webhook registered successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getWebhooks = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const webhooks = await webhookService.getWebhooksByEvent(eventId, req.user);
    return success(res, webhooks, 'Webhooks retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const deleteWebhook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await webhookService.deleteWebhook(id, req.user);
    return success(res, result, 'Webhook deleted successfully');
  } catch (err) {
    next(err);
  }
};

const testWebhook = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const results = await webhookService.dispatchEvent('webhook.test', eventId, {
      message: 'Test event from DOGFOOD judging portal',
      timestamp: new Date().toISOString(),
    });
    return success(res, results, 'Test event dispatched to webhooks');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerWebhook,
  getWebhooks,
  deleteWebhook,
  testWebhook,
};
