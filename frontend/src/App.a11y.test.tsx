import { render } from "@testing-library/react";
import axe from "axe-core";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import App from "./App";

async function audit(path: string): Promise<string[]> {
  const { container } = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

  // color-contrast needs real rendering; audit it in a browser, not jsdom.
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });

  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} (${violation.nodes.length} node(s))`,
  );
}

describe("accessibility (axe)", () => {
  it.each(["/", "/kontakt", "/projekt-starten", "/projekte"])(
    "has no detectable violations on %s",
    async (path) => {
      expect(await audit(path)).toEqual([]);
    },
    20000,
  );
});
