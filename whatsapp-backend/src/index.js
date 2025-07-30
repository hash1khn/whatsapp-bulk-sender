const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer'); // full puppeteer

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
  console.log('🧹 Cleared seen message IDs cache');
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
    console.log('QR Code generated');
  } catch (error) {
    console.error('Error generating QR code:', error);
  }
});

// Handle WhatsApp client ready event
client.on('ready', async () => {
  console.log('✅ WhatsApp client is ready!');
  whatsappStatus = 'connected'; // Changed from 'ready' to 'connected'
  io.emit('whatsapp-ready');

  // Load existing conversations
  try {
    console.log('📋 Loading existing conversations...');
    const chats = await client.getChats();
    console.log(`Found ${chats.length} chats`);

    for (const chat of chats) {
      if (chat.isGroup) {
        console.log(`Skipping group chat: ${chat.name}`);
        continue; // Skip group chats for now
      }

      const phoneNumber = chat.id._serialized.split('@')[0];
      console.log(`Processing chat: ${phoneNumber} (${chat.name || 'No name'})`);

      try {
        // Get messages for this chat
        const chatMessages = await chat.fetchMessages({ limit: 10 });
        console.log(`Found ${chatMessages.length} messages for ${phoneNumber}`);

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
              console.log(`📎 Processing media message: ${msg.id._serialized}`);
              try {
                const media = await msg.downloadMedia();

                // Check if media download was successful
                if (media && media.mimetype && media.data) {
                  mediaData = `data:${media.mimetype};base64,${media.data}`;
                  filename = media.filename;

                  console.log(`📎 Media downloaded: ${media.mimetype}, ${filename}, size: ${media.data.length}`);

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

                  console.log(`📎 Media classified as: ${messageType}`);
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
          console.log(`⚠️ No profile picture for ${phoneNumber}: ${error.message}`);
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

        console.log(`✅ Added conversation: ${phoneNumber} with ${chatMessages.length} messages`);
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

    console.log(`✅ Loaded ${conversations.size} conversations`);

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
  console.log('WhatsApp client authenticated');
  whatsappStatus = 'connecting';
  io.emit('whatsapp-authenticated', { status: 'authenticated' });
});

client.on('auth_failure', (msg) => {
  console.log('WhatsApp authentication failed:', msg);
  whatsappStatus = 'disconnected';
  io.emit('whatsapp-auth-failure', { error: msg });
});

client.on('disconnected', (reason) => {
  console.log('WhatsApp client disconnected:', reason);
  whatsappStatus = 'disconnected';
  io.emit('whatsapp-disconnected', { reason });
});

// Handle incoming messages from WhatsApp
client.on('message', async (message) => {
  console.log('📨 New WhatsApp message received:', message.body);

  // Skip messages from ourselves
  if (message.fromMe) {
    console.log('📨 Skipping own message');
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
    console.log('🔄 Skipping duplicate message:', message.id._serialized);
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

  console.log(`✅ Updated conversation: ${phoneNumber} with new message (type: ${messageType}, hasMedia: ${!!mediaData})`);

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
  console.log('📤 Message we sent:', message.body);

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

  console.log(`✅ Updated conversation: ${phoneNumber} with sent message (type: ${messageType}, hasMedia: ${!!mediaData})`);

  // Broadcast to all connected clients
  io.emit('new-message', {
    message: messageData,
    conversation: conversations.get(phoneNumber)
  });
});

// Handle message sending
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

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
      console.log('📤 Sending message to:', data.to);

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
  socket.on('send-voice', async (data) => {
    try {
      console.log('🎤 Sending voice note to:', data.chatId);

      const phoneNumberWithSuffix = data.chatId.includes('@c.us') ? data.chatId : `${data.chatId}@c.us`;
      const media = new MessageMedia('audio/ogg; codecs=opus', data.buffer, 'voice.ogg');

      const sentMessage = await client.sendMessage(phoneNumberWithSuffix, media, {
        ptt: true // Mark as voice note
      });

      const messageData = {
        id: sentMessage.id._serialized,
        from: sentMessage.from,
        to: sentMessage.to,
        body: '[Voice Message]',
        timestamp: new Date(sentMessage.timestamp * 1000),
        type: 'voice',
        isGroup: false,
        fromMe: true,
        ack: sentMessage._data?.ack || 0,
        mediaData: `data:audio/ogg;base64,${data.buffer}`,
        filename: 'voice.ogg',
        contact: {
          name: data.chatId,
          number: data.chatId
        }
      };

      // Store sent message
      if (!messages.has(data.chatId)) {
        messages.set(data.chatId, []);
      }
      messages.get(data.chatId).push(messageData);

      // Update conversation
      if (!conversations.has(data.chatId)) {
        conversations.set(data.chatId, {
          id: data.chatId,
          phoneNumber: data.chatId,
          contactName: data.chatId,
          lastMessage: '[Voice Message]',
          lastMessageTime: new Date(sentMessage.timestamp * 1000).toISOString(),
          messageCount: 1,
          unreadCount: 0,
          messages: [messageData]
        });
      } else {
        const conversation = conversations.get(data.chatId);
        conversation.lastMessage = '[Voice Message]';
        conversation.lastMessageTime = new Date(sentMessage.timestamp * 1000).toISOString();
        conversation.messageCount += 1;
        conversation.messages.push(messageData);
      }

      // Broadcast to all clients
      io.emit('message-sent', {
        message: messageData,
        conversation: conversations.get(data.chatId)
      });

      socket.emit('send-success', { messageId: sentMessage.id._serialized });

    } catch (error) {
      console.error('❌ Error sending voice note:', error);
      socket.emit('send-error', { error: error.message });
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

        console.log(`📤 Sending ${conversationMessages.length} messages to frontend for ${phoneNumber}`);
        console.log(`📤 Media messages: ${conversationMessages.filter(m => m.mediaData).length}`);

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
      console.log(`❌ Error sending stop typing state: ${error.message}`);
    }
  });

  // Handle media sending
  socket.on('send-media', async (data) => {
    try {
      console.log('📤 Sending media to:', data.chatId, 'Type:', data.mimetype, 'Size:', data.dataUrl.length);

      const phoneNumberWithSuffix = data.chatId.includes('@c.us') ? data.chatId : `${data.chatId}@c.us`;

      // Create MessageMedia from dataUrl
      // Extract base64 data from dataUrl
      const base64Data = data.dataUrl.split(',')[1];
      const media = new MessageMedia(data.mimetype, base64Data, data.filename);

      const sentMessage = await client.sendMessage(phoneNumberWithSuffix, media, {
        caption: data.caption || ''
      });

      // Classify media type for sent messages
      let messageType = 'sent';
      let messageBody = data.caption || '[Media Message]';

      if (data.mimetype.startsWith('image/')) {
        messageType = 'image';
        messageBody = data.caption || '[Image]';
      } else if (data.mimetype.startsWith('video/')) {
        messageType = 'video';
        messageBody = data.caption || '[Video]';
      } else if (data.mimetype.startsWith('audio/')) {
        messageType = 'audio';
        messageBody = data.caption || '[Audio]';
      } else {
        messageType = 'file';
        messageBody = data.caption || `[File: ${data.filename}]`;
      }

      const messageData = {
        id: sentMessage.id._serialized,
        from: sentMessage.from,
        to: sentMessage.to,
        body: messageBody,
        timestamp: new Date(sentMessage.timestamp * 1000),
        type: messageType,
        isGroup: false,
        fromMe: true,
        ack: sentMessage._data?.ack || 0,
        mediaData: data.dataUrl,
        filename: data.filename,
        contact: {
          name: data.chatId,
          number: data.chatId
        }
      };

      // Store sent message
      if (!messages.has(data.chatId)) {
        messages.set(data.chatId, []);
      }
      messages.get(data.chatId).push(messageData);

      // Update conversation
      if (!conversations.has(data.chatId)) {
        conversations.set(data.chatId, {
          id: data.chatId,
          phoneNumber: data.chatId,
          contactName: data.chatId,
          lastMessage: data.caption || '[Media Message]',
          lastMessageTime: new Date(sentMessage.timestamp * 1000).toISOString(),
          messageCount: 1,
          unreadCount: 0,
          messages: [messageData]
        });
      } else {
        const conversation = conversations.get(data.chatId);
        conversation.lastMessage = data.caption || '[Media Message]';
        conversation.lastMessageTime = new Date(sentMessage.timestamp * 1000).toISOString();
        conversation.messageCount += 1;
        conversation.messages.push(messageData);
      }

      // Broadcast to all clients
      io.emit('message-sent', {
        message: messageData,
        conversation: conversations.get(data.chatId)
      });

      socket.emit('send-success', { messageId: sentMessage.id._serialized });

    } catch (error) {
      console.error('❌ Error sending media:', error);
      socket.emit('send-error', {
        error: error.message,
        details: 'Failed to send media file. Please check file type and size.',
        fileType: data.mimetype,
        fileName: data.filename
      });
    }
  });

  // Handle manual message forwarding (download + re-send)
  socket.on('manual-forward', async (data) => {
    try {
      console.log('📤 Manual forwarding message to:', data.to, 'from message:', data.messageId);

      // Ensure the phone number has the @c.us suffix
      const phoneNumberWithSuffix = data.to.includes('@c.us') ? data.to : `${data.to}@c.us`;

      // Get the original message
      const originalMessage = await client.getMessageById(data.messageId);
      if (!originalMessage) {
        throw new Error('Original message not found');
      }

      let sentMessage;

      // Check if it's a media message
      if (originalMessage.hasMedia) {
        console.log('📎 Forwarding media message');

        // Download the original media
        const media = await originalMessage.downloadMedia();
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

        console.log('✅ Media message forwarded successfully');
      } else {
        console.log('📝 Forwarding text message');

        // Send as text message
        sentMessage = await client.sendMessage(phoneNumberWithSuffix, originalMessage.body);

        console.log('✅ Text message forwarded successfully');
      }

      // Create message data for frontend
      const messageData = {
        id: sentMessage.id._serialized,
        from: sentMessage.from,
        to: sentMessage.to,
        body: originalMessage.hasMedia ? (originalMessage.caption || '[Media Message]') : originalMessage.body,
        timestamp: new Date(sentMessage.timestamp * 1000),
        // classify forwarded media by its mimetype
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

      socket.emit('forward-success', { messageId: sentMessage.id._serialized });

    } catch (error) {
      console.error('❌ Error forwarding message:', error);
      socket.emit('forward-error', { error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
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
  console.log(`WebSocket server ready for connections`);
  console.log(`CORS enabled for: http://localhost:5173, http://127.0.0.1:5173, http://localhost:8080, http://127.0.0.1:8080`);

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