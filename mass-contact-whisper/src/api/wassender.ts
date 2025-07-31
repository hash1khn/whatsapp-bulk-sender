import axios from 'axios';
import { CONFIG, getApiKey } from '../lib/config';

interface TextMessage {
  to: string;
  text: string;
}

interface ImageMessage {
  to: string;
  image: {
    url: string;
    caption?: string;
  };
}

type MessagePayload = TextMessage | ImageMessage;

export async function sendMessage(payload: MessagePayload): Promise<any> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API key not found. Please set your Wassender API key.');
  }

  try {
    const response = await axios.post(`${CONFIG.WASSENDER_API_BASE}/send-message`, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export function createTextMessage(to: string, text: string): TextMessage {
  return {
    to,
    text,
  };
}

export function createImageMessage(to: string, imageUrl: string, caption?: string): ImageMessage {
  return {
    to,
    image: {
      url: imageUrl,
      caption,
    },
  };
}

// Manual response entry function (for testing purposes)
export function addManualResponse(
  contactId: string,
  contactName: string,
  contactNumber: string,
  responseText: string,
  bulkMessageId?: string
) {
  const { ChatStorageService } = require('../lib/chatStorage');
  
  // Save the incoming message
  const message = ChatStorageService.saveMessage({
    msgId: `manual-${Date.now()}`,
    contactId,
    contactName,
    contactNumber,
    direction: 'inbound',
    type: 'text',
    content: responseText,
    timestamp: new Date().toISOString(),
    status: 'received',
    tags: [],
    isResponse: true,
    bulkMessageId,
  });
  
  // Update conversation
  ChatStorageService.updateConversation(
    contactId,
    contactName,
    contactNumber,
    responseText,
    true,
    bulkMessageId
  );
  
  // Update bulk message response count if bulkMessageId is provided
  if (bulkMessageId) {
    const bulkMessage = ChatStorageService.getAllBulkMessages().find(bm => bm.id === bulkMessageId);
    if (bulkMessage) {
      ChatStorageService.updateBulkMessage(bulkMessageId, {
        responseCount: bulkMessage.responseCount + 1,
      });
    }
  }
  
  return message;
}

// Check Wasender API status
export async function checkApiStatus(): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key not found. Please set your Wassender API key.');
  }
  try {
    const response = await axios.get(`${CONFIG.WASSENDER_API_BASE}/status`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error checking API status:', error);
    throw error;
  }
}