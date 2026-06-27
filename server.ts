import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';

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

  // Initialize Database in the background to avoid blocking server startup and prevent deployment timeouts
  loadDB().then(() => {
    console.log('[Firestore] Local database loaded successfully.');
  }).catch(err => {
    console.error('[Firestore] Database initialization error:', err);
  });

  // Setup WebSockets
  setupWebSocket(server);

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/couple', coupleRouter);
  app.use('/api/gemini', geminiRouter);
  app.use('/api/data', dataRouter);
  app.use('/api', miscRouter);

  // Vite / Static Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: { server }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`MuTu - For Couples backend up and running on port ${PORT}`);
  });
}

startServer();
