import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Save, RotateCcw, FileText } from 'lucide-react';
import { ContactStorageService } from '@/lib/storage';

interface CsvManagementProps {
  onImport: (csvContent: string) => Promise<void>;
  onExport: () => Promise<string | null>;
  onCreateBackup: () => Promise<void>;
  onRestoreBackup: () => Promise<void>;
}

export function CsvManagement({ 
  onImport, 
  onExport, 
  onCreateBackup, 
  onRestoreBackup 
}: CsvManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDownloadTemplate = () => {
    try {
      const template = ContactStorageService.getCsvTemplate();
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
        description: "CSV template has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download template",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const csvData = await onExport();
      if (csvData) {
        const blob = new Blob([csvData], { type: 'text/csv' });
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
          description: "Your contacts have been exported as CSV",
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export contacts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsLoading(true);
    try {
      await onCreateBackup();
      toast({
        title: "Backup Created",
        description: "Your contacts have been backed up",
      });
    } catch (error) {
      toast({
        title: "Backup Failed",
        description: "Failed to create backup",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!confirm('Are you sure you want to restore from backup? This will replace your current contacts.')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await onRestoreBackup();
      toast({
        title: "Backup Restored",
        description: "Your contacts have been restored from backup",
      });
    } catch (error) {
      toast({
        title: "Restore Failed",
        description: "Failed to restore from backup",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          CSV Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Import & Export</h4>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
                className="flex items-center gap-2"
                disabled={isLoading}
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                className="flex items-center gap-2"
                disabled={isLoading}
              >
                <Upload className="h-4 w-4" />
                Export Contacts
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Backup & Restore</h4>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleCreateBackup}
                variant="outline"
                className="flex items-center gap-2"
                disabled={isLoading}
              >
                <Save className="h-4 w-4" />
                Create Backup
              </Button>
              <Button
                onClick={handleRestoreBackup}
                variant="outline"
                className="flex items-center gap-2"
                disabled={isLoading}
              >
                <RotateCcw className="h-4 w-4" />
                Restore Backup
              </Button>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>• Download template to see the correct CSV format</p>
          <p>• Export your contacts as CSV for backup or sharing</p>
          <p>• Create backups to protect your data</p>
          <p>• Restore from backup if needed</p>
        </div>
      </CardContent>
    </Card>
  );
} 