import { describe, expect, it } from "vitest";
import { ProjectSubmitSchema, ProjectDraftSchema } from "../src/schemas/records.js";

const validProject = {
  service: "design",
  engagement: "project",
  goal: "Wir brauchen eine neue Website für unseren Handwerksbetrieb.",
  timeline: { kind: "fixed", date: "2027-01-15" },
  budget: { range: "5-10k", unknown: false },
  contact: {
    name: "Max Finke",
    company: "Finke GmbH",
    email: "max@example.com",
    phone: "+49 531 234567",
  },
  consent: true,
};

describe("ProjectSubmitSchema", () => {
  it("accepts a valid project request", () => {
    expect(ProjectSubmitSchema.safeParse(validProject).success).toBe(true);
  });

  it("requires consent", () => {
    const result = ProjectSubmitSchema.safeParse({ ...validProject, consent: false });
    expect(result.success).toBe(false);
  });

  it("requires a date for a fixed timeline", () => {
    const result = ProjectSubmitSchema.safeParse({
      ...validProject,
      timeline: { kind: "fixed" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown service", () => {
    const result = ProjectSubmitSchema.safeParse({
      ...validProject,
      service: "marketing",
    });
    expect(result.success).toBe(false);
  });
});

describe("ProjectDraftSchema", () => {
  it("accepts a partial draft for assist", () => {
    expect(ProjectDraftSchema.safeParse({ goal: "Website" }).success).toBe(true);
  });

  it("strips unrelated fields such as contact data", () => {
    const result = ProjectDraftSchema.parse({
      goal: "Website",
      contact: { email: "private@example.com" },
    });

    expect(result).not.toHaveProperty("contact");
  });
});
