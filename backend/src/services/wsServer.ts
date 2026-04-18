import http from 'http';
import WebSocket from 'ws';
import { WSMessage } from '../types';

export class WebSocketServer {
  private wss: WebSocket.Server;
  private clients: Set<WebSocket> = new Set();

  constructor(server: http.Server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`[WS] Client connected. Total clients: ${this.clients.size}`);

      this.sendToClient(ws, {
        type: 'connected',
        message: 'Connected to SyberOps WebSocket server',
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WS] Client disconnected. Total clients: ${this.clients.size}`);
      });

      ws.on('error', (error: Error) => {
        console.error(`[WS] Client error:`, error.message);
        this.clients.delete(ws);
      });
    });

    this.wss.on('error', (error: Error) => {
      console.error(`[WS] Server error:`, error.message);
    });
  }

  broadcast(message: WSMessage): void {
    const payload = JSON.stringify(message);

    this.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload, (error: Error | undefined) => {
          if (error) {
            console.error(`[WS] Broadcast error:`, error.message);
            this.clients.delete(client);
          }
        });
      }
    });
  }

  sendToClient(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message), (error: Error | undefined) => {
        if (error) {
          console.error(`[WS] Send error:`, error.message);
        }
      });
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
