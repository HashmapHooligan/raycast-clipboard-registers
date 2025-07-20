import { Action, ActionPanel, closeMainWindow, Grid, Icon, showToast, Toast } from "@raycast/api";
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
    return <Grid isLoading={true} />;
  }

  return (
    <Grid columns={4} inset={Grid.Inset.Large}>
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
        
        return (
          <Grid.Item
            key={id}
            content={{
              value: icon,
              tooltip: `Register ${id}${isActive ? " (Active)" : ""}`,
            }}
            title={`Register ${id}${isActive ? " ●" : ""}`}
            subtitle={metadata ? `${timestamp} • ${preview}` : "Empty"}
            actions={
              <ActionPanel>
                <Action
                  title={`Switch to Register ${id}`}
                  icon={Icon.Switch}
                  onAction={() => {
                    handleSwitchToRegister(id);
                    closeMainWindow();
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
    </Grid>
  );
}