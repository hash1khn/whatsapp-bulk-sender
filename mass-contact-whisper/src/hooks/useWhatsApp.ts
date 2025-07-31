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
  fromMe?: boolean;
  ack?: number;
  mediaData?: string;
  filename?: string;
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
  forwardMessage: (messageId: string, to: string) => Promise<boolean>;
  forwardingStatus: 'idle' | 'pending' | 'success' | 'error';
  sendVoiceNote: (to: string, buffer: Uint8Array) => Promise<boolean>;
  sendVideo: (to: string, file: File) => Promise<boolean>;
  voiceNoteStatus: 'idle' | 'recording' | 'sending' | 'success' | 'error';
  setVoiceNoteStatus: (status: 'idle' | 'recording' | 'sending' | 'success' | 'error') => void;
}

export const useWhatsApp = (): UseWhatsAppReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [forwardingStatus, setForwardingStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [voiceNoteStatus, setVoiceNoteStatus] = useState<'idle' | 'recording' | 'sending' | 'success' | 'error'>('idle');

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
        
        const allMessages: WhatsAppMessage[] = [];
        const seenIds = new Set<string>();
        
        data.messages.forEach(([phoneNumber, messages]) => {
          messages.forEach((message: WhatsAppMessage) => {
            if (!seenIds.has(message.id)) {
              seenIds.add(message.id);
              allMessages.push(message);
            }
          });
        });
        setMessages(allMessages);
      });

      newSocket.on('new-message', (data: { message: WhatsAppMessage, conversation: WhatsAppConversation }) => {
        setMessages(prev => {
          const isDuplicate = prev.some(m => 
            m.id === data.message.id || 
            (m.body === data.message.body && 
             m.from === data.message.from && 
             Math.abs(new Date(m.timestamp).getTime() - new Date(data.message.timestamp).getTime()) < 1000)
          );
          return isDuplicate ? prev : [...prev, data.message];
        });
        
        setConversations(prev => {
          const existing = prev.find(c => c.phoneNumber === data.conversation.phoneNumber);
          if (existing) {
            return prev.map(c => 
              c.phoneNumber === data.conversation.phoneNumber ? data.conversation : c
            );
          }
          return [...prev, data.conversation];
        });
      });

      newSocket.on('message-sent', (data: { message: WhatsAppMessage, conversation: WhatsAppConversation }) => {
        setMessages(prev => [...prev, data.message]);
        setConversations(prev => {
          const existing = prev.find(c => c.phoneNumber === data.conversation.phoneNumber);
          if (existing) {
            return prev.map(c => 
              c.phoneNumber === data.conversation.phoneNumber ? data.conversation : c
            );
          }
          return [...prev, data.conversation];
        });
      });

      newSocket.on('conversation-updated', (conversation: WhatsAppConversation) => {
        setConversations(prev => 
          prev.map(c => 
            c.phoneNumber === conversation.phoneNumber ? conversation : c
          )
        );
      });

      newSocket.on('conversation-messages', (data: { phoneNumber: string, messages: WhatsAppMessage[] }) => {
        setMessages(prev => {
          const filtered = prev.filter(m => {
            const messageFrom = m.from.split('@')[0];
            const messageTo = m.to ? m.to.split('@')[0] : '';
            return messageFrom !== data.phoneNumber && messageTo !== data.phoneNumber;
          });
          
          const seenIds = new Set(filtered.map(m => m.id));
          const newMessages = data.messages.filter(message => {
            const isDuplicate = filtered.some(m => 
              m.id === message.id || 
              (m.body === message.body && 
               m.from === message.from && 
               Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000)
            );
            return !isDuplicate && !seenIds.has(message.id);
          });
          
          return [...filtered, ...newMessages];
        });
      });

      newSocket.on('send-success', () => {
        if (voiceNoteStatus === 'sending') {
          setVoiceNoteStatus('success');
          setTimeout(() => setVoiceNoteStatus('idle'), 2000);
        }
      });

      newSocket.on('send-error', () => {
        if (voiceNoteStatus === 'sending') {
          setVoiceNoteStatus('error');
          setTimeout(() => setVoiceNoteStatus('idle'), 2000);
        }
      });

      newSocket.on('forward-success', () => {
        setForwardingStatus('success');
        setTimeout(() => setForwardingStatus('idle'), 2000);
      });

      newSocket.on('forward-error', () => {
        setForwardingStatus('error');
        setTimeout(() => setForwardingStatus('idle'), 2000);
      });

      newSocket.on('typing-indicator', (data: { chatId: string, isTyping: boolean }) => {
        // Handled by Chat component
      });

      newSocket.on('contact-info', (data: any) => {
        // Handled by Chat component
      });

      newSocket.on('contact-info-error', (data: { phoneNumber: string, error: string }) => {
        // Handled by Chat component
      });

      newSocket.connect();

    } catch (error) {
      console.log('❌ Failed to create socket:', error);
      setStatus('error');
      setIsConnecting(false);
    }
  }, [isConnecting, socket, voiceNoteStatus]);

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

  const forwardMessage = useCallback(async (messageId: string, to: string): Promise<boolean> => {
    if (!socket?.connected) return false;

    setForwardingStatus('pending');
    return new Promise((resolve) => {
      socket.emit('manual-forward', { messageId, to }, (response: { success: boolean }) => {
        setForwardingStatus(response.success ? 'success' : 'error');
        setTimeout(() => setForwardingStatus('idle'), 2000);
        resolve(response.success);
      });
    });
  }, [socket]);

  // Update the sendVoiceNote function in useWhatsApp.ts
const sendVoiceNote = useCallback(async (to: string, buffer: Uint8Array): Promise<boolean> => {
  if (!socket?.connected) return false;

  setVoiceNoteStatus('sending');
  
  try {
    // Convert buffer to base64 more reliably
    const base64Data = btoa(String.fromCharCode.apply(null, Array.from(buffer)));
    
    return new Promise((resolve) => {
      socket.emit('send-voice', { 
        chatId: to, 
        buffer: base64Data,
        caption: ''
      }, (response: { success: boolean, error?: string }) => {
        if (response.success) {
          setVoiceNoteStatus('success');
          setTimeout(() => setVoiceNoteStatus('idle'), 2000);
          resolve(true);
        } else {
          console.error('Voice note failed:', response.error);
          setVoiceNoteStatus('error');
          setTimeout(() => setVoiceNoteStatus('idle'), 2000);
          resolve(false);
        }
      });
    });
  } catch (error) {
    console.error('Voice note preparation failed:', error);
    setVoiceNoteStatus('error');
    setTimeout(() => setVoiceNoteStatus('idle'), 2000);
    return false;
  }
}, [socket]);

  const sendVideo = useCallback(async (to: string, file: File): Promise<boolean> => {
    if (!socket?.connected) return false;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        socket.emit('send-media', {
          chatId: to,
          dataUrl,
          filename: file.name,
          mimetype: file.type || 'video/mp4',
          caption: ''
        }, (response: { success: boolean }) => {
          resolve(response.success);
        });
      };
      reader.onerror = () => resolve(false);
      reader.readAsDataURL(file);
    });
  }, [socket]);

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
    forwardingStatus,
    sendVoiceNote,
    sendVideo,
    voiceNoteStatus,
    setVoiceNoteStatus,
  };
};