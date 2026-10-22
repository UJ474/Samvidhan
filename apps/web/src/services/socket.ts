import { io, type Socket } from 'socket.io-client';

export function resolveServerUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = window.localStorage.getItem('samvidhan_server_url');
    if (custom) return custom;

    if (window.location.protocol === 'file:' || window.location.hostname === 'localhost') {
      return 'http://localhost:3001';
    }
    return window.location.origin;
  }
  return import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
}

const SERVER_URL = resolveServerUrl();

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
  }
  return socketInstance;
}

export function resetSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
