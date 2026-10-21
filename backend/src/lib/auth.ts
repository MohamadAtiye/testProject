import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { HttpError } from "./errors.js";
import { AUTH_COOKIE } from "../plugins/auth.js";

export interface AdminJwt {
  sub: string;
  email: string;
  role: "admin";
  iss: string;
  aud: string;
}

export async function verifyAdmin(request: FastifyRequest): Promise<AdminJwt> {
  try {
    await request.jwtVerify();
  } catch {
    throw new HttpError(401, "Nicht angemeldet.");
  }

  const user = request.user as AdminJwt;

  if (
    user.role !== "admin" ||
    user.iss !== config.JWT_ISSUER ||
    user.aud !== config.JWT_AUDIENCE
  ) {
    throw new HttpError(401, "Nicht angemeldet.");
  }

  return user;
}

export function signAdminToken(app: FastifyInstance, admin: { id: number; email: string }): string {
  return app.jwt.sign(
    {
      sub: String(admin.id),
      email: admin.email,
      role: "admin",
      iss: config.JWT_ISSUER,
      aud: config.JWT_AUDIENCE,
    },
    { expiresIn: config.JWT_EXPIRES_IN },
  );
}

export function setAdminCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(AUTH_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: config.COOKIE_SECURE,
    maxAge: config.JWT_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearAdminCookie(reply: FastifyReply): void {
  reply.clearCookie(AUTH_COOKIE, {
    path: "/",
  });
}
