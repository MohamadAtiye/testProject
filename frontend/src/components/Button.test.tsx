import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import Button from "./Button";

function renderWithRouter(ui: ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("Button", () => {
  it("renders a button and calls onClick", async () => {
    const onClick = vi.fn();
    renderWithRouter(<Button onClick={onClick}>Senden</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Senden" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders an internal link when `to` is set", () => {
    renderWithRouter(<Button to="/projekte">Projekte</Button>);

    expect(screen.getByRole("link", { name: "Projekte" })).toHaveAttribute(
      "href",
      "/projekte",
    );
  });

  it("renders an external link when `href` is set", () => {
    renderWithRouter(<Button href="https://example.com">Extern</Button>);

    expect(screen.getByRole("link", { name: "Extern" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });

  it("disables the button when requested", () => {
    renderWithRouter(<Button disabled>Gesperrt</Button>);

    expect(screen.getByRole("button", { name: "Gesperrt" })).toBeDisabled();
  });
});
