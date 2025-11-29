import { useState, useEffect, useRef } from "react";
import { X, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchAPI } from "@/lib/apiClient";

type RideChatWindowProps = {
  rideId: number;
  driverName?: string; // now optional, for backwards compatibility
  peerName?: string;
  mode?: "passenger" | "driver";
  onClose: () => void;
};

type DragState = {
  dragging: boolean;
  offsetX: number;
  offsetY: number;
};

type ChatMessage = {
  msgId: number;
  body: string;
  sentAt: string | null;
  isMine: boolean;
};

export default function RideChatWindow({
  rideId,
  driverName,
  peerName,
  mode = "passenger",
  onClose,
}: RideChatWindowProps) {
  const [message, setMessage] = useState("");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragState = useRef<DragState | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Who are we chatting with (label in header)
  const displayName = peerName ?? driverName ?? "User";

  // API base prefix depends on mode
  const apiPrefix = mode === "driver" ? "/driver" : "/passenger";

  // Initial position (bottom-right-ish)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPosition({
      x: Math.max(vw - 360, 16),
      y: Math.max(vh - 320, 16),
    });
  }, []);

  // Drag logic
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!dragState.current?.dragging) return;
      setPosition({
        x: e.clientX - dragState.current.offsetX,
        y: e.clientY - dragState.current.offsetY,
      });
    }

    function handleMouseUp() {
      if (dragState.current) {
        dragState.current.dragging = false;
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!dragState.current) {
      dragState.current = { dragging: false, offsetX: 0, offsetY: 0 };
    }
    dragState.current.dragging = true;
    dragState.current.offsetX = e.clientX - position.x;
    dragState.current.offsetY = e.clientY - position.y;
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    const text = message.trim();

    try {
      setSending(true);
      const res = await fetchAPI<{
        success: boolean;
        message?: ChatMessage;
        error?: string;
      }>(`${apiPrefix}/rides/${rideId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: text }),
      });

      if (!res.success || !res.message) {
        console.error(res.error || "Failed to send message");
        return;
      }

      // Append to list (optimistic-ish)
      setMessages((prev) => [...prev, res.message]);
      setMessage("");
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleFetch = async () => {
    try {
      setLoading(true);
      const res = await fetchAPI<{
        success: boolean;
        messages?: ChatMessage[];
        error?: string;
      }>(`${apiPrefix}/rides/${rideId}/messages`);

      if (!res.success) {
        console.error(res.error || "Failed to fetch messages");
        return;
      }

      setMessages(res.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        className="absolute pointer-events-auto w-80 max-w-[90vw] rounded-xl border border-emerald-700/40 bg-neutral-900/80 shadow-2xl backdrop-blur-md flex flex-col"
        style={{ top: position.y, left: position.x }}
      >
        {/* Header (drag handle) */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 cursor-move bg-neutral-900/90 rounded-t-xl"
          onMouseDown={startDrag}
        >
          <div className="flex flex-col">
            <span className="text-[11px] text-neutral-400">Chat with</span>
            <span className="text-sm font-semibold text-neutral-50 truncate">
              {displayName}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full hover:bg-neutral-800"
            onClick={onClose}
          >
            <X className="h-4 w-4 text-neutral-400" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 max-h-56 overflow-y-auto px-3 py-2 text-xs text-neutral-400">
          {loading ? (
            <p className="text-neutral-500">Loading messages…</p>
          ) : messages.length === 0 ? (
            <p className="text-neutral-500">
              No messages yet. Start the conversation.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {messages.map((m) => (
                <div
                  key={m.msgId}
                  className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-2 py-1 ${
                      m.isMine
                        ? "bg-emerald-600 text-white"
                        : "bg-neutral-800 text-neutral-100"
                    }`}
                  >
                    <div className="text-[11px] leading-snug">{m.body}</div>
                    {m.sentAt && (
                      <div className="mt-0.5 text-[9px] opacity-70 text-right">
                        {new Date(m.sentAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: input + buttons */}
        <div className="border-t border-neutral-800 px-3 py-2 space-y-2">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-50 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Type a message…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (message.trim() && !sending) handleSend();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              className="gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
              onClick={handleSend}
              disabled={!message.trim() || sending}
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 border-neutral-700 bg-neutral-900 text-[11px] text-neutral-400 hover:bg-neutral-800"
            onClick={handleFetch}
          >
            <RefreshCw className="h-3 w-3" />
            {loading ? "Refreshing…" : "Fetch new messages"}
          </Button>
        </div>
      </div>
    </div>
  );
}
