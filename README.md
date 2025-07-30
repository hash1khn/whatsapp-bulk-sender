# WhatsApp Parts Request System

This system consists of two servers:
1. Frontend React Application (`mass-contact-whisper`)
2. WhatsApp Backend Server (`whatsapp-backend`)

## Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- A WhatsApp account for the backend server
- [Wassender API Key](https://wasenderapi.com) for sending messages

## Project Structure

```
/
├── mass-contact-whisper/    # Frontend React App
└── whatsapp-backend/       # WhatsApp Web.js Server
```

## 1. Setting Up the WhatsApp Backend

Navigate to the backend directory:
```bash
cd whatsapp-backend
```

Install dependencies:
```bash
npm install
```

Start the server:
```bash
npm start
```

The backend server will:
- Start on port 3001 by default
- Generate a QR code in the terminal
- Scan this QR code with WhatsApp on your phone to authenticate
- Keep the session active for future use

### Environment Variables
Create a `.env` file in the `whatsapp-backend` directory:
```env
PORT=3001
NODE_ENV=development
```

## 2. Setting Up the Frontend

Navigate to the frontend directory:
```bash
cd mass-contact-whisper
```

Install dependencies:
```bash
npm install
```

Create a `.env` file:
```env
VITE_WASSENDER_API_KEY=your_api_key_here
VITE_WASSENDER_API_BASE=https://wasenderapi.com/api
```

Start the development server:
```bash
npm run dev
```

The frontend will start on `http://localhost:5173` by default.

## Running Both Servers

1. First Terminal (Backend):
```bash
cd whatsapp-backend
npm start
```

2. Second Terminal (Frontend):
```bash
cd mass-contact-whisper
npm run dev
```

## First-Time Setup

1. Start both servers as described above
2. Open the frontend in your browser
3. Scan the QR code shown in the backend terminal with WhatsApp
4. Enter your Wassender API key in the frontend when prompted
5. Import or add your contacts
6. Start sending messages!

## Features

- Bulk WhatsApp messaging
- Contact management
- Parts request templates
- Image gallery support
- Message history tracking
- Response management

## Troubleshooting

### Backend Issues
- If QR code doesn't appear, restart the backend server
- If WhatsApp disconnects, check your phone's internet connection
- Session files are stored in `.wwebjs_auth/` directory

### Frontend Issues
- Check if API key is correctly set
- Verify backend server is running on correct port
- Clear browser cache if changes don't appear

## Development

### Backend Development
```bash
cd whatsapp-backend
npm run dev  # Runs with nodemon for auto-reload
```

### Frontend Development
```bash
cd mass-contact-whisper
npm run dev  # Starts Vite dev server
```

## Building for Production

### Backend
```bash
cd whatsapp-backend
npm run build
```

### Frontend
```bash
cd mass-contact-whisper
npm run build
```

The frontend build will be in `mass-contact-whisper/dist/`

## Security Notes

- Keep your Wassender API key secure
- Don't commit `.env` files
- Regularly update dependencies
- Monitor WhatsApp session status

## Support

For issues:
1. Check the troubleshooting section
2. Verify all environment variables
3. Check server logs
4. Ensure WhatsApp is connected
5. Verify API key validity

## License

MIT License - See LICENSE file for details 