import { describe, it, expect } from "vitest";
import { placeholder } from "../../src/index.js";

describe("placeholder", () => {
  it("returns the expected string", () => {
    expect(placeholder()).toBe("ts-migration-placeholder");
  });
});
