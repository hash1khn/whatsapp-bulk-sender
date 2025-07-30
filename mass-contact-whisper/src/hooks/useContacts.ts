import { useState, useEffect } from 'react';
import { Contact } from '@/types/contact';
import { fileStorageService } from '@/lib/fileStorage';

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const loadedContacts = await fileStorageService.getAllContacts();
      setContacts(loadedContacts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load contacts'));
    } finally {
      setLoading(false);
    }
  };

  const addContact = async (contact: Contact) => {
    try {
      const newContacts = [...contacts, contact];
      await fileStorageService.saveAllContacts(newContacts);
      setContacts(newContacts);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to add contact');
    }
  };

  const updateContact = async (updatedContact: Contact) => {
    try {
      const newContacts = contacts.map(contact => 
        contact.id === updatedContact.id ? updatedContact : contact
      );
      await fileStorageService.saveAllContacts(newContacts);
      setContacts(newContacts);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update contact');
    }
  };

  const deleteContact = async (contactId: string) => {
    try {
      const newContacts = contacts.filter(contact => contact.id !== contactId);
      await fileStorageService.saveAllContacts(newContacts);
      setContacts(newContacts);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete contact');
    }
  };

  const clearAllContacts = async () => {
    try {
      await fileStorageService.saveAllContacts([]);
      setContacts([]);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to clear contacts');
    }
  };

  // Import contacts from CSV
  const importContactsFromCsv = async (csvContent: string) => {
    try {
      const result = await fileStorageService.importContactsFromCsv(csvContent);
      if (result.success) {
        // Reload contacts after successful import
        await loadContacts();
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error importing contacts:', error);
      throw error;
    }
  };

  const exportContactsAsCsv = async (): Promise<string | null> => {
    try {
      const csvContent = await fileStorageService.exportContactsAsCsv();
      return csvContent;
    } catch (err) {
      console.error('Export failed:', err);
      return null;
    }
  };

  const createBackup = async () => {
    try {
      await fileStorageService.createBackup();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create backup');
    }
  };

  const restoreFromBackup = async () => {
    try {
      await fileStorageService.restoreFromBackup();
      await loadContacts(); // Reload contacts after restore
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to restore from backup');
    }
  };

  const searchBySupplier = (supplierName: string) => {
    return contacts.filter(contact => 
      contact.supplierName.toLowerCase().includes(supplierName.toLowerCase())
    );
  };

  const searchByVehicleMake = (vehicleMake: string) => {
    return contacts.filter(contact => 
      contact.vehicleMake.toLowerCase().includes(vehicleMake.toLowerCase())
    );
  };

  const searchByPartCategory = (partCategory: string) => {
    return contacts.filter(contact => 
      contact.partCategory.some(category => 
        category.toLowerCase().includes(partCategory.toLowerCase())
      )
    );
  };

  const filterByCondition = (condition: 'new' | 'used' | 'aftermarket') => {
    return contacts.filter(contact => 
      contact.conditions.includes(condition)
    );
  };

  return {
    contacts,
    loading,
    error,
    addContact,
    updateContact,
    deleteContact,
    clearAllContacts,
    importContactsFromCsv,
    exportContactsAsCsv,
    createBackup,
    restoreFromBackup,
    searchBySupplier,
    searchByVehicleMake,
    searchByPartCategory,
    filterByCondition,
  };
} 