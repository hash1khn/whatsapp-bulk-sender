import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Key } from 'lucide-react';
import { checkApiStatus } from '@/api/wassender';

interface ApiKeyModalProps {
  isOpen: boolean;
  onApiKeySet: (apiKey: string) => void;
  onClose: () => void;
}

export function ApiKeyModal({ isOpen, onApiKeySet, onClose }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    // Load current API key from localStorage on open
    if (isOpen) {
      const storedKey = localStorage.getItem('WASSENDER_API_KEY') || '';
      setApiKey(storedKey);
      setStatus('idle');
      setStatusMsg('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast({ title: 'Error', description: 'Please enter your Wassender API key', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      localStorage.setItem('WASSENDER_API_KEY', apiKey.trim());
      onApiKeySet(apiKey.trim());
      toast({ title: 'Success', description: 'API key saved successfully!' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save API key', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    setStatus('checking');
    setStatusMsg('');
    try {
      const result = await checkApiStatus();
      setStatus('success');
      setStatusMsg('API Connected: ' + (result?.status || JSON.stringify(result)));
    } catch (error: any) {
      setStatus('error');
      setStatusMsg(error?.response?.data?.message || error?.message || 'Unknown error');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Wassender API Key & Status
          </DialogTitle>
          <DialogDescription>
            View, update, and check the status of your Wassender API connection.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="flex items-center gap-2">
              <Input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                placeholder="Enter your Wassender API key"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={() => setShowKey(v => !v)}>
                {showKey ? 'Hide' : 'Show'}
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="w-full" disabled={isLoading}>Save API Key</Button>
            <Button type="button" variant="secondary" onClick={handleCheckStatus} disabled={status === 'checking'}>
              {status === 'checking' ? 'Checking...' : 'Check Status'}
            </Button>
          </div>
        </form>
        <div className="mt-4">
          <Label>Status</Label>
          <div className={`mt-1 p-2 rounded text-sm ${status === 'success' ? 'bg-green-100 text-green-800' : status === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
            {status === 'idle' ? 'No status checked yet.' : statusMsg}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}