import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, X } from 'lucide-react';
import { ConditionType, CONDITION_OPTIONS } from '@/types/contact';

interface ConditionMultiSelectProps {
  value: ConditionType[];
  onChange: (conditions: ConditionType[]) => void;
  label?: string;
}

export function ConditionMultiSelect({ value, onChange, label = "Conditions" }: ConditionMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleConditionToggle = (condition: ConditionType) => {
    const newConditions = value.includes(condition)
      ? value.filter(c => c !== condition)
      : [...value, condition];
    onChange(newConditions);
  };

  const removeCondition = (condition: ConditionType) => {
    onChange(value.filter(c => c !== condition));
  };

  const getDisplayText = () => {
    if (value.length === 0) return "Select conditions...";
    if (value.length === 1) return value[0].charAt(0).toUpperCase() + value[0].slice(1);
    if (value.length === CONDITION_OPTIONS.length) return "All conditions";
    return `${value.length} conditions selected`;
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between"
          >
            <span className="truncate">{getDisplayText()}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Select conditions:</span>
              {value.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange([])}
                  className="h-auto p-1 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {CONDITION_OPTIONS.map((condition) => (
                <div key={condition} className="flex items-center space-x-2">
                  <Checkbox
                    id={condition}
                    checked={value.includes(condition)}
                    onCheckedChange={() => handleConditionToggle(condition)}
                  />
                  <Label
                    htmlFor={condition}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {condition.charAt(0).toUpperCase() + condition.slice(1)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Display selected conditions as badges */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {value.map((condition) => (
            <Badge key={condition} variant="secondary" className="text-xs">
              {condition.charAt(0).toUpperCase() + condition.slice(1)}
              <button
                onClick={() => removeCondition(condition)}
                className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
} 