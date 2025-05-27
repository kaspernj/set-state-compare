import {simpleObjectDifferent} from "../src/index.js"

describe("simpleObjectDifferent", () => {
  it("returns true if the length isn't the same and set to check that", () => {
    const object1 = {firstName: "Kasper"}
    const object2 = {firstName: "Kasper", lastName: "Stöckel"}

    expect(simpleObjectDifferent(object1, object2, true)).toBe(true)
  })

  it("returns true if a value is undefined", () => {
    const object1 = {firstName: undefined}
    const object2 = {lastName: "Stöckel"}

    expect(simpleObjectDifferent(object1, object2, true)).toBe(true)
  })

  it("returns false if the length isn't the same and set not to check that", () => {
    const object1 = {firstName: "Kasper"}
    const object2 = {firstName: "Kasper", lastName: "Stöckel"}

    expect(simpleObjectDifferent(object1, object2, false)).toBe(false)
  })
})
