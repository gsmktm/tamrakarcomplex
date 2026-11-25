import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Exercise the installed resolver version against Zod 4, not just raw z.safeParse.
// Existing forms use zodResolver; a green Vite build alone does not prove compatibility.
describe("Zod 4 / React Hook Form resolver compatibility", () => {
  const schema = z.object({
    email: z.string().email(),
    quantity: z.number().int().min(1),
  });

  const options = {
    criteriaMode: "firstError" as const,
    fields: {},
    shouldUseNativeValidation: false,
  };

  it("resolves a valid form payload", async () => {
    const result = await zodResolver(schema)(
      { email: "buyer@example.com", quantity: 2 },
      {},
      options,
    );
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ email: "buyer@example.com", quantity: 2 });
  });

  it("returns field-level errors for invalid form payload", async () => {
    const result = await zodResolver(schema)(
      { email: "not-an-email", quantity: 0 },
      {},
      options,
    );
    expect(result.errors.email).toBeDefined();
    expect(result.errors.quantity).toBeDefined();
    expect(result.values).toEqual({});
  });
});
