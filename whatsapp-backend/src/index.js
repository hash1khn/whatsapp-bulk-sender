const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path'); // full puppeteer

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: true, // Allow all origins in development
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Store conversations and messages in memory (in production, use a database)
const conversations = new Map();
const messages = new Map();
const profilePics = new Map(); // Store profile pictures
const seenMessageIds = new Set(); // Prevent duplicate messages

// Clear seen message IDs periodically to prevent memory leaks
setInterval(() => {
  seenMessageIds.clear();
}, 60000); // Clear every minute

// Track WhatsApp connection status
let whatsappStatus = 'disconnected';

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: puppeteer.executablePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// WhatsApp client events
client.on('qr', async (qr) => {
  try {
    whatsappStatus = 'connecting';
    const qrCode = await qrcode.toDataURL(qr);
    io.emit('qr', qrCode); // Changed from 'qr-code' to 'qr' to match frontend
  } catch (error) {
    console.error('Error generating QR code:', error);
  }
});

// Handle WhatsApp client ready event
client.on('ready', async () => {
  whatsappStatus = 'connected'; // Changed from 'ready' to 'connected'
  io.emit('whatsapp-ready');

  // Load existing conversations
  try {
    const chats = await client.getChats();

    for (const chat of chats) {
      if (chat.isGroup) {
        continue; // Skip group chats for now
      }

      const phoneNumber = chat.id._serialized.split('@')[0];

      try {
        // Get messages for this chat
        const chatMessages = await chat.fetchMessages({ limit: 10 });

        // Store all messages for this conversation
        if (!messages.has(phoneNumber)) {
          messages.set(phoneNumber, []);
        }

        // Convert all messages to our format with duplicate prevention and media handling
        const conversationMessages = [];
        const seenIds = new Set();

        for (const msg of chatMessages) {
          if (!seenIds.has(msg.id._serialized)) {
            seenIds.add(msg.id._serialized);

            let messageBody = msg.body || '[Media Message]';
            let messageType = msg.fromMe ? 'sent' : 'received';
            let mediaData = null;
            let filename = null;

            // Handle media messages
            if (msg.hasMedia) {
              try {
                const media = await msg.downloadMedia();

                // Check if media download was successful
                if (media && media.mimetype && media.data) {
                  mediaData = `data:${media.mimetype};base64,${media.data}`;
                  filename = media.filename;


                  // Classify media type
                  if (media.mimetype.startsWith('image/')) {
                    messageType = 'image';
                    messageBody = msg.caption || '[Image]';
                  } else if (media.mimetype.startsWith('video/')) {
                    messageType = 'video';
                    messageBody = msg.caption || '[Video]';
                  } else if (media.mimetype.startsWith('audio/')) {
                    if (msg.isPtt) {
                      messageType = 'voice';
                      messageBody = '[Voice Message]';
                    } else {
                      messageType = 'audio';
                      messageBody = '[Audio]';
                    }
                  } else {
                    messageType = 'file';
                    messageBody = msg.caption || `[File: ${filename}]`;
                  }

                } else {
                  console.log(`⚠️ Media download returned invalid data for message ${msg.id._serialized}:`, media);
                  messageBody = '[Media Message]';
                }
              } catch (error) {
                console.log(`❌ Error downloading media for message ${msg.id._serialized}: ${error.message}`);
                messageBody = '[Media Message]';
              }
            }

            conversationMessages.push({
              id: msg.id._serialized,
              from: msg.from,
              to: msg.to,
              body: messageBody,
              timestamp: new Date(msg.timestamp * 1000),
              type: messageType,
              isGroup: false,
              fromMe: msg.fromMe,
              ack: msg._data?.ack || 0, // Read receipt status
              mediaData: mediaData,
              filename: filename,
              contact: {
                name: chat.name || phoneNumber,
                number: phoneNumber
              }
            });
          } else {
            console.log(`🔄 Skipping duplicate message in conversation load: ${msg.id._serialized}`);
          }
        }

        messages.set(phoneNumber, conversationMessages);

        // Create conversation with proper structure
        const lastMessage = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;

        // Try to get profile picture
        let profilePicUrl = null;
        try {
          profilePicUrl = await client.getProfilePicUrl(chat.id._serialized);
          profilePics.set(phoneNumber, profilePicUrl);
        } catch (error) {
        }

        conversations.set(phoneNumber, {
          id: phoneNumber,
          phoneNumber: phoneNumber,
          contactName: chat.name || phoneNumber,
          lastMessage: lastMessage ? (lastMessage.body || '[Media Message]') : 'No messages yet',
          lastMessageTime: lastMessage ? new Date(lastMessage.timestamp * 1000).toISOString() : new Date().toISOString(),
          messageCount: chatMessages.length,
          unreadCount: chat.unreadCount || 0,
          messages: conversationMessages,
          profilePicUrl: profilePicUrl
        });

      } catch (error) {
        console.log(`⚠️ Error processing chat ${phoneNumber}: ${error.message}`);
        // Create empty conversation for chats with errors
        conversations.set(phoneNumber, {
          id: phoneNumber,
          phoneNumber: phoneNumber,
          contactName: chat.name || phoneNumber,
          lastMessage: 'No messages yet',
          lastMessageTime: new Date().toISOString(),
          messageCount: 0,
          unreadCount: 0,
          messages: []
        });
      }
    }


    // Send initial state to all connected clients
    io.emit('initial-state', {
      conversations: Array.from(conversations.values()),
      messages: Array.from(messages.entries())
    });

  } catch (error) {
    console.error('❌ Error loading conversations:', error);
  }
});

client.on('authenticated', () => {
  whatsappStatus = 'connecting';
  io.emit('whatsapp-authenticated', { status: 'authenticated' });
});

client.on('auth_failure', (msg) => {
  whatsappStatus = 'disconnected';
  io.emit('whatsapp-auth-failure', { error: msg });
});

client.on('disconnected', (reason) => {
  whatsappStatus = 'disconnected';
  io.emit('whatsapp-disconnected', { reason });
});

// Handle incoming messages from WhatsApp
client.on('message', async (message) => {

  // Skip messages from ourselves
  if (message.fromMe) {
    return;
  }

  const phoneNumber = message.from.split('@')[0]; // Remove @c.us suffix

  // Handle voice notes and media
  let messageBody = message.body || '[Media Message]';
  let messageType = 'received';
  let mediaData = null;
  let filename = null;

  if (message.hasMedia) {
    try {
      const media = await message.downloadMedia();

      // Check if media download was successful
      if (media && media.mimetype && media.data) {
        mediaData = `data:${media.mimetype};base64,${media.data}`;
        filename = media.filename;

        // Classify media type
        if (media.mimetype.startsWith('image/')) {
          messageType = 'image';
          messageBody = message.caption || '[Image]';
        } else if (media.mimetype.startsWith('video/')) {
          messageType = 'video';
          messageBody = message.caption || '[Video]';
        } else if (media.mimetype.startsWith('audio/')) {
          if (message.isPtt) {
            messageType = 'voice';
            messageBody = '[Voice Message]';
          } else {
            messageType = 'audio';
            messageBody = '[Audio]';
          }
        } else {
          messageType = 'file';
          messageBody = message.caption || `[File: ${filename}]`;
        }
      } else {
        console.log('⚠️ Media download returned invalid data:', media);
        messageBody = '[Media Message]';
      }
    } catch (error) {
      console.log('❌ Error downloading media:', error.message);
      messageBody = '[Media Message]';
    }
  }

  const messageData = {
    id: message.id._serialized,
    from: message.from,
    to: message.to,
    body: messageBody,
    timestamp: new Date(message.timestamp * 1000),
    type: messageType,
    isGroup: false,
    fromMe: message.fromMe,
    mediaData: mediaData,
    filename: filename,
    contact: {
      name: message._data.notifyName || phoneNumber,
      number: phoneNumber
    }
  };

  // Prevent duplicate messages
  if (seenMessageIds.has(message.id._serialized)) {
    return;
  }
  seenMessageIds.add(message.id._serialized);

  // Store message
  if (!messages.has(phoneNumber)) {
    messages.set(phoneNumber, []);
  }
  messages.get(phoneNumber).push(messageData);

  // Update or create conversation
  if (!conversations.has(phoneNumber)) {
    conversations.set(phoneNumber, {
      id: phoneNumber,
      phoneNumber: phoneNumber,
      contactName: message._data.notifyName || phoneNumber,
      lastMessage: message.body || '[Media Message]',
      lastMessageTime: new Date(message.timestamp * 1000).toISOString(),
      messageCount: 1,
      unreadCount: 1,
      messages: [messageData]
    });
  } else {
    const conversation = conversations.get(phoneNumber);
    conversation.lastMessage = message.body || '[Media Message]';
    conversation.lastMessageTime = new Date(message.timestamp * 1000).toISOString();
    conversation.messageCount += 1;
    conversation.unreadCount += 1;
    conversation.messages.push(messageData);
  }


  // Broadcast to all connected clients
  io.emit('new-message', {
    message: messageData,
    conversation: conversations.get(phoneNumber)
  });

  // Send updated initial state to all clients
  io.emit('initial-state', {
    conversations: Array.from(conversations.values()),
    messages: Array.from(messages.entries())
  });
});

// Handle messages we send (message_create event)
client.on('message_create', async (message) => {

  // Only handle messages we sent
  if (!message.fromMe) {
    return;
  }

  const phoneNumber = message.to.split('@')[0]; // Remove @c.us suffix

  // Handle voice notes and media
  let messageBody = message.body || '[Media Message]';
  let messageType = 'sent';
  let mediaData = null;
  let filename = null;

  if (message.hasMedia) {
    try {
      const media = await message.downloadMedia();

      // Check if media object is valid
      if (media && media.mimetype && media.data) {
        mediaData = `data:${media.mimetype};base64,${media.data}`;
        filename = media.filename;

        // Classify media type
        if (media.mimetype.startsWith('image/')) {
          messageType = 'image';
          messageBody = message.caption || '[Image]';
        } else if (media.mimetype.startsWith('video/')) {
          messageType = 'video';
          messageBody = message.caption || '[Video]';
        } else if (media.mimetype.startsWith('audio/')) {
          if (message.isPtt) {
            messageType = 'voice';
            messageBody = '[Voice Message]';
          } else {
            messageType = 'audio';
            messageBody = '[Audio]';
          }
        } else {
          messageType = 'file';
          messageBody = message.caption || `[File: ${filename}]`;
        }
      } else {
        console.log('⚠️ Media object is invalid or missing properties');
        messageBody = '[Media Message]';
      }
    } catch (error) {
      console.log('❌ Error downloading media:', error.message);
      messageBody = '[Media Message]';
    }
  }

  const messageData = {
    id: message.id._serialized,
    from: message.from,
    to: message.to,
    body: messageBody,
    timestamp: new Date(message.timestamp * 1000),
    type: messageType,
    isGroup: false,
    fromMe: true,
    mediaData: mediaData,
    filename: filename,
    contact: {
      name: phoneNumber,
      number: phoneNumber
    }
  };

  // Store message
  if (!messages.has(phoneNumber)) {
    messages.set(phoneNumber, []);
  }
  messages.get(phoneNumber).push(messageData);

  // Update conversation
  if (!conversations.has(phoneNumber)) {
    conversations.set(phoneNumber, {
      id: phoneNumber,
      phoneNumber: phoneNumber,
      contactName: phoneNumber,
      lastMessage: message.body || '[Media Message]',
      lastMessageTime: new Date(message.timestamp * 1000).toISOString(),
      messageCount: 1,
      unreadCount: 0,
      messages: [messageData]
    });
  } else {
    const conversation = conversations.get(phoneNumber);
    conversation.lastMessage = message.body || '[Media Message]';
    conversation.lastMessageTime = new Date(message.timestamp * 1000).toISOString();
    conversation.messageCount += 1;
    conversation.messages.push(messageData);
  }


  // Broadcast to all connected clients
  io.emit('new-message', {
    message: messageData,
    conversation: conversations.get(phoneNumber)
  });
});

// Handle message sending
io.on('connection', (socket) => {

  // Send current WhatsApp status to new client
  if (whatsappStatus === 'connected') {
    socket.emit('whatsapp-ready', { status: 'connected' });
  } else if (whatsappStatus === 'connecting') {
    socket.emit('whatsapp-authenticated', { status: 'authenticated' });
  }

  // Send initial state
  socket.emit('initial-state', {
    conversations: Array.from(conversations.values()),
    messages: Array.from(messages.entries())
  });

  // Handle sending messages
  socket.on('send-message', async (data) => {
    try {

      // Ensure the phone number has the @c.us suffix
      const phoneNumberWithSuffix = data.to.includes('@c.us') ? data.to : `${data.to}@c.us`;
      const sentMessage = await client.sendMessage(phoneNumberWithSuffix, data.body);

      const messageData = {
        id: sentMessage.id._serialized,
        from: sentMessage.from,
        to: sentMessage.to,
        body: sentMessage.body,
        timestamp: new Date(sentMessage.timestamp * 1000),
        type: 'sent',
        isGroup: false,
        fromMe: true,
        contact: {
          name: data.to,
          number: data.to
        }
      };

      // Store sent message
      if (!messages.has(data.to)) {
        messages.set(data.to, []);
      }
      messages.get(data.to).push(messageData);

      // Update conversation
      if (!conversations.has(data.to)) {
        conversations.set(data.to, {
          id: data.to,
          phoneNumber: data.to,
          contactName: data.to,
          lastMessage: data.body,
          lastMessageTime: new Date(sentMessage.timestamp * 1000).toISOString(),
          messageCount: 1,
          unreadCount: 0,
          messages: [messageData]
        });
      } else {
        const conversation = conversations.get(data.to);
        conversation.lastMessage = data.body;
        conversation.lastMessageTime = new Date(sentMessage.timestamp * 1000).toISOString();
        conversation.messageCount += 1;
        conversation.messages.push(messageData);
      }

      // Broadcast to all clients
      io.emit('message-sent', {
        message: messageData,
        conversation: conversations.get(data.to)
      });

      socket.emit('send-success', { messageId: sentMessage.id._serialized });

    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('send-error', { error: error.message });
    }
  });

  // Handle voice note sending
  // Update the send-voice handler in index.js
// Update the send-voice handler in index.js
// Update the send-voice handler in index.js
socket.on('send-voice', async (data, callback) => {
  let tempFilePath = path.join(__dirname, 'temp_voice.ogg');
  
  try {
    const phoneNumberWithSuffix = data.chatId.includes('@c.us') ? data.chatId : `${data.chatId}@c.us`;

    // Convert base64 to buffer
    const buffer = Buffer.from(data.buffer, 'base64');
    
    // Validate audio data
    if (buffer.length === 0) {
      throw new Error('Empty audio buffer received');
    }

    // Write to temporary file
    await fs.promises.writeFile(tempFilePath, buffer);
    
    // Verify file was written
    const stats = await fs.promises.stat(tempFilePath);
    if (stats.size === 0) {
      throw new Error('Failed to write audio file');
    }

    // Create media with explicit MIME type
    const media = MessageMedia.fromFilePath(tempFilePath);
    media.mimetype = 'audio/ogg; codecs=opus';

    // Send with longer timeout
    const sentMessage = await client.sendMessage(phoneNumberWithSuffix, media, {
      sendAudioAsVoice: true,
      caption: data.caption || ''
    });


    // Create response data
    const messageData = {
      id: sentMessage.id._serialized,
      from: sentMessage.from,
      to: sentMessage.to,
      body: '[Voice Message]',
      timestamp: new Date(sentMessage.timestamp * 1000),
      type: 'voice',
      isGroup: false,
      fromMe: true,
      mediaData: `data:audio/ogg;base64,${data.buffer}`,
      filename: 'voice-message.ogg',
      contact: {
        name: data.chatId,
        number: data.chatId
      }
    };

    // Update conversation state
    if (!messages.has(data.chatId)) {
      messages.set(data.chatId, []);
    }
    messages.get(data.chatId).push(messageData);

    // Broadcast update
    io.emit('new-message', {
      message: messageData,
      conversation: conversations.get(data.chatId) || {
        id: data.chatId,
        phoneNumber: data.chatId,
        contactName: data.chatId,
        lastMessage: '[Voice Message]',
        lastMessageTime: messageData.timestamp.toISOString(),
        messageCount: 1,
        unreadCount: 0,
        messages: [messageData]
      }
    });

    callback({ success: true });
  } catch (error) {
    console.error('❌ Voice note error:', error);
    callback({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  } finally {
    // Clean up temp file
    try {
      if (tempFilePath) await fs.promises.unlink(tempFilePath);
    } catch (cleanupError) {
      console.error('Error cleaning up temp file:', cleanupError);
    }
  }
});

  // Handle getting conversation messages
  socket.on('get-conversation', async (data) => {
    const phoneNumber = data.phoneNumber;

    try {
      // Get the chat object
      const chat = await client.getChatById(phoneNumber + '@c.us');
      if (chat) {
        // Load more messages for this conversation
        const chatMessages = await chat.fetchMessages({ limit: 50 });

        // Process messages with media download
        const conversationMessages = [];
        const seenIds = new Set();

        for (const message of chatMessages) {
          if (seenIds.has(message.id._serialized)) continue;
          seenIds.add(message.id._serialized);

          let messageBody = message.body || '[Media Message]';
          let messageType = message.fromMe ? 'sent' : 'received';
          let mediaData = null;
          let filename = null;

          // Handle media messages
          if (message.hasMedia) {
            try {
              const media = await message.downloadMedia();

              // Check if media download was successful
              if (media && media.mimetype && media.data) {
                mediaData = `data:${media.mimetype};base64,${media.data}`;
                filename = media.filename;

                // Classify media type
                if (media.mimetype.startsWith('image/')) {
                  messageType = 'image';
                  messageBody = message.caption || '[Image]';
                } else if (media.mimetype.startsWith('video/')) {
                  messageType = 'video';
                  messageBody = message.caption || '[Video]';
                } else if (media.mimetype.startsWith('audio/')) {
                  if (message.isPtt) {
                    messageType = 'voice';
                    messageBody = '[Voice Message]';
                  } else {
                    messageType = 'audio';
                    messageBody = '[Audio]';
                  }
                } else {
                  messageType = 'file';
                  messageBody = message.caption || `[File: ${filename}]`;
                }
              } else {
                console.log('⚠️ Media download returned invalid data for message:', message.id._serialized);
                messageBody = '[Media Message]';
              }
            } catch (error) {
              console.log('❌ Error downloading media for message:', error.message);
              messageBody = '[Media Message]';
            }
          }

          conversationMessages.push({
            id: message.id._serialized,
            from: message.from,
            to: message.to,
            body: messageBody,
            timestamp: new Date(message.timestamp * 1000),
            type: messageType,
            isGroup: false,
            fromMe: message.fromMe,
            ack: message._data?.ack || 0,
            mediaData: mediaData,
            filename: filename,
            contact: {
              name: chat.name || phoneNumber,
              number: phoneNumber
            }
          });
        }

        // Update messages storage
        messages.set(phoneNumber, conversationMessages);

        // Update conversation
        if (conversations.has(phoneNumber)) {
          const conversation = conversations.get(phoneNumber);
          conversation.messageCount = conversationMessages.length;
          conversation.messages = conversationMessages;
          conversation.lastMessage = conversationMessages.length > 0
            ? conversationMessages[conversationMessages.length - 1]?.body || 'No messages yet'
            : 'No messages yet';
          conversation.lastMessageTime = conversationMessages.length > 0
            ? new Date(conversationMessages[conversationMessages.length - 1].timestamp).toISOString()
            : new Date().toISOString();
        }


        socket.emit('conversation-messages', {
          phoneNumber: phoneNumber,
          messages: conversationMessages
        });
      }
    } catch (error) {
      console.error('❌ Error loading conversation messages:', error);
      // Fallback to existing messages
      const conversationMessages = messages.get(phoneNumber) || [];
      socket.emit('conversation-messages', {
        phoneNumber: phoneNumber,
        messages: conversationMessages
      });
    }
  });

  // Handle marking conversation as read
  socket.on('mark-as-read', (data) => {
    const phoneNumber = data.phoneNumber;
    if (conversations.has(phoneNumber)) {
      const conversation = conversations.get(phoneNumber);
      conversation.unreadCount = 0;

      // Broadcast updated conversation
      io.emit('conversation-updated', conversation);
    }
  });

  // Handle getting profile picture
  socket.on('get-profile-pic', async (data) => {
    const phoneNumber = data.phoneNumber;
    try {
      const profilePicUrl = await client.getProfilePicUrl(phoneNumber + '@c.us');
      profilePics.set(phoneNumber, profilePicUrl);

      // Update conversation with profile pic
      if (conversations.has(phoneNumber)) {
        const conversation = conversations.get(phoneNumber);
        conversation.profilePicUrl = profilePicUrl;
        io.emit('conversation-updated', conversation);
      }

      socket.emit('profile-pic-updated', { phoneNumber, profilePicUrl });
    } catch (error) {
      console.log(`❌ Error getting profile picture for ${phoneNumber}: ${error.message}`);
      socket.emit('profile-pic-error', { phoneNumber, error: error.message });
    }
  });

  // Handle getting contact info with business details
  socket.on('get-contact-info', async (data) => {
    const phoneNumber = data.phoneNumber;
    try {
      const contact = await client.getContactById(phoneNumber + '@c.us');
      const profilePicUrl = await client.getProfilePicUrl(phoneNumber + '@c.us').catch(() => null);

      const contactInfo = {
        name: contact.name || contact.pushname || phoneNumber,
        phoneNumber: phoneNumber,
        about: contact.about || null,
        isBusiness: contact.isBusiness || false,
        profilePicUrl: profilePicUrl
      };

      // Add business profile details if available
      if (contact.businessProfile) {
        const businessProfile = contact.businessProfile;
        contactInfo.business = {
          description: businessProfile.description || null,
          category: businessProfile.category || null,
          address: businessProfile.address || null,
          hours: businessProfile.businessHours || null,
          website: businessProfile.website || null,
          email: businessProfile.email || null
        };
      }

      socket.emit('contact-info', contactInfo);
    } catch (error) {
      console.log(`❌ Error getting contact info for ${phoneNumber}: ${error.message}`);
      socket.emit('contact-info-error', { phoneNumber, error: error.message });
    }
  });

  // Handle typing indicators
  socket.on('typing', async (data) => {
    try {
      await client.sendState(data.chatId + '@c.us', 'composing');
      // Broadcast typing indicator to other clients
      socket.broadcast.emit('typing-indicator', {
        chatId: data.chatId,
        isTyping: true
      });
    } catch (error) {
      console.log(`❌ Error sending typing state: ${error.message}`);
    }
  });

  socket.on('stop-typing', async (data) => {
    try {
      await client.sendState(data.chatId + '@c.us', 'paused');
      // Broadcast stop typing indicator to other clients
      socket.broadcast.emit('typing-indicator', {
        chatId: data.chatId,
        isTyping: false
      });
    } catch (error) {
    }
  });

  // Handle media sending
  socket.on('send-media', async (data, callback) => {
  try {
    const phoneNumberWithSuffix = data.chatId.includes('@c.us') ? data.chatId : `${data.chatId}@c.us`;
    const base64Data = data.dataUrl.split(',')[1];
    const media = new MessageMedia(data.mimetype, base64Data, data.filename);
    
    await client.sendMessage(phoneNumberWithSuffix, media, {
      caption: data.caption || ''
    });
    
    callback({ success: true });
  } catch (error) {
    console.error('Error sending media:', error);
    callback({ success: false, error: error.message });
  }
});

  // Handle manual message forwarding (download + re-send)
  socket.on('manual-forward', async (data, callback) => {
  try {

    // Ensure the phone number has the @c.us suffix
    const phoneNumberWithSuffix = data.to.includes('@c.us') ? data.to : `${data.to}@c.us`;

    // Get the original message
    const originalMessage = await client.getMessageById(data.messageId);
    if (!originalMessage) {
      throw new Error('Original message not found');
    }

    let sentMessage;
    let media = null;

    // Check if it's a media message
    if (originalMessage.hasMedia) {

      // Download the original media
      media = await originalMessage.downloadMedia();
      if (!media || !media.data) {
        throw new Error('Failed to download media');
      }

      // Create new MessageMedia object
      const mediaPayload = new MessageMedia(
        media.mimetype,
        media.data,
        media.filename
      );

      // Send as fresh media message
      sentMessage = await client.sendMessage(phoneNumberWithSuffix, mediaPayload, {
        caption: originalMessage.caption || undefined
      });

    } else {

      // Send as text message
      sentMessage = await client.sendMessage(phoneNumberWithSuffix, originalMessage.body);

    }

    // Create message data for frontend
    const messageData = {
      id: sentMessage.id._serialized,
      from: sentMessage.from,
      to: sentMessage.to,
      body: originalMessage.hasMedia ? (originalMessage.caption || '[Media Message]') : originalMessage.body,
      timestamp: new Date(sentMessage.timestamp * 1000),
      type: (() => {
        if (!originalMessage.hasMedia) return 'sent';
        if (media.mimetype.startsWith('image/')) return 'image';
        if (media.mimetype.startsWith('video/')) return 'video';
        if (media.mimetype.startsWith('audio/')) return originalMessage.isPtt ? 'voice' : 'audio';
        return 'file';
      })(),
      isGroup: false,
      fromMe: true,
      mediaData: originalMessage.hasMedia ? `data:${media.mimetype};base64,${media.data}` : null,
      filename: originalMessage.hasMedia ? media.filename : null,
      contact: {
        name: data.to,
        number: data.to
      }
    };

    // Store the forwarded message
    if (!messages.has(data.to)) {
      messages.set(data.to, []);
    }
    messages.get(data.to).push(messageData);

    // Update conversation
    if (!conversations.has(data.to)) {
      conversations.set(data.to, {
        id: data.to,
        phoneNumber: data.to,
        contactName: data.to,
        lastMessage: messageData.body,
        lastMessageTime: messageData.timestamp.toISOString(),
        messageCount: 1,
        unreadCount: 0,
        messages: [messageData]
      });
    } else {
      const conversation = conversations.get(data.to);
      conversation.lastMessage = messageData.body;
      conversation.lastMessageTime = messageData.timestamp.toISOString();
      conversation.messageCount += 1;
      conversation.messages.push(messageData);
    }

    // Broadcast to all clients
    io.emit('new-message', {
      message: messageData,
      conversation: conversations.get(data.to)
    });

    callback({ success: true });

  } catch (error) {
    console.error('❌ Error forwarding message:', error);
    callback({ success: false, error: error.message });
  }
});
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    whatsappStatus: whatsappStatus,
    connections: io.engine.clientsCount,
    conversations: conversations.size,
    messages: Array.from(messages.values()).flat().length
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'WhatsApp backend is running!',
    timestamp: new Date().toISOString(),
    whatsappStatus: whatsappStatus
  });
});

app.get('/api/conversations', (req, res) => {
  res.json(Array.from(conversations.values()));
});

app.get('/api/messages/:contactId', (req, res) => {
  const { contactId } = req.params;
  const conversationMessages = messages.get(contactId) || [];
  res.json(conversationMessages);
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`WhatsApp backend server running on port ${PORT}`);

  // Initialize WhatsApp client
  client.initialize();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  client.destroy();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}); 