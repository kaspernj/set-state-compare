import React from "react"
import TestRenderer, {act} from "react-test-renderer"
import {ShapeHook, useShapeHook} from "../src/shape-hook.js"
import shared from "../src/shared.js"

/**
 * @returns {void}
 */
function resetShared() {
  shared.rendering = 0
  shared.renderingCallbacks = []
  shared.afterPaintCallbacks = []
  shared.afterPaintHandle = undefined
}

/**
 * @returns {void}
 */
function flushAfterPaint() {
  const callbacks = shared.afterPaintCallbacks

  shared.afterPaintCallbacks = []
  shared.afterPaintHandle = undefined

  for (const callback of callbacks) {
    callback()
  }
}

describe("useShapeHook", () => {
  beforeEach(() => {
    resetShared()
  })

  it("supports setup with class-based hook state", () => {
    /** @type {CounterHook | undefined} */
    let hookInstance
    let setupCalls = 0

    /** @augments {ShapeHook<{name: string}>} */
    class CounterHook extends ShapeHook {
      state = {count: 0}

      setup() {
        setupCalls += 1
      }
    }

    /**
     * @param {{name: string}} props
     * @returns {import("react").ReactElement}
     */
    function CounterHost(props) {
      const hook = useShapeHook(CounterHook, props)
      hookInstance = hook

      return React.createElement("div", null, String(hook.state.count))
    }

    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(CounterHost, {name: "Donald"}))
    })

    act(() => {
      flushAfterPaint()
    })

    act(() => {
      renderer.update(React.createElement(CounterHost, {name: "Daisy"}))
    })

    act(() => {
      flushAfterPaint()
    })

    act(() => {
      hookInstance.setState({count: 3})
    })

    const output = renderer.toJSON()

    expect(output.children).toEqual(["3"])
    expect(setupCalls).toBe(3)
  })

  it("runs mount, update, and unmount hooks", () => {
    let mounted = 0
    let updated = 0
    let unmounted = 0

    /** @augments {ShapeHook<{name: string}>} */
    class LifecycleHook extends ShapeHook {
      state = {count: 0}

      componentDidMount() {
        mounted += 1
      }

      componentDidUpdate() {
        updated += 1
      }

      componentWillUnmount() {
        unmounted += 1
      }
    }

    /**
     * @param {{name: string}} props
     * @returns {import("react").ReactElement}
     */
    function LifecycleHost(props) {
      useShapeHook(LifecycleHook, props)

      return React.createElement("div", null, "Lifecycle")
    }

    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(LifecycleHost, {name: "Donald"}))
    })

    act(() => {
      flushAfterPaint()
    })

    act(() => {
      renderer.update(React.createElement(LifecycleHost, {name: "Daisy"}))
    })

    act(() => {
      renderer.unmount()
    })

    expect(mounted).toBe(1)
    expect(updated).toBe(1)
    expect(unmounted).toBe(1)
  })

  it("provides isMounted helper", () => {
    /** @type {MountedHook | undefined} */
    let hookInstance
    /** @type {boolean | undefined} */
    let mountedInSetup
    /** @type {boolean | undefined} */
    let mountingInSetup
    /** @type {boolean | undefined} */
    let mountedInDidMount
    /** @type {boolean | undefined} */
    let mountingInDidMount

    /** @augments {ShapeHook<{name: string}>} */
    class MountedHook extends ShapeHook {
      state = {count: 0}

      setup() {
        mountedInSetup = this.isMounted()
        mountingInSetup = this.isMounting()
      }

      componentDidMount() {
        mountedInDidMount = this.isMounted()
        mountingInDidMount = this.isMounting()
      }
    }

    /**
     * @param {{name: string}} props
     * @returns {import("react").ReactElement}
     */
    function MountedHost(props) {
      const hook = useShapeHook(MountedHook, props)
      hookInstance = hook

      return React.createElement("div", null, props.name)
    }

    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(MountedHost, {name: "Donald"}))
    })

    expect(mountedInSetup).toBe(false)
    expect(mountingInSetup).toBe(true)

    act(() => {
      flushAfterPaint()
    })

    expect(mountedInDidMount).toBe(true)
    expect(mountingInDidMount).toBe(false)
    expect(hookInstance.isMounted()).toBe(true)
    expect(hookInstance.isMounting()).toBe(false)

    act(() => {
      renderer.unmount()
    })

    expect(hookInstance.isMounted()).toBe(false)
    expect(hookInstance.isMounting()).toBe(false)
  })
})
