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

  it("returns false for identical route params", () => {
    const object1 = {school_class_course_module_id: "module-1", team_survey_step_id: "step-1"}
    const object2 = {school_class_course_module_id: "module-1", team_survey_step_id: "step-1"}

    expect(simpleObjectDifferent(object1, object2, true)).toBe(false)
  })

  it("returns true when a route param changes", () => {
    const object1 = {school_class_course_module_id: "module-1", team_survey_step_id: "step-1"}
    const object2 = {school_class_course_module_id: "module-1", team_survey_step_id: "step-2"}

    expect(simpleObjectDifferent(object1, object2, true)).toBe(true)
  })
})
