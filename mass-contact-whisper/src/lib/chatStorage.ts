import { ChatMessage, BulkMessage, ChatConversation, Contact } from '../types/contact';
import { CONFIG } from './config';
import { generateId } from './utils';

// Chat Storage Service
export class ChatStorageService {
  private static readonly MESSAGES_KEY = 'WASSENDER_MESSAGES';
  private static readonly BULK_MESSAGES_KEY = 'WASSENDER_BULK_MESSAGES';
  private static readonly CONVERSATIONS_KEY = 'WASSENDER_CONVERSATIONS';

  // Get all messages from localStorage
  static getAllMessages(): ChatMessage[] {
    try {
      const messagesJson = localStorage.getItem(this.MESSAGES_KEY);
      if (!messagesJson) return [];
      
      const messages = JSON.parse(messagesJson) as ChatMessage[];
      return Array.isArray(messages) ? messages : [];
    } catch (error) {
      console.error('Error loading messages:', error);
      return [];
    }
  }

  // Get all bulk messages from localStorage
  static getAllBulkMessages(): BulkMessage[] {
    try {
      const bulkMessagesJson = localStorage.getItem(this.BULK_MESSAGES_KEY);
      if (!bulkMessagesJson) return [];
      
      const bulkMessages = JSON.parse(bulkMessagesJson) as BulkMessage[];
      return Array.isArray(bulkMessages) ? bulkMessages : [];
    } catch (error) {
      console.error('Error loading bulk messages:', error);
      return [];
    }
  }

  // Get all conversations from localStorage
  static getAllConversations(): ChatConversation[] {
    try {
      const conversationsJson = localStorage.getItem(this.CONVERSATIONS_KEY);
      if (!conversationsJson) return [];
      
      const conversations = JSON.parse(conversationsJson) as ChatConversation[];
      return Array.isArray(conversations) ? conversations : [];
    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    }
  }

  // Save a new bulk message
  static saveBulkMessage(bulkMessage: Omit<BulkMessage, 'id'>): BulkMessage {
    const newBulkMessage: BulkMessage = {
      ...bulkMessage,
      id: generateId(),
    };

    const existingBulkMessages = this.getAllBulkMessages();
    const updatedBulkMessages = [...existingBulkMessages, newBulkMessage];
    
    localStorage.setItem(this.BULK_MESSAGES_KEY, JSON.stringify(updatedBulkMessages));
    
    return newBulkMessage;
  }

  // Save a new message
  static saveMessage(message: Omit<ChatMessage, 'id'>): ChatMessage {
    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
    };

    const existingMessages = this.getAllMessages();
    const updatedMessages = [...existingMessages, newMessage];
    
    localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(updatedMessages));
    
    return newMessage;
  }

  // Update a bulk message (e.g., when responses come in)
  static updateBulkMessage(bulkMessageId: string, updates: Partial<BulkMessage>): BulkMessage | null {
    const bulkMessages = this.getAllBulkMessages();
    const messageIndex = bulkMessages.findIndex(msg => msg.id === bulkMessageId);
    
    if (messageIndex === -1) return null;
    
    const updatedMessage = { ...bulkMessages[messageIndex], ...updates };
    bulkMessages[messageIndex] = updatedMessage;
    
    localStorage.setItem(this.BULK_MESSAGES_KEY, JSON.stringify(bulkMessages));
    
    return updatedMessage;
  }

  // Get bulk messages by title or content
  static searchBulkMessages(searchTerm: string): BulkMessage[] {
    const bulkMessages = this.getAllBulkMessages();
    const term = searchTerm.toLowerCase();
    
    return bulkMessages.filter(message => 
      message.title.toLowerCase().includes(term) ||
      message.content.toLowerCase().includes(term)
    );
  }

  // Get bulk messages by tag
  static getBulkMessagesByTag(tag: string): BulkMessage[] {
    const bulkMessages = this.getAllBulkMessages();
    return bulkMessages.filter(message => message.tags.includes(tag));
  }

  // Get bulk messages by status
  static getBulkMessagesByStatus(status: BulkMessage['status']): BulkMessage[] {
    const bulkMessages = this.getAllBulkMessages();
    return bulkMessages.filter(message => message.status === status);
  }

  // Get conversations by contact
  static getConversationsByContact(contactId: string): ChatConversation[] {
    const conversations = this.getAllConversations();
    return conversations.filter(conversation => conversation.contactId === contactId);
  }

  // Update or create conversation
  static updateConversation(contactId: string, contactName: string, contactNumber: string, lastMessage: string, isResponse: boolean = false, bulkMessageId?: string): ChatConversation {
    const conversations = this.getAllConversations();
    const existingIndex = conversations.findIndex(conv => conv.contactId === contactId);
    
    const conversationData: ChatConversation = {
      id: existingIndex >= 0 ? conversations[existingIndex].id : generateId(),
      contactId,
      contactName,
      contactNumber,
      lastMessage,
      lastMessageTime: new Date().toISOString(),
      messageCount: existingIndex >= 0 ? conversations[existingIndex].messageCount + 1 : 1,
      unreadCount: existingIndex >= 0 ? conversations[existingIndex].unreadCount : 0,
      tags: existingIndex >= 0 ? conversations[existingIndex].tags : [],
      isActive: true,
      bulkMessageIds: existingIndex >= 0 && bulkMessageId 
        ? [...(conversations[existingIndex].bulkMessageIds || []), bulkMessageId]
        : bulkMessageId ? [bulkMessageId] : []
    };

    if (existingIndex >= 0) {
      conversations[existingIndex] = conversationData;
    } else {
      conversations.push(conversationData);
    }
    
    localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(conversations));
    
    return conversationData;
  }

  // Clear all chat data
  static clearAllChatData(): void {
    localStorage.removeItem(this.MESSAGES_KEY);
    localStorage.removeItem(this.BULK_MESSAGES_KEY);
    localStorage.removeItem(this.CONVERSATIONS_KEY);
  }

  // Export chat data
  static exportChatData(): { messages: ChatMessage[], bulkMessages: BulkMessage[], conversations: ChatConversation[] } {
    return {
      messages: this.getAllMessages(),
      bulkMessages: this.getAllBulkMessages(),
      conversations: this.getAllConversations()
    };
  }

  // Import chat data
  static importChatData(data: { messages: ChatMessage[], bulkMessages: BulkMessage[], conversations: ChatConversation[] }): void {
    if (data.messages) {
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(data.messages));
    }
    if (data.bulkMessages) {
      localStorage.setItem(this.BULK_MESSAGES_KEY, JSON.stringify(data.bulkMessages));
    }
    if (data.conversations) {
      localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(data.conversations));
    }
  }
}
