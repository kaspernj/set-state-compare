import {arrayDifferent} from "../src/index.js"

describe("arrayDifferent", () => {
  it("returns true if the length isn't the same", () => {
    const object1 = ["Kasper"]
    const object2 = ["Kasper", "Christina"]

    expect(arrayDifferent(object1, object2)).toBe(true)
  })

  it("returns true if an element in the arrays are different", () => {
    const object1 = ["Kasper", "Christina"]
    const object2 = ["Kasper", "Christina S."]

    expect(arrayDifferent(object1, object2)).toBe(true)
  })

  it("returns false if the arrays are identical", () => {
    const object1 = ["Kasper", "Christina"]
    const object2 = ["Kasper", "Christina"]

    expect(arrayDifferent(object1, object2)).toBe(false)
  })

  it("returns false for identical route path parts", () => {
    const object1 = ["user", "school-class-course-modules", "show"]
    const object2 = ["user", "school-class-course-modules", "show"]

    expect(arrayDifferent(object1, object2)).toBe(false)
  })

  it("returns true when a route path part changes", () => {
    const object1 = ["user", "school-class-course-modules", "show"]
    const object2 = ["user", "school-class-course-modules", "step"]

    expect(arrayDifferent(object1, object2)).toBe(true)
  })
})
