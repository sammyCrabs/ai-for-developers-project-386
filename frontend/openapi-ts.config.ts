import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "../contract/dist/openapi.yaml",
  output: "src/client",
});
