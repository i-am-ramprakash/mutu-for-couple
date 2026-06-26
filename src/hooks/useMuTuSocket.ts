import { useState, useEffect, useRef, useCallback } from 'react';
import { WSEvent, Message, User } from '../types';

export function useMuTuSocket(currentUser: User | null, onIncomingEvent: (payload: WSEvent) => void) {
  const socketRef = useRef<WebSocket | null>(null);
  const onIncomingEventRef = useRef(onIncomingEvent);

  // Keep callback ref updated to avoid stale closures without breaking the connection
  useEffect(() => {
    onIncomingEventRef.current = onIncomingEvent;
  }, [onIncomingEvent]);

  const connectSocket = useCallback(() => {
    if (!currentUser) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'connection:init', userId: currentUser.id }));
    };

    ws.onmessage = (event) => {
      try {
        const payload: WSEvent = JSON.parse(event.data);
        onIncomingEventRef.current(payload);
      } catch (err) {
        console.error('WS Error:', err);
      }
    };

    ws.onclose = () => {
      setTimeout(connectSocket, 4000);
    };

    return () => {
      ws.close();
    };
  }, [currentUser]);

  useEffect(() => {
    const cleanup = connectSocket();
    return () => {
      if (cleanup) cleanup();
    };
  }, [connectSocket]);

  const sendMessage = (event: WSEvent) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(event));
    }
  };

  return { sendMessage };
}
