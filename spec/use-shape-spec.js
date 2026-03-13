import React from "react"
import TestRenderer, {act} from "react-test-renderer"
import useShape from "../src/use-shape.js"
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

  it("flushes deferred updates without a later React commit", () => {
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

    return act(async () => {
      await Promise.resolve()

      expect(renderer.toJSON().children).toEqual(["0"])

      shared.rendering = 0
      await Promise.resolve()
      await Promise.resolve()
    }).then(() => {
      expect(renderer.toJSON().children).toEqual(["1"])
    })
  })
})
