import { existsSync } from "node:fs";
import path from "node:path";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import type { components } from "./generated/api.js";

type Health = components["schemas"]["Health"];

async function api(app: FastifyInstance) {
  app.get("/health", async (): Promise<Health> => ({ status: "ok" }));
}

export function buildApp(options: { staticDir?: string } = {}) {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });

  app.register(api, { prefix: "/api" });

  const staticDir = options.staticDir ? path.resolve(options.staticDir) : undefined;
  if (staticDir && existsSync(staticDir)) {
    app.register(fastifyStatic, { root: staticDir });
    // SPA fallback: unknown non-API GET routes get index.html
    app.setNotFoundHandler((req, reply) => {
      if (req.method === "GET" && !req.url.startsWith("/api/")) {
        return reply.sendFile("index.html");
      }
      return reply.code(404).send({ message: "Not Found" });
    });
  }

  return app;
}
