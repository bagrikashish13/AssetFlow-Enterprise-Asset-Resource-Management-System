import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

/** Extract a single cookie value from a raw Cookie header. */
function readCookie(rawCookie: string, name: string): string | undefined {
  for (const part of rawCookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
}

/**
 * Realtime gateway. Authenticates the handshake with the same JWT cookie the
 * REST API uses, then joins each socket to a user room and a role room so
 * services can target notifications and cache-invalidation hints precisely.
 */
@WebSocketGateway({
  namespace: '/events',
  cors: { credentials: true },
})
export class EventsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    try {
      const rawCookie = client.handshake.headers.cookie ?? '';
      const token = readCookie(rawCookie, 'af_token');
      if (!token) {
        client.disconnect(true);
        return;
      }
      const payload = this.jwt.verify<{ sub: string; role?: string }>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      void client.join(`user:${payload.sub}`);
      if (payload.role) {
        void client.join(`role:${payload.role}`);
      }
    } catch {
      client.disconnect(true);
    }
  }
}
