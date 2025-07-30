import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, Upload, RotateCcw } from 'lucide-react';
import { fileStorageService } from '@/lib/fileStorage';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CsvManagementProps {
  onExport: () => Promise<void>;
  onCreateBackup: () => Promise<void>;
  onRestoreBackup: () => Promise<void>;
}

export function CsvManagement({ onExport, onCreateBackup, onRestoreBackup }: CsvManagementProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
    } catch (error) {
      console.error('Template download error:', error);
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
            CSV Management
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
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>

            <Button
              variant="outline"
              onClick={onExport}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Export Contacts
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={onCreateBackup}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Create Backup
            </Button>

            <Button
              variant="outline"
              onClick={onRestoreBackup}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restore Backup
            </Button>
          </div>

          <div className="text-xs text-muted-foreground border-t pt-2">
            <ul className="list-disc list-inside space-y-1">
              <li>Download template to see the correct CSV format</li>
              <li>Export your contacts as CSV for backup or sharing</li>
              <li>Create backups to protect your data</li>
              <li>Restore from backup if needed</li>
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
} 