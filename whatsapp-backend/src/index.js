const express = require("express")
const http = require("http")
const socketIo = require("socket.io")
const cors = require("cors")
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js")
const qrcode = require("qrcode")
const { v4: uuidv4 } = require("uuid")
const puppeteer = require("puppeteer")
const fs = require("fs")
const path = require("path")
const NodeCache = require("node-cache")

require("dotenv").config()

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  transports: ["websocket", "polling"],
})

// Performance optimizations
const messageCache = new NodeCache({ stdTTL: 3600 }) // 1 hour cache
const conversationCache = new NodeCache({ stdTTL: 1800 }) // 30 min cache
const profilePicCache = new NodeCache({ stdTTL: 7200 }) // 2 hour cache

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)
app.use(express.json({ limit: "50mb" }))
app.use(express.static("public"))

// In-memory storage with optimization
const conversations = new Map()
const messages = new Map()
const profilePics = new Map()
const businessProfiles = new Map()
const seenMessageIds = new Set()

// Batch processing for better performance
let messageBatch = []
let conversationBatch = []
const BATCH_SIZE = 10
const BATCH_TIMEOUT = 1000 // 1 second

// Clear seen message IDs periodically
setInterval(() => {
  seenMessageIds.clear()
}, 300000) // Clear every 5 minutes

let whatsappStatus = "disconnected"

// Initialize WhatsApp client with optimizations
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: puppeteer.executablePath(),
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  },
})

// Optimized message processing
const processMessageBatch = () => {
  if (messageBatch.length > 0) {
    io.emit("message-batch", messageBatch)
    messageBatch = []
  }

  if (conversationBatch.length > 0) {
    io.emit("conversation-batch", conversationBatch)
    conversationBatch = []
  }
}

setInterval(processMessageBatch, BATCH_TIMEOUT)

// Enhanced QR code handling
client.on("qr", async (qr) => {
  try {
    whatsappStatus = "connecting"
    const qrCode = await qrcode.toDataURL(qr)
    io.emit("qr", qrCode)
    console.log("📱 QR Code generated and sent to clients")
  } catch (error) {
    console.error("❌ Error generating QR code:", error)
  }
})

// Enhanced ready event with business profile support
client.on("ready", async () => {
  whatsappStatus = "connected"
  io.emit("whatsapp-ready")
  console.log("✅ WhatsApp client is ready!")

  try {
    const chats = await client.getChats()
    console.log(`📋 Loading ${chats.length} conversations...`)

    // Process chats in batches for better performance
    const CHAT_BATCH_SIZE = 5
    for (let i = 0; i < chats.length; i += CHAT_BATCH_SIZE) {
      const chatBatch = chats.slice(i, i + CHAT_BATCH_SIZE)

      await Promise.all(
        chatBatch.map(async (chat) => {
          try {
            const phoneNumber = chat.id._serialized.split("@")[0]

            // Enhanced business profile detection
            let businessProfile = null
            let isBusiness = false
            let businessName = null

            if (chat.contact && chat.contact.isBusiness) {
              isBusiness = true
              try {
                const contact = await client.getContactById(chat.id._serialized)
                if (contact.businessProfile) {
                  businessProfile = contact.businessProfile
                  businessName = businessProfile.name || businessProfile.description?.split("\n")[0]
                  businessProfiles.set(phoneNumber, businessProfile)
                }
              } catch (error) {
                console.log(`⚠️ Could not fetch business profile for ${phoneNumber}`)
              }
            }

            // Get recent messages with media handling
            const chatMessages = await chat.fetchMessages({ limit: 20 })

            if (!messages.has(phoneNumber)) {
              messages.set(phoneNumber, [])
            }

            const conversationMessages = []
            const seenIds = new Set()

            for (const msg of chatMessages) {
              if (!seenIds.has(msg.id._serialized)) {
                seenIds.add(msg.id._serialized)

                let messageBody = msg.body || "[Media Message]"
                let messageType = msg.fromMe ? "sent" : "received"
                let mediaData = null
                let filename = null

                // Enhanced media handling with staging support
                if (msg.hasMedia) {
                  try {
                    const media = await msg.downloadMedia()

                    if (media && media.mimetype && media.data) {
                      // Create staging URL for media
                      const mediaId = uuidv4()
                      const stagingPath = path.join(__dirname, "staging", mediaId)

                      // Ensure staging directory exists
                      const stagingDir = path.dirname(stagingPath)
                      if (!fs.existsSync(stagingDir)) {
                        fs.mkdirSync(stagingDir, { recursive: true })
                      }

                      // Save media to staging
                      fs.writeFileSync(stagingPath, Buffer.from(media.data, "base64"))

                      mediaData = `data:${media.mimetype};base64,${media.data}`
                      filename = media.filename || `media_${mediaId}`

                      // Classify media type
                      if (media.mimetype.startsWith("image/")) {
                        messageType = "image"
                        messageBody = msg.caption || "[Image]"
                      } else if (media.mimetype.startsWith("video/")) {
                        messageType = "video"
                        messageBody = msg.caption || "[Video]"
                      } else if (media.mimetype.startsWith("audio/")) {
                        if (msg.isPtt) {
                          messageType = "voice"
                          messageBody = "[Voice Message]"
                        } else {
                          messageType = "audio"
                          messageBody = "[Audio]"
                        }
                      } else {
                        messageType = "file"
                        messageBody = msg.caption || `[File: ${filename}]`
                      }
                    }
                  } catch (error) {
                    console.log(`❌ Error downloading media: ${error.message}`)
                    messageBody = "[Media Message]"
                  }
                }

                conversationMessages.push({
                  id: msg.id._serialized,
                  from: msg.from,
                  to: msg.to,
                  body: messageBody,
                  timestamp: new Date(msg.timestamp * 1000),
                  type: messageType,
                  isGroup: chat.isGroup,
                  fromMe: msg.fromMe,
                  ack: msg._data?.ack || 0,
                  mediaData: mediaData,
                  filename: filename,
                  contact: {
                    name: chat.name || businessName || phoneNumber,
                    number: phoneNumber,
                  },
                })
              }
            }

            messages.set(phoneNumber, conversationMessages)

            // Get profile picture with caching
            let profilePicUrl = profilePicCache.get(phoneNumber)
            if (!profilePicUrl) {
              try {
                profilePicUrl = await client.getProfilePicUrl(chat.id._serialized)
                profilePics.set(phoneNumber, profilePicUrl)
                profilePicCache.set(phoneNumber, profilePicUrl)
              } catch (error) {
                // No profile picture available
              }
            }

            const lastMessage = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null

            // Enhanced conversation object with business support
            const conversationData = {
              id: phoneNumber,
              phoneNumber: phoneNumber,
              contactName: chat.name || phoneNumber,
              businessName: businessName,
              lastMessage: lastMessage ? lastMessage.body || "[Media Message]" : "No messages yet",
              lastMessageTime: lastMessage
                ? new Date(lastMessage.timestamp * 1000).toISOString()
                : new Date().toISOString(),
              messageCount: chatMessages.length,
              unreadCount: chat.unreadCount || 0,
              messages: conversationMessages,
              profilePicUrl: profilePicUrl,
              isGroup: chat.isGroup,
              isBusiness: isBusiness,
              businessProfile: businessProfile,
              participantCount: chat.isGroup ? chat.participants?.length || 0 : 0,
              lastMessageFromMe: lastMessage?.fromMe || false,
              lastMessageAck: lastMessage?._data?.ack || 0,
            }

            conversations.set(phoneNumber, conversationData)
            conversationCache.set(phoneNumber, conversationData)
          } catch (error) {
            console.log(`⚠️ Error processing chat: ${error.message}`)
          }
        }),
      )

      // Small delay between batches to prevent overwhelming
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Send initial state to all connected clients
    io.emit("initial-state", {
      conversations: Array.from(conversations.values()),
      messages: Array.from(messages.entries()),
    })

    console.log("✅ All conversations loaded successfully")
  } catch (error) {
    console.error("❌ Error loading conversations:", error)
  }
})

// Enhanced message handling with business profile support
client.on("message", async (message) => {
  if (message.fromMe) return

  const phoneNumber = message.from.split("@")[0]

  // Check for business profile
  let businessName = null
  let isBusiness = false

  try {
    const contact = await client.getContactById(message.from)
    if (contact.isBusiness && contact.businessProfile) {
      isBusiness = true
      businessName = contact.businessProfile.name || contact.businessProfile.description?.split("\n")[0]
      businessProfiles.set(phoneNumber, contact.businessProfile)
    }
  } catch (error) {
    // Not a business or error fetching profile
  }

  // Enhanced media handling with staging
  let messageBody = message.body || "[Media Message]"
  let messageType = "received"
  let mediaData = null
  let filename = null

  if (message.hasMedia) {
    try {
      const media = await message.downloadMedia()

      if (media && media.mimetype && media.data) {
        // Create staging for media
        const mediaId = uuidv4()
        const stagingPath = path.join(__dirname, "staging", mediaId)

        const stagingDir = path.dirname(stagingPath)
        if (!fs.existsSync(stagingDir)) {
          fs.mkdirSync(stagingDir, { recursive: true })
        }

        fs.writeFileSync(stagingPath, Buffer.from(media.data, "base64"))

        mediaData = `data:${media.mimetype};base64,${media.data}`
        filename = media.filename || `media_${mediaId}`

        if (media.mimetype.startsWith("image/")) {
          messageType = "image"
          messageBody = message.caption || "[Image]"
        } else if (media.mimetype.startsWith("video/")) {
          messageType = "video"
          messageBody = message.caption || "[Video]"
        } else if (media.mimetype.startsWith("audio/")) {
          if (message.isPtt) {
            messageType = "voice"
            messageBody = "[Voice Message]"
          } else {
            messageType = "audio"
            messageBody = "[Audio]"
          }
        } else {
          messageType = "file"
          messageBody = message.caption || `[File: ${filename}]`
        }
      }
    } catch (error) {
      console.log("❌ Error downloading media:", error.message)
      messageBody = "[Media Message]"
    }
  }

  const messageData = {
    id: message.id._serialized,
    from: message.from,
    to: message.to,
    body: messageBody,
    timestamp: new Date(message.timestamp * 1000),
    type: messageType,
    isGroup: message.from.includes("@g.us"),
    fromMe: message.fromMe,
    ack: message._data?.ack || 0,
    mediaData: mediaData,
    filename: filename,
    contact: {
      name: businessName || message._data.notifyName || phoneNumber,
      number: phoneNumber,
    },
  }

  // Prevent duplicates
  if (seenMessageIds.has(message.id._serialized)) {
    return
  }
  seenMessageIds.add(message.id._serialized)

  // Store message
  if (!messages.has(phoneNumber)) {
    messages.set(phoneNumber, [])
  }
  messages.get(phoneNumber).push(messageData)

  // Update or create conversation with business info
  if (!conversations.has(phoneNumber)) {
    conversations.set(phoneNumber, {
      id: phoneNumber,
      phoneNumber: phoneNumber,
      contactName: businessName || message._data.notifyName || phoneNumber,
      businessName: businessName,
      lastMessage: messageBody,
      lastMessageTime: new Date(message.timestamp * 1000).toISOString(),
      messageCount: 1,
      unreadCount: 1,
      messages: [messageData],
      isGroup: message.from.includes("@g.us"),
      isBusiness: isBusiness,
      businessProfile: businessProfiles.get(phoneNumber),
      lastMessageFromMe: false,
      lastMessageAck: 0,
    })
  } else {
    const conversation = conversations.get(phoneNumber)
    conversation.lastMessage = messageBody
    conversation.lastMessageTime = new Date(message.timestamp * 1000).toISOString()
    conversation.messageCount += 1
    conversation.unreadCount += 1
    conversation.messages.push(messageData)
    conversation.businessName = businessName || conversation.businessName
    conversation.isBusiness = isBusiness || conversation.isBusiness
    conversation.lastMessageFromMe = false
    conversation.lastMessageAck = 0
  }

  // Add to batch for efficient broadcasting
  messageBatch.push({
    message: messageData,
    conversation: conversations.get(phoneNumber),
  })

  // Immediate broadcast for real-time feel
  io.emit("new-message", {
    message: messageData,
    conversation: conversations.get(phoneNumber),
  })
})

// Enhanced message_create handler
client.on("message_create", async (message) => {
  if (!message.fromMe) return

  const phoneNumber = message.to.split("@")[0]

  let messageBody = message.body || "[Media Message]"
  let messageType = "sent"
  let mediaData = null
  let filename = null

  if (message.hasMedia) {
    try {
      const media = await message.downloadMedia()

      if (media && media.mimetype && media.data) {
        const mediaId = uuidv4()
        const stagingPath = path.join(__dirname, "staging", mediaId)

        const stagingDir = path.dirname(stagingPath)
        if (!fs.existsSync(stagingDir)) {
          fs.mkdirSync(stagingDir, { recursive: true })
        }

        fs.writeFileSync(stagingPath, Buffer.from(media.data, "base64"))

        mediaData = `data:${media.mimetype};base64,${media.data}`
        filename = media.filename || `media_${mediaId}`

        if (media.mimetype.startsWith("image/")) {
          messageType = "image"
          messageBody = message.caption || "[Image]"
        } else if (media.mimetype.startsWith("video/")) {
          messageType = "video"
          messageBody = message.caption || "[Video]"
        } else if (media.mimetype.startsWith("audio/")) {
          if (message.isPtt) {
            messageType = "voice"
            messageBody = "[Voice Message]"
          } else {
            messageType = "audio"
            messageBody = "[Audio]"
          }
        } else {
          messageType = "file"
          messageBody = message.caption || `[File: ${filename}]`
        }
      }
    } catch (error) {
      console.log("❌ Error downloading media:", error.message)
      messageBody = "[Media Message]"
    }
  }

  const messageData = {
    id: message.id._serialized,
    from: message.from,
    to: message.to,
    body: messageBody,
    timestamp: new Date(message.timestamp * 1000),
    type: messageType,
    isGroup: message.to.includes("@g.us"),
    fromMe: true,
    ack: message._data?.ack || 1,
    mediaData: mediaData,
    filename: filename,
    contact: {
      name: phoneNumber,
      number: phoneNumber,
    },
  }

  // Store message
  if (!messages.has(phoneNumber)) {
    messages.set(phoneNumber, [])
  }
  messages.get(phoneNumber).push(messageData)

  // Update conversation
  if (!conversations.has(phoneNumber)) {
    conversations.set(phoneNumber, {
      id: phoneNumber,
      phoneNumber: phoneNumber,
      contactName: phoneNumber,
      lastMessage: messageBody,
      lastMessageTime: new Date(message.timestamp * 1000).toISOString(),
      messageCount: 1,
      unreadCount: 0,
      messages: [messageData],
      isGroup: message.to.includes("@g.us"),
      lastMessageFromMe: true,
      lastMessageAck: messageData.ack,
    })
  } else {
    const conversation = conversations.get(phoneNumber)
    conversation.lastMessage = messageBody
    conversation.lastMessageTime = new Date(message.timestamp * 1000).toISOString()
    conversation.messageCount += 1
    conversation.messages.push(messageData)
    conversation.lastMessageFromMe = true
    conversation.lastMessageAck = messageData.ack
  }

  // Broadcast to all connected clients
  io.emit("new-message", {
    message: messageData,
    conversation: conversations.get(phoneNumber),
  })
})

// Enhanced socket handling
io.on("connection", (socket) => {
  console.log("👤 Client connected:", socket.id)

  // Send current WhatsApp status
  if (whatsappStatus === "connected") {
    socket.emit("whatsapp-ready", { status: "connected" })
  } else if (whatsappStatus === "connecting") {
    socket.emit("whatsapp-authenticated", { status: "authenticated" })
  }

  // Send initial state with caching
  const cachedState = {
    conversations: Array.from(conversations.values()),
    messages: Array.from(messages.entries()),
  }
  socket.emit("initial-state", cachedState)

  // Enhanced message sending with staging support
  socket.on("send-message", async (data) => {
    try {
      const phoneNumberWithSuffix = data.to.includes("@c.us") ? data.to : `${data.to}@c.us`
      const sentMessage = await client.sendMessage(phoneNumberWithSuffix, data.body)

      const messageData = {
        id: sentMessage.id._serialized,
        from: sentMessage.from,
        to: sentMessage.to,
        body: sentMessage.body,
        timestamp: new Date(sentMessage.timestamp * 1000),
        type: "sent",
        isGroup: false,
        fromMe: true,
        ack: sentMessage._data?.ack || 1,
        contact: {
          name: data.to,
          number: data.to,
        },
      }

      // Store sent message
      if (!messages.has(data.to)) {
        messages.set(data.to, [])
      }
      messages.get(data.to).push(messageData)

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
          messages: [messageData],
          lastMessageFromMe: true,
          lastMessageAck: messageData.ack,
        })
      } else {
        const conversation = conversations.get(data.to)
        conversation.lastMessage = data.body
        conversation.lastMessageTime = new Date(sentMessage.timestamp * 1000).toISOString()
        conversation.messageCount += 1
        conversation.messages.push(messageData)
        conversation.lastMessageFromMe = true
        conversation.lastMessageAck = messageData.ack
      }

      // Broadcast to all clients
      io.emit("message-sent", {
        message: messageData,
        conversation: conversations.get(data.to),
      })

      socket.emit("send-success", { messageId: sentMessage.id._serialized })
    } catch (error) {
      console.error("❌ Error sending message:", error)
      socket.emit("send-error", { error: error.message })
    }
  })

  // Enhanced voice note handling with staging
  socket.on("send-voice", async (data, callback) => {
    const tempFilePath = path.join(__dirname, "staging", `voice_${uuidv4()}.ogg`)

    try {
      const phoneNumberWithSuffix = data.chatId.includes("@c.us") ? data.chatId : `${data.chatId}@c.us`

      // Ensure staging directory exists
      const stagingDir = path.dirname(tempFilePath)
      if (!fs.existsSync(stagingDir)) {
        fs.mkdirSync(stagingDir, { recursive: true })
      }

      const buffer = Buffer.from(data.buffer, "base64")

      if (buffer.length === 0) {
        throw new Error("Empty audio buffer received")
      }

      await fs.promises.writeFile(tempFilePath, buffer)

      const stats = await fs.promises.stat(tempFilePath)
      if (stats.size === 0) {
        throw new Error("Failed to write audio file")
      }

      const media = MessageMedia.fromFilePath(tempFilePath)
      media.mimetype = "audio/ogg; codecs=opus"

      const sentMessage = await client.sendMessage(phoneNumberWithSuffix, media, {
        sendAudioAsVoice: true,
        caption: data.caption || "",
      })

      const messageData = {
        id: sentMessage.id._serialized,
        from: sentMessage.from,
        to: sentMessage.to,
        body: "[Voice Message]",
        timestamp: new Date(sentMessage.timestamp * 1000),
        type: "voice",
        isGroup: false,
        fromMe: true,
        ack: sentMessage._data?.ack || 1,
        mediaData: `data:audio/ogg;base64,${data.buffer}`,
        filename: "voice-message.ogg",
        contact: {
          name: data.chatId,
          number: data.chatId,
        },
      }

      // Update conversation state
      if (!messages.has(data.chatId)) {
        messages.set(data.chatId, [])
      }
      messages.get(data.chatId).push(messageData)

      // Broadcast update
      io.emit("new-message", {
        message: messageData,
        conversation: conversations.get(data.chatId) || {
          id: data.chatId,
          phoneNumber: data.chatId,
          contactName: data.chatId,
          lastMessage: "[Voice Message]",
          lastMessageTime: messageData.timestamp.toISOString(),
          messageCount: 1,
          unreadCount: 0,
          messages: [messageData],
          lastMessageFromMe: true,
          lastMessageAck: messageData.ack,
        },
      })

      callback({ success: true })
    } catch (error) {
      console.error("❌ Voice note error:", error)
      callback({
        success: false,
        error: error.message,
      })
    } finally {
      // Clean up temp file
      try {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath)
        }
      } catch (cleanupError) {
        console.error("Error cleaning up temp file:", cleanupError)
      }
    }
  })

  // Enhanced media sending with staging
  // In your index.js file, modify the send-media handler:
socket.on('send-media', async (data, callback) => {
  try {
    const phoneNumberWithSuffix = data.chatId.includes('@c.us') ? data.chatId : `${data.chatId}@c.us`;
    const base64Data = data.dataUrl.split(',')[1];
    const media = new MessageMedia(data.mimetype, base64Data, data.filename);
    
    const sentMessage = await client.sendMessage(phoneNumberWithSuffix, media, {
      caption: data.caption || ''
    });

    // Success response
    if (typeof callback === 'function') {
      callback({ 
        success: true,
        messageId: sentMessage.id._serialized 
      });
    }

    // Create message data for frontend
    const messageData = {
      id: sentMessage.id._serialized,
      from: sentMessage.from,
      to: sentMessage.to,
      body: data.caption || '[Media Message]',
      timestamp: new Date(sentMessage.timestamp * 1000),
      type: data.mimetype.startsWith('image/') ? 'image' : 
            data.mimetype.startsWith('video/') ? 'video' : 
            data.mimetype.startsWith('audio/') ? 'audio' : 'file',
      isGroup: false,
      fromMe: true,
      mediaData: data.dataUrl,
      filename: data.filename,
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
        lastMessage: messageData.body,
        lastMessageTime: messageData.timestamp.toISOString(),
        messageCount: 1,
        unreadCount: 0,
        messages: [messageData]
      }
    });

  } catch (error) {
    console.error('Error sending media:', error);
    if (typeof callback === 'function') {
      callback({ 
        success: false, 
        error: error.message 
      });
    }
  }
});

  // Enhanced forwarding with staging support
  socket.on("manual-forward", async (data, callback) => {
    try {
      const phoneNumberWithSuffix = data.to.includes("@c.us") ? data.to : `${data.to}@c.us`
      const originalMessage = await client.getMessageById(data.messageId)

      if (!originalMessage) {
        throw new Error("Original message not found")
      }

      let sentMessage
      let media = null

      if (originalMessage.hasMedia) {
        media = await originalMessage.downloadMedia()
        if (!media || !media.data) {
          throw new Error("Failed to download media")
        }

        // Save to staging
        const mediaId = uuidv4()
        const stagingPath = path.join(__dirname, "staging", mediaId)
        const stagingDir = path.dirname(stagingPath)

        if (!fs.existsSync(stagingDir)) {
          fs.mkdirSync(stagingDir, { recursive: true })
        }

        fs.writeFileSync(stagingPath, Buffer.from(media.data, "base64"))

        const mediaPayload = new MessageMedia(media.mimetype, media.data, media.filename)

        sentMessage = await client.sendMessage(phoneNumberWithSuffix, mediaPayload, {
          caption: originalMessage.caption || undefined,
        })
      } else {
        sentMessage = await client.sendMessage(phoneNumberWithSuffix, originalMessage.body)
      }

      const messageData = {
        id: sentMessage.id._serialized,
        from: sentMessage.from,
        to: sentMessage.to,
        body: originalMessage.hasMedia ? originalMessage.caption || "[Media Message]" : originalMessage.body,
        timestamp: new Date(sentMessage.timestamp * 1000),
        type: (() => {
          if (!originalMessage.hasMedia) return "sent"
          if (media.mimetype.startsWith("image/")) return "image"
          if (media.mimetype.startsWith("video/")) return "video"
          if (media.mimetype.startsWith("audio/")) return originalMessage.isPtt ? "voice" : "audio"
          return "file"
        })(),
        isGroup: false,
        fromMe: true,
        ack: sentMessage._data?.ack || 1,
        mediaData: originalMessage.hasMedia ? `data:${media.mimetype};base64,${media.data}` : null,
        filename: originalMessage.hasMedia ? media.filename : null,
        contact: {
          name: data.to,
          number: data.to,
        },
      }

      // Store the forwarded message
      if (!messages.has(data.to)) {
        messages.set(data.to, [])
      }
      messages.get(data.to).push(messageData)

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
          messages: [messageData],
          lastMessageFromMe: true,
          lastMessageAck: messageData.ack,
        })
      } else {
        const conversation = conversations.get(data.to)
        conversation.lastMessage = messageData.body
        conversation.lastMessageTime = messageData.timestamp.toISOString()
        conversation.messageCount += 1
        conversation.messages.push(messageData)
        conversation.lastMessageFromMe = true
        conversation.lastMessageAck = messageData.ack
      }

      // Broadcast to all clients
      io.emit("new-message", {
        message: messageData,
        conversation: conversations.get(data.to),
      })

      callback({ success: true })
    } catch (error) {
      console.error("❌ Error forwarding message:", error)
      callback({ success: false, error: error.message })
    }
  })

  // Enhanced contact info with business profile
  socket.on("get-contact-info", async (data) => {
    const phoneNumber = data.phoneNumber
    try {
      const contact = await client.getContactById(phoneNumber + "@c.us")
      const profilePicUrl = await client.getProfilePicUrl(phoneNumber + "@c.us").catch(() => null)

      const contactInfo = {
        name: contact.name || contact.pushname || phoneNumber,
        phoneNumber: phoneNumber,
        about: contact.about || null,
        isBusiness: contact.isBusiness || false,
        profilePicUrl: profilePicUrl,
      }

      // Enhanced business profile details
      if (contact.businessProfile) {
        const businessProfile = contact.businessProfile
        contactInfo.businessName = businessProfile.name
        contactInfo.business = {
          description: businessProfile.description || null,
          category: businessProfile.category || null,
          address: businessProfile.address || null,
          hours: businessProfile.businessHours || null,
          website: businessProfile.website || null,
          email: businessProfile.email || null,
          phone: businessProfile.phone || null,
          verified: businessProfile.verified || false,
        }
      }

      socket.emit("contact-info", contactInfo)
    } catch (error) {
      console.log(`❌ Error getting contact info for ${phoneNumber}: ${error.message}`)
      socket.emit("contact-info-error", { phoneNumber, error: error.message })
    }
  })

  // Other socket handlers remain the same...
  socket.on("get-conversation", async (data) => {
    const phoneNumber = data.phoneNumber

    // Check cache first
    const cached = conversationCache.get(phoneNumber)
    if (cached) {
      socket.emit("conversation-messages", {
        phoneNumber: phoneNumber,
        messages: cached.messages,
      })
      return
    }

    try {
      const chat = await client.getChatById(phoneNumber + "@c.us")
      if (chat) {
        const chatMessages = await chat.fetchMessages({ limit: 50 })
        // ... rest of the implementation
      }
    } catch (error) {
      console.error("❌ Error loading conversation messages:", error)
      const conversationMessages = messages.get(phoneNumber) || []
      socket.emit("conversation-messages", {
        phoneNumber: phoneNumber,
        messages: conversationMessages,
      })
    }
  })

  socket.on("mark-as-read", (data) => {
    const phoneNumber = data.phoneNumber
    if (conversations.has(phoneNumber)) {
      const conversation = conversations.get(phoneNumber)
      conversation.unreadCount = 0
      io.emit("conversation-updated", conversation)
    }
  })

  socket.on("disconnect", () => {
    console.log("👤 Client disconnected:", socket.id)
  })
})

// Enhanced API routes
app.get("/api/status", (req, res) => {
  res.json({
    status: "running",
    whatsappStatus: whatsappStatus,
    connections: io.engine.clientsCount,
    conversations: conversations.size,
    messages: Array.from(messages.values()).flat().length,
    cacheStats: {
      messageCache: messageCache.getStats(),
      conversationCache: conversationCache.getStats(),
      profilePicCache: profilePicCache.getStats(),
    },
  })
})

app.get("/api/staging/:id", (req, res) => {
  const stagingPath = path.join(__dirname, "staging", req.params.id)
  if (fs.existsSync(stagingPath)) {
    res.sendFile(stagingPath)
  } else {
    res.status(404).json({ error: "File not found" })
  }
})

// Cleanup staging files periodically
setInterval(() => {
  const stagingDir = path.join(__dirname, "staging")
  if (fs.existsSync(stagingDir)) {
    const files = fs.readdirSync(stagingDir)
    const now = Date.now()

    files.forEach((file) => {
      const filePath = path.join(stagingDir, file)
      const stats = fs.statSync(filePath)
      const age = now - stats.mtime.getTime()

      // Delete files older than 1 hour
      if (age > 3600000) {
        fs.unlinkSync(filePath)
        console.log(`🗑️ Cleaned up staging file: ${file}`)
      }
    })
  }
}, 1800000) // Run every 30 minutes

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log(`🚀 WhatsApp backend server running on port ${PORT}`)
  console.log(`📊 Performance optimizations enabled`)
  console.log(`💼 Business profile support enabled`)
  console.log(`📁 Staging directory: ${path.join(__dirname, "staging")}`)

  client.initialize()
})

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("🛑 Shutting down server...")
  client.destroy()
  server.close(() => {
    console.log("✅ Server closed")
    process.exit(0)
  })
})
