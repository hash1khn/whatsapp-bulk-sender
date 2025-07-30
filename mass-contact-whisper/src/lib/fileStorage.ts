import { Contact } from '../types/contact';
import { generateId } from './utils';

// Clear localStorage on module load to ensure fresh sample data
if (typeof window !== 'undefined') {
  // Only clear if we're in a browser environment
  localStorage.removeItem('WASSENDER_CONTACTS_CSV');
  localStorage.removeItem('WASSENDER_CONTACTS_CSV_BACKUP');
  console.log('Cleared localStorage for fresh sample data');
}

// File Storage Service for Contacts
export class FileStorageService {
  private static readonly CONTACTS_FILE = 'data/contacts.csv';
  private static readonly CONTACTS_BACKUP_FILE = 'data/contacts_backup.csv';
  private static fileHandle: FileSystemFileHandle | null = null;

  // Convert contact to CSV row
  private static contactToCsvRow(contact: Contact): string {
    const conditions = contact.conditions.join(';');
    const partCategories = contact.partCategory.join(';');
    return `"${contact.id}","${contact.supplierName}","${contact.vehicleMake}","${conditions}","${partCategories}","${contact.whatsappNumber}"`;
  }

  // Convert CSV row to contact
  private static csvRowToContact(row: string): Contact | null {
    try {
      // Parse CSV row with proper quote handling
      const columns = this.parseCsvRow(row);
      
      if (columns.length >= 6) {
        const conditions = columns[3].split(';').filter(c => 
          ['new', 'used', 'aftermarket'].includes(c)
        ) as ('new' | 'used' | 'aftermarket')[];
        
        const partCategories = columns[4].split(';').filter(c => c.trim() !== '');
        
        return {
          id: columns[0],
          supplierName: columns[1],
          vehicleMake: columns[2],
          conditions: conditions.length > 0 ? conditions : ['new'],
          partCategory: partCategories.length > 0 ? partCategories : [],
          whatsappNumber: columns[5],
        };
      }
    } catch (error) {
      console.error('Error parsing CSV row:', error);
    }
    return null;
  }

  // Parse CSV row with proper quote handling
  private static parseCsvRow(row: string): string[] {
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
  private static getCsvHeader(): string {
    return '"ID","Supplier Name","Vehicle Make","Conditions","Part Category","WhatsApp Number"';
  }

  // Check if File System Access API is supported
  private static isFileSystemSupported(): boolean {
    return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
  }

  // Request file handle for contacts
  private static async requestFileHandle(): Promise<FileSystemFileHandle | null> {
    if (!this.isFileSystemSupported()) {
      console.warn('File System Access API not supported, falling back to localStorage');
      return null;
    }

    // Return existing file handle if available
    if (this.fileHandle) {
      return this.fileHandle;
    }

    // Don't automatically request file selection - return null to use localStorage
    return null;
  }

  // Explicitly request file selection (called by user action)
  static async requestFileSelection(): Promise<FileSystemFileHandle | null> {
    if (!this.isFileSystemSupported()) {
      console.warn('File System Access API not supported');
      return null;
    }

    try {
      // Request user to select the contacts file
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

  // Read contacts from file
  static async readContactsFromFile(): Promise<Contact[]> {
    try {
      const fileHandle = await this.requestFileHandle();
      
      if (fileHandle) {
        // Read from actual file
        const file = await fileHandle.getFile();
        const content = await file.text();
        return this.parseCsvContent(content);
      } else {
        // Try to read from default file location
        try {
          const response = await fetch('/data/contacts.csv');
          if (response.ok) {
            const content = await response.text();
            const contacts = this.parseCsvContent(content);
            if (contacts.length > 0) {
              console.log('Loaded contacts from default file location');
              return contacts;
            }
          }
        } catch (fetchError) {
          console.log('Could not load from default file location, falling back to localStorage');
        }
        
        // Fallback to localStorage
        return this.readFromLocalStorage();
      }
    } catch (error) {
      console.error('Error reading contacts from file:', error);
      // Fallback to localStorage
      return this.readFromLocalStorage();
    }
  }

  // Write contacts to file
  static async writeContactsToFile(contacts: Contact[]): Promise<void> {
    try {
      const csvContent = this.generateCsvContent(contacts);
      
      const fileHandle = await this.requestFileHandle();
      
      if (fileHandle) {
        // Write to actual file
        const writable = await fileHandle.createWritable();
        await writable.write(csvContent);
        await writable.close();
      }
      
      // Always save to localStorage as backup
      this.saveToLocalStorage(csvContent);
    } catch (error) {
      console.error('Error writing contacts to file:', error);
      // Fallback to localStorage only
      const csvContent = this.generateCsvContent(contacts);
      this.saveToLocalStorage(csvContent);
    }
  }

  // Parse CSV content
  private static parseCsvContent(content: string): Contact[] {
    const lines = content.trim().split('\n').filter(line => line.trim());
    if (lines.length <= 1) return []; // Only header or empty
    
    const contacts: Contact[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const contact = this.csvRowToContact(lines[i]);
      if (contact) {
        contacts.push(contact);
      }
    }
    
    return contacts;
  }

  // Generate CSV content
  private static generateCsvContent(contacts: Contact[]): string {
    return [
      this.getCsvHeader(),
      ...contacts.map(contact => this.contactToCsvRow(contact))
    ].join('\n');
  }

  // Read from localStorage (fallback)
  private static readFromLocalStorage(): Contact[] {
    try {
      const contactsJson = localStorage.getItem('WASSENDER_CONTACTS_CSV');
      if (!contactsJson) {
        // If no contacts in localStorage, add sample data
        const sampleContacts: Contact[] = [
          {
            id: 'contact-1',
            supplierName: 'Sean',
            vehicleMake: 'BMW;Mercedes',
            conditions: ['used', 'new', 'aftermarket'] as ('new' | 'used' | 'aftermarket')[],
            partCategory: ['Engine Parts', 'Transmission', 'Brake Pads'],
            whatsappNumber: '+971567191045'
          },
          {
            id: 'contact-2',
            supplierName: 'Easy Car Parts',
            vehicleMake: 'Audi',
            conditions: ['used'] as ('new' | 'used' | 'aftermarket')[],
            partCategory: ['Suspension', 'Electrical', 'Body Parts'],
            whatsappNumber: '+971551776860'
          },
          {
            id: 'contact-3',
            supplierName: 'Jayden',
            vehicleMake: 'BMW;Toyota',
            conditions: ['used'] as ('new' | 'used' | 'aftermarket')[],
            partCategory: ['Engine Parts', 'Cooling System', 'Exhaust'],
            whatsappNumber: '+971566438040'
          }
        ];
        
        // Save sample data to localStorage
        const sampleCsv = this.generateCsvContent(sampleContacts);
        this.saveToLocalStorage(sampleCsv);
        
        return sampleContacts;
      }
      
      return this.parseCsvContent(contactsJson);
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  // Save to localStorage (backup)
  private static saveToLocalStorage(csvContent: string): void {
    try {
      localStorage.setItem('WASSENDER_CONTACTS_CSV', csvContent);
      localStorage.setItem('WASSENDER_CONTACTS_CSV_BACKUP', csvContent);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  // Get all contacts
  static async getAllContacts(): Promise<Contact[]> {
    const contacts = await this.readContactsFromFile();
    console.log('getAllContacts returned:', contacts.length, 'contacts');
    return contacts;
  }

  // Save all contacts
  static async saveAllContacts(contacts: Contact[]): Promise<void> {
    await this.writeContactsToFile(contacts);
  }

  // Add a new contact
  static async addContact(contact: Contact): Promise<void> {
    const contacts = await this.getAllContacts();
    const newContact = {
      ...contact,
      id: contact.id || generateId()
    };
    contacts.push(newContact);
    await this.saveAllContacts(contacts);
  }

  // Update an existing contact
  static async updateContact(updatedContact: Contact): Promise<void> {
    const contacts = await this.getAllContacts();
    const index = contacts.findIndex(contact => contact.id === updatedContact.id);
    
    if (index !== -1) {
      contacts[index] = updatedContact;
      await this.saveAllContacts(contacts);
    } else {
      throw new Error('Contact not found');
    }
  }

  // Delete a contact
  static async deleteContact(contactId: string): Promise<void> {
    const contacts = await this.getAllContacts();
    const filteredContacts = contacts.filter(contact => contact.id !== contactId);
    await this.saveAllContacts(filteredContacts);
  }

  // Search contacts by supplier name
  static async searchContactsBySupplier(supplierName: string): Promise<Contact[]> {
    const contacts = await this.getAllContacts();
    return contacts.filter(contact => 
      contact.supplierName.toLowerCase().includes(supplierName.toLowerCase())
    );
  }

  // Search contacts by vehicle make
  static async searchContactsByVehicleMake(vehicleMake: string): Promise<Contact[]> {
    const contacts = await this.getAllContacts();
    return contacts.filter(contact => 
      contact.vehicleMake.toLowerCase().includes(vehicleMake.toLowerCase())
    );
  }

  // Search contacts by part category
  static async searchContactsByPartCategory(partCategory: string): Promise<Contact[]> {
    const contacts = await this.getAllContacts();
    return contacts.filter(contact => 
      contact.partCategory.some(category => 
        category.toLowerCase().includes(partCategory.toLowerCase())
      )
    );
  }

  // Filter contacts by condition
  static async filterContactsByCondition(condition: 'new' | 'used' | 'aftermarket'): Promise<Contact[]> {
    const contacts = await this.getAllContacts();
    return contacts.filter(contact => 
      contact.conditions.includes(condition)
    );
  }

  // Get contacts count
  static async getContactsCount(): Promise<number> {
    const contacts = await this.getAllContacts();
    return contacts.length;
  }

  // Clear all contacts
  static async clearAllContacts(): Promise<void> {
    await this.writeContactsToFile([]);
  }

  // Export contacts as CSV string
  static async exportContactsAsCsv(): Promise<string> {
    const contacts = await this.getAllContacts();
    return this.generateCsvContent(contacts);
  }

  // Import contacts from CSV string
  static async importContactsFromCsv(csvContent: string): Promise<void> {
    try {
      const contacts = this.parseCsvContent(csvContent);
      
      if (contacts.length === 0) {
        throw new Error('No valid contacts found in CSV');
      }
      
      await this.saveAllContacts(contacts);
    } catch (error) {
      console.error('Error importing contacts from CSV:', error);
      throw new Error('Failed to import contacts from CSV');
    }
  }

  // Create backup
  static async createBackup(): Promise<void> {
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
  static async restoreFromBackup(): Promise<void> {
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

  // Get CSV template
  static getCsvTemplate(): string {
    return [
      this.getCsvHeader(),
      '"example-id-1","ABC Motors","Toyota","new;used","Engine Parts;Transmission","+1234567890"',
      '"example-id-2","XYZ Auto","Honda","new","Brake Pads;Suspension","+0987654321"'
    ].join('\n');
  }

  // Check if file system is available
  static isFileSystemAvailable(): boolean {
    return this.isFileSystemSupported();
  }

  // Get current storage method
  static getStorageMethod(): 'file' | 'localStorage' {
    return this.isFileSystemSupported() ? 'file' : 'localStorage';
  }

  // Check if a file is currently selected
  static hasSelectedFile(): boolean {
    return this.fileHandle !== null;
  }

  // Get the name of the selected file
  static getSelectedFileName(): string | null {
    return this.fileHandle?.name || null;
  }

  // Clear localStorage and reload sample data (for testing)
  static clearLocalStorageAndReload(): void {
    localStorage.removeItem('WASSENDER_CONTACTS_CSV');
    localStorage.removeItem('WASSENDER_CONTACTS_CSV_BACKUP');
    console.log('Cleared localStorage, will reload sample data on next access');
  }
} 