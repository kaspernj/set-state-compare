import {
  enqueueRenderCallback,
  flushDeferredCallbacks,
  flushRenderingCallbacks,
  getAfterPaintCallbacks,
  getAfterPaintHandle,
  getRenderingCallbacks,
  resetSharedStateForTests,
  scheduleAfterPaint,
  setDeferredCallbackErrorReporterForTests,
  setRenderingCallbacks
} from "../src/shared.js"


describe("shared scheduling", () => {
  beforeEach(() => {
    jasmine.clock().install()
    resetSharedStateForTests()
  })

  afterEach(() => {
    jasmine.clock().uninstall()
  })

  it("coalesces deferred callbacks and runs them later", () => {
    const calls = []

    const handle1 = scheduleAfterPaint(() => calls.push("a"))
    const handle2 = scheduleAfterPaint(() => calls.push("b"))

    expect(handle2).toBe(handle1)
    expect(calls).toEqual([])

    jasmine.clock().tick(1)

    expect(calls).toEqual(["a", "b"])
    expect(getAfterPaintHandle()).toBeUndefined()
    expect(getAfterPaintCallbacks().length).toBe(0)
  })

  it("defers render callbacks until the scheduled flush", () => {
    const calls = []

    enqueueRenderCallback(() => calls.push(1))
    enqueueRenderCallback(() => calls.push(2))

    expect(getRenderingCallbacks().length).toBe(2)
    expect(calls).toEqual([])

    jasmine.clock().tick(1)

    expect(calls).toEqual([1, 2])
    expect(getRenderingCallbacks().length).toBe(0)
  })

  it("flushes safely when requestAnimationFrame exists but is ignored", () => {
    const calls = []
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame

    globalThis.requestAnimationFrame = () => 123

    try {
      scheduleAfterPaint(() => calls.push("fallback"))

      expect(calls).toEqual([])

      jasmine.clock().tick(1)

      expect(calls).toEqual(["fallback"])
      expect(getAfterPaintHandle()).toBeUndefined()
    } finally {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame
    }
  })

  it("runs all deferred callbacks and reports every error", () => {
    const calls = []
    const firstError = new Error("first")
    const secondError = new Error("second")
    const reportedErrors = []

    setDeferredCallbackErrorReporterForTests((errors) => {
      reportedErrors.push(errors)
    })

    flushDeferredCallbacks([
      () => {
        calls.push("a")
        throw firstError
      },
      () => calls.push("b"),
      () => {
        calls.push("c")
        throw secondError
      }
    ])

    expect(calls).toEqual(["a", "b", "c"])
    expect(reportedErrors).toEqual([[firstError, secondError]])
  })

  it("returns early when there are no render callbacks", () => {
    setRenderingCallbacks([])

    expect(() => flushRenderingCallbacks()).not.toThrow()
  })
})
