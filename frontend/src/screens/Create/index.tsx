import {
  ComputerIcon,
  ExternalLink,
  Heart,
  Loader2,
  MessageSquare,
  Monitor,
  PhoneIcon,
  Play,
  RotateCcw,
  TabletIcon,
} from "lucide-react";
import { MessageType, Sender } from "../../types/messages";
import { useCallback, useEffect, useRef, useState } from "react";

import { BEAM_CONFIG } from "../../config/beam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Message } from "../../types/messages";
import styled from "styled-components";
import { useLocation, useSearchParams } from "react-router-dom";
import { useMessageBus } from "../../hooks/useMessageBus";

const DEVICE_SPECS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: "100%", height: "100%" },
};

const Create = () => {
  const [inputValue, setInputValue] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [iframeUrl, setIframeUrl] = useState("");
  const [iframeError, setIframeError] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [isUpdateInProgress, setIsUpdateInProgress] = useState(false);
  const [initCompleted, setInitCompleted] = useState(false);
  const [sandboxExists, setSandboxExists] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasConnectedRef = useRef(false);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sessionId =
    searchParams.get("session_id") || location.state?.session_id;
  const initialPromptSent = useRef(false);
  const [selectedDevice, setSelectedDevice] = useState<
    "mobile" | "tablet" | "desktop"
  >("desktop");

  useEffect(() => {
    if (sessionId) {
      console.log("Session ID initialized:", sessionId);
    }
  }, [sessionId]);

  const refreshIframe = useCallback(() => {
    if (iframeRef.current && iframeUrl && iframeUrl !== "/") {
      setIframeReady(false);
      setIframeError(false);

      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = "";

      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentSrc;

          setTimeout(() => {
            if (iframeRef.current) {
              iframeRef.current.src = "";

              setTimeout(() => {
                if (iframeRef.current) {
                  iframeRef.current.src = currentSrc;
                }
              }, 200);
            }
          }, 500);
        }
      }, 300);
    }
  }, [iframeUrl]);

  const messageHandlers = {
    [MessageType.INIT]: (message: Message) => {
      const id = message.id;
      if (id) {
        if (processedMessageIds.current.has(id)) {
          console.log("Skipping duplicate INIT message:", id);
          return;
        }
        processedMessageIds.current.add(id);
        console.log("Processing INIT message:", id);
      }

      if (typeof message.data.url === "string" && message.data.sandbox_id) {
        setIframeUrl(message.data.url);
        setIframeError(false);
      }

      if (message.data.exists === true) {
        setSandboxExists(true);
        console.log("Sandbox already exists, skipping initial prompt");
      }

      setMessages((prev) => {
        if (id) {
          const existingIndex = prev.findIndex((msg) => msg.id === id);
          if (existingIndex !== -1) {
            return prev.map((msg, idx) =>
              idx === existingIndex
                ? {
                    ...msg,
                    timestamp: message.timestamp || msg.timestamp,
                    data: {
                      ...msg.data,
                      text: "Workspace loaded! You can now make edits here.",
                      sender: Sender.ASSISTANT,
                    },
                  }
                : msg
            );
          }
        }
        return [
          ...prev,
          {
            ...message,
            timestamp: message.timestamp || Date.now(),
            data: {
              ...message.data,
              text: "Workspace loaded! You can now make edits here.",
              sender: Sender.ASSISTANT,
            },
          },
        ];
      });
      setInitCompleted(true);
    },

    [MessageType.ERROR]: (message: Message) => {
      setMessages((prev) => [
        ...prev,
        {
          ...message,
          timestamp: message.timestamp || Date.now(),
          data: {
            ...message.data,
            sender: Sender.ASSISTANT,
          },
        },
      ]);
    },

    [MessageType.AGENT_PARTIAL]: (message: Message) => {
      const text = message.data.text;
      const id = message.id;

      if (!id) {
        console.warn("AGENT_PARTIAL message missing id, ignoring:", message);
        return;
      }

      if (text && text.trim()) {
        setMessages((prev) => {
          const existingIndex = prev.findIndex((msg) => msg.id === id);
          if (existingIndex !== -1) {
            return prev.map((msg, idx) =>
              idx === existingIndex
                ? {
                    ...msg,
                    timestamp: message.timestamp || msg.timestamp,
                    data: {
                      ...msg.data,
                      text: text.replace(/\\/g, ""),
                      sender: Sender.ASSISTANT,
                      isStreaming: true,
                    },
                  }
                : msg
            );
          }
          return [
            ...prev,
            {
              ...message,
              timestamp: message.timestamp || Date.now(),
              data: {
                ...message.data,
                text: text.replace(/\\/g, ""),
                isStreaming: true,
                sender: Sender.ASSISTANT,
              },
            },
          ];
        });
      }
    },

    [MessageType.AGENT_FINAL]: (message: Message) => {
      const text = message.data.text;
      const id = message.id;
      if (!id) {
        console.warn("AGENT_FINAL message missing id, ignoring:", message);
        return;
      }
      if (text && text.trim()) {
        setMessages((prev) => {
          const existingIndex = prev.findIndex((msg) => msg.id === id);
          if (existingIndex !== -1) {
            return prev.map((msg, idx) =>
              idx === existingIndex
                ? {
                    ...msg,
                    timestamp: message.timestamp || msg.timestamp,
                    data: {
                      ...msg.data,
                      text: text.replace(/\\/g, ""),
                      isStreaming: false,
                      sender: Sender.ASSISTANT,
                    },
                  }
                : msg
            );
          }
          return [
            ...prev,
            {
              ...message,
              timestamp: message.timestamp || Date.now(),
              data: {
                ...message.data,
                text: text.replace(/\\/g, ""),
                isStreaming: false,
                sender: Sender.ASSISTANT,
              },
            },
          ];
        });
      }
    },

    [MessageType.UPDATE_IN_PROGRESS]: (message: Message) => {
      setIsUpdateInProgress(true);

      const id = message.id;

      setMessages((prev) => {
        if (id) {
          const existingIndex = prev.findIndex((msg) => msg.id === id);
          if (existingIndex !== -1) {
            return prev.map((msg, idx) =>
              idx === existingIndex
                ? {
                    ...msg,
                    timestamp: message.timestamp || msg.timestamp,
                    data: {
                      ...msg.data,
                      text: "Ok - I'll make those changes!",
                      sender: Sender.ASSISTANT,
                    },
                  }
                : msg
            );
          }
        }

        return [
          ...prev,
          {
            ...message,
            timestamp: message.timestamp || Date.now(),
            data: {
              ...message.data,
              text: "Ok - I'll make those changes!",
              sender: Sender.ASSISTANT,
            },
          },
        ];
      });
    },

    [MessageType.UPDATE_FILE]: (message: Message) => {
      const id = message.id;
      if (!id) {
        console.warn("UPDATE_FILE message missing id, ignoring:", message);
        return;
      }
      setMessages((prev) => {
        const existingIndex = prev.findIndex((msg) => msg.id === id);
        if (existingIndex !== -1) {
          return prev.map((msg, idx) =>
            idx === existingIndex
              ? {
                  ...msg,
                  timestamp: message.timestamp || msg.timestamp,
                  data: {
                    ...msg.data,
                    text: message.data.text,
                    sender: Sender.ASSISTANT,
                    isStreaming: true,
                  },
                }
              : msg
          );
        }
        return [
          ...prev,
          {
            ...message,
            timestamp: message.timestamp || Date.now(),
            data: {
              ...message.data,
              text: message.data.text,
              sender: Sender.ASSISTANT,
              isStreaming: true,
            },
          },
        ];
      });
    },

    [MessageType.UPDATE_COMPLETED]: (message: Message) => {
      setIsUpdateInProgress(false);
      const id = message.id;
      setMessages((prev) => {
        const filtered = prev.filter(
          (msg) => msg.type !== MessageType.UPDATE_FILE
        );

        if (id) {
          const existingIndex = filtered.findIndex((msg) => msg.id === id);
          if (existingIndex !== -1) {
            return filtered.map((msg, idx) =>
              idx === existingIndex
                ? {
                    ...msg,
                    timestamp: message.timestamp || msg.timestamp || Date.now(),
                    data: {
                      ...msg.data,
                      text: "Update completed!",
                      sender: Sender.ASSISTANT,
                    },
                  }
                : msg
            );
          }
        }
        return [
          ...filtered,
          {
            ...message,
            timestamp: message.timestamp || Date.now(),
            data: {
              ...message.data,
              text: "Update completed!",
              sender: Sender.ASSISTANT,
            },
          },
        ];
      });
      refreshIframe();
    },
  };

  const { isConnected, error, connect, send } = useMessageBus({
    wsUrl: BEAM_CONFIG.WS_URL,
    token: BEAM_CONFIG.TOKEN,
    sessionId: sessionId,
    handlers: messageHandlers,
    onConnect: () => {
      console.log("Connected to Beam Cloud");
    },
    onDisconnect: () => {
      hasConnectedRef.current = false;
    },
    onError: (errorMsg) => {
      console.error("Connection error:", errorMsg);

      let errorString = "Unknown connection error";
      if (typeof errorMsg === "string") {
        errorString = errorMsg;
      } else if (errorMsg && typeof errorMsg === "object") {
        const errorObj = errorMsg as { message?: unknown };
        if (errorObj.message) {
          errorString = String(errorObj.message);
        }
      }

      console.error("Processed error:", errorString);
    },
  });

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
        setSidebarWidth(Math.max(300, Math.min(800, newWidth)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      send(MessageType.USER, { text: inputValue });
      setInputValue("");
      setMessages((prev) => [
        ...prev,
        {
          type: MessageType.USER,
          timestamp: Date.now(),
          data: {
            text: inputValue,
            sender: Sender.USER,
          },
          session_id: sessionId,
        },
      ]);
    }
  };

  useEffect(() => {
    if (iframeUrl && isConnected) {
      setIframeError(false);
    }
  }, [iframeUrl, isConnected]);

  const handleIframeLoad = () => {
    console.log("Iframe loaded successfully:", iframeUrl);
    setIframeError(false);
    setIframeReady(true);
  };

  const handleIframeError = () => {
    console.error("Iframe failed to load:", iframeUrl);
    setIframeError(true);
  };

  useEffect(() => {
    if (!isConnected && !hasConnectedRef.current && sessionId) {
      console.log("Connecting to Workspace with sessionId:", sessionId);
      hasConnectedRef.current = true;
      connect();
    }
  }, [isConnected, sessionId]);

  useEffect(() => {
    if (!isConnected) {
      processedMessageIds.current.clear();
    }
  }, [isConnected]);

  useEffect(() => {
    setIframeReady(false);
  }, [iframeUrl]);

  useEffect(() => {
    if (
      initCompleted &&
      !sandboxExists &&
      location.state &&
      location.state.initialPrompt &&
      !initialPromptSent.current
    ) {
      send(MessageType.USER, { text: location.state.initialPrompt });
      setMessages((prev) => [
        ...prev,
        {
          type: MessageType.USER,
          timestamp: Date.now(),
          data: {
            text: location.state.initialPrompt,
            sender: Sender.USER,
          },
          session_id: sessionId,
        },
      ]);
      initialPromptSent.current = true;
    }
  }, [
    initCompleted,
    sandboxExists,
    location.state,
    send,
    setMessages,
    sessionId,
  ]);

  const LoadingState = () => (
    <IframeErrorContainer>
      <SpinningIcon>
        <Loader2 size={64} />
      </SpinningIcon>
      <AnimatedText style={{ marginTop: "24px" }}>
        Connecting to Workspace...
      </AnimatedText>
      <p style={{ marginTop: "12px", textAlign: "center", color: "#9ca3af" }}>
        Please wait while we setup your workspace and load the website.
      </p>
    </IframeErrorContainer>
  );

  const UpdateInProgressState = () => (
    <IframeErrorContainer>
      <SpinningIcon>
        <Loader2 size={64} />
      </SpinningIcon>
      <AnimatedText style={{ marginTop: "24px" }}>
        Updating Workspace...
      </AnimatedText>
      <p style={{ marginTop: "12px", textAlign: "center", color: "#9ca3af" }}>
        Please wait while we apply your changes to the website.
      </p>
    </IframeErrorContainer>
  );

  const iframeStyle = {
    visibility: (iframeReady && !isUpdateInProgress ? "visible" : "hidden") as "visible" | "hidden",
    width:
      typeof DEVICE_SPECS[selectedDevice].width === "number"
        ? `${DEVICE_SPECS[selectedDevice].width}px`
        : DEVICE_SPECS[selectedDevice].width,
    height:
      typeof DEVICE_SPECS[selectedDevice].height === "number"
        ? `${DEVICE_SPECS[selectedDevice].height}px`
        : DEVICE_SPECS[selectedDevice].height,
    margin: selectedDevice === "desktop" ? "0" : "24px auto",
    display: "block" as const,
    borderRadius: selectedDevice === "desktop" ? 0 : 16,
    boxShadow:
      selectedDevice === "desktop"
        ? "none"
        : "0 2px 16px rgba(0,0,0,0.12)",
    background: "#fff",
    boxSizing: "border-box" as const,
  };

  const renderIframe = (showOverlay: boolean) => (
    <>
      <IframeResponsiveWrapper>
        <WebsiteIframe
          ref={iframeRef}
          src={iframeUrl}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          allow="fullscreen"
          referrerPolicy="no-referrer"
          loading="lazy"
          isResizing={isResizing}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          style={iframeStyle}
        />
      </IframeResponsiveWrapper>
      {showOverlay && (
        <IframeOverlay>
          {isUpdateInProgress || (!iframeReady && !initCompleted) ? (
            <UpdateInProgressState />
          ) : (
            <LoadingState />
          )}
        </IframeOverlay>
      )}
    </>
  );

  const chatPanel = (
    <>
      <ChatHistory ref={chatHistoryRef}>
        {messages
          .filter(
            (msg) =>
              msg.data.text &&
              typeof msg.data.text === "string" &&
              msg.data.text.trim()
          )
          .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
          .map((msg, index) => (
            <MessageContainer
              key={msg.id || `msg-${index}-${msg.timestamp || Date.now()}`}
              isUser={msg.data.sender === Sender.USER}
            >
              <MessageBubble
                isUser={msg.data.sender === Sender.USER}
              >
                <p
                  style={{
                    whiteSpace: "pre-wrap",
                    color:
                      msg.data.sender === Sender.USER ? "white" : "#d1d5db",
                    margin: 0,
                  }}
                >
                  {String(msg.data.text || "")}
                </p>
                {msg.data.isStreaming && (
                  <TypingIndicator>
                    <TypingDot />
                    <TypingDot />
                    <TypingDot />
                  </TypingIndicator>
                )}
              </MessageBubble>
            </MessageContainer>
          ))}
      </ChatHistory>

      <ChatInputContainer>
        <Input
          placeholder="Ask Holly..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          disabled={!isConnected || !iframeReady}
          className="bg-[#1a1a2e] border-[#2a2a4a] text-white placeholder:text-gray-500"
        />
        <Button
          onClick={handleSendMessage}
          disabled={!isConnected || !iframeReady || !inputValue.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Send
        </Button>
      </ChatInputContainer>
    </>
  );

  const previewPanel = (
    <>
      {isConnected ? (
        <IframeContainer>
          <UrlBarContainer>
            <IconButton
              style={{ cursor: iframeUrl ? "pointer" : "not-allowed" }}
              onClick={iframeUrl ? refreshIframe : undefined}
              title="Refresh"
            >
              <RotateCcw size={16} />
            </IconButton>
            <UrlInput value={iframeUrl || ""} readOnly />
            <a
              href={iframeUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                pointerEvents: iframeUrl ? "auto" : "none",
                color: "#9ca3af",
              }}
              tabIndex={iframeUrl ? 0 : -1}
            >
              <ExternalLink size={16} />
            </a>
          </UrlBarContainer>
          <IframeArea>
            {iframeError ? (
              <IframeErrorContainer>
                <Heart size={64} color="#6366f1" />
                <ErrorTitle style={{ marginTop: "24px" }}>
                  Failed to load website
                </ErrorTitle>
                <ErrorText style={{ marginTop: "12px", textAlign: "center" }}>
                  {iframeUrl} took too long to load or failed to respond.
                </ErrorText>
                <ErrorText style={{ marginTop: "8px", textAlign: "center" }}>
                  This could be due to network issues or the website being
                  temporarily unavailable.
                </ErrorText>
              </IframeErrorContainer>
            ) : !iframeUrl ? (
              <IframeOverlay>
                <LoadingState />
              </IframeOverlay>
            ) : !iframeReady || isUpdateInProgress || !initCompleted ? (
              renderIframe(true)
            ) : (
              renderIframe(false)
            )}
          </IframeArea>
          <BottomBar>
            <ToggleGroup>
              <ToggleButton
                active={true}
                disabled={
                  !iframeUrl ||
                  !iframeReady ||
                  isUpdateInProgress ||
                  !initCompleted
                }
              >
                Preview
              </ToggleButton>
              <ToggleButton
                active={false}
                disabled={
                  !iframeUrl ||
                  !iframeReady ||
                  isUpdateInProgress ||
                  !initCompleted
                }
              >
                Code
              </ToggleButton>
            </ToggleGroup>
            <DeviceGroup>
              <DeviceButton
                active={selectedDevice === "mobile"}
                disabled={
                  !iframeUrl ||
                  !iframeReady ||
                  isUpdateInProgress ||
                  !initCompleted
                }
                onClick={() => setSelectedDevice("mobile")}
              >
                <PhoneIcon size={16} />
              </DeviceButton>
              <DeviceButton
                active={selectedDevice === "tablet"}
                disabled={
                  !iframeUrl ||
                  !iframeReady ||
                  isUpdateInProgress ||
                  !initCompleted
                }
                onClick={() => setSelectedDevice("tablet")}
              >
                <TabletIcon size={16} />
              </DeviceButton>
              <DeviceButton
                active={selectedDevice === "desktop"}
                disabled={
                  !iframeUrl ||
                  !iframeReady ||
                  isUpdateInProgress ||
                  !initCompleted
                }
                onClick={() => setSelectedDevice("desktop")}
              >
                <ComputerIcon size={16} />
              </DeviceButton>
            </DeviceGroup>
            <DeployButton
              disabled={
                !iframeUrl ||
                !iframeReady ||
                isUpdateInProgress ||
                !initCompleted
              }
            >
              Deploy
            </DeployButton>
          </BottomBar>
        </IframeContainer>
      ) : (
        <DisconnectedContainer>
          <Heart size={64} color="#6366f1" />
          <ConnectTitle>
            Connect to start building
          </ConnectTitle>

          {error && (
            <ErrorMessage>
              <ErrorText>Error: {error}</ErrorText>
            </ErrorMessage>
          )}

          <Checklist>
            <ChecklistItem>
              <Play size={16} color="#6366f1" />
              <ChecklistText>Connect to Workspace</ChecklistText>
            </ChecklistItem>
            <ChecklistItem>
              <Play size={16} color="#6366f1" />
              <ChecklistText>Chat with AI in the sidebar</ChecklistText>
            </ChecklistItem>
            <ChecklistItem>
              <Play size={16} color="#6366f1" />
              <ChecklistText>
                Select specific elements to modify
              </ChecklistText>
            </ChecklistItem>
          </Checklist>
        </DisconnectedContainer>
      )}
    </>
  );

  return (
    <PageContainer>
      {/* Desktop layout */}
      <DesktopLayout>
        <Sidebar style={{ width: `${sidebarWidth}px` }}>
          <HollyHeader>
            <span style={{ fontSize: 20 }}>⚡</span>
            <div>Holly</div>
          </HollyHeader>
          {chatPanel}
        </Sidebar>
        <ResizeHandle onMouseDown={() => setIsResizing(true)} />
        <MainContent hasIframe={!!iframeUrl}>
          {previewPanel}
        </MainContent>
      </DesktopLayout>

      {/* Mobile layout */}
      <MobileLayout>
        <MobileHeader>
          <MobileHeaderTitle>
            <span style={{ fontSize: 18 }}>⚡</span>
            <span>Holly</span>
          </MobileHeaderTitle>
          <MobileTabBar>
            <MobileTabButton active={mobileTab === "chat"} onClick={() => setMobileTab("chat")}>
              <MessageSquare size={16} />
              Chat
            </MobileTabButton>
            <MobileTabButton active={mobileTab === "preview"} onClick={() => setMobileTab("preview")}>
              <Monitor size={16} />
              Preview
            </MobileTabButton>
          </MobileTabBar>
        </MobileHeader>
        <MobileContent>
          {mobileTab === "chat" ? (
            <MobileChatPanel>
              {chatPanel}
            </MobileChatPanel>
          ) : (
            <MobilePreviewPanel>
              {previewPanel}
            </MobilePreviewPanel>
          )}
        </MobileContent>
      </MobileLayout>
    </PageContainer>
  );
};

export default Create;

const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  background: #0e0e10;
`;

const DesktopLayout = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;

  @media (max-width: 768px) {
    display: none;
  }
`;

const MobileLayout = styled.div`
  display: none;
  flex-direction: column;
  width: 100%;
  height: 100%;

  @media (max-width: 768px) {
    display: flex;
  }
`;

const MobileHeader = styled.div`
  background: #0e0e10;
  border-bottom: 1px solid #2a2a4a;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
`;

const MobileHeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-weight: 700;
  font-size: 18px;
`;

const MobileTabBar = styled.div`
  display: flex;
  gap: 8px;
`;

const MobileTabButton = styled.button<{ active: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${({ active }) => (active ? "#6366f1" : "#2a2a4a")};
  background: ${({ active }) => (active ? "#1e1e3a" : "transparent")};
  color: ${({ active }) => (active ? "#a5b4fc" : "#6b7280")};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
`;

const MobileContent = styled.div`
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

const MobileChatPanel = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  gap: 12px;
`;

const MobilePreviewPanel = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Sidebar = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  color: white;
  gap: 16px;
  background: #0e0e10;
  border-right: 1px solid #2a2a4a;
  min-width: 300px;
`;

const MainContent = styled.div<{ hasIframe: boolean }>`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: ${({ hasIframe }) => (hasIframe ? "stretch" : "center")};
  justify-content: ${({ hasIframe }) => (hasIframe ? "stretch" : "center")};
  gap: ${({ hasIframe }) => (hasIframe ? "0" : "24px")};
  background: #12121a;
`;

const DisconnectedContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
`;

const Checklist = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 48px;
`;

const ChecklistItem = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;

const HollyHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 18px;
  color: white;
`;

const ChatHistory = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  flex-grow: 1;
`;

const MessageContainer = styled.div<{ isUser: boolean }>`
  display: flex;
  flex-direction: row;
  justify-content: ${({ isUser }) => (isUser ? "flex-end" : "flex-start")};
`;

const MessageBubble = styled.div<{ isUser: boolean }>`
  padding: 12px;
  border-radius: 12px;
  max-width: 85%;
  background: ${({ isUser }) => (isUser ? "#4338ca" : "#1a1a2e")};
  border: 1px solid ${({ isUser }) => (isUser ? "#4338ca" : "#2a2a4a")};
  font-size: 14px;
`;

const ChatInputContainer = styled.div`
  margin-top: auto;
  display: flex;
  flex-direction: row;
  gap: 8px;
  flex-shrink: 0;
`;

const ErrorMessage = styled.div`
  border: 1px solid #f87171;
  border-radius: 6px;
  padding: 12px;
  margin-top: 16px;
`;

const TypingIndicator = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 8px;
  justify-content: flex-start;
`;

const TypingDot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #6366f1;
  animation: typing 1.4s infinite ease-in-out;

  &:nth-child(1) {
    animation-delay: -0.32s;
  }

  &:nth-child(2) {
    animation-delay: -0.16s;
  }

  @keyframes typing {
    0%,
    80%,
    100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

const ResizeHandle = styled.div`
  width: 4px;
  cursor: col-resize;
  transition: background-color 0.2s ease;
  background: #2a2a4a;

  &:hover {
    background-color: #6366f1;
  }

  &:active {
    background-color: #818cf8;
  }
`;

const IframeContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
`;

const IframeArea = styled.div`
  position: relative;
  width: 100%;
  height: calc(100% - 56px - 40px);
  min-height: 0;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
`;

const IframeResponsiveWrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;

  & > iframe {
    max-width: 100%;
    max-height: 100%;
  }
`;

const WebsiteIframe = styled.iframe<{ isResizing: boolean }>`
  width: 100%;
  height: 100%;
  border: none;
  pointer-events: ${({ isResizing }) => (isResizing ? "none" : "auto")};
  display: block;
  box-sizing: border-box;
`;

const IframeErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 24px;
`;

const IframeOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2;
  background: #12121a;
`;

const SpinningIcon = styled.div`
  animation: spin 1s linear infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6366f1;

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #2a2a4a;
  }
`;

const AnimatedText = styled.div`
  font-size: 18px;
  font-weight: 500;
  color: #e5e7eb;
  animation: pulse 1.5s infinite;

  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
    100% {
      opacity: 1;
    }
  }
`;

const ErrorTitle = styled.div`
  font-size: 18px;
  font-weight: 500;
  color: #e5e7eb;
`;

const ErrorText = styled.div`
  font-size: 14px;
  color: #9ca3af;
`;

const ConnectTitle = styled.div`
  font-size: 18px;
  font-weight: 500;
  color: #e5e7eb;
`;

const ChecklistText = styled.div`
  font-size: 14px;
  color: #9ca3af;
`;

const UrlBarContainer = styled.div`
  display: flex;
  align-items: center;
  background: #1a1a2e;
  border-bottom: 1px solid #2a2a4a;
  padding: 6px 12px;
  gap: 8px;
`;

const UrlInput = styled.input`
  flex: 1;
  background: #12121a;
  border: 1px solid #2a2a4a;
  color: #9ca3af;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 14px;
  outline: none;
`;

const BottomBar = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1a1a2e;
  border-top: 1px solid #2a2a4a;
  padding: 0 24px;
  height: 56px;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;

  @media (max-width: 768px) {
    padding: 0 12px;
    gap: 8px;
  }
`;

const ToggleGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const ToggleButton = styled.button<{ active?: boolean }>`
  background: ${({ active }) => (active ? "#2a2a4a" : "transparent")};
  color: ${({ active, disabled }) =>
    disabled ? "#4a4a6a" : active ? "#e5e7eb" : "#6b7280"};
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  padding: 6px 18px;
  font-size: 14px;
  font-weight: 500;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  transition: background 0.15s, color 0.15s;
  &:hover:not(:disabled) {
    background: #2a2a4a;
  }

  @media (max-width: 768px) {
    padding: 6px 12px;
    font-size: 13px;
  }
`;

const DeviceGroup = styled.div`
  display: flex;
  gap: 8px;

  @media (max-width: 768px) {
    display: none;
  }
`;

const DeviceButton = styled.button<{ active?: boolean }>`
  background: ${({ active }) => (active ? "#6366f1" : "transparent")};
  color: ${({ active, disabled }) =>
    disabled ? "#4a4a6a" : active ? "white" : "#6b7280"};
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 14px;
  font-weight: 500;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  transition: background 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover:not(:disabled) {
    background: #4338ca;
    color: white;
  }
`;

const DeployButton = styled.button`
  background: #7c3aed;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 28px;
  font-size: 15px;
  font-weight: 600;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  transition: background 0.15s;
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
  &:hover:not(:disabled) {
    background: #6d28d9;
  }

  @media (max-width: 768px) {
    padding: 8px 16px;
    font-size: 13px;
  }
`;
