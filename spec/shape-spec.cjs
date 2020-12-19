const Shape = require("../lib/shape.cjs")

function spawnFakeComponent() {
  const fakeComponent = {
    state: {
      firstName: "Donald",
      lastName: "Goose"
    },
    setState: function(newState, callback) {
      const mergedState = Object.assign({}, this.state, newState)

      this.state = mergedState
      callback()
    }
  }

  return fakeComponent
}

describe("shape", () => {
  it("calls the callback once it has set the state", async () => {
    const fakeComponent = spawnFakeComponent()
    const shape = new Shape(fakeComponent)

    let called = false

    const promise = new Promise((resolve) => {
      shape.set({firstName: "Kasper"}, () => {
        called = true
        resolve()
      })
    })

    await Promise.all([promise])

    expect(shape.firstName).toBe("Kasper")
    expect(called).toBe(true)
  })
})
