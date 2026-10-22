/**
 * WebSocket client with auto-reconnect and dispatching
 */

type MessageHandler = (data: any) => void;

export class AutoPilotWebSocket {
  private socket: WebSocket | null = null;
  private url: string;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private isExplicitlyClosed = false;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.url = `${protocol}//${host}/ws/stream`;
  }

  public connect() {
    this.isExplicitlyClosed = false;
    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        // Start ping heartbeat
        this.pingTimer = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send('ping');
          }
        }, 15000);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handlers.forEach((handler) => handler(data));
        } catch {
          // ignore non-json ping/pong
        }
      };

      this.socket.onclose = () => {
        clearInterval(this.pingTimer);
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = () => {
        if (this.socket) {
          this.socket.close();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  public subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    clearInterval(this.pingTimer);
    clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const wsClient = new AutoPilotWebSocket();
