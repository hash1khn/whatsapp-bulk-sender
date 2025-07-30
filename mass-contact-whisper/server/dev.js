const express = require('express');
const cors = require('cors');
const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.VITE_CLOUDINARY_API_KEY,
  api_secret: process.env.VITE_CLOUDINARY_API_SECRET
});

// Enable CORS
app.use(cors({
  origin: 'http://localhost:5173', // Vite's default port
  methods: ['GET', 'POST'],
  credentials: true
}));

// Handle gallery upload
app.post('/api/gallery-upload', upload.array('images'), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const batchId = uuidv4();
    const uploadPromises = req.files.map(async (file) => {
      const base64Data = file.buffer.toString('base64');
      const result = await cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${base64Data}`,
        {
          folder: `albums/${batchId}`,
          resource_type: 'auto'
        }
      );
      return result;
    });

    await Promise.all(uploadPromises);

    // Store message text if provided
    if (req.body.messageText) {
      await cloudinary.uploader.upload(
        `data:text/plain;base64,${Buffer.from(req.body.messageText).toString('base64')}`,
        {
          folder: `albums/${batchId}`,
          public_id: 'message',
          resource_type: 'raw'
        }
      );
    }

    const albumLink = `http://localhost:5173/gallery/${batchId}`;
    
    res.json({
      batchId,
      albumLink
    });
  } catch (error) {
    console.error('Gallery upload error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// Get gallery images
app.get('/api/gallery/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `albums/${batchId}/`,
      max_results: 100
    });

    // Get message text if it exists
    let messageText = '';
    try {
      const messageResult = await cloudinary.api.resource(`albums/${batchId}/message`, {
        resource_type: 'raw'
      });
      messageText = await fetch(messageResult.secure_url).then(r => r.text());
    } catch (e) {
      // Message text is optional
    }

    res.json({
      images: result.resources.filter(r => !r.public_id.endsWith('/message')),
      messageText
    });
  } catch (error) {
    console.error('Gallery fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

const port = process.env.API_PORT || 3001;
app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
}); 