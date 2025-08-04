import { useState, useRef } from 'react';
import { Contact } from '@/types/contact';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Send, Upload, X, MessageSquare, Plus, Trash2, ArrowRight } from 'lucide-react';
import { generateId } from '@/lib/utils';
import { ChatStorageService } from '@/lib/chatStorage';
import { uploadImages } from '@/lib/cloudinary';
import { sendMessage, createTextMessage } from '@/api/wassender';

interface Part {
  id: string;
  qty: string;
  name: string;
  number?: string;
}

interface MessageData {
  messageTitle: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  additionalDetails: string;
  parts: Part[];
  imageFiles: File[];
  imagePreviews: string[];
  uploadedImageUrls: string[];
}

interface MessageComposerProps {
  filteredContacts: Contact[];
  onSendComplete: (bulkMessageId: string) => void;
  onSendStart: () => void;
  messageData: MessageData;
  onMessageDataChange: (newData: Partial<MessageData>) => void;
  onNextStage?: () => void;
}

export function MessageComposer({ 
  filteredContacts, 
  onSendComplete, 
  onSendStart,
  messageData,
  onMessageDataChange,
  onNextStage
}: MessageComposerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    console.log('File upload triggered, files:', files);
    
    if (files) {
      console.log('Number of files selected:', files.length);
      const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      console.log('Valid image files:', validFiles.length);

      if (validFiles.length === 0) {
        toast({
          title: "No valid images",
          description: "Please select valid image files (JPG, PNG, WEBP, HEIC)",
          variant: "destructive",
        });
        return;
      }

      // Update files immediately
      onMessageDataChange({
        imageFiles: [...messageData.imageFiles, ...validFiles],
        uploadedImageUrls: [] // Clear any previously uploaded URLs
      });

      console.log('Processing previews for', validFiles.length, 'files');

      // Process all previews and update state once all are complete
      const previewPromises = validFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result;
            if (result && typeof result === 'string') {
              resolve(result);
            } else {
              resolve('');
            }
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(previewPromises).then(previews => {
        const validPreviews = previews.filter(preview => preview !== '');
        console.log('Generated previews:', validPreviews.length);
        onMessageDataChange({
          imagePreviews: [...messageData.imagePreviews, ...validPreviews]
        });
        
        // Reset the file input to allow for additional selections
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      });
    }
  };

  const addPart = () => {
    onMessageDataChange({
      parts: [...messageData.parts, { id: generateId(), qty: '', name: '', number: '' }]
    });
  };

  const removePart = (id: string) => {
    onMessageDataChange({
      parts: messageData.parts.filter(part => part.id !== id)
    });
  };

  const updatePart = (id: string, field: keyof Part, value: string) => {
    onMessageDataChange({
      parts: messageData.parts.map(part => 
        part.id === id ? { ...part, [field]: value } : part
      )
    });
  };

  const removeImage = (index: number) => {
    onMessageDataChange({
      imageFiles: messageData.imageFiles.filter((_, i) => i !== index),
      imagePreviews: messageData.imagePreviews.filter((_, i) => i !== index),
      uploadedImageUrls: []
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadSelectedImages = async () => {
  if (messageData.imageFiles.length === 0) {
    toast({
      title: "No images selected",
      description: "Please select images to upload first",
      variant: "destructive",
    });
    return;
  }

  setIsUploading(true);
  try {
    // 1. Upload to Cloudinary
    const { urls } = await uploadImages(messageData.imageFiles);

    // 2. Create gallery data package
    const galleryData = {
      images: urls,
      message: messageData.messageTitle,
      timestamp: Date.now()
    };

    // 3. Generate URL-safe encoded link
    const galleryLink = createGalleryLink(galleryData);
    
    // 4. Store in localStorage as backup
    localStorage.setItem(`gallery_${galleryData.timestamp}`, JSON.stringify(galleryData));

    // 5. Update state with the single link
    onMessageDataChange({ 
      uploadedImageUrls: [galleryLink],
      // Clear the files after successful upload
    });

    toast({
      title: "Gallery ready!",
      description: "All images are accessible via one link",
    });

  } catch (error) {
    console.error("Upload failed:", error);
    toast({
      title: "Upload failed",
      description: error instanceof Error ? error.message : "Could not create gallery",
      variant: "destructive",
    });
  } finally {
    setIsUploading(false);
  }
};

// Helper function to create the gallery link
const createGalleryLink = (data: {
  images: string[];
  message: string;
  timestamp: number;
}) => {
  try {
    // 1. Convert to JSON and compress if needed
    const jsonData = JSON.stringify(data);
    
    // 2. Encode to base64
    const base64Data = btoa(unescape(encodeURIComponent(jsonData)));
    
    // 3. Make URL-safe
    const urlSafeData = base64Data
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    return `${window.location.origin}/gallery/${urlSafeData}`;
  } catch (error) {
    console.error("Error creating gallery link:", error);
    throw new Error("Failed to generate gallery link");
  }
};

  // Add smart placeholder logic for template
  function applySmartPlaceholderLogic(raw, data) {
    let lines = raw.split('\n');
    // VIN: replace with Not provided if missing
    lines = lines.map(line =>
      line.replace(/\[VIN\]/g, () => {
        const val = data.vin;
        return val && val.trim() ? val : 'Not provided';
      })
    );
    // PART NUMBER: remove placeholder and preceding ' - ' if missing
    lines = lines.map(line =>
      line.replace(/( - )?\[PART NUMBER\]/g, (match, sep) => {
        const val = data.partNumber;
        return val && val.trim() ? (sep || '') + val : '';
      })
    );
    // DETAILS: remove line if missing
    lines = lines.filter(line => {
      if (line.includes('[DETAILS]')) {
        const val = data.additionalDetails;
        return val && val.trim();
      }
      return true;
    });
    lines = lines.map(line =>
      line.replace(/\[DETAILS\]/g, () => data.additionalDetails || '')
    );
    // GALLERY: remove 'Photos Here:' and [GALLERY] line if missing
    if (!data.gallery || !data.gallery.trim()) {
      lines = lines.filter((line, idx, arr) => {
        if (line.includes('[GALLERY]')) return false;
        if (line.trim().toLowerCase().startsWith('photos here:')) {
          if (arr[idx + 1] && arr[idx + 1].includes('[GALLERY]')) return false;
        }
        return true;
      });
    } else {
      lines = lines.map(line =>
        line.replace(/\[GALLERY\]/g, data.gallery)
      );
    }
    // [SPACE]: always output a blank line
    lines = lines.flatMap(line =>
      line.includes('[SPACE]') ? [''] : [line]
    );
    // Remove any lines that are now empty or just whitespace, except for [SPACE] lines
    lines = lines.filter((line, idx, arr) => {
      if (line === '' && (idx === 0 || arr[idx - 1] === '')) return false;
      return true;
    });
    return lines.join('\n');
  }

  const getFinalMessage = () => {
    // Try to load template from localStorage
    const template = localStorage.getItem('massContactTemplate') || `> Part Request - [MAKE] [MODEL] [YEAR]\n_VIN: [VIN]_\n\n* Qty: [QTY] - [PART NAME] - [PART NUMBER]\n* Qty: [QTY] - [PART NAME] - [PART NUMBER]\n\n[DETAILS]\n\nPhotos Here:\n[GALLERY]`;
    // Build data object for placeholders
    const data = {
      MAKE: messageData.make,
      MODEL: messageData.model,
      YEAR: messageData.year,
      VIN: messageData.vin,
      QTY: messageData.parts[0]?.qty || '',
      'PART NAME': messageData.parts[0]?.name || '',
      'PART NUMBER': messageData.parts[0]?.number || '',
      DETAILS: messageData.additionalDetails,
      GALLERY: messageData.uploadedImageUrls.join('\n'), // Use all image URLs
      gallery: messageData.uploadedImageUrls?.[0] || '',
      partNumber: messageData.parts[0]?.number || '',
      additionalDetails: messageData.additionalDetails,
    };
    // If there are multiple parts, build lines for each
    let msg = template;
    if (template.includes('[QTY]') && messageData.parts.length > 1) {
      // Replace the first [QTY] - [PART NAME] - [PART NUMBER] line with all parts
      msg = msg.replace(/\*?\s*\[QTY\].*\[PART NAME\].*\[PART NUMBER\].*/g, () =>
        messageData.parts.map(part =>
          `* Qty: ${part.qty} - ${part.name}${part.number ? ' - ' + part.number : ''}`
        ).join('\n')
      );
    }
    return applySmartPlaceholderLogic(msg, data);
  };



  const sendToAll = async () => {
    if (!isFormValid()) {
      toast({
        title: "Form incomplete",
        description: "Please fill in all required fields and add parts.",
        variant: "destructive",
      });
      return;
    }

    if (messageData.imageFiles.length > 0 && messageData.uploadedImageUrls.length === 0) {
      toast({
        title: "Images not uploaded",
        description: "Please upload your selected images before sending",
        variant: "destructive",
      });
      return;
    }

    if (!messageData.messageTitle.trim()) {
      toast({
        title: "No title",
        description: "Please enter a title for this message campaign",
        variant: "destructive",
      });
      return;
    }

    if (filteredContacts.length === 0) {
      toast({
        title: "No contacts",
        description: "No contacts match your current filters",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    setSendProgress(0);
    onSendStart();

    try {
      const finalMessage = getFinalMessage();

      for (let i = 0; i < filteredContacts.length; i++) {
        const contact = filteredContacts[i];
        
        try {
          const payload = createTextMessage(contact.whatsappNumber, finalMessage);
          await sendMessage(payload);
          
          // Update progress
          const progress = ((i + 1) / filteredContacts.length) * 100;
          setSendProgress(progress);

          toast({
            title: "Message sent",
            description: `Sent to ${contact.supplierName} (${contact.whatsappNumber})`,
          });

          // Wait 5 seconds before sending next message (API rate limiting)
          if (i < filteredContacts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        } catch (error) {
          console.error(`Failed to send to ${contact.whatsappNumber}:`, error);
          toast({
            title: "Send failed",
            description: `Failed to send to ${contact.supplierName}`,
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Bulk send complete",
        description: `Attempted to send ${filteredContacts.length} messages`,
      });

    } catch (error) {
      console.error('Bulk send error:', error);
      toast({
        title: "Send error",
        description: "An error occurred during bulk sending",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
      setSendProgress(0);
      
      // Save the bulk message to chat storage
      const bulkMessageId = generateId();
      
      try {
        const savedBulkMessage = ChatStorageService.saveBulkMessage({
          title: messageData.messageTitle,
          content: getFinalMessage(),
          recipients: filteredContacts.map(contact => contact.whatsappNumber),
          sentAt: new Date().toISOString(),
          status: 'completed',
          tags: [],
          responseCount: 0,
          totalRecipients: filteredContacts.length
        });
        
        // Create conversations for each contact
        filteredContacts.forEach(contact => {
          ChatStorageService.updateConversation(
            contact.id,
            contact.supplierName,
            contact.whatsappNumber,
            getFinalMessage(),
            false,
            savedBulkMessage.id
          );
        });
        
        onSendComplete(savedBulkMessage.id);
      } catch (error) {
        console.error('Failed to save bulk message:', error);
        toast({
          title: "Warning",
          description: "Message sent but failed to save to chat history",
          variant: "destructive",
        });
        onSendComplete(bulkMessageId);
      }
    }
  };

  const isFormValid = () => {
    return (
      messageData.make.trim() !== '' &&
      messageData.model.trim() !== '' &&
      messageData.parts.length > 0 &&
      messageData.parts.every(part => part.name.trim() !== '' && part.qty.trim() !== '')
    );
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-left">
          <MessageSquare className="h-5 w-5" />
          Add Vehicle Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Campaign Title */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Campaign Title</h3>
          <Input
            id="messageTitle"
            placeholder="Enter a descriptive title for this request..."
            value={messageData.messageTitle}
            onChange={(e) => onMessageDataChange({ messageTitle: e.target.value })}
            disabled={isSending}
            required
          />
        </div>

        {/* Vehicle Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Vehicle Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make" className="text-sm font-medium">Make *</Label>
              <Input
                id="make"
                placeholder="Select or type car make"
                value={messageData.make}
                onChange={(e) => onMessageDataChange({ make: e.target.value })}
                disabled={isSending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model" className="text-sm font-medium">Model *</Label>
              <Input
                id="model"
                placeholder="e.g., Camry, X5, Mustang"
                value={messageData.model}
                onChange={(e) => onMessageDataChange({ model: e.target.value })}
                disabled={isSending}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year" className="text-sm font-medium">Year</Label>
              <Input
                id="year"
                placeholder="2025"
                value={messageData.year}
                onChange={(e) => onMessageDataChange({ year: e.target.value })}
                disabled={isSending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vin" className="text-sm font-medium">VIN (Optional)</Label>
              <Input
                id="vin"
                placeholder="17-character VIN"
                value={messageData.vin}
                onChange={(e) => onMessageDataChange({ vin: e.target.value })}
                disabled={isSending}
              />
            </div>
          </div>
        </div>

        {/* Parts List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Parts List</h3>
            <Button
              variant="default"
              size="sm"
              onClick={addPart}
              disabled={isSending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Part
            </Button>
          </div>
          
          {messageData.parts.map((part, index) => (
            <div key={part.id} className="space-y-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor={`part-name-${index}`} className="text-sm font-medium">Part Name *</Label>
                <Input
                  id={`part-name-${index}`}
                  placeholder="e.g., Brake pads, Oil filter, Headlight assembly"
                  value={part.name}
                  onChange={(e) => updatePart(part.id, 'name', e.target.value)}
                  disabled={isSending}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`part-number-${index}`} className="text-sm font-medium">Part Number (Optional)</Label>
                  <Input
                    id={`part-number-${index}`}
                    placeholder="OEM or aftermarket part number"
                    value={part.number}
                    onChange={(e) => updatePart(part.id, 'number', e.target.value)}
                    disabled={isSending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`qty-${index}`} className="text-sm font-medium">Quantity</Label>
                  <Input
                    id={`qty-${index}`}
                    type="number"
                    min="1"
                    placeholder="1"
                    value={part.qty}
                    onChange={(e) => updatePart(part.id, 'qty', e.target.value)}
                    disabled={isSending}
                    required
                  />
                </div>
              </div>

              {messageData.parts.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePart(part.id)}
                  disabled={isSending}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove Part
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Additional Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Additional Details (Optional)</h3>
          <Textarea
            placeholder="Any specific requirements, brand preferences, or additional information..."
            value={messageData.additionalDetails}
            onChange={(e) => onMessageDataChange({ additionalDetails: e.target.value })}
            disabled={isSending}
            className="min-h-[100px]"
          />
        </div>

        {/* Photos Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Reference Images (Optional)</h3>
          <div className="border-2 border-dashed rounded-lg p-6">
            <Input
              id="image"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={isSending || isUploading}
              ref={fileInputRef}
              className="hidden"
            />
            <div className="space-y-4">
              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSending || isUploading}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Upload className="h-5 w-5" />
                  Select reference images
                </Button>
                <p className="text-sm text-gray-500 mt-2">JPG, PNG, WEBP, HEIC (Max 5MB each) - You can select multiple files at once</p>
              </div>

              {messageData.imagePreviews.length > 0 && (
                <>
                  <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                    {messageData.imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {messageData.uploadedImageUrls.length > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 bg-green-500 bg-opacity-80 text-white text-xs p-1 text-center rounded-b-md">
                            Uploaded ✓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      {messageData.imageFiles.length} image{messageData.imageFiles.length !== 1 ? 's' : ''} selected
                    </p>
                    <Button
                      variant="default"
                      onClick={uploadSelectedImages}
                      disabled={isSending || isUploading || messageData.uploadedImageUrls.length > 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {isUploading ? 'Uploading...' : messageData.uploadedImageUrls.length > 0 ? 'Uploaded' : 'Create Gallery'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Next Stage Button */}
        <div className="flex justify-end items-center pt-4">
          <Button
            onClick={onNextStage}
            disabled={!isFormValid() || isUploading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Continue to Preview
          </Button>
        </div>

        {isSending && (
          <Progress value={sendProgress} className="w-full" />
        )}
      </CardContent>
    </Card>
  );
}