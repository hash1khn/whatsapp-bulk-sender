import { useState, useEffect } from 'react';
import { Contact, CONDITION_OPTIONS } from '@/types/contact';
import { useContacts } from '@/hooks/useContacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Filter, Users, MessageSquare, ArrowRight, MessageCircle, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageComposer } from '@/components/MessageComposer';
import { useNavigate } from 'react-router-dom';

export function Home() {
  const { contacts, searchBySupplier, searchByVehicleMake, searchByPartCategory, filterByCondition } = useContacts();
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [filters, setFilters] = useState({
    supplierName: '',
    vehicleMake: '',
    partCategory: '',
    condition: 'all' as 'all' | Contact['conditions'][0],
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  // Apply filters whenever filters or contacts change
  useEffect(() => {
    let result = [...contacts];

    // Filter by supplier name
    if (filters.supplierName.trim()) {
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
  };

  const handleSendStart = () => {
    toast({
      title: "Sending Started",
      description: `Beginning to send messages to ${filteredContacts.length} contacts`,
    });
  };

  const handleSendComplete = (bulkMessageId: string) => {
    toast({
      title: "Sending Complete",
      description: `Finished sending messages to ${filteredContacts.length} contacts. Campaign ID: ${bulkMessageId}`,
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
    } else {
      setSelectedContacts(new Set());
    }
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    const newSelected = new Set(selectedContacts);
    if (checked) {
      newSelected.add(contactId);
    } else {
      newSelected.delete(contactId);
    }
    setSelectedContacts(newSelected);
    setSelectAll(newSelected.size === filteredContacts.length);
  };

  const removeFromStaging = (contactIds: string[]) => {
    setFilteredContacts(prev => prev.filter(c => !contactIds.includes(c.id)));
    setSelectedContacts(prev => {
      const newSelected = new Set(prev);
      contactIds.forEach(id => newSelected.delete(id));
      return newSelected;
    });
    setSelectAll(false);
    
    toast({
      title: "Contacts removed",
      description: `Removed ${contactIds.length} contact${contactIds.length === 1 ? '' : 's'} from staging`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6" />
                <CardTitle className="text-3xl">WhatsApp Bulk Sender</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/contacts')}
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Manage Contacts
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/chat')}
                  className="flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat Management
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Filter your contacts and send bulk WhatsApp messages. 
              Total contacts: {contacts.length} | Filtered: {filteredContacts.length}
            </p>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="supplierName">Supplier Name</Label>
                <Input
                  id="supplierName"
                  placeholder="Filter by supplier name..."
                  value={filters.supplierName}
                  onChange={(e) => handleFilterChange('supplierName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="vehicleMake">Vehicle Make</Label>
                <Input
                  id="vehicleMake"
                  placeholder="Filter by vehicle make..."
                  value={filters.vehicleMake}
                  onChange={(e) => handleFilterChange('vehicleMake', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="partCategory">Part Category</Label>
                <Input
                  id="partCategory"
                  placeholder="Filter by part category..."
                  value={filters.partCategory}
                  onChange={(e) => handleFilterChange('partCategory', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="condition">Condition</Label>
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
                <Badge variant="secondary">
                  {filteredContacts.length} contacts selected
                </Badge>
                {filters.supplierName || filters.vehicleMake || filters.partCategory || filters.condition !== 'all' ? (
                  <Badge variant="outline">
                    Filters active
                  </Badge>
                ) : null}
              </div>
              <Button
                variant="outline"
                onClick={resetFilters}
                className="flex items-center gap-2"
              >
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Staged Contacts */}
        {filteredContacts.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Staged Contacts ({filteredContacts.length})</CardTitle>
                {selectedContacts.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeFromStaging(Array.from(selectedContacts))}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove Selected ({selectedContacts.size})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Vehicle Make</TableHead>
                    <TableHead>Part Category</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>WhatsApp Number</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedContacts.has(contact.id)}
                          onCheckedChange={(checked) => handleSelectContact(contact.id, checked as boolean)}
                          aria-label={`Select ${contact.supplierName}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {contact.supplierName}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contact.vehicleMake.split(';').map((make, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {make.trim()}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contact.partCategory.map((category, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {category.trim()}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(contact.conditions || []).map((condition, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {condition.charAt(0).toUpperCase() + condition.slice(1)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {contact.whatsappNumber}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromStaging([contact.id])}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Message Composer */}
        {filteredContacts.length > 0 && (
          <MessageComposer
            filteredContacts={filteredContacts}
            onSendStart={handleSendStart}
            onSendComplete={handleSendComplete}
          />
        )}

        {/* Empty State */}
        {filteredContacts.length === 0 && contacts.length > 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                No contacts match your current filters. Try adjusting your search criteria.
              </p>
            </CardContent>
          </Card>
        )}

        {/* No Contacts State */}
        {contacts.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No contacts found. Add your first contact to get started.
              </p>
              <Button
                onClick={() => navigate('/contacts')}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Manage Contacts
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 