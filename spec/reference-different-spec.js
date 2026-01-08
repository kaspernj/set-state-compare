import {referenceDifferent} from "../src/index.js"

describe("referenceDifferent", () => {
  it("returns false for the same primitive values", () => {
    expect(referenceDifferent("hello", "hello")).toBe(false)
    expect(referenceDifferent(10, 10)).toBe(false)
    expect(referenceDifferent(true, true)).toBe(false)
  })

  it("returns true for different primitive values", () => {
    expect(referenceDifferent("hello", "world")).toBe(true)
    expect(referenceDifferent(10, 11)).toBe(true)
    expect(referenceDifferent(true, false)).toBe(true)
  })

  it("compares objects by reference", () => {
    const object1 = {name: "Donald"}
    const object2 = {name: "Donald"}

    expect(referenceDifferent(object1, object2)).toBe(true)
    expect(referenceDifferent(object1, object1)).toBe(false)
  })

  it("compares arrays by reference", () => {
    const array1 = ["Donald"]
    const array2 = ["Donald"]

    expect(referenceDifferent(array1, array2)).toBe(true)
    expect(referenceDifferent(array1, array1)).toBe(false)
  })
})
