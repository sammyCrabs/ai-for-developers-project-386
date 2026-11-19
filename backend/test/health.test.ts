import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

describe("smoke", () => {
  const app = buildApp();
  afterAll(() => app.close());

  it("responds to GET /health", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});
