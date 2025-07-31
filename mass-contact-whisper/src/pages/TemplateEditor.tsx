import { useRef, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendMessage, createTextMessage } from '@/api/wassender';
import { useToast } from '@/hooks/use-toast';

const PLACEHOLDERS = ['MAKE', 'MODEL', 'YEAR', 'VIN', 'PARTS', 'DETAILS', 'GALLERY', 'QTY', 'PART NAME', 'PART NUMBER', 'SPACE'];

function applySmartPlaceholderLogic(raw, mockData) {
  let lines = raw.split('\n');
  // VIN: replace with Not provided if missing
  lines = lines.map(line =>
    line.replace(/\[VIN\]/g, () => {
      const val = mockData['VIN'];
      return val && val.trim() ? val : 'Not provided';
    })
  );
  // PART NUMBER: remove placeholder and preceding ' - ' if missing
  lines = lines.map(line =>
    line.replace(/( - )?\[PART NUMBER\]/g, (match, sep) => {
      const val = mockData['PART NUMBER'];
      return val && val.trim() ? (sep || '') + val : '';
    })
  );
  // DETAILS: remove line if missing
  lines = lines.filter(line => {
    if (line.includes('[DETAILS]')) {
      const val = mockData['DETAILS'];
      return val && val.trim();
    }
    return true;
  });
  lines = lines.map(line =>
    line.replace(/\[DETAILS\]/g, () => mockData['DETAILS'] || '')
  );
  // GALLERY: remove 'Photos Here:' and [GALLERY] line if missing
  if (!mockData['GALLERY'] || !mockData['GALLERY'].trim()) {
    lines = lines.filter((line, idx, arr) => {
      if (line.includes('[GALLERY]')) return false;
      if (line.trim().toLowerCase().startsWith('photos here:')) {
        // Also remove if next line is [GALLERY]
        if (arr[idx + 1] && arr[idx + 1].includes('[GALLERY]')) return false;
      }
      return true;
    });
  } else {
    lines = lines.map(line =>
      line.replace(/\[GALLERY\]/g, mockData['GALLERY'])
    );
  }
  // [SPACE]: always output a blank line
  lines = lines.flatMap(line =>
    line.includes('[SPACE]') ? [''] : [line]
  );
  // Remove any lines that are now empty or just whitespace, except for [SPACE] lines
  lines = lines.filter((line, idx, arr) => {
    if (line === '' && (idx === 0 || arr[idx - 1] === '')) return false; // collapse multiple blank lines
    return true;
  });
  return lines.join('\n');
}

function renderPreviewFromHtml(raw, mockData) {
  let text = applySmartPlaceholderLogic(raw, mockData);
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  text = text.replace(/\{\{(.+?)\}\}/g, '<span style="background:#fde68a;color:#92400e;border-radius:4px;padding:0 4px;">$1</span>');
  text = text.replace(/\n/g, '<br>');
  text = text.replace(/\[([A-Z0-9 _-]+)\]/g, '<span style="background:#fde68a;color:#92400e;border-radius:4px;padding:0 4px;">[$1]</span>');
  return text;
}

function extractPlaceholders(template) {
  const set = new Set();
  const arr = [];
  const regex = /\[([A-Z0-9 _-]+)\]/g;
  let match;
  while ((match = regex.exec(template)) !== null) {
    const ph = match[1].trim();
    if (!set.has(ph)) {
      set.add(ph);
      arr.push(ph);
    }
  }
  return arr;
}

export default function TemplateEditor() {
  const editorRef = useRef(null);
  const initialText = '> Part Request - [MAKE] [MODEL] [YEAR]\n_VIN: [VIN]_\n\n[QTY] - [PART NAME] - [PART NUMBER]\n[QTY] - [PART NAME] - [PART NUMBER]\n\n[DETAILS]\n\nPhotos Here:\n[GALLERY]';
  const [mockData, setMockData] = useState({});
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [lastValue, setLastValue] = useState(initialText);

  const insertPlaceholder = (ph) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (!sel) return;
    const range = sel.getRangeAt(0);
    const node = document.createTextNode(`[${ph}]`);
    range.insertNode(node);
    range.setStartAfter(node);
    range.setEndAfter(node);
    sel.removeAllRanges();
    sel.addRange(range);
    setTimeout(() => {
      setLastValue(editorRef.current.innerText);
    }, 0);
  };

  const handleBlur = () => {
    if (editorRef.current) {
      setLastValue(editorRef.current.innerText);
    }
  };

  const handleTestSend = async () => {
    setIsSending(true);
    let message = editorRef.current ? editorRef.current.innerText : lastValue;
    message = applySmartPlaceholderLogic(message, mockData);
    try {
      await sendMessage(createTextMessage('+971567191045', message));
      toast({ title: 'Test Message Sent', description: 'Message sent to +971567191045', variant: 'default' });
    } catch (error) {
      toast({ title: 'Test Message Failed', description: error?.message || 'Could not send test message', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleMockChange = (ph, value) => {
    setMockData(prev => ({ ...prev, [ph]: value }));
  };

  // Save template to localStorage
  const handleSave = () => {
    const template = editorRef.current ? editorRef.current.innerText : lastValue;
    localStorage.setItem('massContactTemplate', template);
    console.log('Saved template:', template);
    toast({ title: 'Template Saved', description: 'Template saved for mass contact.', variant: 'default' });
  };

  const previewText = editorRef.current ? editorRef.current.innerText : lastValue;
  const placeholders = useMemo(() => extractPlaceholders(previewText), [previewText]);

  return (
    <div className="flex flex-col items-center min-h-screen py-10 bg-gray-50">
      <Card className="w-full max-w-2xl mb-8">
        <CardHeader>
          <CardTitle>Message Template Editor (with Chips)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex flex-wrap gap-2">
            {PLACEHOLDERS.map(ph => (
              <Button key={ph} size="sm" variant="outline" onClick={() => insertPlaceholder(ph)}>
                [{ph}]
              </Button>
            ))}
          </div>
          <div
            ref={editorRef}
            className="font-mono border rounded p-2 min-h-[180px] bg-white focus:outline-blue-400 whitespace-pre-wrap text-left"
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            style={{ minHeight: 180, textAlign: 'left' }}
            onBlur={handleBlur}
            defaultValue={initialText}
          >{initialText}</div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave} variant="success">Save</Button>
            <Button onClick={handleTestSend} disabled={isSending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSending ? 'Sending...' : 'Send Test Message to +971567191045'}
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Type your template. Insert variables as chips. Chips are not editable, but you can move or delete them. Undo/Redo and caret will work as expected.
          </div>
        </CardContent>
      </Card>
      <Card className="w-full max-w-2xl mb-8">
        <CardHeader>
          <CardTitle>Mock Data for Placeholders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {placeholders.length === 0 && <div className="text-gray-500 col-span-2">No placeholders detected in template.</div>}
            {placeholders.map(ph => (
              <div key={ph} className="flex flex-col">
                <label className="text-xs font-semibold mb-1">{ph}</label>
                <Input
                  value={mockData[ph] || ''}
                  onChange={e => handleMockChange(ph, e.target.value)}
                  placeholder={`Enter mock value for [${ph}]`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="bg-[#075e54] text-white rounded-lg p-6 min-h-[180px] font-mono whitespace-pre-wrap text-left"
            style={{ textAlign: 'left' }}
            dangerouslySetInnerHTML={{ __html: renderPreviewFromHtml(previewText, mockData) }}
          />
        </CardContent>
      </Card>
    </div>
  );
}