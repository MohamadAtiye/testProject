import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import Kontakt from "./Kontakt";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Kontakt form", () => {
  it("associates a server field error with its input", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              ok: false,
              error: "Bitte prüfe deine Eingaben.",
              errors: { email: "Bitte gib eine gültige E-Mail-Adresse an." },
            }),
            { status: 422, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    render(
      <MemoryRouter>
        <Kontakt />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText("E-Mail"), "test@example.com");
    await userEvent.type(screen.getByLabelText("Titel"), "Hallo");
    await userEvent.type(screen.getByLabelText("Nachricht"), "Testnachricht");
    await userEvent.click(
      screen.getByRole("button", { name: /Nachricht senden/i }),
    );

    const email = await screen.findByLabelText("E-Mail");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-describedby", "email-error");
    expect(
      screen.getByText("Bitte gib eine gültige E-Mail-Adresse an."),
    ).toHaveAttribute("id", "email-error");
  });
});
