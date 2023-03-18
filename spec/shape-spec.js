import Shape from "../src/shape.js"

function spawnFakeComponent() {
  const fakeComponent = {
    shapeDidUpdate() {
      if (this.shapeDidUpdateCalled === undefined) {
        this.shapeDidUpdateCalled = 0
      }

      this.shapeDidUpdateCalled++
    },
    shapeUpdated() {
      if (this.shapeUpdatedCalled === undefined) {
        this.shapeUpdatedCalled = 0
      }

      this.shapeUpdatedCalled++
    },
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

  it("calls callbacks even if there isn't anything to change in shape and in the correct order", async () => {
    const fakeComponent = spawnFakeComponent()
    const shape = new Shape(fakeComponent, {age: 1})
    const result = []
    const promises = []

    promises.push(new Promise((resolve) => {
      shape.set({firstName: "Donald"}, () => {
        result.push(1)
        resolve()
      })
    }))
    promises.push(new Promise((resolve) => {
      shape.set({firstName: "Donald"}, () => {
        result.push(2)
        resolve()
      })
    }))
    promises.push(new Promise((resolve) => {
      shape.set({firstName: "Kasper"}, () => {
        result.push(3)
        resolve()
      })
    }))

    await Promise.all(promises)

    expect(result).toEqual([1, 2, 3])
    expect(fakeComponent.shapeDidUpdateCalled).toEqual(1)
    expect(fakeComponent.shapeUpdatedCalled).toEqual(2)
  })
})
