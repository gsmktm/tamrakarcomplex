import { describe, expect, it } from "vitest";
import { ADMIN_TASKS_COLUMNS } from "@/lib/supabaseColumnMaps";

describe("admin_tasks selected column contract", () => {
  it("selects assignment and module fields used by the staff task manager", () => {
    expect(ADMIN_TASKS_COLUMNS).toContain("assigned_to_user_id");
    expect(ADMIN_TASKS_COLUMNS).toContain("assigned_role_type");
    expect(ADMIN_TASKS_COLUMNS).toContain("module_key");
    expect(ADMIN_TASKS_COLUMNS).toContain("due_date");
  });

  it("does not select the retired assigned_to alias", () => {
    expect(ADMIN_TASKS_COLUMNS).not.toContain("assigned_to");
  });
});
