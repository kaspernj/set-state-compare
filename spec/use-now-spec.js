import React, {StrictMode} from "react"
import TestRenderer, {act} from "react-test-renderer"
import useNow from "../src/use-now.js"

describe("useNow", () => {
  it("runs the callback during the initial render", () => {
    let calls = 0

    /**
     * @returns {import("react").ReactElement}
     */
    function Component() {
      useNow(() => {
        calls += 1
      }, [])

      return React.createElement("div", null, String(calls))
    }

    act(() => {
      TestRenderer.create(React.createElement(Component))
    })

    expect(calls).toBe(1)
  })

  it("re-runs only when deps change", () => {
    let calls = 0

    /**
     * @param {{value: number}} props
     * @returns {import("react").ReactElement}
     */
    function Component({value}) {
      useNow(() => {
        calls += 1
      }, [value])

      return React.createElement("div", null, String(value))
    }

    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component, {value: 1}))
    })

    act(() => {
      renderer.update(React.createElement(Component, {value: 1}))
    })

    expect(calls).toBe(1)

    act(() => {
      renderer.update(React.createElement(Component, {value: 2}))
    })

    expect(calls).toBe(2)
  })

  it("fires exactly once per dep change under StrictMode double render", () => {
    let calls = 0
    let renderCount = 0

    /**
     * @returns {import("react").ReactElement}
     */
    function Component() {
      renderCount += 1
      useNow(() => {
        calls += 1
      }, [])

      return React.createElement("div", null, String(calls))
    }

    act(() => {
      TestRenderer.create(
        React.createElement(StrictMode, null, React.createElement(Component))
      )
    })

    // StrictMode invokes the component body twice, but useNow should dedupe
    // via the ref so the callback only fires once.
    expect(renderCount).toBe(2)
    expect(calls).toBe(1)
  })
})
