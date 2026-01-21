// GET /api/docs - Redirect to OpenAPI spec or serve Swagger UI
import { handleOptions, corsHeaders } from './_shared.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const format = url.searchParams.get('format');

  // If JSON format requested, redirect to the spec
  if (format === 'json') {
    return Response.redirect(`${url.origin}/openapi.json`, 302);
  }

  // Serve a simple Swagger UI page
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kubishi Dictionary API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '${url.origin}/openapi.json',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      ...corsHeaders,
    },
  });
}
