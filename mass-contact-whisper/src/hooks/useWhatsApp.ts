import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  type: 'sent' | 'received' | 'image' | 'video' | 'voice' | 'audio' | 'file';
  isGroup: boolean;
  fromMe?: boolean; // Whether the message was sent by the current user
  ack?: number; // Read receipt status: 0=error, 1=pending, 2=server, 3=received, 4=read
  mediaData?: string; // Base64 data URL for media/voice messages
  filename?: string; // Filename for media messages
  contact?: {
    name: string;
    number: string;
  };
}

interface WhatsAppConversation {
  id: string;
  phoneNumber: string;
  contactName: string;
  lastMessage: string;
  lastMessageTime: string;
  messageCount: number;
  unreadCount: number;
  messages: WhatsAppMessage[];
  profilePicUrl?: string;
}

interface UseWhatsAppReturn {
  socket: Socket | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  messages: WhatsAppMessage[];
  conversations: WhatsAppConversation[];
  qrCode: string | null;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (to: string, body: string) => void;
  getConversation: (phoneNumber: string) => void;
  markAsRead: (phoneNumber: string) => void;
  getProfilePic: (phoneNumber: string) => void;
  getContactInfo: (phoneNumber: string) => void;
  forwardMessage: (messageId: string, to: string) => void;
}

export const useWhatsApp = (): UseWhatsAppReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(() => {
    if (isConnecting || socket?.connected) {
      console.log('🔄 Already connecting or connected, skipping...');
      return;
    }

    console.log('🚀 Starting connection to WhatsApp backend...');
    setIsConnecting(true);
    setStatus('connecting');

    try {
      const newSocket = io('http://localhost:3000', {
        transports: ['polling', 'websocket'],
        timeout: 20000,
        forceNew: true,
        reconnection: false,
        autoConnect: true,
      });

      // Connection events
      newSocket.on('connect', () => {
        console.log('✅ Socket connected successfully');
        setSocket(newSocket);
        setStatus('connected');
        setIsConnecting(false);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setStatus('disconnected');
        setIsConnecting(false);
        setSocket(null);
      });

      newSocket.on('connect_error', (error) => {
        console.log('❌ Connection error:', error.message);
        setStatus('error');
        setIsConnecting(false);
        setSocket(null);
      });

      // WhatsApp events
      newSocket.on('qr', (qr: string) => {
        console.log('📱 QR Code received');
        setQrCode(qr);
      });

      newSocket.on('whatsapp-ready', () => {
        console.log('✅ WhatsApp is ready');
        setQrCode(null);
      });

      newSocket.on('whatsapp-authenticated', () => {
        console.log('✅ WhatsApp authenticated');
        setQrCode(null);
      });

      newSocket.on('whatsapp-auth-failure', () => {
        console.log('❌ WhatsApp authentication failed');
        setQrCode(null);
      });

      newSocket.on('whatsapp-disconnected', () => {
        console.log('❌ WhatsApp disconnected');
        setQrCode(null);
      });

      // Message events
      newSocket.on('initial-state', (data: { conversations: any[], messages: [string, any[]][] }) => {
        console.log('📥 Received initial state:', data);
        setConversations(data.conversations);
        
        // Convert messages map to array with duplicate prevention
        const allMessages: WhatsAppMessage[] = [];
        const seenIds = new Set<string>();
        
        data.messages.forEach(([phoneNumber, messages]) => {
          messages.forEach((message: WhatsAppMessage) => {
            if (!seenIds.has(message.id)) {
              seenIds.add(message.id);
              allMessages.push(message);
            } else {
              console.log('🔄 Skipping duplicate message in initial state:', message.id);
            }
          });
        });
        setMessages(allMessages);
      });

      newSocket.on('new-message', (data: { message: WhatsAppMessage, conversation: WhatsAppConversation }) => {
        console.log('📨 New message received:', data);
        setMessages(prev => {
          // Check for duplicates by ID and content
          const isDuplicate = prev.some(m => 
            m.id === data.message.id || 
            (m.body === data.message.body && 
             m.from === data.message.from && 
             Math.abs(new Date(m.timestamp).getTime() - new Date(data.message.timestamp).getTime()) < 1000)
          );
          if (isDuplicate) {
            console.log('🔄 Skipping duplicate message:', data.message.id, data.message.body);
            return prev;
          }
          return [...prev, data.message];
        });
        setConversations(prev => {
          const existing = prev.find(c => c.phoneNumber === data.conversation.phoneNumber);
          if (existing) {
            return prev.map(c => 
              c.phoneNumber === data.conversation.phoneNumber ? data.conversation : c
            );
          } else {
            return [...prev, data.conversation];
          }
        });
      });

      newSocket.on('message-sent', (data: { message: WhatsAppMessage, conversation: WhatsAppConversation }) => {
        console.log('📤 Message sent:', data);
        setMessages(prev => [...prev, data.message]);
        setConversations(prev => {
          const existing = prev.find(c => c.phoneNumber === data.conversation.phoneNumber);
          if (existing) {
            return prev.map(c => 
              c.phoneNumber === data.conversation.phoneNumber ? data.conversation : c
            );
          } else {
            return [...prev, data.conversation];
          }
        });
      });

      newSocket.on('conversation-updated', (conversation: WhatsAppConversation) => {
        console.log('🔄 Conversation updated:', conversation);
        setConversations(prev => 
          prev.map(c => 
            c.phoneNumber === conversation.phoneNumber ? conversation : c
          )
        );
      });

      newSocket.on('conversation-messages', (data: { phoneNumber: string, messages: WhatsAppMessage[] }) => {
        console.log('💬 Conversation messages:', data);
        console.log('💬 Media messages received:', data.messages.filter(m => m.mediaData).length);
        console.log('💬 Message types:', data.messages.map(m => ({ id: m.id, type: m.type, hasMedia: !!m.mediaData })));
        // Update messages for this conversation with duplicate prevention
        setMessages(prev => {
          const filtered = prev.filter(m => {
            const messageFrom = m.from.split('@')[0];
            const messageTo = m.to ? m.to.split('@')[0] : '';
            return messageFrom !== data.phoneNumber && messageTo !== data.phoneNumber;
          });
          
          // Add new messages with duplicate prevention
          const seenIds = new Set(filtered.map(m => m.id));
          const newMessages = data.messages.filter(message => {
            // Check for duplicates by ID and content
            const isDuplicate = filtered.some(m => 
              m.id === message.id || 
              (m.body === message.body && 
               m.from === message.from && 
               Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000)
            );
            
            if (isDuplicate || seenIds.has(message.id)) {
              console.log('🔄 Skipping duplicate message in conversation load:', message.id, message.body);
              return false;
            }
            seenIds.add(message.id);
            return true;
          });
          
          return [...filtered, ...newMessages];
        });
      });

      newSocket.on('send-success', (data: { messageId: string }) => {
        console.log('✅ Message sent successfully:', data.messageId);
      });

      newSocket.on('send-error', (data: { error: string, details?: string, fileType?: string, fileName?: string }) => {
        console.log('❌ Message send failed:', data.error);
        if (data.details) {
          console.log('Details:', data.details);
        }
        if (data.fileType && data.fileName) {
          console.log('File:', data.fileName, 'Type:', data.fileType);
        }
        // You can add toast notifications here if needed
      });

      newSocket.on('typing-indicator', (data: { chatId: string, isTyping: boolean }) => {
        console.log('⌨️ Typing indicator:', data);
        // This will be handled by the Chat component
      });

      newSocket.on('contact-info', (data: any) => {
        console.log('📋 Contact info received:', data);
        // This will be handled by the Chat component
      });

      newSocket.on('contact-info-error', (data: { phoneNumber: string, error: string }) => {
        console.log('❌ Contact info error:', data);
      });

      // Initialize connection
      newSocket.connect();

    } catch (error) {
      console.log('❌ Failed to create socket:', error);
      setStatus('error');
      setIsConnecting(false);
    }
  }, [isConnecting, socket]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting...');
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setStatus('disconnected');
    setIsConnecting(false);
  }, [socket]);

  const sendMessage = useCallback((to: string, body: string) => {
    if (socket?.connected) {
      console.log('📤 Sending message to:', to);
      socket.emit('send-message', { to, body });
    } else {
      console.log('❌ Cannot send message - not connected');
    }
  }, [socket]);

  const getConversation = useCallback((phoneNumber: string) => {
    if (socket?.connected) {
      console.log('📋 Getting conversation for:', phoneNumber);
      socket.emit('get-conversation', { phoneNumber });
    }
  }, [socket]);

  const markAsRead = useCallback((phoneNumber: string) => {
    if (socket?.connected) {
      console.log('✅ Marking as read:', phoneNumber);
      socket.emit('mark-as-read', { phoneNumber });
      
      // Update local state
      setConversations(prev => 
        prev.map(c => 
          c.phoneNumber === phoneNumber 
            ? { ...c, unreadCount: 0 }
            : c
        )
      );
    }
  }, [socket]);

  const getProfilePic = useCallback((phoneNumber: string) => {
    if (socket?.connected) {
      console.log('📸 Getting profile picture for:', phoneNumber);
      socket.emit('get-profile-pic', { phoneNumber });
    }
  }, [socket]);

  const getContactInfo = useCallback((phoneNumber: string) => {
    if (socket?.connected) {
      console.log('📋 Getting contact info for:', phoneNumber);
      socket.emit('get-contact-info', { phoneNumber });
    }
  }, [socket]);

  const forwardMessage = useCallback((messageId: string, to: string) => {
    if (socket?.connected) {
      console.log('📤 Forwarding message:', messageId, 'to:', to);
      socket.emit('manual-forward', { messageId, to });
    }
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return {
    socket,
    status,
    messages,
    conversations,
    qrCode,
    connect,
    disconnect,
    sendMessage,
    getConversation,
    markAsRead,
    getProfilePic,
    getContactInfo,
    forwardMessage,
  };
}; 