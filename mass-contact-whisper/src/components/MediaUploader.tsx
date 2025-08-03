"use client"

import type React from "react"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Paperclip } from "lucide-react"

interface MediaUploaderProps {
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  isUploading: boolean
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({ onUpload, isUploading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const fakeEvent = {
        target: { files, value: "" },
      } as React.ChangeEvent<HTMLInputElement>
      onUpload(fakeEvent)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <>
      <input ref={fileInputRef} type="file" accept="*/*" onChange={onUpload} className="hidden" />

      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isUploading}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="cursor-pointer"
        title="Upload file or drag & drop"
      >
        {isUploading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </Button>
    </>
  )
}
