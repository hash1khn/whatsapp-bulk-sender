import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, HardDrive, Database, AlertCircle, CheckCircle, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { fileStorageService } from '@/lib/fileStorage';

export function StorageStatus() {
  const [storageMethod, setStorageMethod] = useState<'local' | 'file' | 'localStorage'>('localStorage');
  const [isFileSystemSupported, setIsFileSystemSupported] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkFileSystemSupport = () => {
      const supported = 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
      setIsFileSystemSupported(supported);
      
      // Check current storage mode
      const mode = fileStorageService.getStorageMode();
      setStorageMethod(mode);
      
      if (mode === 'file' && fileStorageService.hasSelectedFile()) {
        setSelectedFileName(fileStorageService.getSelectedFileName());
      } else {
        setSelectedFileName(null);
      }
    };

    checkFileSystemSupport();
  }, []);

  const handleSelectFile = async () => {
    setIsLoading(true);
    try {
      // Disable local file mode when selecting a file
      fileStorageService.setLocalFileMode(false);
      
      const fileHandle = await fileStorageService.requestFileSelection();
      
      if (fileHandle) {
        setStorageMethod('file');
        setSelectedFileName(fileHandle.name);
        
        toast({
          title: "File Selected",
          description: "Contacts file has been selected successfully",
        });
      } else {
        // Re-enable local file mode if no file selected
        fileStorageService.setLocalFileMode(true);
        setStorageMethod('local');
        setSelectedFileName(null);
        
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

  const handleUseLocalFile = () => {
    fileStorageService.setLocalFileMode(true);
    setStorageMethod('local');
    setSelectedFileName(null);
    
    toast({
      title: "Local File Mode Enabled",
      description: "Contacts will be loaded from /data/contacts.csv",
    });
  };

  const handleExportToLocalFile = async () => {
    setIsLoading(true);
    try {
      const contacts = await fileStorageService.getAllContacts();
      const csvContent = fileStorageService['generateCsvContent'](contacts);
      
      // Create a download link for the CSV content
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contacts.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Contacts Exported",
        description: "Download the file and save it to /data/contacts.csv",
      });
    } catch (error) {
      console.error('Error exporting contacts:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export contacts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStorageIcon = () => {
    if (storageMethod === 'local') {
      return <FileText className="h-4 w-4" />;
    } else if (storageMethod === 'file') {
      return <FileText className="h-4 w-4" />;
    }
    return <Database className="h-4 w-4" />;
  };

  const getStorageStatus = () => {
    if (storageMethod === 'local') {
      return (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-600">Local File Mode Active</span>
        </div>
      );
    } else if (storageMethod === 'file') {
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
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Status
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStorageIcon()}
              <span className="font-medium">Current Storage:</span>
            </div>
            <Badge variant={storageMethod === 'localStorage' ? 'secondary' : 'default'}>
              {storageMethod === 'local' ? 'Local File' : 
               storageMethod === 'file' ? 'File System' : 'Browser Storage'}
            </Badge>
          </div>

          {getStorageStatus()}

          {storageMethod === 'local' && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Local file: <span className="font-mono">{fileStorageService.getLocalFilePath()}</span>
              </div>
              <Button
                onClick={handleExportToLocalFile}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isLoading ? 'Exporting...' : 'Export to Local File'}
              </Button>
            </div>
          )}

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

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Storage Options:</p>
            <div className="flex gap-2">
              <Button
                onClick={handleUseLocalFile}
                disabled={isLoading || storageMethod === 'local'}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Use Local File
              </Button>
              
              {isFileSystemSupported && (
                <Button
                  onClick={handleSelectFile}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {isLoading ? 'Selecting...' : 'Select File'}
                </Button>
              )}
            </div>
          </div>

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
            <p><strong>Local File:</strong> Contacts loaded from /data/contacts.csv in your project</p>
            <p><strong>File Storage:</strong> Contacts saved to a file you select</p>
            <p><strong>Browser Storage:</strong> Contacts saved in browser localStorage as backup</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
} 