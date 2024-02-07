import memoCompareProps from "../src/memo-compare-props.js"

describe("memoCompareProps", () => {
  it("returns true when given fewer props than before", () => {
    const prevProps = {
      firstName: "Kasper",
      lastName: "Stöckel"
    }

    const nextProps = {
      firstName: "Kasper"
    }

    const result = memoCompareProps(prevProps, nextProps)

    expect(result).toBeFalse()
  })

  it("returns true when given more props than before", () => {
    const prevProps = {
      firstName: "Kasper"
    }

    const nextProps = {
      firstName: "Kasper",
      lastName: "Stöckel"
    }

    const result = memoCompareProps(prevProps, nextProps)

    expect(result).toBeFalse()
  })

  it("returns true when given different props than before", () => {
    const prevProps = {
      firstName: "Kasper"
    }

    const nextProps = {
      firstName: "Christina"
    }

    const result = memoCompareProps(prevProps, nextProps)

    expect(result).toBeFalse()
  })

  it("returns true when a sub element is changed", () => {
    const prevProps = {
      users: {
        people: {
          ids: [1, 2, 3]
        }
      }
    }

    const nextProps = {
      users: {
        people: {
          ids: [1, 2, 3, 4]
        }
      }
    }

    const result = memoCompareProps(prevProps, nextProps)

    expect(result).toBeFalse()
  })
})
