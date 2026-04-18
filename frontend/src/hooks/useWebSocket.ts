import { useEffect, useRef, useState, useCallback } from 'react';
import { WSMessage } from '../types';

// In production VITE_WS_URL = "wss://syberops-api.up.railway.app"
// In dev the Vite proxy handles /ws → ws://localhost:3001
const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL
  ? `${import.meta.env.VITE_WS_URL}/ws`
  : `ws://${window.location.hostname}:3001`;

interface UseWebSocketOptions {
  url?: string;
  onMessage?: (message: WSMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = DEFAULT_WS_URL,
    onMessage,
    onConnect,
    onDisconnect,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [messageHistory, setMessageHistory] = useState<WSMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          setMessageHistory((prev) => [...prev.slice(-99), message]);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        onDisconnect?.();
        attemptReconnect();
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      attemptReconnect();
    }
  }, [url, onMessage, onConnect, onDisconnect]);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error(
        'Max WebSocket reconnection attempts reached. Manual reconnection needed.'
      );
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectAttemptsRef.current += 1;

    console.log(`WebSocket reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
    reconnectTimeoutRef.current = setTimeout(connect, delay);
  }, [connect]);

  const send = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    messageHistory,
    send,
    disconnect,
    reconnect: connect,
  };
}
