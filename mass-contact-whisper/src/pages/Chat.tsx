import type React from "react"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useWhatsApp } from "@/hooks/useWhatsApp"
import type { WhatsAppMessage } from "@/hooks/useWhatsApp"
import {
  Search,
  Send,
  MoreVertical,
  Phone,
  Video,
  Mic,
  MicOff,
  ForwardIcon,
  Users,
  Building2,
  CheckCheck,
  Check,
} from "lucide-react"
import { VoiceNotePlayer } from "@/components/VoiceNotePlayer"
import { MediaUploader } from "@/components/MediaUploader"
import { MessageForwarder } from "@/components/MessageForwarder"

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
    sendVoiceNote,
    voiceNoteStatus,
    sendVideo,
    setVoiceNoteStatus,
    getContactInfo,
    forwardMessage,
  } = useWhatsApp()

  const [selectedConversation, setSelectedConversation] = useState<any>(null)
  const [messageInput, setMessageInput] = useState("")
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showContactInfo, setShowContactInfo] = useState(false)
  const [contactInfo, setContactInfo] = useState<any>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [justOpenedChat, setJustOpenedChat] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showForwardModal, setShowForwardModal] = useState(false)
  const [forwardingMessage, setForwardingMessage] = useState<WhatsAppMessage | null>(null)
  const [showGroupChats, setShowGroupChats] = useState(true)

  // Add staging states
  const [stagingMedia, setStagingMedia] = useState<{
    file: File | null
    preview: string | null
    type: "image" | "video" | "audio" | "file" | null
    caption: string
  } | null>(null)
  const [showStagingModal, setShowStagingModal] = useState(false)

  // Refs for auto-scrolling and performance
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const virtualizedRef = useRef<HTMLDivElement>(null)

  // Memoized filtered conversations with business name support
  const filteredConversations = useMemo(() => {
    return whatsappConversations
      .filter((conversation) => {
        const matchesSearch =
          conversation.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (conversation.contactName && conversation.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (conversation.businessName && conversation.businessName.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesFilter = showGroupChats || !conversation.isGroup

        return matchesSearch && matchesFilter
      })
      .sort((a, b) => {
        // Sort by last message time, most recent first
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      })
  }, [whatsappConversations, searchTerm, showGroupChats])

  // Optimized message retrieval with caching
  const getConversationMessages = useCallback(
    (phoneNumber: string) => {
      const conversationMessages = messages.filter((m) => {
        const messageFrom = m.from.split("@")[0]
        const messageTo = m.to ? m.to.split("@")[0] : ""
        return messageFrom === phoneNumber || messageTo === phoneNumber
      })

      // Remove duplicates and sort
      const uniqueMessages = conversationMessages.reduce((acc, message) => {
        const isDuplicate = acc.some((m) => m.id === message.id)
        if (!isDuplicate) {
          acc.push(message)
        }
        return acc
      }, [] as WhatsAppMessage[])

      return uniqueMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    },
    [messages],
  )

  // Auto-scroll optimization
  useEffect(() => {
    if (messages.length && justOpenedChat) {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      }
      setJustOpenedChat(false)
    } else if (!justOpenedChat) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, selectedConversation, justOpenedChat])

  useEffect(() => {
    setJustOpenedChat(true)
  }, [selectedConversation])

  // Socket event listeners
  useEffect(() => {
    if (socket) {
      const handleTypingIndicator = (data: { chatId: string; isTyping: boolean }) => {
        if (selectedConversation && data.chatId === selectedConversation.phoneNumber) {
          setIsTyping(data.isTyping)
        }
      }

      const handleContactInfo = (data: any) => {
        setContactInfo(data)
      }

      socket.on("typing-indicator", handleTypingIndicator)
      socket.on("contact-info", handleContactInfo)

      return () => {
        socket.off("typing-indicator", handleTypingIndicator)
        socket.off("contact-info", handleContactInfo)
      }
    }
  }, [socket, selectedConversation])

  // Auto-connect
  useEffect(() => {
    if (status === "disconnected") {
      connect()
    }
  }, [status, connect])

  const handleSendMessage = useCallback(
    (to: string) => {
      if (messageInput.trim()) {
        sendMessage(to, messageInput)
        setMessageInput("")
      }
    },
    [messageInput, sendMessage],
  )

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedConversation) return

    try {
      // Determine media type
      let mediaType: "image" | "video" | "audio" | "file" = "file"
      if (file.type.startsWith("image/")) {
        mediaType = "image"
      } else if (file.type.startsWith("video/")) {
        mediaType = "video"
      } else if (file.type.startsWith("audio/")) {
        mediaType = "audio"
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file)

      // Set staging data
      setStagingMedia({
        file,
        preview: previewUrl,
        type: mediaType,
        caption: "",
      })
      setShowStagingModal(true)
    } catch (error) {
      console.error("Error preparing file:", error)
      alert(`Error preparing file: ${error.message}`)
    } finally {
      event.target.value = ""
    }
  }

  const handleSendStagedMedia = async () => {
    if (!stagingMedia?.file || !selectedConversation) return

    setIsUploading(true)
    try {
      const reader = new FileReader()
      await new Promise<void>((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            const dataUrl = e.target?.result as string
            const success = await new Promise<boolean>((resolve) => {
              if (socket?.connected) {
                socket.emit(
                  "send-media",
                  {
                    chatId: selectedConversation.phoneNumber,
                    dataUrl,
                    filename: stagingMedia.file!.name,
                    mimetype: stagingMedia.file!.type || "application/octet-stream",
                    caption: stagingMedia.caption || "",
                  },
                  (response: { success: boolean }) => {
                    resolve(response.success)
                  },
                )
              } else {
                resolve(false)
              }
            })

            if (success) {
              // Close staging modal
              setShowStagingModal(false)
              setStagingMedia(null)
              if (stagingMedia.preview) {
                URL.revokeObjectURL(stagingMedia.preview)
              }
            } else {
              throw new Error("Failed to send media")
            }
            resolve()
          } catch (error) {
            reject(error)
          }
        }
        reader.onerror = () => reject(new Error("File reading failed"))
        reader.readAsDataURL(stagingMedia.file!)
      })
    } catch (error) {
      console.error("Error uploading file:", error)
      alert(`Error uploading file: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleCloseStagingModal = () => {
    if (stagingMedia?.preview) {
      URL.revokeObjectURL(stagingMedia.preview)
    }
    setStagingMedia(null)
    setShowStagingModal(false)
  }

  const startRecording = useCallback(async () => {
    try {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop()
        mediaRecorder.stream.getTracks().forEach((track) => track.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
          channelCount: 1,
        },
      })

      const mimeType = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm", "audio/ogg"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      )

      if (!mimeType) {
        throw new Error("No supported audio format available")
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 64000,
      })

      const audioChunks: BlobPart[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }

      recorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunks, { type: mimeType })

          if (audioBlob.size === 0) {
            throw new Error("Empty audio recording")
          }

          const arrayBuffer = await audioBlob.arrayBuffer()
          await sendVoiceNote(selectedConversation.phoneNumber, new Uint8Array(arrayBuffer))
        } catch (error) {
          console.error("Error processing recording:", error)
          alert(`Failed to send voice note: ${error.message}`)
        } finally {
          stream.getTracks().forEach((track) => track.stop())
        }
      }

      recorder.start(1000)
      setMediaRecorder(recorder)
      setIsRecording(true)
      setVoiceNoteStatus("recording")
    } catch (error) {
      console.error("Recording error:", error)
      alert(`Microphone error: ${error.message}`)
      setVoiceNoteStatus("error")
      setTimeout(() => setVoiceNoteStatus("idle"), 2000)
    }
  }, [mediaRecorder, selectedConversation, sendVoiceNote, setVoiceNoteStatus])

  const stopRecording = useCallback(() => {
    if (mediaRecorder && isRecording) {
      try {
        mediaRecorder.stop()

        if (mediaRecorder.stream) {
          mediaRecorder.stream.getTracks().forEach((track) => track.stop())
        }

        setIsRecording(false)
        setMediaRecorder(null)
        setVoiceNoteStatus("sending")
      } catch (error) {
        console.error("Error stopping recording:", error)
        setVoiceNoteStatus("error")
        setTimeout(() => setVoiceNoteStatus("idle"), 2000)
      }
    }
  }, [mediaRecorder, isRecording, setVoiceNoteStatus])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-500"
      case "connecting":
        return "bg-yellow-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "Connected"
      case "connecting":
        return "Connecting..."
      case "error":
        return "Error"
      default:
        return "Disconnected"
    }
  }

  const renderReadReceipts = (message: WhatsAppMessage) => {
    if (!message.fromMe) return null

    return (
      <div className="flex items-center gap-1 ml-2">
        {message.ack >= 1 && <Check className="h-3 w-3" />}
        {message.ack >= 2 && <Check className="h-3 w-3 -ml-1" />}
        {message.ack >= 3 && <CheckCheck className="h-3 w-3 text-blue-500" />}
      </div>
    )
  }

  const getDisplayName = (conversation: any) => {
    if (conversation.businessName) {
      return conversation.businessName
    }
    if (conversation.contactName && conversation.contactName !== conversation.phoneNumber) {
      return conversation.contactName
    }
    return conversation.phoneNumber
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">WhatsApp Business</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${getStatusColor(status)} text-white text-xs`}>{getStatusText(status)}</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGroupChats(!showGroupChats)}
            className={showGroupChats ? "bg-green-50" : ""}
          >
            <Users className="h-4 w-4 mr-1" />
            Groups
          </Button>
          <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                QR
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>WhatsApp QR Code</DialogTitle>
              </DialogHeader>
              {qrCode ? (
                <div className="flex justify-center">
                  <img src={qrCode || "/placeholder.svg"} alt="WhatsApp QR Code" className="max-w-xs" />
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  {status === "connected" ? "WhatsApp is already connected!" : "Waiting for QR code..."}
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
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 border-0 focus:bg-white"
              />
            </div>
          </div>

          {/* Conversations List - Virtualized for performance */}
          <div className="flex-1 overflow-y-auto" ref={virtualizedRef}>
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-4">💬</div>
                <p className="font-medium">No conversations</p>
                <p className="text-sm mt-2">Start a chat to see conversations here</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const displayName = getDisplayName(conversation)

                return (
                  <div
                    key={conversation.id}
                    className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConversation?.id === conversation.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => {
                      setSelectedConversation(conversation)
                      getConversation(conversation.phoneNumber)
                      if (conversation.unreadCount > 0) {
                        markAsRead(conversation.phoneNumber)
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar with business indicator */}
                      <div className="relative">
                        {conversation.profilePicUrl ? (
                          <img
                            src={conversation.profilePicUrl || "/placeholder.svg"}
                            alt={displayName}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                              e.currentTarget.nextElementSibling?.classList.remove("hidden")
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold ${
                            conversation.profilePicUrl ? "hidden" : ""
                          }`}
                        >
                          {conversation.isGroup ? <Users className="h-6 w-6" /> : displayName.charAt(0).toUpperCase()}
                        </div>

                        {/* Business indicator */}
                        {conversation.isBusiness && (
                          <div className="absolute -bottom-1 -right-1 bg-green-600 rounded-full p-1">
                            <Building2 className="h-3 w-3 text-white" />
                          </div>
                        )}

                        {/* Group indicator */}
                        {conversation.isGroup && (
                          <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1">
                            <Users className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Conversation Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 truncate">{displayName}</h3>
                            {conversation.isBusiness && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                Business
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-400">
                            {new Date(conversation.lastMessageTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {conversation.lastMessageFromMe &&
                            renderReadReceipts({
                              fromMe: true,
                              ack: conversation.lastMessageAck || 0,
                            } as WhatsAppMessage)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
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
                      getContactInfo(selectedConversation.phoneNumber)
                      setShowContactInfo(true)
                    }
                  }}
                >
                  <div className="relative">
                    {selectedConversation.profilePicUrl ? (
                      <img
                        src={selectedConversation.profilePicUrl || "/placeholder.svg"}
                        alt={getDisplayName(selectedConversation)}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                          e.currentTarget.nextElementSibling?.classList.remove("hidden")
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold ${
                        selectedConversation.profilePicUrl ? "hidden" : ""
                      }`}
                    >
                      {selectedConversation.isGroup ? (
                        <Users className="h-5 w-5" />
                      ) : (
                        getDisplayName(selectedConversation).charAt(0).toUpperCase()
                      )}
                    </div>

                    {selectedConversation.isBusiness && (
                      <div className="absolute -bottom-1 -right-1 bg-green-600 rounded-full p-1">
                        <Building2 className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">{getDisplayName(selectedConversation)}</h2>
                    <p className="text-sm text-gray-500">
                      {isTyping
                        ? "typing..."
                        : selectedConversation.isGroup
                          ? `${selectedConversation.participantCount || 0} participants`
                          : "online"}
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

              {/* Messages Area - Optimized scrolling */}
              <div ref={chatContainerRef} className="flex-1 bg-gray-50 p-4 overflow-y-auto">
                <div className="space-y-3">
                  {(() => {
                    const conversationMessages = getConversationMessages(selectedConversation.phoneNumber)

                    return conversationMessages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <div className="text-2xl mb-2">💬</div>
                        <p>No messages yet</p>
                        <p className="text-sm">Start the conversation!</p>
                      </div>
                    ) : (
                      <>
                        {conversationMessages.map((message, index) => {
                          const isSentByMe = message.fromMe === true || message.type === "sent"

                          return (
                            <div
                              key={`${message.id}-${index}`}
                              className={`flex ${isSentByMe ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  isSentByMe ? "bg-green-500 text-white" : "bg-white text-gray-800 shadow-sm"
                                }`}
                              >
                                {/* Group message sender name */}
                                {selectedConversation.isGroup && !isSentByMe && (
                                  <p className="text-xs font-medium text-green-600 mb-1">
                                    {message.contact?.name || message.from.split("@")[0]}
                                  </p>
                                )}

                                {/* Message content */}
                                {message.body &&
                                  message.body !== "[Media Message]" &&
                                  message.body !== "[Image]" &&
                                  message.body !== "[Video]" &&
                                  message.body !== "[Audio]" &&
                                  message.body !== "[Voice Message]" &&
                                  !message.body.startsWith("[File:") && <p className="text-sm mb-2">{message.body}</p>}

                                {/* Media Display */}
                                {message.mediaData && (
                                  <div className="mt-2">
                                    {message.type === "image" && (
                                      <img
                                        src={message.mediaData || "/placeholder.svg"}
                                        alt={message.filename || "Image"}
                                        className="max-w-xs rounded-lg shadow-sm cursor-pointer"
                                        onClick={() => window.open(message.mediaData, "_blank")}
                                      />
                                    )}

                                    {message.type === "video" && (
                                      <div className="relative">
                                        <video
                                          src={message.mediaData}
                                          controls
                                          className="max-w-xs rounded-lg shadow-sm"
                                          preload="metadata"
                                        />
                                        {message.filename && (
                                          <div className="text-xs text-gray-500 mt-1">{message.filename}</div>
                                        )}
                                      </div>
                                    )}

                                    {(message.type === "voice" || message.type === "audio") && (
                                      <VoiceNotePlayer src={message.mediaData} className="w-full" />
                                    )}

                                    {message.type === "file" && (
                                      <a
                                        href={message.mediaData}
                                        download={message.filename || "file"}
                                        className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                      >
                                        <span className="text-2xl">📄</span>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-sm truncate">
                                            {message.filename || "File"}
                                          </div>
                                          <div className="text-xs text-gray-500">Click to download</div>
                                        </div>
                                      </a>
                                    )}
                                  </div>
                                )}

                                {/* Message footer with timestamp and read receipts */}
                                <div
                                  className={`flex items-center justify-between mt-1 ${
                                    isSentByMe ? "text-green-100" : "text-gray-500"
                                  }`}
                                >
                                  <p className="text-xs">
                                    {new Date(message.timestamp).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    {renderReadReceipts(message)}
                                    <button
                                      onClick={() => {
                                        setForwardingMessage(message)
                                        setShowForwardModal(true)
                                      }}
                                      className="text-xs opacity-60 hover:opacity-100 transition-opacity ml-2"
                                      title="Forward message"
                                    >
                                      <ForwardIcon className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <MediaUploader onUpload={handleFileUpload} isUploading={isUploading} />

                  <Input
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value)

                      if (selectedConversation && e.target.value.length > 0) {
                        if (socket?.connected) {
                          socket.emit("typing", { chatId: selectedConversation.phoneNumber })
                        }

                        if (typingTimeout) {
                          clearTimeout(typingTimeout)
                        }

                        const timeout = setTimeout(() => {
                          if (socket?.connected) {
                            socket.emit("stop-typing", { chatId: selectedConversation.phoneNumber })
                          }
                        }, 1000)

                        setTypingTimeout(timeout)
                      }
                    }}
                    placeholder="Type a message"
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage(selectedConversation.phoneNumber)
                      }
                    }}
                    onPaste={(e) => {
                      // Handle paste events for images
                      const items = e.clipboardData?.items
                      if (items) {
                        for (let i = 0; i < items.length; i++) {
                          const item = items[i]
                          if (item.type.indexOf("image") !== -1) {
                            const file = item.getAsFile()
                            if (file) {
                              const fakeEvent = {
                                target: { files: [file], value: "" },
                              } as any
                              handleFileUpload(fakeEvent)
                            }
                          }
                        }
                      }
                    }}
                  />

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
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to WhatsApp Business</h2>
                <p className="text-gray-600 mb-4">Select a conversation to start messaging</p>
                <p className="text-sm text-gray-500">
                  {whatsappConversations.length === 0
                    ? "No conversations yet. Send a message to start chatting!"
                    : `${whatsappConversations.length} conversation${whatsappConversations.length !== 1 ? "s" : ""} available`}
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
              <div className="flex justify-center">
                {contactInfo.profilePicUrl ? (
                  <img
                    src={contactInfo.profilePicUrl || "/placeholder.svg"}
                    alt={contactInfo.name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                    {contactInfo.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{contactInfo.businessName || contactInfo.name}</h3>
                  <p className="text-sm text-gray-500">{contactInfo.phoneNumber}</p>
                  {contactInfo.isBusiness && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        <Building2 className="h-3 w-3 mr-1" />
                        Business Account
                      </Badge>
                      {contactInfo.business?.category && (
                        <span className="text-xs text-gray-500">{contactInfo.business.category}</span>
                      )}
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

      {/* Message Forwarder */}
      <MessageForwarder
        isOpen={showForwardModal}
        onClose={() => {
          setShowForwardModal(false)
          setForwardingMessage(null)
        }}
        message={forwardingMessage}
        conversations={whatsappConversations}
        onForward={forwardMessage}
      />

      {/* Media Staging Modal */}
      <Dialog open={showStagingModal} onOpenChange={handleCloseStagingModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Media</DialogTitle>
          </DialogHeader>

          {stagingMedia && (
            <div className="space-y-4">
              {/* Media Preview */}
              <div className="flex justify-center bg-gray-50 rounded-lg p-4">
                {stagingMedia.type === "image" && (
                  <img
                    src={stagingMedia.preview || "/placeholder.svg"}
                    alt="Preview"
                    className="max-w-full max-h-64 rounded-lg object-contain"
                  />
                )}

                {stagingMedia.type === "video" && (
                  <video
                    src={stagingMedia.preview || ""}
                    controls
                    className="max-w-full max-h-64 rounded-lg"
                    preload="metadata"
                  />
                )}

                {stagingMedia.type === "audio" && (
                  <div className="flex items-center gap-3 p-4 bg-white rounded-lg border">
                    <div className="text-3xl">🎵</div>
                    <div>
                      <div className="font-medium">{stagingMedia.file?.name}</div>
                      <div className="text-sm text-gray-500">Audio file</div>
                    </div>
                  </div>
                )}

                {stagingMedia.type === "file" && (
                  <div className="flex items-center gap-3 p-4 bg-white rounded-lg border">
                    <div className="text-3xl">📄</div>
                    <div>
                      <div className="font-medium">{stagingMedia.file?.name}</div>
                      <div className="text-sm text-gray-500">
                        {stagingMedia.file?.size ? `${(stagingMedia.file.size / 1024 / 1024).toFixed(2)} MB` : "File"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Caption Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Caption (optional)</label>
                <Input
                  value={stagingMedia.caption}
                  onChange={(e) => setStagingMedia((prev) => (prev ? { ...prev, caption: e.target.value } : null))}
                  placeholder="Add a caption..."
                  className="w-full"
                />
              </div>

              {/* Send to info */}
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  Sending to: <span className="font-medium">{getDisplayName(selectedConversation)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseStagingModal} disabled={isUploading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSendStagedMedia}
                  disabled={isUploading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Chat
