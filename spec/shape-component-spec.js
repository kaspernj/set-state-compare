import React from "react"
import TestRenderer, {act} from "react-test-renderer"
import {ShapeComponent, shapeComponent} from "../src/shape-component.js"
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

describe("shapeComponent", () => {
  beforeEach(() => {
    resetShared()
  })

  it("caches values based on reference dependencies", () => {
    const shape = new ShapeComponent({})
    const shared = {name: "Donald"}
    const firstValue = shape.cache("styles", () => ({id: 1}), [shared, 1])
    const secondValue = shape.cache("styles", () => ({id: 2}), [shared, 1])
    const thirdValue = shape.cache("styles", () => ({id: 3}), [{name: "Donald"}, 1])

    expect(secondValue).toBe(firstValue)
    expect(thirdValue).not.toBe(firstValue)
  })

  it("caches values on the class with cacheStatic", () => {
    class StaticShape extends ShapeComponent {}

    const shared = {name: "Donald"}
    const shapeA = new StaticShape({})
    const shapeB = new StaticShape({})

    const firstValue = shapeA.cacheStatic("styles", () => ({id: 1}), [shared, 1])
    const secondValue = shapeB.cacheStatic("styles", () => ({id: 2}), [shared, 1])
    const thirdValue = shapeB.cacheStatic("styles", () => ({id: 3}), [{name: "Donald"}, 1])

    expect(secondValue).toBe(firstValue)
    expect(thirdValue).not.toBe(firstValue)
  })

  it("re-renders for new object references but skips identical primitives", () => {
    /** @type {ShapeComponent | undefined} */
    let shapeInstance

    class TestShape extends ShapeComponent {
      /** @param {Record<string, any>} props */
      constructor(props) {
        super(props)
        this.renderCount = 0
        shapeInstance = this
      }

      render() {
        this.renderCount += 1
        this.useState("count", 0)
        this.useState("data", {name: "Donald"})

        return React.createElement("div", null, String(this.state.count))
      }
    }

    const Component = shapeComponent(TestShape)
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component))
    })

    act(() => {
      flushAfterPaint()
    })

    const initialRenderCount = shapeInstance.renderCount

    act(() => {
      shapeInstance.setState({count: 0})
    })

    expect(shapeInstance.renderCount).toBe(initialRenderCount)

    act(() => {
      shapeInstance.setState({data: {name: "Donald"}})
    })

    expect(shapeInstance.renderCount).toBe(initialRenderCount + 1)

    act(() => {
      renderer.unmount()
    })
  })

  it("runs mount, update, and unmount hooks", () => {
    let mounted = 0
    let updated = 0
    let unmounted = 0

    class LifecycleShape extends ShapeComponent {
      componentDidMount() {
        mounted += 1
      }

      componentDidUpdate() {
        updated += 1
      }

      componentWillUnmount() {
        unmounted += 1
      }

      render() {
        this.useState("count", 0)

        return React.createElement("div", null, "Lifecycle")
      }
    }

    const Component = shapeComponent(LifecycleShape)
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component, {name: "Donald"}))
    })

    act(() => {
      renderer.update(React.createElement(Component, {name: "Daisy"}))
    })

    act(() => {
      renderer.unmount()
    })

    expect(mounted).toBe(1)
    expect(updated).toBe(1)
    expect(unmounted).toBe(1)
  })
})
