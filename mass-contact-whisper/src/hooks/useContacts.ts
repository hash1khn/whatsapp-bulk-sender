import { useState, useEffect, useCallback } from 'react';
import { Contact } from '../types/contact';
import { ContactStorageService } from '../lib/storage';

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load contacts from CSV storage on mount
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const storedContacts = await ContactStorageService.getAllContacts();
        setContacts(storedContacts);
      } catch (err) {
        setError('Failed to load contacts');
        console.error('Error loading contacts:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadContacts();
  }, []);

  // Add a new contact
  const addContact = useCallback(async (contact: Contact) => {
    try {
      await ContactStorageService.addContact(contact);
      setContacts(prev => [...prev, contact]);
      setError(null);
    } catch (err) {
      setError('Failed to add contact');
      console.error('Error adding contact:', err);
    }
  }, []);

  // Update an existing contact
  const updateContact = useCallback(async (updatedContact: Contact) => {
    try {
      await ContactStorageService.updateContact(updatedContact);
      setContacts(prev => 
        prev.map(contact => 
          contact.id === updatedContact.id ? updatedContact : contact
        )
      );
      setError(null);
    } catch (err) {
      setError('Failed to update contact');
      console.error('Error updating contact:', err);
    }
  }, []);

  // Delete a contact
  const deleteContact = useCallback(async (contactId: string) => {
    try {
      await ContactStorageService.deleteContact(contactId);
      setContacts(prev => prev.filter(contact => contact.id !== contactId));
      setError(null);
    } catch (err) {
      setError('Failed to delete contact');
      console.error('Error deleting contact:', err);
    }
  }, []);

  // Search contacts by supplier name
  const searchBySupplier = useCallback(async (supplierName: string) => {
    return await ContactStorageService.searchContactsBySupplier(supplierName);
  }, []);

  // Search contacts by vehicle make
  const searchByVehicleMake = useCallback(async (vehicleMake: string) => {
    return await ContactStorageService.searchContactsByVehicleMake(vehicleMake);
  }, []);

  // Search contacts by part category
  const searchByPartCategory = useCallback(async (partCategory: string) => {
    return await ContactStorageService.searchContactsByPartCategory(partCategory);
  }, []);

  // Filter contacts by condition
  const filterByCondition = useCallback(async (condition: 'new' | 'used' | 'aftermarket') => {
    return await ContactStorageService.filterContactsByCondition(condition);
  }, []);

  // Clear all contacts
  const clearAllContacts = useCallback(async () => {
    try {
      await ContactStorageService.clearAllContacts();
      setContacts([]);
      setError(null);
    } catch (err) {
      setError('Failed to clear contacts');
      console.error('Error clearing contacts:', err);
    }
  }, []);

  // Export contacts as CSV
  const exportContactsAsCsv = useCallback(async () => {
    try {
      return await ContactStorageService.exportContactsAsCsv();
    } catch (err) {
      setError('Failed to export contacts');
      console.error('Error exporting contacts:', err);
      return null;
    }
  }, []);

  // Export contacts as JSON
  const exportContactsAsJson = useCallback(async () => {
    try {
      return await ContactStorageService.exportContactsAsJson();
    } catch (err) {
      setError('Failed to export contacts');
      console.error('Error exporting contacts:', err);
      return null;
    }
  }, []);

  // Import contacts from CSV
  const importContactsFromCsv = useCallback(async (csvContent: string) => {
    try {
      await ContactStorageService.importContactsFromCsv(csvContent);
      const importedContacts = await ContactStorageService.getAllContacts();
      setContacts(importedContacts);
      setError(null);
    } catch (err) {
      setError('Failed to import contacts');
      console.error('Error importing contacts:', err);
    }
  }, []);

  // Import contacts from JSON
  const importContactsFromJson = useCallback(async (contactsJson: string) => {
    try {
      await ContactStorageService.importContactsFromJson(contactsJson);
      const importedContacts = await ContactStorageService.getAllContacts();
      setContacts(importedContacts);
      setError(null);
    } catch (err) {
      setError('Failed to import contacts');
      console.error('Error importing contacts:', err);
    }
  }, []);

  // Get contacts count
  const getContactsCount = useCallback(async () => {
    return await ContactStorageService.getContactsCount();
  }, []);

  // Create backup
  const createBackup = useCallback(async () => {
    try {
      await ContactStorageService.createBackup();
      setError(null);
    } catch (err) {
      setError('Failed to create backup');
      console.error('Error creating backup:', err);
    }
  }, []);

  // Restore from backup
  const restoreFromBackup = useCallback(async () => {
    try {
      await ContactStorageService.restoreFromBackup();
      const restoredContacts = await ContactStorageService.getAllContacts();
      setContacts(restoredContacts);
      setError(null);
    } catch (err) {
      setError('Failed to restore from backup');
      console.error('Error restoring from backup:', err);
    }
  }, []);

  // Legacy methods for backward compatibility
  const exportContacts = useCallback(() => {
    console.warn('exportContacts() is deprecated, use exportContactsAsJson() instead');
    return '[]';
  }, []);

  const importContacts = useCallback((contactsJson: string) => {
    console.warn('importContacts() is deprecated, use importContactsFromJson() instead');
    importContactsFromJson(contactsJson);
  }, [importContactsFromJson]);

  return {
    contacts,
    loading,
    error,
    addContact,
    updateContact,
    deleteContact,
    searchBySupplier,
    searchByVehicleMake,
    searchByPartCategory,
    filterByCondition,
    clearAllContacts,
    exportContactsAsCsv,
    exportContactsAsJson,
    importContactsFromCsv,
    importContactsFromJson,
    getContactsCount,
    createBackup,
    restoreFromBackup,
    // Legacy methods for backward compatibility
    exportContacts,
    importContacts,
  };
} 