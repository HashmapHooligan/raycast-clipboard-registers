import { normalize, resolve } from "path";
import {
  RegisterId,
  ContentType,
  ClipboardState,
  RegisterMetadata,
  isValidRegisterId,
  isValidContentType,
  isValidRegisterMetadata,
} from "./types";
import { REGISTER_IDS, CONFIG, CONTENT_TYPES } from "./constants";

/**
 * Validates and sanitizes a register ID
 */
export function validateRegisterId(value: unknown): RegisterId {
  if (!isValidRegisterId(value)) {
    throw new Error(`Invalid register ID: ${value}. Must be one of: ${REGISTER_IDS.join(", ")}`);
  }
  return value;
}

/**
 * Validates content type
 */
export function validateContentType(value: unknown): ContentType {
  if (!isValidContentType(value)) {
    throw new Error(`Invalid content type: ${value}. Must be one of: ${Object.values(CONTENT_TYPES).join(", ")}`);
  }
  return value;
}

/**
 * Sanitizes and validates file paths
 */
export function sanitizeFilePath(filePath: string, basePath: string): string {
  if (!filePath) {
    throw new Error("File path must be a non-empty string");
  }

  // Normalize and resolve the path to prevent directory traversal
  const normalizedPath = normalize(filePath);
  const resolvedPath = resolve(basePath, normalizedPath);

  // Ensure the resolved path is within the base directory
  if (!resolvedPath.startsWith(resolve(basePath))) {
    throw new Error(`File path outside allowed directory: ${filePath}`);
  }

  return resolvedPath;
}

/**
 * Validates text content size
 */
export function validateTextContent(text: string): string {
  const sizeInBytes = Buffer.byteLength(text, "utf8");
  if (sizeInBytes > CONFIG.MAX_FILE_SIZE) {
    throw new Error(`Text content too large: ${sizeInBytes} bytes (max: ${CONFIG.MAX_FILE_SIZE})`);
  }

  return text;
}

/**
 * Validates file paths array
 */
export function validateFilePaths(filePaths: unknown): string[] {
  if (!Array.isArray(filePaths)) {
    throw new Error("File paths must be an array");
  }

  if (filePaths.length === 0) {
    throw new Error("File paths array cannot be empty");
  }

  return filePaths.map((path, index) => {
    if (typeof path !== "string") {
      throw new Error(`File path at index ${index} must be a string`);
    }
    return path;
  });
}

/**
 * Validates HTML content
 */
export function validateHtmlContent(html: string, text?: string): { html: string; text?: string } {
  const htmlSizeInBytes = Buffer.byteLength(html, "utf8");
  const textSizeInBytes = text ? Buffer.byteLength(text, "utf8") : 0;
  const totalSize = htmlSizeInBytes + textSizeInBytes;

  if (totalSize > CONFIG.MAX_FILE_SIZE) {
    throw new Error(`HTML content too large: ${totalSize} bytes (max: ${CONFIG.MAX_FILE_SIZE})`);
  }

  return { html, text };
}

/**
 * Validates clipboard state structure
 */
export function validateClipboardState(state: unknown): ClipboardState {
  if (!state || typeof state !== "object") {
    throw new Error("Clipboard state must be an object");
  }

  const obj = state as Record<string, unknown>;

  // Validate activeRegister
  const activeRegister = validateRegisterId(obj.activeRegister);

  // Validate initialized
  if (typeof obj.initialized !== "boolean") {
    throw new Error("initialized must be a boolean");
  }

  // Validate registers
  if (!obj.registers || typeof obj.registers !== "object") {
    throw new Error("registers must be an object");
  }

  const registers = obj.registers as Record<string, unknown>;
  const validatedRegisters: Record<RegisterId, RegisterMetadata | null> = {
    1: null,
    2: null,
    3: null,
    4: null,
  };

  for (const registerId of REGISTER_IDS) {
    const registerData = registers[registerId.toString()];
    if (registerData === null || registerData === undefined) {
      validatedRegisters[registerId] = null;
    } else if (isValidRegisterMetadata(registerData)) {
      validatedRegisters[registerId] = registerData;
    } else {
      throw new Error(`Invalid register metadata for register ${registerId}`);
    }
  }

  return {
    activeRegister,
    initialized: obj.initialized,
    registers: validatedRegisters,
  };
}

/**
 * Creates a truncated text preview
 */
export function createTextPreview(text: string): string {
  return text.length <= CONFIG.TEXT_PREVIEW_LENGTH ? text : text.substring(0, CONFIG.TEXT_PREVIEW_LENGTH) + "...";
}
