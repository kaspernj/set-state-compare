import React from "react"
import TestRenderer, {act} from "react-test-renderer"
import {flushAfterPaintCallbacks, resetSharedStateForTests} from "../src/shared.js"
import useState from "../src/use-state.js"

describe("useState", () => {
  beforeEach(() => {
    resetSharedStateForTests()
  })

  it("defers render-time state writes until after paint", () => {
    /**
     * @returns {import("react").ReactElement}
     */
    function DeferredStateComponent() {
      const [count, setCount] = useState(0)

      if (count === 0) {
        setCount(1)
      }

      return React.createElement("div", null, String(count))
    }

    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(DeferredStateComponent))
    })

    expect(renderer.toJSON().children).toEqual(["0"])

    act(() => {
      flushAfterPaintCallbacks()
    })

    expect(renderer.toJSON().children).toEqual(["1"])
  })

  it("applies queued functional updates in order", () => {
    /**
     * @returns {import("react").ReactElement}
     */
    function DeferredUpdaterComponent() {
      const [count, setCount] = useState(0)

      if (count === 0) {
        setCount((previousCount) => previousCount + 1)
        setCount((previousCount) => previousCount + 1)
      }

      return React.createElement("div", null, String(count))
    }

    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(DeferredUpdaterComponent))
    })

    act(() => {
      flushAfterPaintCallbacks()
    })

    expect(renderer.toJSON().children).toEqual(["2"])
  })
})
