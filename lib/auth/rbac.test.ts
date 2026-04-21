import { describe, it, expect } from "vitest"
import { hasRole } from "./rbac"

describe("hasRole", () => {
  it("returns false when userRole is undefined", () => {
    expect(hasRole(undefined, "viewer")).toBe(false)
  })
  it("viewer meets viewer", () => {
    expect(hasRole("viewer", "viewer")).toBe(true)
  })
  it("viewer does not meet okr_manager", () => {
    expect(hasRole("viewer", "okr_manager")).toBe(false)
  })
  it("okr_manager meets viewer", () => {
    expect(hasRole("okr_manager", "viewer")).toBe(true)
  })
  it("admin meets everything", () => {
    expect(hasRole("admin", "viewer")).toBe(true)
    expect(hasRole("admin", "okr_manager")).toBe(true)
    expect(hasRole("admin", "admin")).toBe(true)
  })
})
