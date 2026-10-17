import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import StatCard from "./StatCard";

describe("StatCard", () => {
  it("shows the today and week values", () => {
    render(
      <MemoryRouter>
        <StatCard
          title="Offene Projekte"
          icon="chart"
          bucket={{ today: 2, week: 5, total: 9 }}
          to="/admin/projects"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Offene Projekte")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Alle ansehen/i })).toHaveAttribute(
      "href",
      "/admin/projects",
    );
  });
});
