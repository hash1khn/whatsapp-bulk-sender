import { useState, useEffect } from 'react';
import { Contact, CONDITION_OPTIONS } from '@/types/contact';
import { useContacts } from '@/hooks/useContacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, Upload, Download, ArrowLeft, Search, Filter, X, Settings, Users, Car, Package, Phone } from 'lucide-react';
import { generateId, formatWhatsAppNumber, isValidWhatsAppNumber } from '@/lib/utils';
import { CsvImport } from '@/components/CsvImport';
import { CsvManagement } from '@/components/CsvManagement';
import { StorageStatus } from '@/components/StorageStatus';
import { ConditionMultiSelect } from '@/components/ConditionMultiSelect';
import { useNavigate } from 'react-router-dom';
import { TableEditor } from '@/components/TableEditor';
import { SettingsModal } from '@/components/SettingsModal';

export function Contacts() {
  const {
    contacts,
    loading,
    error,
    addContact,
    updateContact,
    deleteContact,
    clearAllContacts,
    exportContactsAsCsv,
    importContactsFromCsv,
    createBackup,
    restoreFromBackup,
    searchBySupplier,
    searchByVehicleMake,
    searchByPartCategory,
    filterByCondition,
  } = useContacts();
  const navigate = useNavigate();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [newContact, setNewContact] = useState<Partial<Contact>>({
    supplierName: '',
    vehicleMake: '',
    conditions: ['new'],
    partCategory: [],
    whatsappNumber: '',
  });
  const [filters, setFilters] = useState({
    supplierName: '',
    vehicleMake: '',
    partCategory: '',
    condition: 'all' as 'all' | Contact['conditions'][0],
  });
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const { toast } = useToast();

  // Apply filters whenever filters or contacts change
  useEffect(() => {
    let result = [...contacts];

    // Filter by supplier name
    if (filters.supplierName.trim()) {
      // Use local filtering for now since searchBySupplier is async
      result = result.filter(contact => 
        contact.supplierName.toLowerCase().includes(filters.supplierName.toLowerCase())
      );
    }

    // Filter by vehicle make
    if (filters.vehicleMake.trim()) {
      result = result.filter(contact => 
        contact.vehicleMake.toLowerCase().includes(filters.vehicleMake.toLowerCase())
      );
    }

    // Filter by part category
    if (filters.partCategory.trim()) {
      result = result.filter(contact => 
        contact.partCategory.some(category => 
          category.toLowerCase().includes(filters.partCategory.toLowerCase())
        )
      );
    }

    // Filter by condition
    if (filters.condition !== 'all') {
      result = result.filter(contact => (contact.conditions || []).includes(filters.condition as Contact['conditions'][0]));
    }

    setFilteredContacts(result);
  }, [filters, contacts]);

  // Handle select all checkbox
  useEffect(() => {
    if (selectAll) {
      setSelectedContacts(new Set(filteredContacts.map(contact => contact.id)));
    } else {
      setSelectedContacts(new Set());
    }
  }, [selectAll, filteredContacts]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      supplierName: '',
      vehicleMake: '',
      partCategory: '',
      condition: 'all',
    });
    setSelectedContacts(new Set());
    setSelectAll(false);
  };

  const handleContactSelection = (contactId: string, checked: boolean) => {
    const newSelected = new Set(selectedContacts);
    if (checked) {
      newSelected.add(contactId);
    } else {
      newSelected.delete(contactId);
    }
    setSelectedContacts(newSelected);
    
    // Update select all state
    if (newSelected.size === filteredContacts.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedContacts.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select contacts to delete",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Are you sure you want to delete ${selectedContacts.size} selected contacts?`)) {
      selectedContacts.forEach(contactId => {
        deleteContact(contactId);
      });
      setSelectedContacts(new Set());
      setSelectAll(false);
      
      toast({
        title: "Bulk Delete Complete",
        description: `Deleted ${selectedContacts.size} contacts`,
      });
    }
  };

  const handleBulkExport = () => {
    if (selectedContacts.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select contacts to export",
        variant: "destructive",
      });
      return;
    }

    const selectedContactData = filteredContacts.filter(contact => 
      selectedContacts.has(contact.id)
    );
    
    const jsonData = JSON.stringify(selectedContactData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected-contacts.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Exported ${selectedContacts.size} selected contacts`,
    });
  };

  const handleAddContact = async () => {
    if (!newContact.supplierName || !newContact.vehicleMake || !newContact.whatsappNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!isValidWhatsAppNumber(newContact.whatsappNumber)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid WhatsApp number",
        variant: "destructive",
      });
      return;
    }

    const contact: Contact = {
      id: generateId(),
      supplierName: newContact.supplierName,
      vehicleMake: newContact.vehicleMake,
      conditions: newContact.conditions as Contact['conditions'],
      partCategory: newContact.partCategory || [],
      whatsappNumber: formatWhatsAppNumber(newContact.whatsappNumber),
    };

    await addContact(contact);
    setNewContact({
      supplierName: '',
      vehicleMake: '',
      conditions: ['new'],
      partCategory: [],
      whatsappNumber: '',
    });
    setIsAddDialogOpen(false);
    
    toast({
      title: "Contact Added",
      description: `Added ${contact.supplierName} to your contacts`,
    });
  };

  const handleUpdateContact = async (contact: Contact) => {
    await updateContact(contact);
    setEditingContact(null);
    
    toast({
      title: "Contact Updated",
      description: `Updated ${contact.supplierName}`,
    });
  };

  const handleDeleteContact = async (contact: Contact) => {
    await deleteContact(contact.id);
    
    toast({
      title: "Contact Deleted",
      description: `Removed ${contact.supplierName} from your contacts`,
    });
  };





  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Button>
                <CardTitle className="text-3xl">Contact Management</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Manage your contacts, import from CSV, and organize your supplier database.
              Total contacts: {contacts.length}
            </p>
          </CardContent>
        </Card>

        {/* Search and Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="searchSupplier">Supplier Name</Label>
                <Input
                  id="searchSupplier"
                  placeholder="Search by supplier name..."
                  value={filters.supplierName}
                  onChange={(e) => handleFilterChange('supplierName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="searchVehicleMake">Vehicle Make</Label>
                <Input
                  id="searchVehicleMake"
                  placeholder="Search by vehicle make..."
                  value={filters.vehicleMake}
                  onChange={(e) => handleFilterChange('vehicleMake', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="searchPartCategory">Part Category</Label>
                <Input
                  id="searchPartCategory"
                  placeholder="Search by part category..."
                  value={filters.partCategory}
                  onChange={(e) => handleFilterChange('partCategory', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="filterCondition">Condition</Label>
                <Select
                  value={filters.condition}
                  onValueChange={(value) => handleFilterChange('condition', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Conditions</SelectItem>
                    {CONDITION_OPTIONS.map(condition => (
                      <SelectItem key={condition} value={condition}>
                        {condition.charAt(0).toUpperCase() + condition.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Reset Filters
                </Button>
                <span className="text-sm text-muted-foreground">
                  Showing {filteredContacts.length} of {contacts.length} contacts
                </span>
              </div>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Contact
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedContacts.size > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedContacts.size} contact{selectedContacts.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleBulkExport}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export Selected
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Contact Button */}
        <div className="flex justify-end">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="supplierName">Supplier Name *</Label>
                  <Input
                    id="supplierName"
                    value={newContact.supplierName}
                    onChange={(e) => setNewContact(prev => ({ ...prev, supplierName: e.target.value }))}
                    placeholder="Enter supplier name"
                  />
                </div>
                <div>
                  <Label htmlFor="vehicleMake">Vehicle Make *</Label>
                  <Input
                    id="vehicleMake"
                    value={newContact.vehicleMake}
                    onChange={(e) => setNewContact(prev => ({ ...prev, vehicleMake: e.target.value }))}
                    placeholder="e.g., Toyota, Honda, BMW"
                  />
                </div>
                <div>
                  <Label htmlFor="partCategory">Part Category</Label>
                  <Input
                    id="partCategory"
                    value={newContact.partCategory?.join(', ') || ''}
                    onChange={(e) => setNewContact(prev => ({ 
                      ...prev, 
                      partCategory: e.target.value.split(',').map(cat => cat.trim()).filter(cat => cat !== '')
                    }))}
                    placeholder="e.g., Engine Parts, Brake Pads (comma separated)"
                  />
                </div>
                <div>
                  <ConditionMultiSelect
                    value={newContact.conditions || []}
                    onChange={(conditions) => setNewContact(prev => ({ ...prev, conditions }))}
                    label="Conditions"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsappNumber">WhatsApp Number *</Label>
                  <Input
                    id="whatsappNumber"
                    value={newContact.whatsappNumber}
                    onChange={(e) => setNewContact(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                    placeholder="+1234567890"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddContact}>
                    Add Contact
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Contacts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contacts ({filteredContacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TableEditor
              data={filteredContacts}
              selectedRows={selectedContacts}
              onSelectionChange={setSelectedContacts}
              onSelectAll={setSelectAll}
              selectAll={selectAll}
              onEdit={handleUpdateContact}
              onDelete={handleDeleteContact}
              columns={[
                {
                  key: 'supplierName',
                  header: 'Supplier Name',
                  cell: (contact) => (
                    <div className="font-medium">{contact.supplierName}</div>
                  ),
                },
                {
                  key: 'vehicleMake',
                  header: 'Vehicle Makes',
                  cell: (contact) => (
                    <div className="flex flex-wrap gap-1">
                      {contact.vehicleMake.split(';').map((make, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {make.trim()}
                        </span>
                      ))}
                    </div>
                  ),
                },
                {
                  key: 'partCategory',
                  header: 'Part Categories',
                  cell: (contact) => (
                    <div className="flex flex-wrap gap-1">
                      {contact.partCategory.map((category, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  ),
                },
                {
                  key: 'conditions',
                  header: 'Conditions',
                  cell: (contact) => (
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
                  ),
                },
                {
                  key: 'whatsappNumber',
                  header: 'WhatsApp',
                  cell: (contact) => (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-green-600" />
                      <span className="font-mono text-sm">{contact.whatsappNumber}</span>
                    </div>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onImportComplete={async () => {
            toast({
              title: "Contacts Imported",
              description: "Contacts have been imported successfully",
            });
          }}
          onExport={async () => {
            await exportContactsAsCsv();
          }}
          onCreateBackup={createBackup}
          onRestoreBackup={restoreFromBackup}
        />
      </div>
    </div>
  );
} 