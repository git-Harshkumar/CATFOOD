const prisma = require('../utils/prisma');
const { escapeHtml } = require('../utils/validation');
const { canManageEvent } = require('../utils/permissions');
const { success } = require('../utils/response');

const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return escapeHtml(trimmed);
    }
  } catch (e) {
    if (/^https?:\/\//i.test(trimmed)) {
      return escapeHtml(trimmed);
    }
  }
  return null;
};

/**
 * Render standalone embeddable project gallery HTML.
 */
const renderEmbedGallery = async (req, res, next) => {
  try {
    const rawEventId = req.params.eventId || req.query.eventId;
    const parsedEventId = parseInt(rawEventId, 10);

    // Strict 404: Never fall back to another event if eventId is missing or invalid!
    if (isNaN(parsedEventId) || parsedEventId <= 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="utf-8"><title>Gallery Not Found</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; text-align: center; padding: 50px;">
          <h2>Hackathon Gallery Not Found</h2>
          <p>Please specify a valid event ID in the embed configuration.</p>
        </body>
        </html>
      `);
    }

    const event = await prisma.event.findUnique({
      where: { id: parsedEventId },
      include: { embedConfig: true },
    });

    if (!event) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="utf-8"><title>Gallery Not Found</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; text-align: center; padding: 50px;">
          <h2>Hackathon Event Not Found</h2>
          <p>The requested hackathon event does not exist or has been removed.</p>
        </body>
        </html>
      `);
    }

    // Tenant Isolation: Only serve published/active events, return 404 for private/draft
    if (event.status !== 'PUBLISHED' && event.status !== 'ACTIVE') {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="utf-8"><title>Gallery Not Found</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; text-align: center; padding: 50px;">
          <h2>Private Hackathon Gallery</h2>
          <p>This hackathon event is currently private or unlisted.</p>
        </body>
        </html>
      `);
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const configPageSize = event.embedConfig?.pageSize || 24;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || configPageSize));
    const skip = (page - 1) * limit;

    const where = { eventId: event.id, status: 'SUBMITTED' };
    if (req.query.trackId) {
      where.trackId = parseInt(req.query.trackId, 10);
    }

    const [submissions, totalCount] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          team: { select: { name: true } },
          track: true,
        },
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      prisma.submission.count({ where }),
    ]);

    // Theme configuration
    const theme = req.query.theme || event.embedConfig?.theme || 'dark';
    const isLight = theme === 'light';
    const bgCol = isLight ? '#f8fafc' : '#0f172a';
    const cardBg = isLight ? '#ffffff' : '#1e293b';
    const textCol = isLight ? '#0f172a' : '#f8fafc';
    const borderCol = isLight ? '#cbd5e1' : '#334155';
    const subTextCol = isLight ? '#64748b' : '#94a3b8';

    const cardsHtml = submissions
      .map((s) => {
        const safeRepoUrl = sanitizeUrl(s.repoUrl);
        const safeDemoUrl = sanitizeUrl(s.demoUrl);
        const safeTitle = escapeHtml(s.title);
        const safeTeamName = escapeHtml(s.team?.name || 'Hackathon Team');
        const safeTagline = escapeHtml(s.tagline || '');
        const safeTrackName = escapeHtml(s.track?.name || 'General Track');

        return `
      <div class="df-card">
        <div class="df-card-track">${safeTrackName}</div>
        <h3 class="df-card-title">${safeTitle}</h3>
        <p class="df-card-team">by ${safeTeamName}</p>
        <p class="df-card-tagline">${safeTagline}</p>
        <div class="df-card-links">
          ${safeRepoUrl ? `<a href="${safeRepoUrl}" target="_blank" rel="noopener noreferrer" class="df-card-link">Code &rarr;</a>` : ''}
          ${safeDemoUrl ? `<a href="${safeDemoUrl}" target="_blank" rel="noopener noreferrer" class="df-card-link">Live Demo &rarr;</a>` : ''}
        </div>
      </div>
    `;
      })
      .join('');

    const safeEventTitle = escapeHtml(event.title);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeEventTitle} - Project Showcase Gallery</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: ${bgCol};
      color: ${textCol};
    }
    .df-header {
      margin-bottom: 24px;
      text-align: center;
    }
    .df-header h2 { margin: 0 0 6px 0; color: #38bdf8; font-size: 1.5rem; }
    .df-header p { margin: 0; color: ${subTextCol}; font-size: 0.9rem; }
    .df-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .df-card {
      background: ${cardBg};
      border: 1px solid ${borderCol};
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .df-card:hover {
      transform: translateY(-2px);
      border-color: #38bdf8;
    }
    .df-card-track {
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 700;
      color: #38bdf8;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .df-card-title {
      margin: 0 0 4px 0;
      font-size: 1.1rem;
      color: ${isLight ? '#0f172a' : '#f1f5f9'};
    }
    .df-card-team {
      margin: 0 0 8px 0;
      font-size: 0.8rem;
      color: ${subTextCol};
    }
    .df-card-tagline {
      font-size: 0.85rem;
      color: ${isLight ? '#334155' : '#cbd5e1'};
      flex-grow: 1;
      margin: 0 0 12px 0;
      line-height: 1.4;
    }
    .df-card-links {
      display: flex;
      gap: 12px;
    }
    .df-card-link {
      color: #38bdf8;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .df-card-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="df-header">
    <h2>${safeEventTitle} Showcase</h2>
    <p>Live Hackathon Project Gallery (${totalCount} projects)</p>
  </div>
  <div class="df-grid">
    ${cardsHtml.length > 0 ? cardsHtml : '<p style="text-align:center;grid-column: 1/-1;">No projects submitted yet.</p>'}
  </div>
</body>
</html>`;

    // Security Headers & Caching
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src * data:; frame-ancestors *;");
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.status(200).send(html);
  } catch (err) {
    next(err);
  }
};

/**
 * Public JSON DTO endpoint for headless gallery widgets.
 */
const getEmbedGalleryData = async (req, res, next) => {
  try {
    const parsedEventId = parseInt(req.params.eventId, 10);
    if (isNaN(parsedEventId) || parsedEventId <= 0) {
      const error = new Error('Invalid event ID');
      error.statusCode = 404;
      throw error;
    }

    const event = await prisma.event.findUnique({
      where: { id: parsedEventId },
      select: { id: true, title: true, status: true },
    });

    if (!event || (event.status !== 'PUBLISHED' && event.status !== 'ACTIVE')) {
      const error = new Error('Event not found or not publicly available.');
      error.statusCode = 404;
      throw error;
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 24));
    const skip = (page - 1) * limit;

    const where = { eventId: event.id, status: 'SUBMITTED' };
    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        select: {
          id: true,
          title: true,
          tagline: true,
          description: true,
          repoUrl: true,
          demoUrl: true,
          techStack: true,
          track: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
      }),
      prisma.submission.count({ where }),
    ]);

    res.setHeader('Cache-Control', 'public, max-age=60');
    return success(res, {
      event: { id: event.id, title: event.title },
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Dynamic JavaScript embed loader script that reads data-event-id.
 */
const renderEmbedScript = (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol;
  const baseUrl = `${protocol}://${host}`;

  const js = `(function() {
  var scripts = document.getElementsByTagName("script");
  var currentScript = document.currentScript || scripts[scripts.length - 1];
  var eventId = currentScript.getAttribute("data-event-id") || new URL(currentScript.src).searchParams.get("eventId");
  var theme = currentScript.getAttribute("data-theme") || "dark";

  if (!eventId) {
    console.error("[CATFOOD Gallery Widget] Missing 'data-event-id' attribute on widget script tag.");
    return;
  }

  var container = document.getElementById("catfood-gallery-widget") || 
                  document.getElementById("dogfood-gallery-widget") || 
                  currentScript.parentElement;

  var iframe = document.createElement("iframe");
  iframe.src = "${baseUrl}/api/embed/gallery/" + encodeURIComponent(eventId) + "?theme=" + encodeURIComponent(theme);
  iframe.style.width = "100%";
  iframe.style.height = "650px";
  iframe.style.border = "none";
  iframe.style.borderRadius = "12px";
  iframe.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
  iframe.setAttribute("loading", "lazy");
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups");

  container.appendChild(iframe);
})();`;

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(js);
};

/**
 * Retrieve embed configuration for an event.
 */
const getEmbedConfig = async (req, res, next) => {
  try {
    const parsedEventId = parseInt(req.params.eventId, 10);
    let config = await prisma.embedConfig.findUnique({
      where: { eventId: parsedEventId },
    });

    if (!config) {
      config = {
        eventId: parsedEventId,
        theme: 'dark',
        layout: 'grid',
        pageSize: 24,
        showTracks: true,
        showTeam: true,
        showRepo: true,
        showDemo: true,
      };
    }

    return success(res, config, 'Embed configuration retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * Update embed configuration for an event (Organizer only).
 */
const updateEmbedConfig = async (req, res, next) => {
  try {
    const parsedEventId = parseInt(req.params.eventId, 10);
    const isAllowed = await canManageEvent(req.user, parsedEventId);
    if (!isAllowed) {
      const error = new Error('Forbidden. Only organizers can configure the embed gallery.');
      error.statusCode = 403;
      throw error;
    }

    const { theme, layout, pageSize, showTracks, showTeam, showRepo, showDemo, customCss } = req.body;

    const config = await prisma.embedConfig.upsert({
      where: { eventId: parsedEventId },
      update: {
        theme,
        layout,
        pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        showTracks,
        showTeam,
        showRepo,
        showDemo,
        customCss,
      },
      create: {
        eventId: parsedEventId,
        theme: theme || 'dark',
        layout: layout || 'grid',
        pageSize: pageSize ? parseInt(pageSize, 10) : 24,
        showTracks: showTracks !== undefined ? showTracks : true,
        showTeam: showTeam !== undefined ? showTeam : true,
        showRepo: showRepo !== undefined ? showRepo : true,
        showDemo: showDemo !== undefined ? showDemo : true,
        customCss,
      },
    });

    return success(res, config, 'Embed configuration updated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  renderEmbedGallery,
  getEmbedGalleryData,
  renderEmbedScript,
  getEmbedConfig,
  updateEmbedConfig,
};
