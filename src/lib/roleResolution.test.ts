import { describe, expect, it } from "vitest";
import { highestGrantedRole } from "./roleResolution";

describe("server-assigned roles only", () => {
  it("chooses the highest assigned role", () => {
    expect(highestGrantedRole([{ role: "user" }, { role: "storeadmin" }])).toBe("storeadmin");
    expect(highestGrantedRole([{ role: "staffadmin" }, { role: "suadmin" }])).toBe("suadmin");
  });

  it("defaults to standard user without a database assignment", () => {
    expect(highestGrantedRole([])).toBe("user");
    expect(highestGrantedRole(null)).toBe("user");
    expect(highestGrantedRole([{ role: "invalid" }])).toBe("user");
  });
});
