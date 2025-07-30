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
import { Filter, Users, MessageSquare, ArrowRight, MessageCircle, Trash2, ChevronRight, ChevronLeft, Send, ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageComposer } from '@/components/MessageComposer';
import { useNavigate } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StagedContactsTable } from '@/components/StagedContactsTable';

// Define interfaces for message data
interface Part {
  id: string;
  qty: string;
  name: string;
  number?: string;
}

interface MessageData {
  messageTitle: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  additionalDetails: string;
  parts: Part[];
  imageFiles: File[];
  imagePreviews: string[];
  uploadedImageUrls: string[];
}

export function Home() {
  const { contacts, searchBySupplier, searchByVehicleMake, searchByPartCategory, filterByCondition } = useContacts();
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [messageData, setMessageData] = useState<MessageData>({
    messageTitle: '',
    make: '',
    model: '',
    year: '',
    vin: '',
    additionalDetails: '',
    parts: [],
    imageFiles: [],
    imagePreviews: [],
    uploadedImageUrls: []
  });
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
    
    // Clear selected contacts when filters change - only show filtered contacts
    setSelectedContacts(new Set());
    setSelectAll(false);
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
    // Clear selections when resetting filters
    setSelectedContacts(new Set());
    setSelectAll(false);
  };

  const handleSendStart = () => {
    const selectedContactsList = filteredContacts.filter(contact => selectedContacts.has(contact.id));
    toast({
      title: "Sending Started",
      description: `Beginning to send messages to ${selectedContactsList.length} contacts`,
    });
  };

  const handleSendComplete = (bulkMessageId: string) => {
    const selectedContactsList = filteredContacts.filter(contact => selectedContacts.has(contact.id));
    toast({
      title: "Sending Complete",
      description: `Finished sending messages to ${selectedContactsList.length} contacts. Campaign ID: ${bulkMessageId}`,
    });
    setCurrentStep(1); // Reset to first step after sending
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



  const nextStep = () => {
    if (currentStep < 3) {
      if (currentStep === 1 && selectedContacts.size === 0) {
        toast({
          title: "No contacts selected",
          description: "Please select at least one contact before proceeding",
          variant: "destructive",
        });
        return;
      }
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleMessageDataChange = (newData: Partial<MessageData>) => {
    setMessageData(prev => ({ ...prev, ...newData }));
  };

  const getFinalMessage = () => {
    let message = `> Part Request - ${messageData.make} ${messageData.model} ${messageData.year}\n`;
    message += `_VIN: ${messageData.vin}_\n\n`;
    
    // Add parts
    messageData.parts.forEach(part => {
      message += `${part.qty} - ${part.name}${part.number ? ` - ${part.number}` : ''}\n`;
    });

    // Add additional details if present
    if (messageData.additionalDetails.trim()) {
      message += `\n${messageData.additionalDetails.trim()}\n`;
    }

    if (messageData.uploadedImageUrls.length > 0) {
      message += '\nPHOTOS HERE:\n';
      message += messageData.uploadedImageUrls[0];
    }

    return message;
  };

  const VehicleMakeCell = ({ makes }: { makes: string[] }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const displayCount = 2; // Number of makes to show initially
    
    if (makes.length <= displayCount) {
      return (
        <div className="flex flex-wrap gap-1">
          {makes.map((make, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {make.trim()}
            </Badge>
          ))}
        </div>
      );
    }

    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {makes.slice(0, displayCount).map((make, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {make.trim()}
              </Badge>
            ))}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 px-2 text-xs">
                +{makes.length - displayCount} more
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap gap-1 pt-2">
              {makes.slice(displayCount).map((make, index) => (
                <Badge key={index + displayCount} variant="outline" className="text-xs">
                  {make.trim()}
                </Badge>
              ))}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  const PartCategoryCell = ({ categories }: { categories: string[] }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const displayCount = 2; // Number of categories to show initially
    
    if (categories.length <= displayCount) {
      return (
        <div className="flex flex-wrap gap-1">
          {categories.map((category, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {category.trim()}
            </Badge>
          ))}
        </div>
      );
    }

    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {categories.slice(0, displayCount).map((category, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {category.trim()}
              </Badge>
            ))}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 px-2 text-xs">
                +{categories.length - displayCount} more
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap gap-1 pt-2">
              {categories.slice(displayCount).map((category, index) => (
                <Badge key={index + displayCount} variant="outline" className="text-xs">
                  {category.trim()}
                </Badge>
              ))}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
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
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Filter your contacts and send bulk WhatsApp messages. 
                Total contacts: {contacts.length} | Filtered: {filteredContacts.length}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</div>
                  <span className={currentStep === 1 ? 'font-medium' : 'text-muted-foreground'}>Filter & Stage</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
                  <span className={currentStep === 2 ? 'font-medium' : 'text-muted-foreground'}>Compose Message</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</div>
                  <span className={currentStep === 3 ? 'font-medium' : 'text-muted-foreground'}>Preview & Send</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Filter & Stage */}
        {currentStep === 1 && (
          <>
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
                      {selectedContacts.size} of {filteredContacts.length} contacts selected
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
                  <CardTitle>Staged Contacts ({selectedContacts.size})</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedContacts.size === 0 && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        💡 Select the contacts you want to send messages to by checking the boxes below.
                      </p>
                    </div>
                  )}
                  <StagedContactsTable
                    contacts={filteredContacts}
                    selectedContacts={selectedContacts}
                    onSelectionChange={setSelectedContacts}
                  />
                </CardContent>
              </Card>
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
          </>
        )}

        {/* Step 2: Message Composer */}
        {currentStep === 2 && selectedContacts.size > 0 && (
          <MessageComposer
            filteredContacts={filteredContacts.filter(contact => selectedContacts.has(contact.id))}
            onSendStart={handleSendStart}
            onSendComplete={handleSendComplete}
            messageData={messageData}
            onMessageDataChange={handleMessageDataChange}
            onNextStage={nextStep}
          />
        )}

        {/* Step 3: Preview & Send */}
        {currentStep === 3 && selectedContacts.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Preview & Send</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* WhatsApp Message Preview */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">WhatsApp Message Preview</h3>
                <div className="relative bg-[#efeae2] rounded-lg p-4 min-h-[400px] flex flex-col justify-end" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1d5db' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}>
                  <div className="flex justify-end mb-4">
                    <div className="max-w-[85%] bg-green-500 text-white rounded-lg p-3 shadow-sm relative text-left">
                    {/* Message Content */}
                    <div className="space-y-2">
                      {/* Header with vehicle info */}
                      <div className="border-l-4 border-white pl-2">
                        <div className="font-medium text-sm">
                          Part Request - {messageData.make} {messageData.model} {messageData.year}
                        </div>
                      </div>
                      
                      {/* VIN */}
                      <div className="text-sm opacity-90">
                        <em>VIN: {messageData.vin || 'Not provided'}</em>
                      </div>
                      
                      {/* Parts List */}
                      <div className="space-y-1">
                        {messageData.parts.map((part, index) => (
                          <div key={index} className="text-sm">
                            {part.qty} - {part.name}{part.number ? ` - ${part.number}` : ''}
                          </div>
                        ))}
                      </div>
                      
                      {/* Additional Details */}
                      {messageData.additionalDetails.trim() && (
                        <div className="text-sm pt-2 border-t border-white border-opacity-20">
                          {messageData.additionalDetails.trim()}
                        </div>
                      )}
                      
                      {/* Images Section */}
                      {messageData.uploadedImageUrls.length > 0 && (
                        <div className="pt-2 border-t border-white border-opacity-20">
                          <div className="text-sm mb-2">PHOTOS HERE:</div>
                          <div className="space-y-1">
                            {messageData.uploadedImageUrls.map((url, index) => (
                              <div key={index} className="text-xs break-all">
                                Reference {index + 1}: {url}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* WhatsApp Message Metadata */}
                    <div className="flex items-center justify-end gap-1 mt-2 text-xs opacity-70">
                      <span>19:19</span>
                      <div className="flex items-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                        </svg>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </div>

              {/* Selected Contacts */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Selected Contacts ({selectedContacts.size})</h3>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-4">
                  <div className="space-y-2">
                    {filteredContacts.filter(contact => selectedContacts.has(contact.id)).map(contact => (
                      <div key={contact.id} className="flex items-center justify-between">
                        <span className="font-medium">{contact.supplierName}</span>
                        <span className="font-mono text-sm">{contact.whatsappNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-4">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={prevStep}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          {currentStep === 1 && (
            <Button
              onClick={nextStep}
              disabled={selectedContacts.size === 0}
              className="flex items-center gap-2 ml-auto"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {currentStep === 3 && (
            <Button
              onClick={() => {
                handleSendStart();
                // Trigger send functionality from MessageComposer
                const finalMessage = getFinalMessage();
                // TODO: Implement send functionality here
              }}
              className="flex items-center gap-2 ml-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="h-4 w-4" />
              Send to {selectedContacts.size} Contact{selectedContacts.size !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 