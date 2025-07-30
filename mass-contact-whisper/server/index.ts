const express = require('express');
const { createServer: createViteServer } = require('vite');
const galleryRouter = require('./api/gallery');

async function createServer() {
  const app = express();
  
  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

  // API routes
  app.use('/api', galleryRouter);

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

createServer(); 