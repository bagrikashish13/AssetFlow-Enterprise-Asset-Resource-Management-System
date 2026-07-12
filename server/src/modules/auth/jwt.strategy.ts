import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request): string | null => {
          const cookies = request.cookies as Record<string, string> | undefined;
          return cookies?.af_token ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { department: true },
    });
    if (!user) {
      throw new UnauthorizedException({
        errorCode: 'UNAUTHENTICATED',
        message: 'User not found',
      });
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        errorCode: 'UNAUTHENTICATED',
        message: 'User account is inactive',
      });
    }
    // Remove passwordHash before attaching to request
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
