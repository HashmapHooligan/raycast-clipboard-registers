import { Clipboard, environment, LocalStorage, showToast, Toast } from "@raycast/api";
import { promises as fs } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { ClipboardContent, ClipboardState, RegisterMetadata } from "./types";

const STORAGE_KEY = "clipboard-registers-state";
const CONTENT_DIR = "clipboard-registers";

function fileUriToPath(uri: string): string {
  if (uri.startsWith("file://")) {
    return decodeURIComponent(uri.slice(7));
  }
  return uri;
}

export class RegisterManager {
  private static instance: RegisterManager;
  private contentPath: string;

  private constructor() {
    this.contentPath = join(environment.supportPath, CONTENT_DIR);
  }

  static getInstance(): RegisterManager {
    if (!RegisterManager.instance) {
      RegisterManager.instance = new RegisterManager();
    }
    return RegisterManager.instance;
  }

  async ensureContentDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.contentPath, { recursive: true });
    } catch (error) {
      console.error("Failed to create content directory:", error);
    }
  }

  async getState(): Promise<ClipboardState> {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error("Failed to parse stored state:", error);
      }
    }

    // Default state
    return {
      activeRegister: 1,
      initialized: false,
      registers: { 1: null, 2: null, 3: null, 4: null },
    };
  }

  async setState(state: ClipboardState): Promise<void> {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async initializeIfNeeded(): Promise<void> {
    const state = await this.getState();

    if (!state.initialized) {
      // First run - capture current clipboard content for register 1
      const currentContent = await this.getCurrentClipboardContent();

      if (currentContent) {
        state.registers[1] = await this.saveContentToFile(currentContent, 1);
      }

      state.activeRegister = 1;
      state.initialized = true;
      await this.setState(state);

      await showToast({
        style: Toast.Style.Success,
        title: "Clipboard Registers Initialized",
        message: "Register 1 is now active with current clipboard content",
      });
    }
  }

  async getCurrentClipboardContent(): Promise<ClipboardContent | null> {
    try {
      const content = await Clipboard.read();

      if (content.file) {
        // Convert file URI to regular path for storage
        const filePath = fileUriToPath(content.file);
        return {
          type: "file",
          filePaths: [filePath],
        };
      } else if (content.html) {
        return {
          type: "html",
          html: content.html,
          text: content.text,
        };
      } else if (content.text) {
        return {
          type: "text",
          text: content.text,
        };
      }

      return null;
    } catch (error) {
      console.error("Failed to read clipboard:", error);
      return null;
    }
  }

  async saveContentToFile(content: ClipboardContent, registerId: number): Promise<RegisterMetadata> {
    await this.ensureContentDirectory();

    const uuid = randomUUID();
    const timestamp = Date.now();
    let fileName: string;
    let originalFileName: string | undefined;
    let filePaths: string[] | undefined;
    let textPreview: string | undefined;

    switch (content.type) {
      case "text": {
        fileName = `${uuid}.txt`;
        await fs.writeFile(join(this.contentPath, fileName), content.text, "utf-8");
        textPreview = content.text.substring(0, 100);
        break;
      }

      case "html": {
        fileName = `${uuid}.json`;
        const htmlData = { html: content.html, text: content.text };
        await fs.writeFile(join(this.contentPath, fileName), JSON.stringify(htmlData), "utf-8");
        textPreview = content.text?.substring(0, 100);
        break;
      }

      case "file": {
        fileName = `${uuid}.json`;
        filePaths = content.filePaths;
        await fs.writeFile(join(this.contentPath, fileName), JSON.stringify(content.filePaths), "utf-8");
        originalFileName = content.filePaths[0]?.split("/").pop();
        textPreview = `${content.filePaths.length} file(s)`;
        break;
      }
    }

    return {
      registerId,
      contentType: content.type,
      fileName,
      timestamp,
      originalFileName,
      filePaths,
      textPreview,
    };
  }

  async loadContentFromFile(metadata: RegisterMetadata): Promise<void> {
    const filePath = join(this.contentPath, metadata.fileName);

    try {
      switch (metadata.contentType) {
        case "text": {
          const text = await fs.readFile(filePath, "utf-8");
          await Clipboard.copy(text);
          break;
        }

        case "html": {
          const htmlData = JSON.parse(await fs.readFile(filePath, "utf-8"));
          await Clipboard.copy({ html: htmlData.html, text: htmlData.text });
          break;
        }

        case "file": {
          const filePaths = JSON.parse(await fs.readFile(filePath, "utf-8"));
          // Copy first file path as file reference
          if (filePaths.length > 0) {
            // Ensure we're using the correct file path format
            const cleanPath = fileUriToPath(filePaths[0]);
            await Clipboard.copy({ file: cleanPath });
          }
          break;
        }
      }
    } catch (error) {
      console.error(`Failed to load content from ${filePath}:`, error);
      throw new Error(`Failed to load register ${metadata.registerId} content`);
    }
  }

  async cleanupRegisterContent(registerId: number): Promise<void> {
    const state = await this.getState();
    const metadata = state.registers[registerId as 1 | 2 | 3 | 4];

    if (metadata) {
      try {
        const filePath = join(this.contentPath, metadata.fileName);
        await fs.unlink(filePath);
      } catch (error) {
        console.error(`Failed to cleanup file for register ${registerId}:`, error);
      }
    }
  }

  async switchToRegister(targetRegister: 1 | 2 | 3 | 4): Promise<void> {
    await this.initializeIfNeeded();

    const state = await this.getState();

    // If switching to the same register, do nothing
    if (state.activeRegister === targetRegister) {
      await showToast({
        style: Toast.Style.Success,
        title: `Register ${targetRegister}`,
        message: "Already active",
      });
      return;
    }

    try {
      // Step 1: Save current clipboard content to the current active register
      const currentContent = await this.getCurrentClipboardContent();
      if (currentContent) {
        // Clean up previous content for current register
        await this.cleanupRegisterContent(state.activeRegister);

        // Save current content
        state.registers[state.activeRegister as 1 | 2 | 3 | 4] = await this.saveContentToFile(
          currentContent,
          state.activeRegister,
        );
      }

      // Step 2: Load target register content to clipboard
      const targetMetadata = state.registers[targetRegister];
      if (targetMetadata) {
        await this.loadContentFromFile(targetMetadata);
        await showToast({
          style: Toast.Style.Success,
          title: `Switched to Register ${targetRegister}`,
          message: `Loaded ${targetMetadata.contentType} content from ${new Date(targetMetadata.timestamp).toLocaleTimeString()}`,
        });
      } else {
        // Target register is empty - clear clipboard
        await Clipboard.clear();
        await showToast({
          style: Toast.Style.Success,
          title: `Switched to Register ${targetRegister}`,
          message: "Register is empty - clipboard cleared",
        });
      }

      // Step 3: Update active register
      state.activeRegister = targetRegister;
      await this.setState(state);
    } catch (error) {
      console.error("Failed to switch register:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Register Switch Failed",
        message: String(error),
      });
    }
  }
}

// Export singleton instance
export const registerManager = RegisterManager.getInstance();
