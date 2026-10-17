import { describe, expect, it } from "vitest";
import { seoForPath } from "./seo";

describe("seoForPath", () => {
  it("returns known metadata for a public route", () => {
    const entry = seoForPath("/kontakt");

    expect(entry.title).toContain("Kontakt");
    expect(entry.noindex).toBeUndefined();
  });

  it("normalizes a trailing slash", () => {
    expect(seoForPath("/kontakt/").title).toBe(seoForPath("/kontakt").title);
  });

  it("marks the admin area noindex", () => {
    expect(seoForPath("/admin/messages").noindex).toBe(true);
    expect(seoForPath("/admin").noindex).toBe(true);
  });

  it("marks unknown paths noindex", () => {
    expect(seoForPath("/does-not-exist").noindex).toBe(true);
  });
});
