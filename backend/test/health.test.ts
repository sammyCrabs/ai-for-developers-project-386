import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

describe("smoke", () => {
  const app = buildApp();
  afterAll(() => app.close());

  it("responds to GET /api/health", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});

describe("static frontend", () => {
  const app = buildApp({ staticDir: new URL("./fixtures/static", import.meta.url).pathname });
  afterAll(() => app.close());

  it("serves index.html for client routes", async () => {
    const res = await app.inject({ method: "GET", url: "/some/page" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("<div id=\"root\">");
  });

  it("returns 404 JSON for unknown API routes", async () => {
    const res = await app.inject({ method: "GET", url: "/api/nope" });
    expect(res.statusCode).toBe(404);
  });
});
