import { describe, expect, it, vi } from "vitest";
import {
  OPERATIONS_MODE_KEY,
  parseOperationsMode,
  readOperationsMode,
  writeOperationsMode,
} from "./operations-mode";

describe("parseOperationsMode", () => {
  it("parses exact strings", () => {
    expect(parseOperationsMode("live")).toBe("live");
    expect(parseOperationsMode("sandbox")).toBe("sandbox");
  });

  it("trims surrounding whitespace", () => {
    expect(parseOperationsMode(" live ")).toBe("live");
    expect(parseOperationsMode("sandbox\n")).toBe("sandbox");
  });

  it("rejects anything else", () => {
    expect(parseOperationsMode(null)).toBeNull();
    expect(parseOperationsMode(undefined)).toBeNull();
    expect(parseOperationsMode("")).toBeNull();
    expect(parseOperationsMode("LIVE")).toBeNull();
    expect(parseOperationsMode("test")).toBeNull();
  });
});

describe("readOperationsMode", () => {
  it("returns the stored value", async () => {
    const settings = { get: async () => "live", set: async () => {}, delete: async () => {}, all: async () => ({}) };
    expect(await readOperationsMode(settings, "sandbox")).toBe("live");
  });

  it("falls back on missing value", async () => {
    const settings = { get: async () => null, set: async () => {}, delete: async () => {}, all: async () => ({}) };
    expect(await readOperationsMode(settings, "sandbox")).toBe("sandbox");
  });

  it("falls back on malformed stored value without throwing", async () => {
    const settings = { get: async () => "bogus", set: async () => {}, delete: async () => {}, all: async () => ({}) };
    expect(await readOperationsMode(settings, "live")).toBe("live");
  });
});

describe("writeOperationsMode", () => {
  it("writes the exact key/value", async () => {
    const set = vi.fn(async () => {});
    const settings = { get: async () => null, set, delete: async () => {}, all: async () => ({}) };

    await writeOperationsMode(settings, "live");

    expect(set).toHaveBeenCalledWith(OPERATIONS_MODE_KEY, "live");
    expect(OPERATIONS_MODE_KEY).toBe("operations:mode");
  });

  it("rejects an invalid mode", async () => {
    const set = vi.fn(async () => {});
    const settings = { get: async () => null, set, delete: async () => {}, all: async () => ({}) };

    await expect(
      writeOperationsMode(settings, "bogus" as never),
    ).rejects.toThrow("OPERATIONS_MODE must be one of live, sandbox");
    expect(set).not.toHaveBeenCalled();
  });
});
