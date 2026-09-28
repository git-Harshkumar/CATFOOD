const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const teamRoutes = require('./routes/teamRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const judgingRoutes = require('./routes/judgingRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');

const app = express();

// Global Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Hackathon Judgment Platform API',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/judging', judgingRoutes);
app.use('/api/judge', judgingRoutes);
app.use('/api/organizer/judging', judgingRoutes);

const communityRoutes = require('./routes/communityRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const bulkRoutes = require('./routes/bulkRoutes');
const embedController = require('./controllers/embedController');
const path = require('path');
const fs = require('fs');

app.use('/api/community', communityRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/bulk', bulkRoutes);

// Embeddable gallery widget routes
app.get('/api/embed/gallery', embedController.renderEmbedGallery);
app.get('/api/embed/gallery/:eventId', embedController.renderEmbedGallery);
app.get('/embed/gallery.js', embedController.renderEmbedScript);

// Interactive OpenAPI Documentation (Bonus 4)
app.get('/api/openapi.json', (req, res) => {
  const jsonPath = path.resolve(__dirname, '../../docs/openapi.json');
  if (fs.existsSync(jsonPath)) {
    return res.sendFile(jsonPath);
  }
  return res.status(404).json({ error: 'OpenAPI specification not found' });
});

app.get('/api/docs', (req, res) => {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>DOGFOOD 2026 API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
</head>
<body style="margin:0; background:#f8fafc;">
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
      });
    };
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
});

const { authenticate } = require('./middleware/authMiddleware');
const { requireRole } = require('./middleware/roleMiddleware');
const submissionController = require('./controllers/submissionController');
const judgingController = require('./controllers/judgingController');

// Acceptance Checker compatibility routes
app.get('/projects', submissionController.getPublicGallery);
app.post('/projects/new', authenticate, submissionController.handleDirectSubmission);
app.get('/api/organizer/judging/export.csv', authenticate, requireRole('ORGANIZER'), judgingController.exportCsv);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 8080;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Server] Hackathon Judgment Platform API running on port ${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
