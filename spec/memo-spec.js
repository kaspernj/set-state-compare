import memo from "../src/memo.js"

describe("memo", () => {
  it("returns true when given fewer props than before", () => {
    const prevProps = {
      firstName: "Kasper",
      lastName: "Stöckel"
    }

    const nextProps = {
      firstName: "Kasper"
    }

    const result = memo(prevProps, nextProps)

    expect(result).toBeTrue()
  })

  it("returns true when given more props than before", () => {
    const prevProps = {
      firstName: "Kasper"
    }

    const nextProps = {
      firstName: "Kasper",
      lastName: "Stöckel"
    }

    const result = memo(prevProps, nextProps)

    expect(result).toBeTrue()
  })

  it("returns true when given different props than before", () => {
    const prevProps = {
      firstName: "Kasper"
    }

    const nextProps = {
      firstName: "Christina"
    }

    const result = memo(prevProps, nextProps)

    expect(result).toBeTrue()
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

    const result = memo(prevProps, nextProps)

    expect(result).toBeTrue()
  })
})
