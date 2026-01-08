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
      renderer = TestRenderer.create(React.createElement(UseShapeComponent, {trigger: true}))
    })

    const output = renderer.toJSON()

    expect(output.children).toEqual(["1"])
    expect(Object.keys(shapeInstance.__setStatesLater).length).toBe(0)
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
})
