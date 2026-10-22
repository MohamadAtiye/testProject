import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProjektStarten from "./ProjektStarten";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("ProjektStarten assist", () => {
  it("hides the loading state when typing cancels the request", async () => {
    vi.useFakeTimers();
    let aborted = false;

    vi.stubGlobal(
      "fetch",
      vi.fn(
        (request: Request) =>
          new Promise((_resolve, reject) => {
            request.signal.addEventListener("abort", () => {
              aborted = true;
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      ),
    );

    render(
      <MemoryRouter>
        <ProjektStarten />
      </MemoryRouter>,
    );

    const goal = screen.getByLabelText("Beschreib dein Vorhaben");

    fireEvent.change(goal, {
      target: { value: "Wir brauchen eine neue Website für unseren Betrieb." },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(screen.getByText("Assistent denkt nach")).toBeInTheDocument();

    fireEvent.change(goal, {
      target: {
        value: "Wir brauchen eine neue Website für unseren Betrieb. Danke",
      },
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(aborted).toBe(true);
    expect(screen.queryByText("Assistent denkt nach")).not.toBeInTheDocument();
  });
});
