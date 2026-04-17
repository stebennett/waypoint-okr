import { describe, it, expect } from "vitest"
import { computeDiff } from "./audit"

describe("computeDiff", () => {
  const fields = ["title", "description", "status"]

  it("returns empty when nothing changed", () => {
    expect(
      computeDiff(
        { title: "a", description: "b", status: "active" },
        { title: "a", description: "b", status: "active" },
        fields
      )
    ).toEqual({})
  })

  it("captures a single field change", () => {
    expect(
      computeDiff(
        { title: "a", description: "b", status: "active" },
        { title: "A", description: "b", status: "active" },
        fields
      )
    ).toEqual({ title: { from: "a", to: "A" } })
  })

  it("treats undefined and null identically", () => {
    expect(
      computeDiff(
        { title: "a", description: undefined, status: "active" },
        { title: "a", description: null, status: "active" },
        fields
      )
    ).toEqual({})
  })

  it("captures multiple changes", () => {
    expect(
      computeDiff(
        { title: "a", description: "b", status: "active" },
        { title: "A", description: "B", status: "active" },
        fields
      )
    ).toEqual({
      title: { from: "a", to: "A" },
      description: { from: "b", to: "B" },
    })
  })
})
