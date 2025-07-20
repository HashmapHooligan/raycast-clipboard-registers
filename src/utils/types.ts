export interface RegisterMetadata {
  registerId: number;
  contentType: "text" | "file" | "html";
  fileName: string; // UUID-based filename in supportPath
  timestamp: number;
  originalFileName?: string; // For display purposes
  filePaths?: string[]; // Array of file paths for file content
  textPreview?: string; // First 100 chars for user display/debugging/logging
}

export interface ClipboardState {
  activeRegister: number;
  initialized: boolean;
  registers: Record<1 | 2 | 3 | 4, RegisterMetadata | null>;
}

export type ClipboardContent =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "file";
      filePaths: string[];
    }
  | {
      type: "html";
      html: string;
      text?: string;
    };
