import {anythingDifferent} from "../lib/diff-utils.js"

describe("anythingDifferent", () => {
  it("when nothing nested is different", () => {
    const object1 = {
      firstName: "Donald",
      lastName: "Duck",
      nephews: ["Rip", "Rap", {Rup: {age: 5}}]
    }

    const object2 = {
      firstName: "Donald",
      lastName: "Duck",
      nephews: ["Rip", "Rap", {Rup: {age: 5}}]
    }

    expect(anythingDifferent(object1, object2)).toBe(false)
  })

  it("compares multiple other values", () => {
    const object1 = {
      firstName: "Donald",
      lastName: "Duck",
      nephews: ["Rip", "Rap", {Rup: {age: 5}}]
    }

    const object2 = {
      firstName: "Donald",
      lastName: "Duck",
      nephews: ["Rip", "Rap", {Rup: {age: 6}}]
    }

    expect(anythingDifferent(object1, object2)).toBe(true)
  })
})
