import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { db } from './db';
import { WSEvent } from '../src/types';

export const clientSockets = new Map<string, WebSocket>();
export const activeChatUsers = new Set<string>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    let currentUserId: string | null = null;

    ws.on('message', (message) => {
      try {
        const payload: WSEvent = JSON.parse(message.toString());
        
        if (payload.type === 'connection:init') {
          currentUserId = payload.userId;
          if (currentUserId) {
            clientSockets.set(currentUserId, ws);
            const user = db.users.find(u => u.id === currentUserId);
            if (user) user.online = true;
            broadcastPartnerStatus(currentUserId, true);
          }
        }
        
        // Handle other event types
        if (payload.type === 'chat:typing') {
          const partnerId = getPartnerId(payload.userId);
          if (partnerId) sendToUser(partnerId, payload);
        }

        if (payload.type === 'chat:message') {
           const partnerId = getPartnerId(payload.message.senderId);
           if (partnerId) sendToUser(partnerId, payload);
        }

        if (payload.type === 'chat:thumb-kiss-start' || payload.type === 'chat:thumb-kiss-end') {
           const partnerId = getPartnerId(payload.userId);
           if (partnerId) sendToUser(partnerId, payload);
        }

      } catch (err) {
        console.error('WS Message Error:', err);
      }
    });

    ws.on('close', () => {
      if (currentUserId) {
        clientSockets.delete(currentUserId);
        const user = db.users.find(u => u.id === currentUserId);
        if (user) user.online = false;
        broadcastPartnerStatus(currentUserId, false);
      }
    });
  });

  return wss;
}

export function sendToUser(userId: string, event: WSEvent) {
  const ws = clientSockets.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  }
}

function getPartnerId(userId: string): string | undefined {
  const user = db.users.find(u => u.id === userId);
  if (!user || !user.coupleId) return undefined;
  const couple = db.couples.find(c => c.id === user.coupleId);
  if (!couple) return undefined;
  return couple.partner1Id === userId ? couple.partner2Id : couple.partner1Id;
}

function broadcastPartnerStatus(userId: string, online: boolean) {
  const partnerId = getPartnerId(userId);
  if (partnerId) {
    sendToUser(partnerId, {
      type: 'partner:status',
      userId,
      online
    });
  }
}
