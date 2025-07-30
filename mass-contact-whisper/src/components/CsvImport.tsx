import { useState, useRef } from 'react';
import { Contact } from '@/types/contact';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface CsvImportProps {
  onImport: (csvContent: string) => void;
}

export function CsvImport({ onImport }: CsvImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseCsv = (csvText: string): Contact[] => {
    const lines = csvText.trim().split('\n');
    const contacts: Contact[] = [];

    // Skip header row if it exists
    const startIndex = lines[0].toLowerCase().includes('supplier') || lines[0].toLowerCase().includes('id') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line (handle quoted fields)
      const columns = line.split(',').map(col => col.trim().replace(/^"(.*)"$/, '$1'));
      
      if (columns.length >= 4) {
        // Handle both old format (4 columns) and new format (5 columns with ID)
        const isNewFormat = columns.length >= 5;
        
        const contact: Contact = {
          id: isNewFormat ? (columns[0] || uuidv4()) : uuidv4(),
          supplierName: isNewFormat ? (columns[1] || '') : (columns[0] || ''),
          partType: isNewFormat ? (columns[2] || '') : (columns[1] || ''),
          conditions: isNewFormat 
            ? (columns[3] || 'new').split(';').filter(c => ['new', 'used', 'aftermarket'].includes(c)) as ('new' | 'used' | 'aftermarket')[]
            : [(columns[2] as 'new' | 'used' | 'aftermarket') || 'new'],
          whatsappNumber: isNewFormat ? (columns[4] || '') : (columns[3] || ''),
        };
        
        // Validate conditions
        if (contact.conditions.length === 0) {
          contact.conditions = ['new'];
        }

        contacts.push(contact);
      }
    }

    return contacts;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    try {
      const text = await file.text();
      const contacts = parseCsv(text);

      if (contacts.length === 0) {
        toast({
          title: "No valid contacts found",
          description: "Please check your CSV format",
          variant: "destructive",
        });
        return;
      }

      onImport(text);
      toast({
        title: "Import successful",
        description: `Imported ${contacts.length} contacts`,
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('CSV import error:', error);
      toast({
        title: "Import failed",
        description: "Error reading CSV file",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          CSV Import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>Import contacts from a CSV file with columns:</p>
          <p className="font-mono text-xs mt-1">
            Supplier Name, Part Type, Condition, WhatsApp Number
          </p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".csv"
          className="hidden"
          disabled={isImporting}
        />

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {isImporting ? 'Importing...' : 'Import CSV'}
        </Button>
      </CardContent>
    </Card>
  );
}