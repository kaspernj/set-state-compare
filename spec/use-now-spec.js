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

  it("runs the previous cleanup before the next callback invocation", () => {
    /** @type {string[]} */
    const events = []

    /**
     * @param {{value: number}} props
     * @returns {import("react").ReactElement}
     */
    function Component({value}) {
      useNow(() => {
        events.push(`setup:${value}`)

        return () => {
          events.push(`cleanup:${value}`)
        }
      }, [value])

      return React.createElement("div", null, String(value))
    }

    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component, {value: 1}))
    })

    expect(events).toEqual(["setup:1"])

    act(() => {
      renderer.update(React.createElement(Component, {value: 2}))
    })

    expect(events).toEqual(["setup:1", "cleanup:1", "setup:2"])

    act(() => {
      renderer.unmount()
    })

    expect(events).toEqual(["setup:1", "cleanup:1", "setup:2", "cleanup:2"])
  })

  it("runs cleanup on unmount", () => {
    let cleanedUp = false

    /**
     * @returns {import("react").ReactElement}
     */
    function Component() {
      useNow(() => {
        return () => {
          cleanedUp = true
        }
      }, [])

      return React.createElement("div", null, "hello")
    }

    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component))
    })

    expect(cleanedUp).toBe(false)

    act(() => {
      renderer.unmount()
    })

    expect(cleanedUp).toBe(true)
  })

  it("handles callbacks that return no cleanup", () => {
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
      renderer.update(React.createElement(Component, {value: 2}))
    })

    expect(calls).toBe(2)

    act(() => {
      renderer.unmount()
    })

    expect(calls).toBe(2)
  })

  it("runs callback exactly once per dep change under StrictMode with cleanup", () => {
    /** @type {string[]} */
    const events = []

    /**
     * @param {{value: number}} props
     * @returns {import("react").ReactElement}
     */
    function Component({value}) {
      useNow(() => {
        events.push(`setup:${value}`)

        return () => {
          events.push(`cleanup:${value}`)
        }
      }, [value])

      return React.createElement("div", null, String(value))
    }

    let renderer

    act(() => {
      renderer = TestRenderer.create(
        React.createElement(StrictMode, null, React.createElement(Component, {value: 1}))
      )
    })

    // StrictMode double-renders but the ref-based dedup ensures the callback
    // fires exactly once. The setup:1 event appears exactly once.
    expect(events.filter((e) => e === "setup:1").length).toBe(1)

    act(() => {
      renderer.update(
        React.createElement(StrictMode, null, React.createElement(Component, {value: 2}))
      )
    })

    // Dep change: setup:2 fires exactly once, and cleanup:1 fires before it.
    expect(events.filter((e) => e === "setup:2").length).toBe(1)
    const cleanup1Index = events.indexOf("cleanup:1")
    const setup2Index = events.indexOf("setup:2")

    expect(cleanup1Index).toBeLessThan(setup2Index)

    act(() => {
      renderer.unmount()
    })

    // Final unmount cleanup.
    expect(events[events.length - 1]).toBe("cleanup:2")
  })

  it("does not re-run callback when deps do not change", () => {
    let calls = 0
    let cleanups = 0

    /**
     * @param {{value: number}} props
     * @returns {import("react").ReactElement}
     */
    function Component({value}) {
      useNow(() => {
        calls += 1

        return () => {
          cleanups += 1
        }
      }, [value])

      return React.createElement("div", null, String(value))
    }

    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component, {value: 1}))
    })

    expect(calls).toBe(1)
    expect(cleanups).toBe(0)

    // Same value, no re-run.
    act(() => {
      renderer.update(React.createElement(Component, {value: 1}))
    })

    expect(calls).toBe(1)
    expect(cleanups).toBe(0)

    act(() => {
      renderer.unmount()
    })

    expect(cleanups).toBe(1)
  })
})
