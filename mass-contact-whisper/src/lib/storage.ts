import { Contact } from '../types/contact';
import { CONFIG } from './config';
import { FileStorageService } from './fileStorage';

// Contact Storage Service - Now uses CSV storage with localStorage fallback
export class ContactStorageService {
  private static readonly STORAGE_KEY = CONFIG.STORAGE_KEYS.CONTACTS;

  // Get all contacts - try file storage first, then localStorage fallback
  static async getAllContacts(): Promise<Contact[]> {
    try {
      // Try file storage first (only if file is selected)
      const fileContacts = await FileStorageService.getAllContacts();
      if (fileContacts.length > 0) {
        return fileContacts;
      }
      
      // Fallback to localStorage for backward compatibility
      const contactsJson = localStorage.getItem(this.STORAGE_KEY);
      if (!contactsJson) return [];
      
      const contacts = JSON.parse(contactsJson) as Contact[];
      if (!Array.isArray(contacts)) return [];
      
      // Migrate old contacts that have single 'condition' field to new 'conditions' array
      const migratedContacts = contacts.map(contact => {
        if ('condition' in contact && !('conditions' in contact)) {
          // Migrate old format to new format
          const oldContact = contact as any;
          return {
            id: oldContact.id,
            supplierName: oldContact.supplierName,
            vehicleMake: oldContact.partType || oldContact.vehicleMake || '',
            conditions: [oldContact.condition],
            partCategory: oldContact.partCategory || [],
            whatsappNumber: oldContact.whatsappNumber,
          } as Contact;
        }
        return contact;
      });
      
      // Only migrate to file storage if a file is actually selected
      if (migratedContacts.length > 0) {
        await FileStorageService.saveAllContacts(migratedContacts);
        // Clear old localStorage data
        localStorage.removeItem(this.STORAGE_KEY);
      }
      
      return migratedContacts;
    } catch (error) {
      console.error('Error reading contacts:', error);
      return [];
    }
  }

  // Save all contacts - use file storage
  static async saveAllContacts(contacts: Contact[]): Promise<void> {
    try {
      await FileStorageService.saveAllContacts(contacts);
    } catch (error) {
      console.error('Error saving contacts:', error);
      throw new Error('Failed to save contacts');
    }
  }

  // Add a new contact
  static async addContact(contact: Contact): Promise<void> {
    await FileStorageService.addContact(contact);
  }

  // Update an existing contact
  static async updateContact(updatedContact: Contact): Promise<void> {
    await FileStorageService.updateContact(updatedContact);
  }

  // Delete a contact by ID
  static async deleteContact(contactId: string): Promise<void> {
    await FileStorageService.deleteContact(contactId);
  }

  // Get a contact by ID
  static async getContactById(contactId: string): Promise<Contact | undefined> {
    const contacts = await this.getAllContacts();
    return contacts.find(contact => contact.id === contactId);
  }

  // Search contacts by supplier name
  static async searchContactsBySupplier(supplierName: string): Promise<Contact[]> {
    return await FileStorageService.searchContactsBySupplier(supplierName);
  }

  // Search contacts by vehicle make
  static async searchContactsByVehicleMake(vehicleMake: string): Promise<Contact[]> {
    return await FileStorageService.searchContactsByVehicleMake(vehicleMake);
  }

  // Search contacts by part category
  static async searchContactsByPartCategory(partCategory: string): Promise<Contact[]> {
    return await FileStorageService.searchContactsByPartCategory(partCategory);
  }

  // Filter contacts by condition
  static async filterContactsByCondition(condition: 'new' | 'used' | 'aftermarket'): Promise<Contact[]> {
    return await FileStorageService.filterContactsByCondition(condition);
  }

  // Clear all contacts
  static async clearAllContacts(): Promise<void> {
    await FileStorageService.clearAllContacts();
  }

  // Get contacts count
  static async getContactsCount(): Promise<number> {
    return await FileStorageService.getContactsCount();
  }

  // Export contacts as CSV
  static async exportContactsAsCsv(): Promise<string> {
    return await FileStorageService.exportContactsAsCsv();
  }

  // Export contacts as JSON (for backward compatibility)
  static async exportContactsAsJson(): Promise<string> {
    const contacts = await this.getAllContacts();
    return JSON.stringify(contacts, null, 2);
  }

  // Import contacts from CSV
  static async importContactsFromCsv(csvContent: string): Promise<void> {
    await FileStorageService.importContactsFromCsv(csvContent);
  }

  // Import contacts from JSON (for backward compatibility)
  static async importContactsFromJson(contactsJson: string): Promise<void> {
    try {
      const contacts = JSON.parse(contactsJson) as Contact[];
      if (Array.isArray(contacts)) {
        await this.saveAllContacts(contacts);
      } else {
        throw new Error('Invalid contacts format');
      }
    } catch (error) {
      console.error('Error importing contacts:', error);
      throw new Error('Failed to import contacts');
    }
  }

  // Create backup
  static async createBackup(): Promise<void> {
    await FileStorageService.createBackup();
  }

  // Restore from backup
  static async restoreFromBackup(): Promise<void> {
    await FileStorageService.restoreFromBackup();
  }

  // Get CSV template
  static getCsvTemplate(): string {
    return FileStorageService.getCsvTemplate();
  }

  // Legacy methods for backward compatibility
  static exportContacts(): string {
    // This is now deprecated, use exportContactsAsJson instead
    console.warn('exportContacts() is deprecated, use exportContactsAsJson() instead');
    return '[]';
  }

  static importContacts(contactsJson: string): void {
    // This is now deprecated, use importContactsFromJson instead
    console.warn('importContacts() is deprecated, use importContactsFromJson() instead');
    this.importContactsFromJson(contactsJson).catch(console.error);
  }
} 