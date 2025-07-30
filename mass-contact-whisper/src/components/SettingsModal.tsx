import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  HardDrive, 
  Database, 
  AlertCircle, 
  CheckCircle, 
  Download, 
  Upload, 
  RotateCcw,
  Settings,
  X
} from 'lucide-react';
import { fileStorageService } from '@/lib/fileStorage';
import { CsvImport } from './CsvImport';
import { StorageStatus } from './StorageStatus';
import { CsvManagement } from './CsvManagement';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  onExport?: () => Promise<void>;
  onCreateBackup?: () => Promise<void>;
  onRestoreBackup?: () => Promise<void>;
}

export function SettingsModal({ 
  isOpen, 
  onClose, 
  onImportComplete,
  onExport,
  onCreateBackup,
  onRestoreBackup 
}: SettingsModalProps) {
  const { toast } = useToast();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Settings</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* CSV Import Section */}
          <CsvImport onImportComplete={onImportComplete} />

          {/* Storage Status Section */}
          <StorageStatus />

          {/* CSV Management Section */}
          <CsvManagement
            onExport={onExport || (async () => {
              try {
                const csvContent = await fileStorageService.exportContactsAsCsv();
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
                  description: "Your contacts have been exported as CSV",
                });
              } catch (error) {
                toast({
                  title: "Export Failed",
                  description: "Failed to export contacts",
                  variant: "destructive",
                });
              }
            })}
            onCreateBackup={onCreateBackup || (async () => {
              try {
                await fileStorageService.createBackup();
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
              }
            })}
            onRestoreBackup={onRestoreBackup || (async () => {
              if (!confirm('Are you sure you want to restore from backup? This will replace your current contacts.')) {
                return;
              }
              
              try {
                await fileStorageService.restoreFromBackup();
                toast({
                  title: "Backup Restored",
                  description: "Your contacts have been restored from backup",
                });
                if (onImportComplete) {
                  onImportComplete();
                }
              } catch (error) {
                toast({
                  title: "Restore Failed",
                  description: "Failed to restore from backup",
                  variant: "destructive",
                });
              }
            })}
          />
        </div>
      </div>
    </div>
  );
} 