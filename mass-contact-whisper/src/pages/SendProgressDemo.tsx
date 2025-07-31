import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ContactStatus {
  id: string;
  name: string;
  number: string;
  status: 'pending' | 'sending' | 'sent' | 'error' | 'stopped';
  errorMsg?: string;
}

// Generate 35 mock contacts
const MOCK_CONTACTS: ContactStatus[] = Array.from({ length: 35 }, (_, i) => ({
  id: (i + 1).toString(),
  name: `Contact ${i + 1}`,
  number: `+9715${(600000000 + i).toString()}`,
  status: 'pending',
}));

export default function SendProgressDemo() {
  const [open, setOpen] = useState(true);
  const [contacts, setContacts] = useState<ContactStatus[]>(MOCK_CONTACTS);
  const [current, setCurrent] = useState(0);
  const [sending, setSending] = useState(false);
  const stopRequested = useRef(false);

  const startSending = async () => {
    setSending(true);
    stopRequested.current = false;
    for (let i = 0; i < contacts.length; i++) {
      if (stopRequested.current) {
        setContacts(prev => prev.map((c, idx) => idx >= i ? { ...c, status: 'stopped' } : c));
        break;
      }
      setCurrent(i + 1);
      setContacts(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'sending' } : c));
      await new Promise(res => setTimeout(res, 800)); // simulate network delay
      // Simulate random error
      if (Math.random() < 0.2) {
        setContacts(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'error', errorMsg: 'Mock error' } : c));
      } else {
        setContacts(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'sent' } : c));
      }
    }
    setSending(false);
  };

  const handleStop = () => {
    stopRequested.current = true;
    setSending(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Button onClick={() => { setOpen(true); setContacts(MOCK_CONTACTS); setCurrent(0); }}>Show Progress Modal</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sending Messages Progress</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <Progress value={contacts.filter(c => c.status === 'sent').length / contacts.length * 100} />
            <div className="text-sm mt-2">{contacts.filter(c => c.status === 'sent').length} / {contacts.length} sent</div>
          </div>
          <div className="max-h-60 overflow-y-auto border rounded p-2 mb-4">
            {contacts.map((c, idx) => (
              <div key={c.id} className="flex items-center gap-2 py-1 border-b last:border-b-0">
                <span className="font-medium w-32">{c.name}</span>
                <span className="font-mono text-xs w-36">{c.number}</span>
                <span className="text-xs">
                  {c.status === 'pending' && <span className="text-gray-500">Pending</span>}
                  {c.status === 'sending' && <span className="text-blue-600">Sending...</span>}
                  {c.status === 'sent' && <span className="text-green-600">Sent</span>}
                  {c.status === 'error' && <span className="text-red-600">Error: {c.errorMsg}</span>}
                  {c.status === 'stopped' && <span className="text-yellow-600">Stopped</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            {sending ? (
              <Button variant="destructive" onClick={handleStop}>STOP</Button>
            ) : (
              <Button onClick={startSending}>Start Sending (Mock)</Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}