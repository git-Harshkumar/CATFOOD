const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.post(
  '/',
  authenticate,
  requireRole('ORGANIZER'),
  webhookController.registerWebhook
);

router.post(
  '/:eventId',
  authenticate,
  requireRole('ORGANIZER'),
  webhookController.registerWebhook
);

router.get(
  '/:eventId',
  authenticate,
  requireRole('ORGANIZER'),
  webhookController.getWebhooks
);

router.delete(
  '/:id',
  authenticate,
  requireRole('ORGANIZER'),
  webhookController.deleteWebhook
);

router.post(
  '/:eventId/test',
  authenticate,
  requireRole('ORGANIZER'),
  webhookController.testWebhook
);

module.exports = router;
