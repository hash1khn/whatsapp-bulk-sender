import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, HardDrive, Database, AlertCircle, CheckCircle } from 'lucide-react';
import { FileStorageService } from '@/lib/fileStorage';

export function StorageStatus() {
  const [storageMethod, setStorageMethod] = useState<'file' | 'localStorage'>('localStorage');
  const [isFileSystemSupported, setIsFileSystemSupported] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkFileSystemSupport = () => {
      const supported = FileStorageService.isFileSystemAvailable();
      setIsFileSystemSupported(supported);
      
      // Check if file is selected
      if (supported && FileStorageService.hasSelectedFile()) {
        setStorageMethod('file');
        setSelectedFileName(FileStorageService.getSelectedFileName());
      } else {
        setStorageMethod('localStorage');
        setSelectedFileName(null);
      }
    };

    checkFileSystemSupport();
  }, []);



  const handleSelectFile = async () => {
    setIsLoading(true);
    try {
      // Explicitly request file selection
      const fileHandle = await FileStorageService.requestFileSelection();
      
      if (fileHandle) {
        setStorageMethod('file');
        setSelectedFileName(fileHandle.name);
        
        toast({
          title: "File Selected",
          description: "Contacts file has been selected successfully",
        });
      } else {
        toast({
          title: "File Selection Cancelled",
          description: "No file was selected",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      toast({
        title: "File Selection Failed",
        description: "Failed to select contacts file",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStorageIcon = () => {
    if (storageMethod === 'file') {
      return <FileText className="h-4 w-4" />;
    }
    return <Database className="h-4 w-4" />;
  };

  const getStorageStatus = () => {
    if (storageMethod === 'file') {
      return (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-600">File Storage Active</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-yellow-500" />
        <span className="text-sm text-yellow-600">Browser Storage (Backup)</span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Storage Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStorageIcon()}
            <span className="font-medium">Current Storage:</span>
          </div>
          <Badge variant={storageMethod === 'file' ? 'default' : 'secondary'}>
            {storageMethod === 'file' ? 'File System' : 'Browser Storage'}
          </Badge>
        </div>

        {getStorageStatus()}

        {selectedFileName && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Selected file: <span className="font-mono">{selectedFileName}</span>
            </div>
            <Button
              onClick={handleSelectFile}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {isLoading ? 'Selecting...' : 'Change File'}
            </Button>
          </div>
        )}

        {isFileSystemSupported && !FileStorageService.hasSelectedFile() && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Your browser supports file system access. Select a contacts file to enable file-based storage.
            </p>
            <Button
              onClick={handleSelectFile}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {isLoading ? 'Selecting...' : 'Select Contacts File'}
            </Button>
          </div>
        )}

        {!isFileSystemSupported && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Your browser doesn't support file system access. Contacts will be stored in browser storage.
            </p>
            <div className="text-xs text-muted-foreground">
              <p>• Use Chrome, Edge, or other Chromium-based browsers for file system support</p>
              <p>• File system access requires HTTPS or localhost</p>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground border-t pt-2">
          <p><strong>File Storage:</strong> Contacts saved as CSV files in your project directory</p>
          <p><strong>Browser Storage:</strong> Contacts saved in browser localStorage as backup</p>
        </div>
      </CardContent>
    </Card>
  );
} 