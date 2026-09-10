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

  it("starts the new resource during render and tears down the previous one after commit", () => {
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

    // The new resource is started during render (setup:2) and the previous one
    // is torn down in the committed phase (cleanup:1) after the render commits.
    expect(events).toEqual(["setup:1", "setup:2", "cleanup:1"])

    act(() => {
      renderer.unmount()
    })

    expect(events).toEqual(["setup:1", "setup:2", "cleanup:1", "cleanup:2"])
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

  it("keeps exactly one resource active across StrictMode mount and dep changes", () => {
    /** @type {number[]} */
    const active = []

    /**
     * @param {{value: number}} props
     * @returns {import("react").ReactElement}
     */
    function Component({value}) {
      useNow(() => {
        active.push(value)

        return () => {
          const index = active.indexOf(value)
          if (index >= 0) active.splice(index, 1)
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

    // StrictMode replays the effect (setup -> cleanup -> setup); the resource
    // must survive, leaving exactly one active instance.
    expect(active).toEqual([1])

    act(() => {
      renderer.update(
        React.createElement(StrictMode, null, React.createElement(Component, {value: 2}))
      )
    })

    // The value-1 resource is torn down and the value-2 resource is the only
    // active one.
    expect(active).toEqual([2])

    act(() => {
      renderer.unmount()
    })

    expect(active).toEqual([])
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

  it("keeps a cleanup-backed resource active after a StrictMode mount replay", () => {
    let active = 0

    /**
     * @returns {import("react").ReactElement}
     */
    function Component() {
      useNow(() => {
        active += 1

        return () => {
          active -= 1
        }
      }, [])

      return React.createElement("div", null, String(active))
    }

    act(() => {
      TestRenderer.create(
        React.createElement(StrictMode, null, React.createElement(Component))
      )
    })

    // StrictMode replays the effect (setup -> cleanup -> setup) during mount.
    // The resource must survive that replay: exactly one instance stays active
    // rather than being torn down by the simulated unmount and never recreated.
    expect(active).toBe(1)
  })

  it("tears down the previous resource and keeps the new one on a dep change", () => {
    /** @type {string[]} */
    const active = []

    /**
     * @param {{id: string}} props
     * @returns {import("react").ReactElement}
     */
    function Component({id}) {
      useNow(() => {
        active.push(id)

        return () => {
          const index = active.indexOf(id)
          if (index >= 0) active.splice(index, 1)
        }
      }, [id])

      return React.createElement("div", null, id)
    }

    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component, {id: "a"}))
    })

    expect(active).toEqual(["a"])

    act(() => {
      renderer.update(React.createElement(Component, {id: "b"}))
    })

    // The "a" resource is torn down and the "b" resource is the only active one.
    expect(active).toEqual(["b"])

    act(() => {
      renderer.unmount()
    })

    expect(active).toEqual([])
  })
})
