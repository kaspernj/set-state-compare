import React from "react"
import TestRenderer, {act} from "react-test-renderer"
import useShape, {shapeComponent} from "../src/use-shape.js"
import {ShapeComponent} from "../src/shape-component.js"
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

describe("useShape", () => {
  beforeEach(() => {
    resetShared()
  })

  it("applies queued updates after mount", () => {
    /**
     * @param {{trigger: boolean}} props
     * @returns {import("react").ReactElement}
     */
    function UseShapeComponent({trigger}) {
      const shape = useShape({})
      shape.useState("count", 0)

      if (trigger) {
        shape.set({count: 1})
      }

      return React.createElement("div", null, String(shape.state.count))
    }

    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(UseShapeComponent, {trigger: true}))
    })

    const output = renderer.toJSON()

    expect(output.children).toEqual(["1"])
  })

  it("updates state after mount", () => {
    /** @type {import("../src/use-shape.js").Shape | undefined} */
    let shapeInstance

    /**
     * @param {{trigger: boolean}} props
     * @returns {import("react").ReactElement}
     */
    function UseShapeComponent({trigger}) {
      const shape = useShape({})
      shapeInstance = shape
      shape.useState("count", 0)

      if (trigger) {
        shape.set({count: 1})
      }

      return React.createElement("div", null, String(shape.state.count))
    }

    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(UseShapeComponent, {trigger: false}))
    })

    act(() => {
      shapeInstance.set({count: 2})
    })

    const output = renderer.toJSON()

    expect(output.children).toEqual(["2"])
  })

  it("resolves function state defaults once during first registration", () => {
    const initializer = jasmine.createSpy("initializer").and.returnValue(["a", "b"])

    /**
     * @returns {import("react").ReactElement}
     */
    function UseShapeComponent() {
      const shape = useShape({})

      shape.useState("items", initializer)

      return React.createElement("div", null, String(shape.state.items.length))
    }

    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(UseShapeComponent))
    })

    expect(initializer.calls.count()).toBe(1)
    expect(renderer.toJSON().children).toEqual(["2"])
  })

  it("flushes deferred updates without a later React commit", async () => {
    /** @type {(value: number) => void} */
    let resolveAsyncUpdate

    const asyncUpdate = new Promise((resolve) => {
      resolveAsyncUpdate = resolve
    })

    /**
     * @param {{trigger: boolean}} props
     * @returns {import("react").ReactElement}
     */
    function UseShapeComponent({trigger}) {
      const shape = useShape({})

      shape.useState("count", 0)

      if (trigger && !shape.meta.asyncQueued) {
        shape.meta.asyncQueued = true

        asyncUpdate.then(() => {
          shape.set({count: 1})
        })
      }

      return React.createElement("div", null, String(shape.state.count))
    }

    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(UseShapeComponent, {trigger: false}))
    })

    act(() => {
      renderer.update(React.createElement(UseShapeComponent, {trigger: true}))
    })

    expect(renderer.toJSON().children).toEqual(["0"])

    act(() => {
      shared.rendering = 1
      resolveAsyncUpdate(1)
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    shared.rendering = 0

    if (shared.renderingCallbacks.length > 0) {
      act(() => {
        shared.flushRenderingCallbacks()
      })
    }

    expect(renderer.toJSON().children).toEqual(["1"])
  })

  it("does not replay superseded deferred state", () => {
    /** @type {import("../src/use-shape.js").Shape | undefined} */
    let shapeInstance

    /**
     * @returns {import("react").ReactElement}
     */
    function UseShapeComponent() {
      const shape = useShape({})

      shapeInstance = shape
      shape.useState("count", 0)

      return React.createElement("div", null, String(shape.state.count))
    }

    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(UseShapeComponent))
    })

    act(() => {
      shared.rendering = 1
      shapeInstance.set({count: 1})
      shared.rendering = 0
      shapeInstance.set({count: 2})
      act(() => {
        shared.flushRenderingCallbacks()
      })
    })

    /** @type {import("react-test-renderer").ReactTestRendererJSON} */
    const json = renderer.toJSON()

    expect(json.children).toEqual(["2"])
  })

  it("allows set after unmount without warning and updates state silently", () => {
    /** @type {import("../src/use-shape.js").Shape | undefined} */
    let shapeInstance

    /** @returns {import("react").ReactElement} */
    function UseShapeComponent() {
      const shape = useShape({})
      shapeInstance = shape
      shape.useState("count", 0)

      return React.createElement("div", null, String(shape.state.count))
    }

    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(UseShapeComponent))
    })

    if (!shapeInstance) throw new Error("shapeInstance was never assigned")

    const errorSpy = spyOn(console, "error")

    act(() => {
      renderer.unmount()
    })

    expect(() => {
      shapeInstance.set({count: 42})
    }).not.toThrow()

    expect(shapeInstance.state.count).toBe(42)

    for (const call of errorSpy.calls.all()) {
      const message = String(call.args[0])

      expect(message).not.toMatch(/unmounted component/i)
      expect(message).not.toMatch(/memory leak/i)
    }
  })

  it("reuses the main shapeComponent implementation for named exports", () => {
    let updates = 0

    class NamedExportShape extends ShapeComponent {
      static defaultProps = {
        name: "Donald"
      }

      componentDidUpdate() {
        updates += 1
      }

      render() {
        return React.createElement("div", null, this.props.name)
      }
    }

    const Component = shapeComponent(NamedExportShape)
    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component))
    })

    act(() => {
      renderer.update(React.createElement(Component, {name: "Daisy"}))
    })

    expect(renderer.toJSON().children).toEqual(["Daisy"])
    expect(updates).toBe(1)
  })
})
