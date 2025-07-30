import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Key } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onApiKeySet: (apiKey: string) => void;
}

export function ApiKeyModal({ isOpen, onApiKeySet }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Wassender API key",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      localStorage.setItem('WASSENDER_API_KEY', apiKey.trim());
      onApiKeySet(apiKey.trim());
      toast({
        title: "Success",
        description: "API key saved successfully!",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to save API key",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Enter Wassender API Key
          </DialogTitle>
          <DialogDescription>
            Please enter your Wassender API key to start sending WhatsApp messages.
            You can find this in your Wassender dashboard.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your Wassender API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save API Key'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}