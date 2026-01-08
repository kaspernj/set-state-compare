import Shape from "../src/shape.js"
import shared from "../src/shared.js"

describe("shape modes", () => {
  beforeEach(() => {
    jasmine.clock().install()
    shared.afterPaintCallbacks = []
    shared.afterPaintHandle = undefined
    shared.renderingCallbacks = []
  })

  afterEach(() => {
    jasmine.clock().uninstall()
    Shape.setMode("queuedForceUpdate")
  })

  it("uses setState in setState mode", () => {
    Shape.setMode("setState")

    const component = {
      setState: jasmine.createSpy("setState").and.callFake((newState, callback) => {
        if (callback) callback()
        return newState
      }),
      forceUpdate: jasmine.createSpy("forceUpdate").and.callFake((callback) => {
        if (callback) callback()
      })
    }
    const shape = new Shape(component)

    shape.set({name: "Donald"})
    jasmine.clock().tick(1)

    expect(component.setState).toHaveBeenCalledWith(
      jasmine.objectContaining({__renderCount: 0}),
      jasmine.any(Function)
    )

    expect(component.forceUpdate).not.toHaveBeenCalledWith(jasmine.any(Function))
  })

  it("uses forceUpdate in queuedForceUpdate mode", () => {
    Shape.setMode("queuedForceUpdate")

    const component = {
      setState: jasmine.createSpy("setState").and.callFake((newState, callback) => {
        if (callback) callback()
        return newState
      }),
      forceUpdate: jasmine.createSpy("forceUpdate").and.callFake((callback) => {
        if (callback) callback()
      })
    }
    const shape = new Shape(component)

    shape.set({name: "Donald"})
    jasmine.clock().tick(1)

    expect(component.forceUpdate).toHaveBeenCalledWith(jasmine.any(Function))

    expect(component.setState).not.toHaveBeenCalledWith(
      jasmine.objectContaining({__renderCount: 0}),
      jasmine.any(Function)
    )
  })
})
