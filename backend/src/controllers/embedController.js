const prisma = require('../utils/prisma');

const renderEmbedGallery = async (req, res, next) => {
  try {
    let { eventId } = req.params;
    let event = null;
    const parsedEventId = eventId ? parseInt(eventId, 10) : NaN;
    if (!isNaN(parsedEventId)) {
      event = await prisma.event.findUnique({ where: { id: parsedEventId } });
    }
    if (!event) {
      event = await prisma.event.findFirst({ orderBy: { id: 'asc' } });
    }

    if (!event) {
      return res.status(404).send('<h3>No hackathon event found.</h3>');
    }

    const submissions = await prisma.submission.findMany({
      where: { eventId: event.id, status: 'SUBMITTED' },
      include: {
        team: { select: { name: true } },
        track: true,
      },
      orderBy: { submittedAt: 'desc' },
      take: 50,
    });

    const cardsHtml = submissions
      .map(
        (s) => `
      <div class="df-card">
        <div class="df-card-track">${s.track?.name || 'General Track'}</div>
        <h3 class="df-card-title">${s.title}</h3>
        <p class="df-card-team">by ${s.team?.name || 'Hackathon Team'}</p>
        <p class="df-card-tagline">${s.tagline || ''}</p>
        ${
          s.repoUrl
            ? `<a href="${s.repoUrl}" target="_blank" rel="noopener" class="df-card-link">View Repository &rarr;</a>`
            : ''
        }
      </div>
    `
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${event.title} - Project Gallery</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 16px;
      background: #0f172a;
      color: #f8fafc;
    }
    .df-header {
      margin-bottom: 20px;
      text-align: center;
    }
    .df-header h2 { margin: 0 0 6px 0; color: #38bdf8; font-size: 1.5rem; }
    .df-header p { margin: 0; color: #94a3b8; font-size: 0.9rem; }
    .df-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .df-card {
      background: #1e293b;
      border: 1px solid #334155;
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
      color: #f1f5f9;
    }
    .df-card-team {
      margin: 0 0 8px 0;
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .df-card-tagline {
      font-size: 0.85rem;
      color: #cbd5e1;
      flex-grow: 1;
      margin: 0 0 12px 0;
      line-height: 1.4;
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
    <h2>${event.title} Showcase</h2>
    <p>Live Hackathon Project Gallery (${submissions.length} projects)</p>
  </div>
  <div class="df-grid">
    ${cardsHtml}
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    next(err);
  }
};

const renderEmbedScript = (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol;
  const baseUrl = `${protocol}://${host}`;

  const js = `(function() {
  var container = document.getElementById("dogfood-gallery-widget") || document.currentScript.parentElement;
  var iframe = document.createElement("iframe");
  iframe.src = "${baseUrl}/api/embed/gallery";
  iframe.style.width = "100%";
  iframe.style.height = "600px";
  iframe.style.border = "none";
  iframe.style.borderRadius = "8px";
  iframe.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
  container.appendChild(iframe);
})();`;

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  return res.status(200).send(js);
};

module.exports = {
  renderEmbedGallery,
  renderEmbedScript,
};
