import { useEffect, useRef, useCallback } from "react";
import { api } from "./api";

interface ShotEdit {
  shot_id: string;
  updates: Record<string, unknown>;
}

interface ShotAdd {
  shot: Record<string, unknown>;
}

interface ShotDelete {
  shot_id: string;
}

type MessageHandler = {
  onShotUpdated?: (data: ShotEdit & { user_id: string }) => void;
  onShotAdded?: (data: ShotAdd & { user_id: string }) => void;
  onShotDeleted?: (data: ShotDelete & { user_id: string }) => void;
  onOnlineCount?: (count: number) => void;
};

export function useWebSocket(projectId: string | null, handlers: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    if (!projectId) return;

    const token = api.getToken();
    if (!token) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const wsUrl = baseUrl.replace(/^http/, "ws");
    const ws = new WebSocket(`${wsUrl}/ws/${projectId}?token=${token}`);

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case "shot_updated":
            handlersRef.current.onShotUpdated?.(data);
            break;
          case "shot_added":
            handlersRef.current.onShotAdded?.(data);
            break;
          case "shot_deleted":
            handlersRef.current.onShotDeleted?.(data);
            break;
          case "online_count":
            handlersRef.current.onOnlineCount?.(data.count);
            break;
        }
      } catch {}
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [projectId]);

  return { send };
}
