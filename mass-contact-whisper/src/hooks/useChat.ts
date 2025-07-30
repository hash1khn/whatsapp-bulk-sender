import { useState, useEffect, useCallback } from 'react';
import { ChatMessage, BulkMessage, ChatConversation, ChatFilter } from '../types/contact';
import { ChatStorageService } from '../lib/chatStorage';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bulkMessages, setBulkMessages] = useState<BulkMessage[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load chat data from localStorage on mount
  useEffect(() => {
    try {
      const storedMessages = ChatStorageService.getAllMessages();
      const storedBulkMessages = ChatStorageService.getAllBulkMessages();
      const storedConversations = ChatStorageService.getAllConversations();
      
      setMessages(storedMessages);
      setBulkMessages(storedBulkMessages);
      setConversations(storedConversations);
      setError(null);
    } catch (err) {
      setError('Failed to load chat data');
      console.error('Error loading chat data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save a new bulk message
  const saveBulkMessage = useCallback((bulkMessageData: Omit<BulkMessage, 'id'>) => {
    try {
      const newBulkMessage = ChatStorageService.saveBulkMessage(bulkMessageData);
      setBulkMessages(prev => [...prev, newBulkMessage]);
      return newBulkMessage;
    } catch (err) {
      setError('Failed to save bulk message');
      console.error('Error saving bulk message:', err);
      throw err;
    }
  }, []);

  // Save a new message
  const saveMessage = useCallback((messageData: Omit<ChatMessage, 'id'>) => {
    try {
      const newMessage = ChatStorageService.saveMessage(messageData);
      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    } catch (err) {
      setError('Failed to save message');
      console.error('Error saving message:', err);
      throw err;
    }
  }, []);

  // Update a bulk message
  const updateBulkMessage = useCallback((bulkMessageId: string, updates: Partial<BulkMessage>) => {
    try {
      const updatedMessage = ChatStorageService.updateBulkMessage(bulkMessageId, updates);
      if (updatedMessage) {
        setBulkMessages(prev => 
          prev.map(msg => msg.id === bulkMessageId ? updatedMessage : msg)
        );
      }
      return updatedMessage;
    } catch (err) {
      setError('Failed to update bulk message');
      console.error('Error updating bulk message:', err);
      throw err;
    }
  }, []);

  // Update or create conversation
  const updateConversation = useCallback((
    contactId: string, 
    contactName: string, 
    contactNumber: string, 
    lastMessage: string, 
    isResponse: boolean = false, 
    bulkMessageId?: string
  ) => {
    try {
      const updatedConversation = ChatStorageService.updateConversation(
        contactId, 
        contactName, 
        contactNumber, 
        lastMessage, 
        isResponse, 
        bulkMessageId
      );
      
      setConversations(prev => {
        const existingIndex = prev.findIndex(conv => conv.contactId === contactId);
        if (existingIndex >= 0) {
          return prev.map((conv, index) => 
            index === existingIndex ? updatedConversation : conv
          );
        } else {
          return [...prev, updatedConversation];
        }
      });
      
      return updatedConversation;
    } catch (err) {
      setError('Failed to update conversation');
      console.error('Error updating conversation:', err);
      throw err;
    }
  }, []);

  // Search bulk messages
  const searchBulkMessages = useCallback((searchTerm: string) => {
    return ChatStorageService.searchBulkMessages(searchTerm);
  }, []);

  // Get bulk messages by tag
  const getBulkMessagesByTag = useCallback((tag: string) => {
    return ChatStorageService.getBulkMessagesByTag(tag);
  }, []);

  // Get bulk messages by status
  const getBulkMessagesByStatus = useCallback((status: BulkMessage['status']) => {
    return ChatStorageService.getBulkMessagesByStatus(status);
  }, []);

  // Get conversations by contact
  const getConversationsByContact = useCallback((contactId: string) => {
    return ChatStorageService.getConversationsByContact(contactId);
  }, []);

  // Clear all chat data
  const clearAllChatData = useCallback(() => {
    try {
      ChatStorageService.clearAllChatData();
      setMessages([]);
      setBulkMessages([]);
      setConversations([]);
      setError(null);
    } catch (err) {
      setError('Failed to clear chat data');
      console.error('Error clearing chat data:', err);
    }
  }, []);

  // Export chat data
  const exportChatData = useCallback(() => {
    return ChatStorageService.exportChatData();
  }, []);

  // Import chat data
  const importChatData = useCallback((data: { messages: ChatMessage[], bulkMessages: BulkMessage[], conversations: ChatConversation[] }) => {
    try {
      ChatStorageService.importChatData(data);
      setMessages(data.messages || []);
      setBulkMessages(data.bulkMessages || []);
      setConversations(data.conversations || []);
      setError(null);
    } catch (err) {
      setError('Failed to import chat data');
      console.error('Error importing chat data:', err);
    }
  }, []);

  // Refresh chat data
  const refreshChatData = useCallback(() => {
    try {
      const storedMessages = ChatStorageService.getAllMessages();
      const storedBulkMessages = ChatStorageService.getAllBulkMessages();
      const storedConversations = ChatStorageService.getAllConversations();
      
      setMessages(storedMessages);
      setBulkMessages(storedBulkMessages);
      setConversations(storedConversations);
      setError(null);
    } catch (err) {
      setError('Failed to refresh chat data');
      console.error('Error refreshing chat data:', err);
    }
  }, []);

  return {
    // State
    messages,
    bulkMessages,
    conversations,
    loading,
    error,
    
    // Actions
    saveBulkMessage,
    saveMessage,
    updateBulkMessage,
    updateConversation,
    searchBulkMessages,
    getBulkMessagesByTag,
    getBulkMessagesByStatus,
    getConversationsByContact,
    clearAllChatData,
    exportChatData,
    importChatData,
    refreshChatData,
  };
}
