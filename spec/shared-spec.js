import shared from "../src/shared.js"

describe("shared scheduling", () => {
  beforeEach(() => {
    jasmine.clock().install()
    shared.afterPaintCallbacks = []
    shared.afterPaintHandle = undefined
    shared.renderingCallbacks = []
  })

  afterEach(() => {
    jasmine.clock().uninstall()
  })

  it("coalesces after-paint callbacks and runs them later", () => {
    const calls = []

    const handle1 = shared.scheduleAfterPaint(() => calls.push("a"))
    const handle2 = shared.scheduleAfterPaint(() => calls.push("b"))

    expect(handle2).toBe(handle1)
    expect(calls).toEqual([])

    jasmine.clock().tick(1)

    expect(calls).toEqual(["a", "b"])
    expect(shared.afterPaintHandle).toBeUndefined()
    expect(shared.afterPaintCallbacks.length).toBe(0)
  })

  it("defers render callbacks until after paint", () => {
    const calls = []

    shared.enqueueRenderCallback(() => calls.push(1))
    shared.enqueueRenderCallback(() => calls.push(2))

    expect(shared.renderingCallbacks.length).toBe(2)
    expect(calls).toEqual([])

    jasmine.clock().tick(1)

    expect(calls).toEqual([1, 2])
    expect(shared.renderingCallbacks.length).toBe(0)
  })
})
