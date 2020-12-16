const {setState} = require("../index.cjs")

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
})
