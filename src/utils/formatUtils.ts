import { Icon, Color } from "@raycast/api";

/**
 * Format a timestamp into a relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) {
    return "Just now";
  } else if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  } else if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } else {
    // For older content, show the actual date
    return new Date(timestamp).toLocaleDateString();
  }
}

/**
 * Get the appropriate Raycast icon for content type with color
 */
export function getContentTypeIcon(contentType: "text" | "file" | "html" | null): { source: Icon; tintColor: Color } {
  switch (contentType) {
    case "text":
      return { source: Icon.Text, tintColor: Color.Blue };
    case "file":
      return { source: Icon.Document, tintColor: Color.Orange };
    case "html":
      return { source: Icon.Globe, tintColor: Color.Green };
    case null:
    default:
      return { source: Icon.Circle, tintColor: Color.Red };
  }
}

/**
 * Get a display-friendly preview for register content
 */
export function getContentPreview(
  contentType: "text" | "file" | "html" | null,
  textPreview?: string,
  originalFileName?: string,
  filePaths?: string[]
): string {
  if (!contentType) {
    return "Empty register";
  }

  switch (contentType) {
    case "text":
    case "html":
      return textPreview ? textPreview : "No preview available";
    case "file":
      if (originalFileName) {
        return originalFileName;
      } else if (filePaths && filePaths.length > 0) {
        const fileName = filePaths[0].split("/").pop() || "Unknown file";
        return filePaths.length > 1 ? `${fileName} (+${filePaths.length - 1} more)` : fileName;
      }
      return "File content";
    default:
      return "Unknown content";
  }
}