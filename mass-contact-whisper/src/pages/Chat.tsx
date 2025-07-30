import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import type { WhatsAppMessage } from '@/hooks/useWhatsApp';
import { Search, Send, MoreVertical, Phone, Video, ArrowLeft, Paperclip, Mic, MicOff } from 'lucide-react';
import { VoiceNotePlayer } from '@/components/VoiceNotePlayer';

const Chat: React.FC = () => {
  const { 
    socket,
    status, 
    conversations: whatsappConversations, 
    messages,
    qrCode, 
    connect, 
    sendMessage,
    markAsRead,
    getConversation,
    getProfilePic,
    getContactInfo,
    forwardMessage
  } = useWhatsApp();

  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [contactInfo, setContactInfo] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [justOpenedChat, setJustOpenedChat] = useState(false);
  const [seenMessageIds] = useState(new Set<string>());
  const [isUploading, setIsUploading] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<WhatsAppMessage | null>(null);
  
  // Refs for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or conversation changes
  useEffect(() => {
    if (messages.length && justOpenedChat) {
      // Jump instantly to bottom for initial load
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
      setJustOpenedChat(false);
    } else if (!justOpenedChat) {
      // Smooth scroll for new messages
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedConversation, justOpenedChat]);

  // Set justOpenedChat to true when conversation changes
  useEffect(() => {
    setJustOpenedChat(true);
  }, [selectedConversation]);

  // Listen for typing indicators
  useEffect(() => {
    if (socket) {
      const handleTypingIndicator = (data: { chatId: string, isTyping: boolean }) => {
        if (selectedConversation && data.chatId === selectedConversation.phoneNumber) {
          setIsTyping(data.isTyping);
        }
      };

      const handleContactInfo = (data: any) => {
        setContactInfo(data);
      };

      socket.on('typing-indicator', handleTypingIndicator);
      socket.on('contact-info', handleContactInfo);

      return () => {
        socket.off('typing-indicator', handleTypingIndicator);
        socket.off('contact-info', handleContactInfo);
      };
    }
  }, [socket, selectedConversation]);

  // Auto-connect to WhatsApp when component mounts
  useEffect(() => {
    if (status === 'disconnected') {
      connect();
    }
  }, [status, connect]);

  const handleSendMessage = (to: string) => {
    if (messageInput.trim()) {
      sendMessage(to, messageInput);
      setMessageInput('');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📎 File upload handler triggered');
    
    const file = event.target.files?.[0];
    console.log('📎 Selected file:', file);
    
    if (!file) {
      console.log('📎 No file selected');
      return;
    }
    
    if (!selectedConversation) {
      console.log('📎 No conversation selected');
      alert('Please select a conversation first');
      return;
    }
    
    setIsUploading(true);
    
    try {
      console.log('📎 Uploading file:', file.name, file.type, file.size);
      
      // Check file size (WhatsApp limit is ~16MB)
      const maxSize = 16 * 1024 * 1024; // 16MB
      if (file.size > maxSize) {
        alert(`File too large. Maximum size is 16MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB`);
        setIsUploading(false);
        return;
      }
      
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (socket?.connected) {
          socket.emit('send-media', {
            chatId: selectedConversation.phoneNumber,
            dataUrl: dataUrl,
            filename: file.name,
            mimetype: file.type || 'application/octet-stream',
            caption: messageInput || ''
          });
          setMessageInput('');
          console.log('📤 Media sent to backend');
        } else {
          alert('Not connected to WhatsApp. Please check your connection.');
        }
        setIsUploading(false);
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert('Error reading file. Please try again.');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
      setIsUploading(false);
    }
    
    // Reset the input so the same file can be selected again
    event.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/ogg; codecs=opus' });
      
      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && selectedConversation) {
          const buffer = await event.data.arrayBuffer();
          if (socket?.connected) {
            socket.emit('send-voice', {
              chatId: selectedConversation.phoneNumber,
              buffer: Array.from(new Uint8Array(buffer))
            });
          }
        }
      };
      
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };
      
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Error';
      default: return 'Disconnected';
    }
  };

  // Filter conversations based on search
  const filteredConversations = whatsappConversations.filter(conversation =>
    conversation.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get messages for selected conversation with duplicate removal
  const getConversationMessages = (phoneNumber: string) => {
    const conversationMessages = messages.filter(m => {
      const messageFrom = m.from.split('@')[0];
      const messageTo = m.to ? m.to.split('@')[0] : '';
      return messageFrom === phoneNumber || messageTo === phoneNumber;
    });
    
    // Remove duplicates based on content and timestamp
    const uniqueMessages = conversationMessages.reduce((acc, message) => {
      const isDuplicate = acc.some(m => 
        m.id === message.id || 
        (m.body === message.body && 
         m.from === message.from && 
         Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000)
      );
      
      if (!isDuplicate) {
        acc.push(message);
      }
      return acc;
    }, [] as WhatsAppMessage[]);
    
    return uniqueMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">WhatsApp Chat</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${getStatusColor(status)} text-white text-xs`}>
            {getStatusText(status)}
          </Badge>
          <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">QR</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>WhatsApp QR Code</DialogTitle>
              </DialogHeader>
              {qrCode ? (
                <div className="flex justify-center">
                  <img src={qrCode} alt="WhatsApp QR Code" className="max-w-xs" />
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  {status === 'connected' ? 'WhatsApp is already connected!' : 'Waiting for QR code...'}
                </p>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex bg-white overflow-hidden">
        {/* Left Sidebar - Conversations List */}
        <div className="w-80 border-r border-gray-200 flex flex-col flex-shrink-0">
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-200 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search or start new chat"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 border-0 focus:bg-white"
              />
            </div>
          </div>

          {/* Conversations List - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-4">💬</div>
                <p className="font-medium">No conversations</p>
                <p className="text-sm mt-2">Start a chat to see conversations here</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                return (
                  <div
                    key={conversation.id}
                    className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      setSelectedConversation(conversation);
                      // Load conversation messages
                      getConversation(conversation.phoneNumber);
                      // Mark as read when selected
                      if (conversation.unreadCount > 0) {
                        markAsRead(conversation.phoneNumber);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      {conversation.profilePicUrl ? (
                        <img 
                          src={conversation.profilePicUrl} 
                          alt={conversation.contactName || conversation.phoneNumber}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            // Fallback to default avatar if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold ${conversation.profilePicUrl ? 'hidden' : ''}`}>
                        {conversation.phoneNumber.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Conversation Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 truncate">
                            {conversation.contactName || conversation.phoneNumber}
                          </h3>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.lastMessage}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(conversation.lastMessageTime).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side - Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => {
                    if (selectedConversation) {
                      // Get enhanced contact info from backend
                      getContactInfo(selectedConversation.phoneNumber);
                      setShowContactInfo(true);
                    }
                  }}
                >
                  {selectedConversation.profilePicUrl ? (
                    <img 
                      src={selectedConversation.profilePicUrl} 
                      alt={selectedConversation.contactName || selectedConversation.phoneNumber}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        // Fallback to default avatar if image fails to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold ${selectedConversation.profilePicUrl ? 'hidden' : ''}`}>
                    {selectedConversation.phoneNumber.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {selectedConversation.contactName || selectedConversation.phoneNumber}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {isTyping ? 'typing...' : 'online'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages Area - Scrollable */}
              <div ref={chatContainerRef} className="flex-1 bg-gray-50 p-4 overflow-y-auto">
                <div className="space-y-3">
                  {(() => {
                    const conversationMessages = getConversationMessages(selectedConversation.phoneNumber);
                    
                    return conversationMessages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <div className="text-2xl mb-2">💬</div>
                        <p>No messages yet</p>
                        <p className="text-sm">Start the conversation!</p>
                      </div>
                    ) : (
                      <>
                        {conversationMessages.map((message, index) => {
                          // Determine if message is sent by current user
                          // In WhatsApp, messages from the current user have fromMe=true
                          // Messages from others have fromMe=false or undefined
                          const isSentByMe = message.fromMe === true || message.type === 'sent';
                          
                          // Debug logging (only for media messages)
                          if (message.mediaData) {
                            console.log(`Media message ${index}:`, {
                              type: message.type,
                              filename: message.filename,
                              hasMediaData: !!message.mediaData
                            });
                          }
                          
                          return (
                            <div
                              key={index}
                              className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  isSentByMe
                                    ? 'bg-green-500 text-white'
                                    : 'bg-white text-gray-800 shadow-sm'
                                }`}
                              >
                              {/* Show caption/body text if it exists and is not just a placeholder */}
                              {message.body && message.body !== '[Media Message]' && message.body !== '[Image]' && message.body !== '[Video]' && message.body !== '[Audio]' && message.body !== '[Voice Message]' && !message.body.startsWith('[File:') && (
                                <p className="text-sm mb-2">{message.body}</p>
                              )}
                            
                                                           {/* Media Display */}
                               {message.mediaData && (
                                 <div className="mt-2">
                                   {message.type === 'image' && (
                                     <img 
                                       src={message.mediaData} 
                                       alt={message.filename || 'Image'} 
                                       className="max-w-xs rounded-lg shadow-sm"
                                     />
                                   )}
                                   
                                   {message.type === 'video' && (
                                     <div className="relative">
                                       <video 
                                         src={message.mediaData} 
                                         controls 
                                         className="max-w-xs rounded-lg shadow-sm"
                                         preload="metadata"
                                         onError={(e) => console.error('Video load error:', e)}
                                         onLoadStart={() => console.log('Video loading started:', message.filename)}
                                         onLoadedData={() => console.log('Video loaded successfully:', message.filename)}
                                       />
                                       {message.filename && (
                                         <div className="text-xs text-gray-500 mt-1">
                                           {message.filename}
                                         </div>
                                       )}
                                     </div>
                                   )}
                                   
                                   {message.type === 'voice' && (
                                     <VoiceNotePlayer 
                                       src={message.mediaData} 
                                       className="w-full"
                                     />
                                   )}
                                   
                                   {message.type === 'audio' && (
                                     <VoiceNotePlayer 
                                       src={message.mediaData} 
                                       className="w-full"
                                     />
                                   )}
                                   
                                   {message.type === 'file' && (
                                     <a 
                                       href={message.mediaData} 
                                       download={message.filename || 'file'}
                                       className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                     >
                                       <span className="text-2xl">📄</span>
                                       <div className="flex-1 min-w-0">
                                         <div className="font-medium text-sm truncate">
                                           {message.filename || 'File'}
                                         </div>
                                         <div className="text-xs text-gray-500">
                                           Click to download
                                         </div>
                                       </div>
                                     </a>
                                   )}
                                 </div>
                               )}
                            <div className={`flex items-center justify-between mt-1 ${
                              isSentByMe ? 'text-green-100' : 'text-gray-500'
                            }`}>
                              <p className="text-xs">
                                {new Date(message.timestamp).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                              <div className="flex items-center gap-1">
                                {isSentByMe && message.ack !== undefined && (
                                  <>
                                    {message.ack >= 2 && <span className="text-xs">✓</span>}
                                    {message.ack >= 3 && <span className="text-xs">✓</span>}
                                    {message.ack >= 4 && <span className="text-xs text-blue-300">✓</span>}
                                  </>
                                )}
                                {/* Forward button for received messages */}
                                {!isSentByMe && (
                                  <button
                                    onClick={() => {
                                      console.log('Forwarding message:', message.id);
                                      setForwardingMessage(message);
                                      setShowForwardModal(true);
                                    }}
                                    className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                                    title="Forward message"
                                  >
                                    ↪️
                                  </button>
                                )}
                              </div>
                            </div>
                            </div>
                          </div>
                        );
                      })}
                        {/* Scroll target for auto-scroll */}
                        <div ref={messagesEndRef} />
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Message Input - Fixed at bottom */}
              <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  {/* File Upload Button */}
                                      <Button 
                      variant="ghost" 
                      size="sm" 
                      className="cursor-pointer"
                      disabled={isUploading}
                      onClick={() => {
                        console.log('📎 File upload button clicked');
                        // Create a temporary file input
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '*/*';
                        input.onchange = (e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.files && target.files[0]) {
                            handleFileUpload(e as any);
                          }
                        };
                        input.click();
                      }}
                    >
                    {isUploading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Input
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      
                      // Send typing indicator
                      if (selectedConversation && e.target.value.length > 0) {
                        if (socket?.connected) {
                          socket.emit('typing', { chatId: selectedConversation.phoneNumber });
                        }
                        
                        // Clear existing timeout
                        if (typingTimeout) {
                          clearTimeout(typingTimeout);
                        }
                        
                        // Set new timeout to stop typing indicator
                        const timeout = setTimeout(() => {
                          if (socket?.connected) {
                            socket.emit('stop-typing', { chatId: selectedConversation.phoneNumber });
                          }
                        }, 1000);
                        
                        setTypingTimeout(timeout);
                      }
                    }}
                    placeholder="Type a message"
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(selectedConversation.phoneNumber);
                      }
                    }}
                  />
                  
                  {/* Voice Recording Button */}
                  {!messageInput.trim() && (
                    <Button 
                      onClick={isRecording ? stopRecording : startRecording}
                      variant={isRecording ? "destructive" : "ghost"}
                      size="sm"
                    >
                      {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  )}
                  
                  <Button 
                    onClick={() => handleSendMessage(selectedConversation.phoneNumber)}
                    disabled={!messageInput.trim()}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Welcome Screen */
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to WhatsApp</h2>
                <p className="text-gray-600 mb-4">Select a conversation to start messaging</p>
                <p className="text-sm text-gray-500">
                  {whatsappConversations.length === 0 
                    ? "No conversations yet. Send a message to start chatting!" 
                    : `${whatsappConversations.length} conversation${whatsappConversations.length !== 1 ? 's' : ''} available`
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contact Info Modal */}
      <Dialog open={showContactInfo} onOpenChange={setShowContactInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Info</DialogTitle>
          </DialogHeader>
          {contactInfo && (
            <div className="space-y-4">
              {/* Profile Picture */}
              <div className="flex justify-center">
                {contactInfo.profilePicUrl ? (
                  <img 
                    src={contactInfo.profilePicUrl} 
                    alt={contactInfo.name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                    {contactInfo.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>

              {/* Contact Details */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{contactInfo.name}</h3>
                  <p className="text-sm text-gray-500">{contactInfo.phoneNumber}</p>
                  {contactInfo.isBusiness && contactInfo.business?.category && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        Business Account
                      </Badge>
                      <span className="text-xs text-gray-500">{contactInfo.business.category}</span>
                    </div>
                  )}
                </div>

                {contactInfo.about && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">About</h4>
                    <p className="text-sm text-gray-600">{contactInfo.about}</p>
                  </div>
                )}

                {contactInfo.isBusiness && contactInfo.business && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-700">Business Profile</h4>
                    
                    {contactInfo.business.description && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-600">Description</h5>
                        <p className="text-sm text-gray-600">{contactInfo.business.description}</p>
                      </div>
                    )}

                    {contactInfo.business.address && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-600">Address</h5>
                        <p className="text-sm text-gray-600">{contactInfo.business.address}</p>
                      </div>
                    )}

                    {contactInfo.business.hours && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-600">Business Hours</h5>
                        <p className="text-sm text-gray-600">{contactInfo.business.hours}</p>
                      </div>
                    )}

                    {contactInfo.business.website && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-600">Website</h5>
                        <a 
                          href={contactInfo.business.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {contactInfo.business.website}
                        </a>
                      </div>
                    )}

                    {contactInfo.business.email && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-600">Email</h5>
                        <a 
                          href={`mailto:${contactInfo.business.email}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {contactInfo.business.email}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Forward Message Modal */}
      {showForwardModal && forwardingMessage && (
        <Dialog open={showForwardModal} onOpenChange={setShowForwardModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Forward Message</DialogTitle>
              <DialogDescription>
                Select a contact to forward this message to:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Message Preview */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Message to forward:</p>
                <p className="text-sm">{forwardingMessage.body}</p>
                {forwardingMessage.mediaData && (
                  <p className="text-xs text-gray-500 mt-1">
                    📎 Media message ({forwardingMessage.type})
                  </p>
                )}
              </div>
              
              {/* Contact Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Contact:</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  onChange={(e) => {
                    if (e.target.value) {
                      forwardMessage(forwardingMessage.id, e.target.value);
                      setShowForwardModal(false);
                      setForwardingMessage(null);
                    }
                  }}
                >
                  <option value="">Choose a contact...</option>
                  {whatsappConversations.map((conv) => (
                    <option key={conv.phoneNumber} value={conv.phoneNumber}>
                      {conv.contactName} ({conv.phoneNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowForwardModal(false);
                  setForwardingMessage(null);
                }}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Chat;
