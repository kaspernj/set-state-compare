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

    class CounterHook extends ShapeHook {
      setup() {
        setupCalls += 1
        this.useState("count", 0)
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

    class LifecycleHook extends ShapeHook {
      componentDidMount() {
        mounted += 1
      }

      componentDidUpdate() {
        updated += 1
      }

      componentWillUnmount() {
        unmounted += 1
      }

      setup() {
        this.useState("count", 0)
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
})
