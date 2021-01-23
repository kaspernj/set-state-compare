const shouldComponentUpdate = require("../lib/should-component-update.cjs")

describe("shouldComponentUpdate", () => {
  it("returns true when given fewer props than before", () => {
    const component = {
      props: {
        firstName: "Kasper",
        lastName: "Stöckel"
      }
    }

    const nextProps = {
      firstName: "Kasper"
    }

    const result = shouldComponentUpdate(component, nextProps)

    expect(result).toBeTrue()
  })

  it("returns true when given more props than before", () => {
    const component = {
      props: {
        firstName: "Kasper"
      }
    }

    const nextProps = {
      firstName: "Kasper",
      lastName: "Stöckel"
    }

    const result = shouldComponentUpdate(component, nextProps)

    expect(result).toBeTrue()
  })

  it("returns true when given different props than before", () => {
    const component = {
      props: {
        firstName: "Kasper"
      }
    }

    const nextProps = {
      firstName: "Christina"
    }

    const result = shouldComponentUpdate(component, nextProps)

    expect(result).toBeTrue()
  })

  it("returns true when given fewer states than before", () => {
    const component = {
      props: {},
      state: {
        firstName: "Kasper",
        lastName: "Stöckel"
      }
    }

    const nextState = {
      firstName: "Kasper"
    }

    const result = shouldComponentUpdate(component, {}, nextState)

    expect(result).toBeTrue()
  })

  it("returns true when given more states than before", () => {
    const component = {
      props: {},
      state: {
        firstName: "Kasper"
      }
    }

    const nextState = {
      firstName: "Kasper",
      lastName: "Stöckel"
    }

    const result = shouldComponentUpdate(component, {}, nextState)

    expect(result).toBeTrue()
  })

  it("returns true when given different states than before", () => {
    const component = {
      props: {},
      state: {
        firstName: "Kasper"
      }
    }

    const nextState = {
      firstName: "Christina"
    }

    const result = shouldComponentUpdate(component, {}, nextState)

    expect(result).toBeTrue()
  })

  it("handles if a state wasn't previously set", () => {
    const component = {
      props: {}
      // state: undefined
    }

    const nextState = {
      firstName: "Christina"
    }

    const result = shouldComponentUpdate(component, {}, nextState)

    expect(result).toBeTrue()
  })
})
