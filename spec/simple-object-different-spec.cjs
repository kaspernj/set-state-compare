const {simpleObjectDifferent} = require("../index.cjs")

describe("simpleObjectDifferent", () => {
  it("returns true if the length isn't the same and set to check that", () => {
    const object1 = {firstName: "Kasper"}
    const object2 = {firstName: "Kasper", lastName: "Stöckel"}

    expect(simpleObjectDifferent(object1, object2, true)).toBe(true)
  })

  it("returns false if the length isn't the same and set not to check that", () => {
    const object1 = {firstName: "Kasper"}
    const object2 = {firstName: "Kasper", lastName: "Stöckel"}

    expect(simpleObjectDifferent(object1, object2, false)).toBe(false)
  })
})
