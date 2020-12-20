const Shape = require("../lib/shape.cjs")

function spawnFakeComponent() {
  const fakeComponent = {
    forceUpdate: function(callback) {
      callback()
    },
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
  it("calls all given callbacks once when it has set the state", async () => {
    const fakeComponent = spawnFakeComponent()
    const promises = []
    const shape = new Shape(fakeComponent)

    let calledCount = 0

    for (let i = 0; i < 10; i++) {
      promises.push(new Promise((resolve) => {
        setTimeout(
          () => {
            shape.set({firstName: "Kasper"}, () => {
              calledCount++
              resolve()
            })
          },
          i
        )
      }))
      promises.push(new Promise((resolve) => {
        setTimeout(
          () => {
            shape.set({firstName: "Kasper"}, () => {
              calledCount++
              resolve()
            })
          },
          i
        )
      }))
      promises.push(new Promise((resolve) => {
        setTimeout(
          () => {
            shape.set({firstName: "Christina"}, () => {
              calledCount++
              resolve()
            })
          },
          i
        )
      }))
    }

    await Promise.all(promises)

    expect(shape.firstName).toBe("Christina")
    expect(calledCount).toBe(30)
  })
})
