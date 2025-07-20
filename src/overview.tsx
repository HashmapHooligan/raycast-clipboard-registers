import { Action, ActionPanel, List, Icon, showToast, Toast, closeMainWindow } from "@raycast/api";
import { useEffect, useState } from "react";
import { registerManager } from "./utils/registerManager";
import { RegisterMetadata } from "./utils/types";
import { formatRelativeTime, getContentTypeIcon, getContentPreview } from "./utils/formatUtils";

interface RegisterDisplayData {
  activeRegister: number;
  registers: Array<{
    id: 1 | 2 | 3 | 4;
    metadata: RegisterMetadata | null;
    isActive: boolean;
  }>;
}

export default function Command() {
  const [displayData, setDisplayData] = useState<RegisterDisplayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await registerManager.getRegisterDisplayData();
      setDisplayData(data);
    } catch (error) {
      console.error("Failed to load register data:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Registers",
        message: "Could not load register data. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSwitchToRegister = async (registerId: 1 | 2 | 3 | 4) => {
    setIsLoading(true);
    try {
      await registerManager.switchToRegister(registerId);
      await loadData();
    } catch (error) {
      console.error("Failed to switch register:", error);
      setIsLoading(false);
    }
  };

  const handleCopyRegister = async (registerId: 1 | 2 | 3 | 4) => {
    try {
      await registerManager.copyRegisterContent(registerId);
    } catch (error) {
      console.error("Failed to copy register:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Copy Failed",
        message: `Failed to copy register ${registerId}`,
      });
    }
  };

  const handleClearRegister = async (registerId: 1 | 2 | 3 | 4) => {
    try {
      await registerManager.clearRegister(registerId);
      await loadData();
    } catch (error) {
      console.error("Failed to clear register:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Clear Failed",
        message: `Failed to clear register ${registerId}`,
      });
    }
  };

  if (isLoading || !displayData) {
    return <List isLoading={true} />;
  }

  return (
    <List isShowingDetail>
      {displayData.registers.map((register) => {
        const { id, metadata, isActive } = register;
        const contentType = metadata?.contentType || null;
        const icon = getContentTypeIcon(contentType);
        const preview = getContentPreview(
          contentType,
          metadata?.textPreview,
          metadata?.originalFileName,
          metadata?.filePaths
        );
        const timestamp = metadata ? formatRelativeTime(metadata.timestamp) : "";
        
        // Create title with active indicator
        const title = `Register ${id}`;
        
        // Create subtitle with content info
        let subtitle = "";
        if (timestamp) {
          subtitle += `${timestamp}`;
        } else {
          subtitle = "Empty";
        }

        return (
          <List.Item
            key={id}
            icon={icon}
            title={title}
            subtitle={subtitle}
            accessories={isActive ? [{ icon: Icon.Dot, tooltip: "Active Register" }] : undefined}
            detail={
              <List.Item.Detail
                markdown={`\`\`\`\n${preview}\n\`\`\``}
                metadata={
                  metadata ? (
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Register" text={`#${id}`} />
                      <List.Item.Detail.Metadata.Label 
                        title="Status" 
                        text={isActive ? "Active" : "Inactive"} 
                        icon={isActive ? Icon.Dot : Icon.Circle}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Content Type" text={metadata.contentType.toUpperCase()} />
                      <List.Item.Detail.Metadata.Label title="Last Updated" text={timestamp} />
                      {metadata.originalFileName && (
                        <List.Item.Detail.Metadata.Label title="File Name" text={metadata.originalFileName} />
                      )}
                      {metadata.filePaths && metadata.filePaths.length > 1 && (
                        <List.Item.Detail.Metadata.Label 
                          title="Files" 
                          text={`${metadata.filePaths.length} files`} 
                        />
                      )}
                    </List.Item.Detail.Metadata>
                  ) : (
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Register" text={`#${id}`} />
                      <List.Item.Detail.Metadata.Label 
                        title="Status" 
                        text="Empty" 
                        icon={Icon.Circle}
                      />
                    </List.Item.Detail.Metadata>
                  )
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={`Switch to Register ${id}`}
                  icon={Icon.Switch}
                  onAction={() => {
                    handleSwitchToRegister(id)
                    closeMainWindow()
                  }}
                />
                {metadata && (
                  <>
                    <Action
                      title={`Copy Register ${id}`}
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                      onAction={() => handleCopyRegister(id)}
                    />
                    <Action
                      title={`Clear Register ${id}`}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => handleClearRegister(id)}
                    />
                  </>
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}