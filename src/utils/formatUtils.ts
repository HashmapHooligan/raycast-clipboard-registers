import { Icon } from "@raycast/api";

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
 * Get the appropriate Raycast icon for content type
 */
export function getContentTypeIcon(contentType: "text" | "file" | "html" | null): Icon {
  switch (contentType) {
    case "text":
      return Icon.Text;
    case "file":
      return Icon.Document;
    case "html":
      return Icon.Globe;
    case null:
    default:
      return Icon.Circle;
  }
}

/**
 * Truncate text to a specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + "...";
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
      return textPreview ? truncateText(textPreview) : "No preview available";
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