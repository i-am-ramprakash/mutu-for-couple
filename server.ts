import express from 'express';
import http from 'http';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { loadDB } from './server/db';
import { setupWebSocket } from './server/socket';

// Routes
import authRouter from './server/routes/auth';
import coupleRouter from './server/routes/couple';
import geminiRouter from './server/routes/gemini';
import dataRouter from './server/routes/data';
import miscRouter from './server/routes/misc';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Boost body size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Initialize Database
  loadDB().then(() => {
    console.log('[DB] Server database loaded successfully.');
  }).catch(err => {
    console.error('[DB] Database initialization error:', err);
  });

  // Setup WebSockets
  setupWebSocket(server);

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/couple', coupleRouter);
  app.use('/api/gemini', geminiRouter);
  app.use('/api', dataRouter);
  app.use('/api', miscRouter);

  // Static Serving
  if (process.env.NODE_ENV !== 'production') {
    // In development: proxy all non-API requests to Vite dev server (port 5173)
    // Run Vite separately with: npx vite
    const VITE_PORT = process.env.VITE_PORT || '5173';
    app.use(createProxyMiddleware({
      target: `http://localhost:${VITE_PORT}`,
      changeOrigin: true,
      ws: false, // WebSocket is handled directly by our server, not proxied
      on: {
        error: (err: any, req: any, res: any) => {
          // Vite not started yet — show a helpful message
          if (typeof res.writeHead === 'function') {
            res.writeHead(502, { 'Content-Type': 'text/html' });
            res.end(`<h2>Vite dev server not ready yet.</h2><p>Run <code>npx vite --port ${VITE_PORT}</code> in another terminal, then refresh.</p>`);
          }
        }
      }
    }));
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`MuTu backend running on http://localhost:${PORT}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`→ Proxying UI from Vite at http://localhost:${process.env.VITE_PORT || '5173'}`);
      console.log(`→ If the page shows a 502, start Vite in another terminal: npx vite`);
    }
  });
}

startServer();
