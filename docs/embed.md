# CATFOOD Embeddable Public Gallery Widget

## Overview
CATFOOD allows organizers to embed live hackathon project showcases on university websites, sponsor portals, and personal blogs.

---

## Security & Tenant Isolation
1. **Fallback Removal:** Non-existent, missing, or negative event IDs strictly return HTTP 404. Under no circumstances does the server fall back to displaying Event #1 or any arbitrary project list.
2. **Draft & Private Event Isolation:** Galleries for events in `DRAFT` or private state return HTTP 404, preventing confidential submissions from leaking prior to the public opening.
3. **Stored XSS Neutralization:** Project titles, descriptions, taglines, and team names are HTML-escaped. Dangerous URL protocols (`javascript:`, `data:`, `vbscript:`) in repository and demo links are stripped.
4. **Content Security Policy (CSP):** The standalone gallery iframe sets strict CSP headers (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`).
5. **Clickjacking Defense:** `X-Frame-Options` and `Content-Security-Policy: frame-ancestors *` are configured specifically for the embed route while protecting admin routes.
6. **HTTP Caching:** Responses return `ETag` and `Cache-Control: public, max-age=60, stale-while-revalidate=300`.

---

## Embedding Methods

### Method 1: Dynamic Script Tag (Recommended)
Place the lightweight widget loader in your HTML:
```html
<div id="catfood-gallery-widget"></div>
<script
  src="https://catfood.example.com/embed/gallery.js"
  data-event-id="42"
  data-theme="dark">
</script>
```
The script dynamically reads `data-event-id`, measures the viewport, and injects a responsive, sandboxed `<iframe>`.

### Method 2: Direct Responsive Iframe
```html
<iframe
  src="https://catfood.example.com/api/embed/gallery/42?theme=dark"
  width="100%"
  height="750px"
  style="border: none; border-radius: 12px; overflow: hidden;"
  loading="lazy"
  title="Hackathon Projects Gallery">
</iframe>
```

---

## Organizer Customization API
Organizers can customize appearance and controls:
- `GET /api/embed/:eventId/config` — View settings
- `PUT /api/embed/:eventId/config` — Update settings

Supported settings:
```json
{
  "theme": "dark",
  "layout": "grid",
  "pageSize": 24,
  "showTrack": true,
  "showTeam": true,
  "showDescription": true,
  "showRepository": true,
  "sort": "title"
}
```
