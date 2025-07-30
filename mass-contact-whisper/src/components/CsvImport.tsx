import { useState, useRef } from 'react';
import { Contact } from '@/types/contact';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Download, AlertCircle, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { fileStorageService } from '@/lib/fileStorage';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CsvImportProps {
  onImportComplete?: () => void;
}

export function CsvImport({ onImportComplete }: CsvImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [needsFileAccess, setNeedsFileAccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const requestFileAccess = async () => {
    try {
      const fileHandle = await fileStorageService.requestFileSelection();
      if (fileHandle) {
        setNeedsFileAccess(false);
        toast({
          title: "File access granted",
          description: "You can now import and save contacts to the file.",
        });
      } else {
        setNeedsFileAccess(true);
        toast({
          title: "File access needed",
          description: "Please grant access to save contacts to a file.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error requesting file access:', error);
      setNeedsFileAccess(true);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);
    setSuccess(null);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if we need file access
      if (!fileStorageService.hasSelectedFile()) {
        const fileHandle = await fileStorageService.requestFileSelection();
        if (!fileHandle) {
          setError('File access is required for importing. Please grant permission.');
          return;
        }
      }

      const content = await file.text();
      const result = await fileStorageService.importContactsFromCsv(content);
      
      if (result.success) {
        setSuccess(result.message);
        if (result.stats) {
          console.log('Import stats:', result.stats);
        }
        // Trigger a refresh of contacts
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        setError(result.message);
        if (result.errors) {
          console.error('Import errors:', result.errors);
        }
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      setError(error instanceof Error ? error.message : 'Failed to import CSV');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const template = fileStorageService.getCsvTemplate();
      const blob = new Blob([template], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contacts_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Template Downloaded",
        description: "CSV template has been downloaded. Use this as a guide for your import.",
      });
    } catch (error) {
      console.error('Template download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download template",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            CSV Import
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
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Import contacts from a CSV file with the following columns:</p>
            <div className="font-mono text-xs bg-muted p-2 rounded-md">
              ID, Supplier Name, Vehicle Makes, Part Categories, Conditions, WhatsApp Number
            </div>
            <ul className="text-xs list-disc list-inside space-y-1">
              <li>Vehicle Makes: semicolon-separated (e.g., "BMW;Mercedes")</li>
              <li>Part Categories: semicolon-separated (e.g., "Engine Parts;Transmission")</li>
              <li>Conditions: semicolon-separated, must be 'new', 'used', or 'aftermarket'</li>
              <li>WhatsApp Number: international format with + (e.g., +1234567890)</li>
            </ul>
          </div>

          {error && !error.startsWith('Import successful:') && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import Error</AlertTitle>
              <AlertDescription className="mt-2 whitespace-pre-wrap font-mono text-xs">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Import Successful</AlertTitle>
              <AlertDescription className="mt-2 whitespace-pre-wrap font-mono text-xs text-green-700">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>

            {needsFileAccess && (
              <Button
                onClick={requestFileAccess}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Grant File Access
              </Button>
            )}

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {isImporting ? 'Importing...' : 'Import CSV'}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="text-xs text-muted-foreground border-t pt-2">
            <p className="font-medium mb-2">Having issues? Check that:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Your CSV file uses commas (,) to separate columns</li>
              <li>Use semicolons (;) to separate multiple values within a column</li>
              <li>Enclose values containing commas in quotes ("Example, Value")</li>
              <li>All required fields are filled (Supplier Name, Vehicle Makes, WhatsApp Number)</li>
              <li>WhatsApp numbers start with + and contain only digits</li>
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
}