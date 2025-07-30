// File System Access API TypeScript declarations
interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>;
  isSameEntry(other: FileSystemHandle): Promise<boolean>;
}

interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | BufferSource | Blob): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}

interface FileSystemPickerOptions {
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
}

interface SaveFilePickerOptions extends FileSystemPickerOptions {
  suggestedName?: string;
}

declare global {
  interface Window {
    showOpenFilePicker(options?: FileSystemPickerOptions): Promise<FileSystemFileHandle[]>;
    showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
    showDirectoryPicker(options?: FileSystemPickerOptions): Promise<FileSystemDirectoryHandle>;
  }
}

export {}; 