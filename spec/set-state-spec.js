import {setState} from "../src/index.js"

describe("setState", () => {
  it("sets the state when the object is different", () => {
    const fakeComponent = {
      state: {
        firstName: "Donald",
        lastName: "Goose"
      },
      setState: function(newState) {
        const mergedState = Object.assign({}, this.state, newState)

        this.state = mergedState
      }
    }

    setState(fakeComponent, {
      firstName: "Donald",
      lastName: "Duck"
    })

    expect(fakeComponent.state).toEqual({firstName: "Donald", lastName: "Duck"})
  })

  it("doesnt change anything when nothing changed and passed a function", () => {
    let setStateResult = {
      firstName: "Mickey",
      lastName: "Mouse"
    }

    const fakeComponent = {
      state: {
        firstName: "Donald",
        lastName: "Duck"
      },
      setState: function(callback) {
        setStateResult = callback(this.state)

        if (setStateResult && setStateResult.firstName != "Mickey") {
          this.state = setStateResult
        }
      }
    }

    setState(fakeComponent, () => ({
      firstName: "Donald",
      lastName: "Duck"
    }))

    expect(fakeComponent.state).toEqual({firstName: "Donald", lastName: "Duck"})
    expect(setStateResult).toBe(null)
  })

  it("doesnt change anything when nothing changed and passed a function", () => {
    let setStateResult = {
      firstName: "Mickey",
      lastName: "Mouse"
    }

    const fakeComponent = {
      state: {
        firstName: "Donald",
        lastName: "Duck"
      },
      setState: /** @returns {() => {firstName: string, lastName: string}} */ (function(callback) {
        setStateResult = callback(this.state)

        if (setStateResult && setStateResult.firstName != "Mickey") {
          this.state = setStateResult
        }
      })
    }

    setState(fakeComponent, () => ({
      firstName: "Daisy",
      lastName: "Duck"
    }))

    expect(fakeComponent.state).toEqual({firstName: "Daisy", lastName: "Duck"})
    expect(setStateResult).toEqual({firstName: "Daisy", lastName: "Duck"})
  })
})
