import type { FastifyRequest } from "fastify";
import { config } from "../config.js";
import { HttpError } from "./errors.js";

function requestOrigin(request: FastifyRequest): string | null {
  const origin = request.headers.origin;
  if (typeof origin === "string" && origin !== "") {
    return origin.replace(/\/$/, "");
  }

  const referer = request.headers.referer;
  if (typeof referer === "string" && referer !== "") {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  return null;
}

export function assertTrustedOrigin(request: FastifyRequest): void {
  const origin = requestOrigin(request);

  if (origin === null) {
    return;
  }

  if (!config.ALLOWED_ORIGINS.includes(origin)) {
    throw new HttpError(403, "Ungültige Herkunft.");
  }
}

export function assertCookieRequestOrigin(request: FastifyRequest): void {
  if (request.cookies.admin_token !== undefined) {
    assertTrustedOrigin(request);
  }
}
