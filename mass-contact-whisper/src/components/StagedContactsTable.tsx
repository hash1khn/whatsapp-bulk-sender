import { useState, useEffect } from 'react';
import { Contact } from '@/types/contact';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Phone } from 'lucide-react';

interface StagedContactsTableProps {
  contacts: Contact[];
  selectedContacts: Set<string>;
  onSelectionChange: (selectedContacts: Set<string>) => void;
}

export function StagedContactsTable({ 
  contacts, 
  selectedContacts, 
  onSelectionChange 
}: StagedContactsTableProps) {
  const [selectAll, setSelectAll] = useState(true);

  // Don't auto-select contacts - let user choose manually
  // useEffect(() => {
  //   if (contacts.length > 0 && selectedContacts.size === 0) {
  //     const allContactIds = new Set(contacts.map(contact => contact.id));
  //     onSelectionChange(allContactIds);
  //     setSelectAll(true);
  //   }
  // }, [contacts, onSelectionChange]);

  // Update select all state when selectedContacts changes
  useEffect(() => {
    if (contacts.length > 0) {
      setSelectAll(selectedContacts.size === contacts.length);
    }
  }, [selectedContacts, contacts]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allContactIds = new Set(contacts.map(contact => contact.id));
      onSelectionChange(allContactIds);
      setSelectAll(true);
    } else {
      onSelectionChange(new Set());
      setSelectAll(false);
    }
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    const newSelected = new Set(selectedContacts);
    if (checked) {
      newSelected.add(contactId);
    } else {
      newSelected.delete(contactId);
    }
    onSelectionChange(newSelected);
  };

  const renderVehicleMakes = (vehicleMake: string) => {
    const makes = vehicleMake.split(';').map(make => make.trim());
    if (makes.length <= 2) {
      return (
        <div className="flex flex-wrap gap-1">
          {makes.map((make, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {make}
            </span>
          ))}
        </div>
      );
    } else {
      return (
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {makes[0]}
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {makes[1]}
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200">
            +{makes.length - 2} more
          </span>
        </div>
      );
    }
  };

  const renderPartCategories = (partCategories: string[]) => {
    if (partCategories.length === 1 && partCategories[0] === 'All') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          All
        </span>
      );
    }
    
    if (partCategories.length <= 2) {
      return (
        <div className="flex flex-wrap gap-1">
          {partCategories.map((category, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
            >
              {category}
            </span>
          ))}
        </div>
      );
    } else {
      return (
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {partCategories[0]}
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {partCategories[1]}
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200">
            +{partCategories.length - 2} more
          </span>
        </div>
      );
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectAll}
                onCheckedChange={handleSelectAll}
                aria-label="Select all staged contacts"
              />
            </TableHead>
            <TableHead>Supplier Name</TableHead>
            <TableHead>Vehicle Makes</TableHead>
            <TableHead>Part Categories</TableHead>
            <TableHead>Conditions</TableHead>
            <TableHead>WhatsApp Number</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id}>
              <TableCell>
                <Checkbox
                  checked={selectedContacts.has(contact.id)}
                  onCheckedChange={(checked) => handleSelectContact(contact.id, checked as boolean)}
                  aria-label={`Select ${contact.supplierName}`}
                />
              </TableCell>
              <TableCell>
                <div className="font-medium">{contact.supplierName}</div>
              </TableCell>
              <TableCell>
                {renderVehicleMakes(contact.vehicleMake)}
              </TableCell>
              <TableCell>
                {renderPartCategories(contact.partCategory)}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {contact.conditions.map((condition, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                    >
                      {condition}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-green-600" />
                  <span className="font-mono text-sm">{contact.whatsappNumber}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 