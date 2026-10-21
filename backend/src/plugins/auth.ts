import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import fp from "fastify-plugin";
import { config } from "../config.js";

export const AUTH_COOKIE = "admin_token";

export default fp(async (app) => {
  await app.register(cookie);

  await app.register(jwt, {
    secret: config.JWT_SECRET,
    cookie: {
      cookieName: AUTH_COOKIE,
      signed: false,
    },
  });
});
