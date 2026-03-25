import { useEffect, useRef, useCallback, useState } from 'react';

export interface WebSocketMessage {
  type: string;
  election_id?: number;
  branch?: string;
  section?: string;
  candidate_id?: number;
  message?: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface UseWebSocketProps {
  electionId?: number;
  isAdmin?: boolean;
  enabled?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
}

const DEFAULT_RECONNECT_DELAY_MS = 3000;
const DEFAULT_PING_INTERVAL_MS = 20000;

const normalizeApiBaseUrl = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname === 'localhost') {
      parsed.hostname = '127.0.0.1';
    }
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return rawUrl.replace(/\/$/, '');
  }
};

const normalizeWebSocketBaseUrl = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname === 'localhost') {
      parsed.hostname = '127.0.0.1';
    }
    if (parsed.protocol === 'https:') parsed.protocol = 'wss:';
    if (parsed.protocol === 'http:') parsed.protocol = 'ws:';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return rawUrl
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://')
      .replace(/\/$/, '');
  }
};

const isWebSocketMessage = (value: unknown): value is WebSocketMessage => {
  if (typeof value !== 'object' || value === null) return false;
  const maybeMessage = value as { type?: unknown };
  return typeof maybeMessage.type === 'string';
};

export const useWebSocket = ({
  electionId,
  isAdmin = false,
  enabled = true,
  onMessage,
  reconnectDelayMs = DEFAULT_RECONNECT_DELAY_MS,
  pingIntervalMs = DEFAULT_PING_INTERVAL_MS,
}: UseWebSocketProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldReconnectRef = useRef(false);
  const onMessageRef = useRef(onMessage);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const clearPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const getWebSocketUrl = useCallback(() => {
    const explicitWsBaseUrl = import.meta.env.VITE_WS_BASE_URL?.trim();
    let baseUrl = explicitWsBaseUrl
      ? normalizeWebSocketBaseUrl(explicitWsBaseUrl)
      : 'ws://127.0.0.1:8000';

    if (!explicitWsBaseUrl) {
      const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000');
      try {
        const parsed = new URL(apiBaseUrl);
        const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
        const basePath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');
        baseUrl = `${wsProtocol}//${parsed.host}${basePath}`;
      } catch {
        baseUrl = apiBaseUrl.startsWith('https://')
          ? apiBaseUrl.replace('https://', 'wss://')
          : apiBaseUrl.replace('http://', 'ws://');
        baseUrl = baseUrl.replace(/\/$/, '');
      }
    }
    if (isAdmin) {
      return `${baseUrl}/ws/admin`;
    } else if (electionId) {
      return `${baseUrl}/ws/election/${electionId}`;
    } else {
      return `${baseUrl}/ws/global`;
    }
  }, [electionId, isAdmin]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearReconnectTimeout();
    clearPingInterval();
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, [clearReconnectTimeout, clearPingInterval]);

  const connect = useCallback(() => {
    if (!enabled) return;
    clearReconnectTimeout();

    const current = wsRef.current;
    if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      shouldReconnectRef.current = true;
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        clearPingInterval();
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
          }
        }, pingIntervalMs);
      };

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;
        try {
          const parsed: unknown = JSON.parse(event.data);
          if (!isWebSocketMessage(parsed)) {
            console.warn('Ignoring malformed WebSocket message payload');
            return;
          }
          const message = parsed as WebSocketMessage;
          setLastMessage(message);
          onMessageRef.current?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        setIsConnected(false);
        clearPingInterval();
        wsRef.current = null;
        if (!shouldReconnectRef.current) return;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectDelayMs);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [enabled, clearPingInterval, clearReconnectTimeout, getWebSocketUrl, reconnectDelayMs, pingIntervalMs]);

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      disconnect();
      return;
    }
    connect();

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect
  };
};

export default useWebSocket;
