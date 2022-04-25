import {isSimpleObject} from "../index.js"

describe("isSimpleObject", () => {
  it("returns true for simple objects", () => {
    const object = {
      firstName: "Donald",
      lastName: "Duck",
      types: ["male", "duck"]
    }

    expect(isSimpleObject(object)).toBe(true)
  })

  it("returns false for a date", () => {
    const object = new Date()

    expect(isSimpleObject(object)).toBe(false)
  })
})
