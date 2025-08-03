"use client"

import type React from "react"
import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Users, Building2 } from "lucide-react"
import { VoiceNotePlayer } from "./VoiceNotePlayer"
import type { WhatsAppMessage } from "@/hooks/useWhatsApp"

interface MessageForwarderProps {
  isOpen: boolean
  onClose: () => void
  message: WhatsAppMessage | null
  conversations: any[]
  onForward: (messageId: string, to: string) => Promise<boolean>
}

export const MessageForwarder: React.FC<MessageForwarderProps> = ({
  isOpen,
  onClose,
  message,
  conversations,
  onForward,
}) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [isForwarding, setIsForwarding] = useState(false)

  const filteredConversations = useMemo(() => {
    return conversations.filter(
      (conv) =>
        conv.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (conv.contactName && conv.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (conv.businessName && conv.businessName.toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }, [conversations, searchTerm])

  const handleForward = async (to: string) => {
    if (!message) return

    setIsForwarding(true)
    try {
      const success = await onForward(message.id, to)
      if (success) {
        onClose()
      }
    } finally {
      setIsForwarding(false)
    }
  }

  const getDisplayName = (conv: any) => {
    if (conv.businessName) return conv.businessName
    if (conv.contactName && conv.contactName !== conv.phoneNumber) return conv.contactName
    return conv.phoneNumber
  }

  if (!message) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forward Message</DialogTitle>
          <DialogDescription>Select a contact to forward this message to:</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message Preview */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Message to forward:</p>
            {message.mediaData ? (
              <div className="mb-2">
                {message.type === "image" && (
                  <img
                    src={message.mediaData || "/placeholder.svg"}
                    alt="Forwarding media"
                    className="max-w-xs rounded-lg"
                  />
                )}
                {message.type === "video" && <video src={message.mediaData} controls className="max-w-xs rounded-lg" />}
                {["voice", "audio"].includes(message.type) && (
                  <VoiceNotePlayer src={message.mediaData} className="w-full" />
                )}
                {message.type === "file" && (
                  <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                    <span className="text-2xl">📄</span>
                    <div>
                      <div className="font-medium text-sm">{message.filename || "File"}</div>
                      <div className="text-xs text-gray-500">{message.type}</div>
                    </div>
                  </div>
                )}
                {message.body && message.body !== "[Media Message]" && <p className="text-sm mt-2">{message.body}</p>}
              </div>
            ) : (
              <p className="text-sm">{message.body}</p>
            )}
          </div>

          {/* Contact Selection */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-60 overflow-y-auto border rounded-md">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.phoneNumber}
                  className="p-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors"
                  onClick={() => handleForward(conv.phoneNumber)}
                >
                  <div className="relative">
                    {conv.profilePicUrl ? (
                      <img
                        src={conv.profilePicUrl || "/placeholder.svg"}
                        alt={getDisplayName(conv)}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                        {conv.isGroup ? <Users className="h-4 w-4" /> : getDisplayName(conv).charAt(0).toUpperCase()}
                      </div>
                    )}

                    {conv.isBusiness && (
                      <div className="absolute -bottom-1 -right-1 bg-green-600 rounded-full p-0.5">
                        <Building2 className="h-2 w-2 text-white" />
                      </div>
                    )}

                    {conv.isGroup && (
                      <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-0.5">
                        <Users className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{getDisplayName(conv)}</p>
                      {conv.isBusiness && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          Business
                        </Badge>
                      )}
                      {conv.isGroup && (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                          Group
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{conv.phoneNumber}</p>
                  </div>
                </div>
              ))}

              {filteredConversations.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  <p className="text-sm">No contacts found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isForwarding}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
