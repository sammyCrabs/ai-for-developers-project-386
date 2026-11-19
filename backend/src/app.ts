import Fastify from "fastify";
import type { components } from "./generated/api.js";

type Health = components["schemas"]["Health"];

export function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });

  app.get("/health", async (): Promise<Health> => ({ status: "ok" }));

  return app;
}
