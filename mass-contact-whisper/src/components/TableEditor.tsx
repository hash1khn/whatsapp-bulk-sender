import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { Contact, CONDITION_OPTIONS } from '@/types/contact';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface TableEditorProps {
  contacts: Contact[];
  onChange: (contacts: Contact[]) => void;
}

const columnHelper = createColumnHelper<Contact>();

export function TableEditor({ contacts, onChange }: TableEditorProps) {
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);

  const updateContact = (id: string, field: keyof Contact, value: string) => {
    const updatedContacts = contacts.map((contact) =>
      contact.id === id ? { ...contact, [field]: value } : contact
    );
    onChange(updatedContacts);
  };

  const addRow = () => {
    const newContact: Contact = {
      id: uuidv4(),
      supplierName: '',
      partType: '',
      condition: 'new',
      whatsappNumber: '',
    };
    onChange([...contacts, newContact]);
  };

  const deleteRow = (id: string) => {
    const updatedContacts = contacts.filter((contact) => contact.id !== id);
    onChange(updatedContacts);
  };

  const columns = [
    columnHelper.accessor('supplierName', {
      header: 'Supplier Name',
      cell: ({ row, getValue }) => {
        const isEditing = editingCell?.rowId === row.original.id && editingCell?.columnId === 'supplierName';
        
        return isEditing ? (
          <Input
            value={getValue()}
            onChange={(e) => updateContact(row.original.id, 'supplierName', e.target.value)}
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setEditingCell(null);
            }}
            autoFocus
            className="w-full"
          />
        ) : (
          <div
            onClick={() => setEditingCell({ rowId: row.original.id, columnId: 'supplierName' })}
            className="cursor-pointer min-h-[40px] flex items-center p-2 hover:bg-muted rounded"
          >
            {getValue() || 'Click to edit...'}
          </div>
        );
      },
    }),
    columnHelper.accessor('partType', {
      header: 'Part Type',
      cell: ({ row, getValue }) => {
        const isEditing = editingCell?.rowId === row.original.id && editingCell?.columnId === 'partType';
        
        return isEditing ? (
          <Input
            value={getValue()}
            onChange={(e) => updateContact(row.original.id, 'partType', e.target.value)}
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setEditingCell(null);
            }}
            autoFocus
            className="w-full"
          />
        ) : (
          <div
            onClick={() => setEditingCell({ rowId: row.original.id, columnId: 'partType' })}
            className="cursor-pointer min-h-[40px] flex items-center p-2 hover:bg-muted rounded"
          >
            {getValue() || 'Click to edit...'}
          </div>
        );
      },
    }),
    columnHelper.accessor('condition', {
      header: 'Condition',
      cell: ({ row, getValue }) => {
        return (
          <Select
            value={getValue()}
            onValueChange={(value) => updateContact(row.original.id, 'condition', value as Contact['condition'])}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITION_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    }),
    columnHelper.accessor('whatsappNumber', {
      header: 'WhatsApp Number',
      cell: ({ row, getValue }) => {
        const isEditing = editingCell?.rowId === row.original.id && editingCell?.columnId === 'whatsappNumber';
        
        return isEditing ? (
          <Input
            value={getValue()}
            onChange={(e) => updateContact(row.original.id, 'whatsappNumber', e.target.value)}
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setEditingCell(null);
            }}
            autoFocus
            className="w-full"
            placeholder="+1234567890"
          />
        ) : (
          <div
            onClick={() => setEditingCell({ rowId: row.original.id, columnId: 'whatsappNumber' })}
            className="cursor-pointer min-h-[40px] flex items-center p-2 hover:bg-muted rounded"
          >
            {getValue() || 'Click to edit...'}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => deleteRow(row.original.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    }),
  ];

  const table = useReactTable({
    data: contacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Contact Management</h2>
        <Button onClick={addRow} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-semibold">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No contacts found. Click "Add Contact" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}