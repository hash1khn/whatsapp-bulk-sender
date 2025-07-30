import { Contact } from '../types/contact';
import { generateId } from './utils';

// Clear localStorage on module load to ensure fresh sample data
if (typeof window !== 'undefined') {
  // Only clear if we're in a browser environment
  localStorage.removeItem('WASSENDER_CONTACTS_CSV');
  localStorage.removeItem('WASSENDER_CONTACTS_CSV_BACKUP');
  console.log('Cleared localStorage for fresh sample data');
}

export interface FileStorageService {
  getAllContacts(): Promise<Contact[]>;
  saveAllContacts(contacts: Contact[]): Promise<void>;
  importContactsFromCsv(csvContent: string): Promise<{ success: boolean; message: string; errors?: string[]; stats?: { total: number; added: number; updated: number } }>;
  exportContactsAsCsv(): Promise<string>;
  createBackup(): Promise<void>;
  restoreFromBackup(): Promise<void>;
  getCsvTemplate(): string;
  isFileSystemAvailable(): boolean;
  hasSelectedFile(): boolean;
  getSelectedFileName(): string | null;
  requestFileSelection(): Promise<FileSystemFileHandle | null>;
  setLocalFileMode(enabled: boolean): void;
  getStorageMode(): 'local' | 'file' | 'localStorage';
  getLocalFilePath(): string;
}

class FileStorageServiceImpl implements FileStorageService {
  private readonly CONTACTS_FILE = 'data/contacts.csv';
  private readonly CONTACTS_BACKUP_FILE = 'data/contacts_backup.csv';
  private fileHandle: FileSystemFileHandle | null = null;
  private useLocalFile: boolean = true; // Default to using local file

  // Convert contact to CSV row
  private contactToCsvRow(contact: Contact): string {
    const vehicleMakes = contact.vehicleMake.split(';').map(m => m.trim()).filter(Boolean).join(';');
    const partCategories = contact.partCategory.join(';');
    const conditions = contact.conditions.join(';');
    return `"${contact.id}","${contact.supplierName}","${vehicleMakes}","${partCategories}","${conditions}","${contact.whatsappNumber}"`;
  }

  // Convert CSV row to contact
  private csvRowToContact(row: string): Contact | null {
    try {
      // Parse CSV row with proper quote handling
      const columns = this.parseCsvRow(row);
      
      if (columns.length >= 6) {
        const vehicleMakes = columns[2].trim();
        const partCategories = columns[3].split(';').map(cat => cat.trim()).filter(Boolean);
        const conditions = columns[4].split(';')
          .map(c => c.trim().toLowerCase())
          .filter(c => ['new', 'used', 'aftermarket'].includes(c)) as ('new' | 'used' | 'aftermarket')[];
        
        return {
          id: columns[0] || generateId(),
          supplierName: columns[1].trim(),
          vehicleMake: vehicleMakes,
          partCategory: partCategories.length > 0 ? partCategories : ['General'],
          conditions: conditions.length > 0 ? conditions : ['new'],
          whatsappNumber: columns[5].trim()
        };
      }
    } catch (error) {
      console.error('Error parsing CSV row:', error);
    }
    return null;
  }

  // Parse CSV row with proper quote handling
  private parseCsvRow(row: string): string[] {
    const columns: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        columns.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    columns.push(current.trim());
    return columns.map(col => col.replace(/^"(.*)"$/, '$1'));
  }

  // Get CSV header
  private getCsvHeader(): string {
    return '"ID","Supplier Name","Vehicle Makes (;-separated)","Part Categories (;-separated)","Conditions (;-separated)","WhatsApp Number"';
  }

  // Check if File System Access API is supported
  private isFileSystemSupported(): boolean {
    return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
  }

  // Request file selection
  public async requestFileSelection(): Promise<FileSystemFileHandle | null> {
    if (!this.isFileSystemSupported()) {
      console.warn('File System Access API not supported');
      return null;
    }

    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'CSV Files',
          accept: {
            'text/csv': ['.csv'],
          },
        }],
        multiple: false,
      });

      this.fileHandle = fileHandle;
      return fileHandle;
    } catch (error) {
      console.error('Error requesting file handle:', error);
      return null;
    }
  }

  // Check if a file is currently selected
  public hasSelectedFile(): boolean {
    return this.fileHandle !== null;
  }

  // Get the name of the selected file
  public getSelectedFileName(): string | null {
    return this.fileHandle?.name || null;
  }

  // Generate CSV content
  private generateCsvContent(contacts: Contact[]): string {
    return [
      this.getCsvHeader(),
      ...contacts.map(contact => this.contactToCsvRow(contact))
    ].join('\n');
  }

  // Get CSV template
  public getCsvTemplate(): string {
    return [
      this.getCsvHeader(),
      '"example-1","ABC Motors","Toyota;Honda","Engine Parts;Transmission","new;used","+1234567890"',
      '"example-2","XYZ Auto","BMW;Mercedes","Brake Pads;Suspension","used;aftermarket","+0987654321"'
    ].join('\n');
  }

  // Parse CSV content
  private parseCsvContent(content: string): Contact[] {
    console.log('Starting CSV parsing...');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    if (lines.length <= 1) {
      console.warn('CSV file is empty or contains only header');
      throw new Error('CSV file is empty or contains only header');
    }

    // Validate header
    const headerRow = this.parseCsvRow(lines[0]);
    const expectedColumns = ['ID', 'Supplier Name', 'Vehicle Makes', 'Part Categories', 'Conditions', 'WhatsApp Number'];
    const headerValid = expectedColumns.every((col, index) => 
      headerRow[index]?.toLowerCase().includes(col.toLowerCase())
    );

    if (!headerValid) {
      console.error('Invalid CSV header format', {
        expected: expectedColumns,
        found: headerRow
      });
      throw new Error(`Invalid CSV header. Expected columns: ${expectedColumns.join(', ')}`);
    }

    const contacts: Contact[] = [];
    const errors: string[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      try {
        const contact = this.csvRowToContact(lines[i]);
        if (contact) {
          // Validate contact
          const validationErrors = this.validateContact(contact, i + 1);
          if (validationErrors.length > 0) {
            errors.push(...validationErrors);
          } else {
            contacts.push(contact);
          }
        } else {
          errors.push(`Row ${i + 1}: Failed to parse row`);
        }
      } catch (error) {
        console.error(`Error parsing row ${i + 1}:`, error);
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Log parsing results
    console.log('CSV parsing complete', {
      totalRows: lines.length - 1,
      validContacts: contacts.length,
      errors: errors.length > 0 ? errors : 'None'
    });

    if (errors.length > 0) {
      throw new Error(`CSV import failed with ${errors.length} errors:\n${errors.join('\n')}`);
    }

    return contacts;
  }

  // Import contacts from CSV content
  public async importContactsFromCsv(csvContent: string): Promise<{ success: boolean; message: string; errors?: string[]; stats?: { total: number; added: number; updated: number } }> {
    try {
      console.log('Starting CSV import...');
      
      // Parse the CSV content
      const newContacts = this.parseCsvContent(csvContent);
      if (newContacts.length === 0) {
        return { success: false, message: 'No valid contacts found in CSV' };
      }

      // Get existing contacts
      const existingContacts = await this.getAllContacts();
      console.log(`Found ${existingContacts.length} existing contacts`);

      // Create a map for quick lookup by WhatsApp number
      const existingMap = new Map<string, Contact>();
      existingContacts.forEach(contact => {
        existingMap.set(contact.whatsappNumber, contact);
      });

      let added = 0;
      let updated = 0;
      const mergedContacts: Contact[] = [];

      // Process new contacts
      for (const newContact of newContacts) {
        const existing = existingMap.get(newContact.whatsappNumber);
        
        if (existing) {
          // Update existing contact (preserve original ID)
          const updatedContact: Contact = {
            ...newContact,
            id: existing.id // Keep the original ID
          };
          mergedContacts.push(updatedContact);
          updated++;
          console.log(`Updated contact: ${newContact.supplierName} (${newContact.whatsappNumber})`);
        } else {
          // Add new contact
          mergedContacts.push(newContact);
          added++;
          console.log(`Added new contact: ${newContact.supplierName} (${newContact.whatsappNumber})`);
        }
      }

      // Save merged contacts
      await this.saveAllContacts(mergedContacts);
      
      // Clear any cached data to force fresh read
      localStorage.removeItem('WASSENDER_CONTACTS_CSV');
      
      console.log(`Import completed: ${added} added, ${updated} updated, ${mergedContacts.length} total`);
      
      return {
        success: true,
        message: `Successfully imported ${newContacts.length} contacts (${added} added, ${updated} updated)`,
        stats: { total: mergedContacts.length, added, updated }
      };

    } catch (error) {
      console.error('Error importing contacts:', error);
      return { success: false, message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  // Save all contacts - save to local file by default
  public async saveAllContacts(contacts: Contact[]): Promise<void> {
    try {
      const csvContent = this.generateCsvContent(contacts);
      
      // Always save to local file if using local file mode
      if (this.useLocalFile) {
        try {
          // Note: This will only work if the server allows writing to /data/
          // For now, we'll save to localStorage and provide instructions
          localStorage.setItem('WASSENDER_CONTACTS_CSV', csvContent);
          console.log('Saved contacts to localStorage (local file mode)');
          console.log('To save to /data/contacts.csv, you need to manually copy the data');
        } catch (error) {
          console.warn('Could not write to local file, using localStorage');
          localStorage.setItem('WASSENDER_CONTACTS_CSV', csvContent);
        }
      }
      
      // Also save to selected file if available
      if (this.fileHandle) {
        const writable = await this.fileHandle.createWritable();
        await writable.write(csvContent);
        await writable.close();
        console.log('Saved contacts to selected file:', this.fileHandle.name);
      }
      
      // Always save to localStorage as backup
      localStorage.setItem('WASSENDER_CONTACTS_CSV_BACKUP', csvContent);
    } catch (error) {
      console.error('Error saving contacts:', error);
      throw new Error('Failed to save contacts');
    }
  }

  // Get all contacts - prioritize local file
  public async getAllContacts(): Promise<Contact[]> {
    try {
      // First try to read from local file
      if (this.useLocalFile) {
        try {
          // Force fresh read by adding cache-busting parameter
          const timestamp = new Date().getTime();
          const response = await fetch(`/data/contacts.csv?t=${timestamp}`, {
            cache: 'no-cache',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          if (response.ok) {
            const content = await response.text();
            const contacts = this.parseCsvContent(content);
            if (contacts.length > 0) {
              console.log('Loaded contacts from local file: /data/contacts.csv');
              // Clear localStorage to prevent caching conflicts
              localStorage.removeItem('WASSENDER_CONTACTS_CSV');
              return contacts;
            }
          }
        } catch (fetchError) {
          console.log('Could not load from local file, trying other sources');
        }
      }

      // Then try selected file handle
      if (this.fileHandle) {
        const file = await this.fileHandle.getFile();
        const content = await file.text();
        return this.parseCsvContent(content);
      }

      // Finally fallback to localStorage
      const contactsJson = localStorage.getItem('WASSENDER_CONTACTS_CSV');
      if (contactsJson) {
        return this.parseCsvContent(contactsJson);
      }

      return [];
    } catch (error) {
      console.error('Error reading contacts:', error);
      return [];
    }
  }

  // Validate contact
  private validateContact(contact: Contact, rowNumber: number): string[] {
    const errors: string[] = [];

    // Required fields
    if (!contact.supplierName?.trim()) {
      errors.push(`Row ${rowNumber}: Supplier Name is required`);
    }
    if (!contact.vehicleMake?.trim()) {
      errors.push(`Row ${rowNumber}: Vehicle Make is required`);
    }
    if (!contact.whatsappNumber?.trim()) {
      errors.push(`Row ${rowNumber}: WhatsApp Number is required`);
    }

    // WhatsApp number format
    if (!/^\+[0-9]{10,15}$/.test(contact.whatsappNumber)) {
      errors.push(`Row ${rowNumber}: Invalid WhatsApp number format. Must start with + and contain 10-15 digits`);
    }

    // Validate conditions
    const validConditions = ['new', 'used', 'aftermarket'];
    const invalidConditions = contact.conditions.filter(c => !validConditions.includes(c));
    if (invalidConditions.length > 0) {
      errors.push(`Row ${rowNumber}: Invalid conditions: ${invalidConditions.join(', ')}. Must be: new, used, or aftermarket`);
    }

    return errors;
  }

  // Export contacts as CSV string
  public async exportContactsAsCsv(): Promise<string> {
    const contacts = await this.getAllContacts();
    return this.generateCsvContent(contacts);
  }

  // Create backup
  public async createBackup(): Promise<void> {
    const contacts = await this.getAllContacts();
    const csvContent = this.generateCsvContent(contacts);
    
    try {
      // Try to save backup file
      if (this.isFileSystemSupported()) {
        const backupHandle = await window.showSaveFilePicker({
          suggestedName: 'contacts_backup.csv',
          types: [{
            description: 'CSV Files',
            accept: {
              'text/csv': ['.csv'],
            },
          }],
        });
        
        const writable = await backupHandle.createWritable();
        await writable.write(csvContent);
        await writable.close();
      }
    } catch (error) {
      console.error('Error creating backup file:', error);
    }
    
    // Always save to localStorage as backup
    localStorage.setItem('WASSENDER_CONTACTS_CSV_BACKUP', csvContent);
  }

  // Restore from backup
  public async restoreFromBackup(): Promise<void> {
    try {
      if (this.isFileSystemSupported()) {
        const [fileHandle] = await window.showOpenFilePicker({
          types: [{
            description: 'CSV Files',
            accept: {
              'text/csv': ['.csv'],
            },
          }],
          multiple: false,
        });
        
        const file = await fileHandle.getFile();
        const content = await file.text();
        await this.importContactsFromCsv(content);
      } else {
        // Fallback to localStorage backup
        const backupContent = localStorage.getItem('WASSENDER_CONTACTS_CSV_BACKUP');
        if (backupContent) {
          await this.importContactsFromCsv(backupContent);
        } else {
          throw new Error('No backup found');
        }
      }
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw new Error('Failed to restore from backup');
    }
  }

  // Set storage mode
  public setLocalFileMode(enabled: boolean): void {
    this.useLocalFile = enabled;
    console.log(`Local file mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Get current storage mode
  public getStorageMode(): 'local' | 'file' | 'localStorage' {
    if (this.useLocalFile) return 'local';
    if (this.fileHandle) return 'file';
    return 'localStorage';
  }

  // Get local file path
  public getLocalFilePath(): string {
    return '/data/contacts.csv';
  }

  // Check if File System Access API is available
  public isFileSystemAvailable(): boolean {
    return this.isFileSystemSupported();
  }
}

// Export the singleton instance
export const fileStorageService = new FileStorageServiceImpl(); 