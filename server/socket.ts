import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { db } from './db';
import { WSEvent } from '../src/types';
import { addRecord, updateRecord } from '../src/utils/firestore';

export const clientSockets = new Map<string, WebSocket>();
export const activeChatUsers = new Set<string>();

export function setupWebSocket(server: Server, getViteServer?: () => any) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    if (request.headers['sec-websocket-protocol'] === 'vite-hmr') {
      const vite = getViteServer?.();
      if (vite) {
        vite.ws.handleUpgrade(request, socket, head);
      }
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    let currentUserId: string | null = null;

    ws.on('message', async (message) => {
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
          return;
        }

        // Persist message on server if it's sent via WS
        if (payload.type === 'chat:message') {
          try {
            await addRecord('messages', payload.message);
            db.messages.push(payload.message);
          } catch (err) {
            console.error('[WS Server] Failed to persist message to Supabase:', err);
          }
        }

        // Persist delivery status update if received
        if (payload.type === 'chat:delivered') {
          try {
            const msg = db.messages.find(m => m.id === payload.messageId);
            if (msg && msg.status !== 'seen') {
              msg.status = 'delivered';
              await updateRecord('messages', msg);
            }
          } catch (err) {
            console.error('[WS Server] Failed to update message delivery in Supabase:', err);
          }
        }

        // Persist seen status update on server side (removes need for client direct DB write)
        if (payload.type === 'chat:seen-update') {
          try {
            const partnerId = getPartnerId(currentUserId || '');
            if (partnerId) {
              const unread = db.messages.filter(m => m.senderId === partnerId && m.status !== 'seen');
              for (const msg of unread) {
                msg.read = true;
                msg.status = 'seen';
                await updateRecord('messages', msg);
              }
            }
          } catch (err) {
            console.error('[WS Server] Failed to persist seen status in Supabase:', err);
          }
        }

        // Persist chat reaction on server side (removes need for client direct DB write)
        if (payload.type === 'chat:reaction') {
          try {
            const { messageId, reaction, action } = payload as any;
            const msg = db.messages.find(m => m.id === messageId);
            if (msg) {
              let reactions = [...(msg.reactions || [])];
              if (action === 'add') {
                reactions = reactions.filter(r => r.userId !== reaction.userId);
                reactions.push(reaction);
              } else {
                reactions = reactions.filter(r => r.userId !== reaction.userId);
              }
              msg.reactions = reactions;
              await updateRecord('messages', msg);
            }
          } catch (err) {
            console.error('[WS Server] Failed to persist reaction in Supabase:', err);
          }
        }

        // Persist call connection logs if call is initiated
        if (payload.type === 'call:dial') {
          try {
            const senderId = currentUserId || (payload as any).callerId;
            const user = db.users.find(u => u.id === senderId);
            if (user && user.coupleId) {
              const callLog = {
                id: 'call_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                coupleId: user.coupleId,
                type: (payload as any).mode || 'voice',
                timestamp: Date.now()
              };
              await addRecord('callLogs', callLog);
              if (!db.callLogs) db.callLogs = [];
              db.callLogs.push(callLog);
              console.log('[WS Server] Call log persisted:', callLog);
            }
          } catch (err) {
            console.error('[WS Server] Failed to persist call log in Supabase:', err);
          }
        }

        // Universal Partner Signaling Forwarder (for movies, calls, reactions, status, etc.)
        if (currentUserId) {
          const partnerId = getPartnerId(currentUserId);
          if (partnerId) {
            sendToUser(partnerId, payload);
          }
        } else {
          // Fallback if connection:init wasn't completed or state has desynced
          const senderId = (payload as any).userId || 
                           ((payload as any).message && (payload as any).message.senderId) ||
                           (payload as any).callerId ||
                           (payload as any).calleeId;
          if (senderId) {
            const partnerId = getPartnerId(senderId);
            if (partnerId) {
              sendToUser(partnerId, payload);
            }
          }
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
