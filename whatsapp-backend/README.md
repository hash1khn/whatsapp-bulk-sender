# WhatsApp Backend

A Node.js backend that integrates WhatsApp Web for real-time conversation management.

## Features

- **WhatsApp Web Integration**: Connect to WhatsApp using whatsapp-web.js
- **Real-time Messaging**: WebSocket-based communication
- **QR Code Authentication**: Easy setup with QR code scanning
- **Message Storage**: In-memory storage of conversations and messages
- **REST API**: HTTP endpoints for status and data retrieval

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Server**:
   ```bash
   npm run dev
   ```

3. **Access QR Code**:
   - Open `http://localhost:3001` in your browser
   - Scan the QR code with your WhatsApp mobile app
   - Wait for connection confirmation

## API Endpoints

### GET `/api/status`
Returns server and WhatsApp connection status.

### GET `/api/conversations`
Returns all active conversations.

### GET `/api/messages/:contactId`
Returns all messages for a specific contact.

## WebSocket Events

### Client → Server
- `send-message`: Send a message to a contact
- `get-conversation`: Get messages for a conversation
- `mark-as-read`: Mark messages as read

### Server → Client
- `qr-code`: QR code for WhatsApp authentication
- `whatsapp-ready`: WhatsApp connection established
- `new-message`: New incoming message
- `message-sent`: Message sent successfully
- `conversation-messages`: Messages for a conversation
- `conversation-updated`: Conversation updated

## Environment Variables

Create a `.env` file:
```
PORT=3001
```

## Usage with Frontend

This backend is designed to work with the React frontend. The frontend will connect to this backend via WebSocket for real-time messaging while using WassenderAPI for bulk message sending.

## Security Notes

- This is a development setup
- WhatsApp Web sessions are stored locally
- Consider implementing proper authentication for production use 