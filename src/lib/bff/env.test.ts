import { afterEach, describe, expect, it } from "vitest";
import { serverEnv } from "@/lib/bff/env";

const originalEnv = { ...process.env };

describe("serverEnv", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("accepts BACKEND_API_KEY as the local secret alias", () => {
    delete process.env.CLIENT_API_KEY;
    process.env.BACKEND_API_KEY = "local-backend-key";

    expect(serverEnv().clientApiKey).toBe("local-backend-key");
  });

  it("prefers CLIENT_API_KEY when both key names are present", () => {
    process.env.CLIENT_API_KEY = "client-key";
    process.env.BACKEND_API_KEY = "backend-key";

    expect(serverEnv().clientApiKey).toBe("client-key");
  });
});
