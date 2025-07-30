import { useState } from 'react';
import { Contact, CONDITION_OPTIONS, ConditionType } from '@/types/contact';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter, RotateCcw } from 'lucide-react';

interface FiltersPanelProps {
  contacts: Contact[];
  onFilteredContactsChange: (filteredContacts: Contact[]) => void;
}

export function FiltersPanel({ contacts, onFilteredContactsChange }: FiltersPanelProps) {
  const [partTypeFilter, setPartTypeFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState<ConditionType | 'all'>('all');

  const applyFilters = () => {
    let filtered = contacts;

    // Filter by part type
    if (partTypeFilter.trim()) {
      filtered = filtered.filter((contact) =>
        contact.partType.toLowerCase().includes(partTypeFilter.toLowerCase())
      );
    }

    // Filter by condition
    if (conditionFilter !== 'all') {
      filtered = filtered.filter((contact) => contact.condition === conditionFilter);
    }

    onFilteredContactsChange(filtered);
  };

  const resetFilters = () => {
    setPartTypeFilter('');
    setConditionFilter('all');
    onFilteredContactsChange(contacts);
  };

  const hasActiveFilters = partTypeFilter.trim() !== '' || conditionFilter !== 'all';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="part-type-filter">Part Type</Label>
            <Input
              id="part-type-filter"
              placeholder="Filter by part type..."
              value={partTypeFilter}
              onChange={(e) => setPartTypeFilter(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition-filter">Condition</Label>
            <Select value={conditionFilter} onValueChange={(value) => setConditionFilter(value as ConditionType | 'all')}>
              <SelectTrigger id="condition-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                {CONDITION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col justify-end gap-2">
            <Button onClick={applyFilters} className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Apply Filters
            </Button>
            {hasActiveFilters && (
              <Button 
                variant="outline" 
                onClick={resetFilters}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          Total contacts: {contacts.length}
        </div>
      </CardContent>
    </Card>
  );
}