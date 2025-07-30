export interface Contact {
  id: string;
  supplierName: string;
  vehicleMake: string;
  conditions: ('new' | 'used' | 'aftermarket')[];
  partCategory: string[];
  whatsappNumber: string;
}

export type ConditionType = 'new' | 'used' | 'aftermarket';

export const CONDITION_OPTIONS: ConditionType[] = ['new', 'used', 'aftermarket'];

// Chat Management Types
export interface ChatMessage {
  id: string;
  msgId: string; // WasenderAPI message ID
  contactId: string; // Our contact ID
  contactName: string;
  contactNumber: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  tags: string[];
  isResponse: boolean; // Whether this is a response to a bulk message
  bulkMessageId?: string; // ID of the original bulk message
  metadata?: {
    imageUrl?: string;
    caption?: string;
    fileName?: string;
    fileSize?: number;
  };
}

export interface BulkMessage {
  id: string;
  title: string; // User-assigned title for the campaign
  content: string; // The message content
  recipients: string[]; // Phone numbers this was sent to
  sentAt: string;
  status: 'sending' | 'completed' | 'failed';
  tags: string[];
  responseCount: number;
  totalRecipients: number;
}

export interface ChatConversation {
  id: string;
  contactId: string;
  contactName: string;
  contactNumber: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  tags: string[];
  messageCount: number;
  isActive?: boolean; // Whether this conversation has recent activity
  bulkMessageIds?: string[]; // IDs of bulk messages sent to this contact
}

export interface ChatFilter {
  tags: string[];
  direction: 'all' | 'inbound' | 'outbound';
  dateRange: {
    start: string;
    end: string;
  };
  search: string;
  showResponsesOnly: boolean;
  bulkMessageId?: string; // Filter by specific bulk message
}