import express from 'express';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'diw6rekpm',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Enable CORS for all routes during development
app.use(cors());
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Store message text for a gallery
app.post('/api/gallery/:batchId/message', async (req, res) => {
  try {
    const { batchId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Store message as a text file in Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:text/plain;base64,${Buffer.from(message).toString('base64')}`,
      {
        public_id: `requests/${batchId}/message`,
        resource_type: 'raw'
      }
    );

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Failed to store message:', error);
    res.status(500).json({ error: 'Failed to store message' });
  }
});

// Get gallery images and message by batchId
app.get('/api/gallery/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    console.log('Received request for gallery:', { batchId });

    if (!batchId) {
      console.log('Missing batchId');
      return res.status(400).json({ error: 'Gallery ID is required' });
    }

    try {
      // First, try to list all resources to see what we have
      console.log('Listing all resources...');
      const allResources = await cloudinary.api.resources({
        type: 'upload',
        max_results: 500,
        resource_type: 'image'
      });

      console.log('All resources:', {
        count: allResources.resources.length,
        paths: allResources.resources.map(r => r.public_id)
      });

      // Try different possible folder paths
      const possiblePrefixes = [
        `requests/${batchId}`,
        batchId,
        `wasender-galleries/${batchId}`,
        `wasender/${batchId}`
      ];

      let foundImages = [];
      for (const prefix of possiblePrefixes) {
        console.log(`Trying prefix: ${prefix}`);
        try {
          const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: prefix,
            max_results: 100,
            resource_type: 'image'
          });

          if (result.resources && result.resources.length > 0) {
            console.log(`Found ${result.resources.length} images with prefix ${prefix}`);
            foundImages = result.resources;
            break;
          }
        } catch (error) {
          console.log(`No images found with prefix ${prefix}`);
        }
      }

      // Try to get the message text
      let messageText = '';
      try {
        const messageResult = await cloudinary.api.resource(`requests/${batchId}/message`, {
          resource_type: 'raw'
        });
        const messageResponse = await fetch(messageResult.secure_url);
        messageText = await messageResponse.text();
      } catch (error) {
        console.log('No message text found');
      }

      if (foundImages.length === 0) {
        console.log('No images found in any expected location');
        return res.json({ images: [], message: messageText });
      }

      const images = foundImages.map(resource => ({
        url: resource.secure_url,
        width: resource.width,
        height: resource.height
      }));

      console.log('Sending response with images and message:', {
        count: images.length,
        hasMessage: !!messageText
      });

      res.json({ 
        images,
        message: messageText
      });
    } catch (cloudinaryError) {
      console.error('Cloudinary API error:', {
        error: cloudinaryError,
        message: cloudinaryError.message,
        stack: cloudinaryError.stack,
        details: cloudinaryError.error || {}
      });

      res.status(500).json({ 
        error: 'Failed to fetch gallery',
        message: cloudinaryError.message,
        details: cloudinaryError.error || {}
      });
    }
  } catch (error) {
    console.error('Gallery fetch error:', {
      error,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to fetch gallery',
      message: error.message
    });
  }
});

const port = process.env.API_PORT || 3001;
app.listen(port, () => {
  console.log(`Gallery server running at http://localhost:${port}`);
  console.log('Cloudinary config:', {
    cloud_name: cloudinary.config().cloud_name,
    hasApiKey: !!cloudinary.config().api_key,
    hasApiSecret: !!cloudinary.config().api_secret
  });
}); 