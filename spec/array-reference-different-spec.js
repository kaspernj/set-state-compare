import {arrayReferenceDifferent} from "../src/index.js"

describe("arrayReferenceDifferent", () => {
  it("returns true if the lengths are different", () => {
    expect(arrayReferenceDifferent([1], [1, 2])).toBe(true)
  })

  it("returns true if any element differs by reference or value", () => {
    const shared = {name: "Donald"}
    const object1 = {name: "Donald"}
    const object2 = {name: "Donald"}

    expect(arrayReferenceDifferent([shared], [object1])).toBe(true)
    expect(arrayReferenceDifferent([object1], [object2])).toBe(true)
    expect(arrayReferenceDifferent([1, 2], [1, 3])).toBe(true)
  })

  it("returns false when all elements are the same references or values", () => {
    const shared = {name: "Donald"}

    expect(arrayReferenceDifferent([shared, 1], [shared, 1])).toBe(false)
  })
})
