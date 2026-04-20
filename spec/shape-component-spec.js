import {
  flushRenderingCallbacks,
  getAfterPaintCallbacks,
  getRenderingCallbacks,
  resetSharedStateForTests,
  setAfterPaintCallbacks,
  setAfterPaintHandle,
  setRendering
} from "../src/shared.js"

import React from "react"
import TestRenderer, {act} from "react-test-renderer"
import {ShapeComponent, shapeComponent} from "../src/shape-component.js"

/**
 * @returns {void}
 */
function resetShared() {
  resetSharedStateForTests()
}

/**
 * @returns {void}
 */
function flushAfterPaint() {
  const callbacks = getAfterPaintCallbacks()

  setAfterPaintCallbacks([])
  setAfterPaintHandle(undefined)

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

  it("does not evaluate cacheStatic supplier when dependencies are unchanged", () => {
    class StaticShape extends ShapeComponent {}

    const shared = {name: "Donald"}
    const shape = new StaticShape({})

    const supplier = jasmine.createSpy("supplier").and.returnValue({id: 1})

    shape.cacheStatic("styles", supplier, [shared, 1])
    shape.cacheStatic("styles", supplier, [shared, 1])

    expect(supplier.calls.count()).toBe(1)
  })

  it("does not evaluate cache supplier when dependencies are unchanged", () => {
    const shape = new ShapeComponent({})
    const sharedReference = {name: "Donald"}
    const supplier = jasmine.createSpy("supplier").and.returnValue({id: 1})

    shape.cache("styles", supplier, [sharedReference, 1])
    shape.cache("styles", supplier, [sharedReference, 1])

    expect(supplier.calls.count()).toBe(1)
  })

  it("re-renders for new object references but skips identical primitives", () => {
    /** @type {TestShape | undefined} */
    let shapeInstance

    class TestShape extends ShapeComponent {
      state = {
        count: 0,
        data: {name: "Donald"}
      }

      /** @param {Record<string, any>} props */
      constructor(props) {
        super(props)
        /** @type {number} */
        this.renderCount = 0
        shapeInstance = this
      }

      render() {
        this.renderCount += 1

        return React.createElement("div", null, String(this.state.count))
      }
    }

    const Component = shapeComponent(TestShape)
    /** @type {import("react-test-renderer").ReactTestRenderer} */
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

      render() {
        return React.createElement("div", null, "Lifecycle")
      }
    }

    const Component = shapeComponent(LifecycleShape)
    /** @type {import("react-test-renderer").ReactTestRenderer} */
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

  it("runs componentDidUpdate after the committed rerender", async () => {
    /** @type {number | undefined} */
    let renderedCountSeenInDidUpdate
    /** @type {TestShape | undefined} */
    let shapeInstance

    class TestShape extends ShapeComponent {
      state = {count: 0}

      render() {
        this.renderedCount = this.state.count
        shapeInstance = this

        return React.createElement("div", null, String(this.state.count))
      }

      componentDidUpdate() {
        renderedCountSeenInDidUpdate = this.renderedCount
      }
    }

    const Component = shapeComponent(TestShape)

    act(() => {
      TestRenderer.create(React.createElement(Component))
    })

    act(() => {
      shapeInstance.setState({count: 1})
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(renderedCountSeenInDidUpdate).toBe(1)
  })

  it("resolves function state defaults once during first registration", () => {
    const initializer = jasmine.createSpy("initializer").and.returnValue(["a", "b"])

    class LazyDefaultShape extends ShapeComponent {
      state = {
        items: initializer()
      }

      render() {
        return React.createElement("div", null, String(this.state.items.length))
      }
    }

    const Component = shapeComponent(LazyDefaultShape)
    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component))
    })

    expect(initializer.calls.count()).toBe(1)
    expect(renderer.toJSON().children).toEqual(["2"])
  })

  it("keeps class useStates() compatibility in setup()", () => {
    class LegacySetupShape extends ShapeComponent {
      setup() {
        this.useStates({count: 2})
      }

      render() {
        return React.createElement("div", null, String(this.s.count))
      }
    }

    const Component = shapeComponent(LegacySetupShape)
    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component))
    })

    expect(renderer.toJSON().children).toEqual(["2"])
  })

  it("keeps class useState() compatibility in render()", () => {
    class LegacyRenderShape extends ShapeComponent {
      render() {
        this.useState("count", 3)

        return React.createElement("div", null, String(this.s.count))
      }
    }

    const Component = shapeComponent(LegacyRenderShape)
    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component))
    })

    expect(renderer.toJSON().children).toEqual(["3"])
  })


  it("resolves class useState() lazy initializers only once across re-renders", () => {
    const initializer = jasmine.createSpy("initializer").and.returnValue(["a", "b"])

    class LazyLegacyRenderShape extends ShapeComponent {
      render() {
        this.useState("items", initializer)

        return React.createElement("div", null, String(this.s.items.length))
      }
    }

    const Component = shapeComponent(LazyLegacyRenderShape)
    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component, {count: 1}))
    })

    act(() => {
      renderer.update(React.createElement(Component, {count: 2}))
    })

    expect(initializer.calls.count()).toBe(1)
    expect(renderer.toJSON().children).toEqual(["2"])
  })

  it("runs componentDidUpdate when props change with defaultProps", () => {
    let updates = 0
    /** @type {Record<string, any> | undefined} */
    let previousProps

    class DefaultPropsShape extends ShapeComponent {
      static defaultProps = {
        name: "Donald",
        role: "duck"
      }

      /**
       * @param {Record<string, any>} prevProps
       * @returns {void}
       */
      componentDidUpdate(prevProps) {
        updates += 1
        previousProps = prevProps
      }

      render() {
        return React.createElement("div", null, this.props.name)
      }
    }

    const Component = shapeComponent(DefaultPropsShape)
    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component))
    })

    act(() => {
      renderer.update(React.createElement(Component, {name: "Daisy"}))
    })

    act(() => {
      renderer.unmount()
    })

    expect(updates).toBe(1)
    expect(previousProps).toEqual({name: "Donald", role: "duck"})
  })

  it("passes the previous committed state to componentDidUpdate on prop updates", async () => {
    /** @type {Record<string, any> | undefined} */
    let previousState
    /** @type {DefaultPropsShape | undefined} */
    let shapeInstance

    class DefaultPropsShape extends ShapeComponent {
      state = {count: 2}

      /**
       * @param {Record<string, any>} prevProps
       * @param {Record<string, any>} prevState
       * @returns {void}
       */
      componentDidUpdate(prevProps, prevState) {
        previousState = prevState
      }

      render() {
        shapeInstance = this

        return React.createElement("div", null, `${this.props.name}:${this.state.count}`)
      }
    }

    const Component = shapeComponent(DefaultPropsShape)
    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component, {name: "Donald"}))
    })

    act(() => {
      flushAfterPaint()
    })

    act(() => {
      shapeInstance.setState({count: 5})
    })

    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      flushAfterPaint()
    })

    act(() => {
      renderer.update(React.createElement(Component, {name: "Daisy"}))
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(previousState).toEqual({count: 5})
  })

  it("uses the current committed props for setState calls inside componentDidUpdate", async () => {
    /** @type {Array<Record<string, any>>} */
    const previousPropsCalls = []
    /** @type {PropUpdateShape | undefined} */
    let shapeInstance

    class PropUpdateShape extends ShapeComponent {
      state = {count: 0}

      componentDidUpdate(prevProps) {
        previousPropsCalls.push(prevProps)

        if (this.props.name === "Daisy" && this.state.count === 0) {
          this.setState({count: 1})
        }
      }

      render() {
        shapeInstance = this

        return React.createElement("div", null, `${this.props.name}:${this.state.count}`)
      }
    }

    const Component = shapeComponent(PropUpdateShape)
    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component, {name: "Donald"}))
    })

    act(() => {
      renderer.update(React.createElement(Component, {name: "Daisy"}))
    })

    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      flushAfterPaint()
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(previousPropsCalls).toEqual([{name: "Donald"}, {name: "Daisy"}])
    expect(shapeInstance.state.count).toBe(1)
  })

  it("exposes this.s as a typed proxy of the subclass class-field state", () => {
    /** @type {StateProxyShape | undefined} */
    let shapeInstance

    class StateProxyShape extends ShapeComponent {
      state = {
        count: 0,
        label: /** @type {string | null} */ (null)
      }

      /**
       * @param {Record<string, any>} props
       */
      constructor(props) {
        super(props)
        shapeInstance = this
      }

      render() {
        return React.createElement("div", null, "")
      }
    }

    const Component = shapeComponent(StateProxyShape)

    act(() => {
      TestRenderer.create(React.createElement(Component))
    })

    act(() => {
      flushAfterPaint()
    })

    if (!shapeInstance) throw new Error("shapeInstance was never assigned")

    expect(shapeInstance.s.count).toBe(0)
    expect(shapeInstance.s.label).toBe(null)

    act(() => {
      shapeInstance.setState({count: 5, label: "five"})
    })

    act(() => {
      flushAfterPaint()
    })

    expect(shapeInstance.s.count).toBe(5)
    expect(shapeInstance.s.label).toBe("five")

    // Static type check: `this.s` must be typed against the subclass's
    // declared `state` shape — not widened to `any` or `Record<string, any>`.
    // The conditional below uses the standard `IsAny` test
    // (`0 extends 1 & T` succeeds only when T is `any`); it resolves to
    // `never` on widening, and `true` is not assignable to `never`, so
    // `npm run typecheck` fails. A plain `/** @type {number} */ const x = ...`
    // is not enough because `any` is assignable to every type and would
    // silently pass.
    /** @type {0 extends (1 & typeof shapeInstance.s.count) ? never : (typeof shapeInstance.s.count extends number ? true : never)} */
    const _stateCountIsExactlyNumber = true
    /** @type {0 extends (1 & typeof shapeInstance.s.label) ? never : (typeof shapeInstance.s.label extends (string | null) ? true : never)} */
    const _stateLabelIsExactlyStringOrNull = true

    expect(_stateCountIsExactlyNumber).toBe(true)
    expect(_stateLabelIsExactlyStringOrNull).toBe(true)
    expect(shapeInstance.s.count).toBe(5)
    expect(shapeInstance.s.label).toBe("five")
  })

  it("treats this.s assignments as setState calls and re-renders", () => {
    /** @type {WritableStateShape | undefined} */
    let shapeInstance
    let renderCount = 0

    class WritableStateShape extends ShapeComponent {
      state = {
        count: 0,
        label: /** @type {string | null} */ (null)
      }

      /**
       * @param {Record<string, any>} props
       */
      constructor(props) {
        super(props)
        shapeInstance = this
      }

      render() {
        renderCount += 1
        return React.createElement("div", null, `${this.s.count}:${this.s.label ?? ""}`)
      }
    }

    const Component = shapeComponent(WritableStateShape)

    act(() => {
      TestRenderer.create(React.createElement(Component))
    })

    act(() => {
      flushAfterPaint()
    })

    if (!shapeInstance) throw new Error("shapeInstance was never assigned")

    const initialRenderCount = renderCount

    // Writing through this.s should be equivalent to this.setState.
    act(() => {
      shapeInstance.s.count = 7
    })

    act(() => {
      flushAfterPaint()
    })

    // Synchronous read after assignment must reflect the new value — this.state is
    // mutated inside setStates[name] before React's queued setter fires.
    expect(shapeInstance.state.count).toBe(7)
    expect(shapeInstance.s.count).toBe(7)
    expect(renderCount).toBeGreaterThan(initialRenderCount)

    act(() => {
      shapeInstance.s.label = "seven"
    })

    act(() => {
      flushAfterPaint()
    })

    expect(shapeInstance.s.label).toBe("seven")
  })

  it("throws when assigning to an unregistered state key through this.s", () => {
    /** @type {UnregisteredStateShape | undefined} */
    let shapeInstance

    class UnregisteredStateShape extends ShapeComponent {
      state = {known: 0}

      /**
       * @param {Record<string, any>} props
       */
      constructor(props) {
        super(props)
        shapeInstance = this
      }

      render() {
        return React.createElement("div", null, "")
      }
    }

    const Component = shapeComponent(UnregisteredStateShape)

    act(() => {
      TestRenderer.create(React.createElement(Component))
    })

    act(() => {
      flushAfterPaint()
    })

    if (!shapeInstance) throw new Error("shapeInstance was never assigned")

    expect(() => {
      /** @type {any} */ (shapeInstance.s).unknown = 1
    }).toThrowError(/state key "unknown" is not registered/)

    // `prop in setStates` would match inherited prototype keys and silently
    // call them; the own-key guard must reject those too.
    expect(() => {
      /** @type {any} */ (shapeInstance.s).toString = 1
    }).toThrowError(/state key "toString" is not registered/)
  })

  it("exposes this.tt as a typed proxy of the subclass instance", () => {
    /** @type {TtProxyShape | undefined} */
    let shapeInstance

    class TtProxyShape extends ShapeComponent {
      state = {count: 0}

      /**
       * @param {Record<string, any>} props
       */
      constructor(props) {
        super(props)
        shapeInstance = this
      }

      /** @returns {number} */
      doubledCount() {
        return this.s.count * 2
      }

      render() {
        return React.createElement("div", null, "")
      }
    }

    const Component = shapeComponent(TtProxyShape)

    act(() => {
      TestRenderer.create(React.createElement(Component))
    })

    act(() => {
      flushAfterPaint()
    })

    if (!shapeInstance) throw new Error("shapeInstance was never assigned")

    act(() => {
      shapeInstance.s.count = 3
    })

    // Runtime: `this.tt.method()` dispatches to the subclass method.
    expect(shapeInstance.tt.doubledCount()).toBe(6)

    // Unknown-key reads still throw (baseline fetching-object behaviour).
    expect(() => {
      /** @type {any} */ (shapeInstance.tt).nonexistentMethod()
    }).toThrowError(/Property not found: nonexistentMethod/)

    // Static type check: `this.tt` is typed against the subclass, not `any`.
    // Same `IsAny` trick as the class-field-state spec — resolves to `never`
    // when the type widens to `any`, so `true` fails to assign and
    // `npm run typecheck` breaks. Using `typeof doubledCount extends () => number`
    // keeps us specific to the subclass's method signature.
    /** @type {0 extends (1 & typeof shapeInstance.tt.doubledCount) ? never : (typeof shapeInstance.tt.doubledCount extends () => number ? true : never)} */
    const _ttIsExactlySubclass = true

    expect(_ttIsExactlySubclass).toBe(true)
  })

  it("queues a follow-up render for writes during the first render pass", async () => {
    // Regression test: a setState during the initial render that lands
    // AFTER the current render already read the old value must still
    // schedule a follow-up render once mounted, otherwise the UI shows
    // the stale value until some unrelated update.
    let renderCount = 0

    class PreMountWriteShape extends ShapeComponent {
      state = {count: 0}

      render() {
        renderCount += 1
        const rendered = this.s.count

        // Mimic a child-in-the-same-tree mutating shared state during the
        // initial render after we captured our read. The write happens
        // while __mounting is true and __mounted is still false.
        if (rendered === 0) {
          this.setState({count: 7})
        }

        return React.createElement("div", null, String(rendered))
      }
    }

    const Component = shapeComponent(PreMountWriteShape)
    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component))
    })

    act(() => {
      flushAfterPaint()
    })

    await act(async () => {
      await Promise.resolve()
    })

    // After the follow-up render fires, the tree must reflect the new value.
    expect(renderer.toJSON().children).toEqual(["7"])
    expect(renderCount).toBeGreaterThan(1)
  })

  it("allows setState after unmount without warning and updates this.state silently", () => {
    /** @type {UnmountSafeShape | undefined} */
    let shapeInstance
    let renderCount = 0

    class UnmountSafeShape extends ShapeComponent {
      state = {count: 0}

      /** @param {Record<string, any>} props */
      constructor(props) {
        super(props)
        shapeInstance = this
      }

      render() {
        renderCount += 1
        return React.createElement("div", null, String(this.s.count))
      }
    }

    const Component = shapeComponent(UnmountSafeShape)
    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component))
    })

    act(() => {
      flushAfterPaint()
    })

    if (!shapeInstance) throw new Error("shapeInstance was never assigned")

    const renderCountBeforeUnmount = renderCount
    const errorSpy = spyOn(console, "error")

    act(() => {
      renderer.unmount()
    })

    // Writing after unmount must not throw, must not log a React state-update-on-unmounted warning,
    // and must still update the underlying this.state value.
    expect(() => {
      shapeInstance.s.count = 42
    }).not.toThrow()

    expect(shapeInstance.state.count).toBe(42)
    expect(shapeInstance.s.count).toBe(42)
    expect(renderCount).toBe(renderCountBeforeUnmount)

    for (const call of errorSpy.calls.all()) {
      const message = String(call.args[0])

      expect(message).not.toMatch(/unmounted component/i)
      expect(message).not.toMatch(/memory leak/i)
    }
  })

  it("does not run componentDidUpdate when prop values are unchanged", () => {
    let updates = 0

    class SamePropsShape extends ShapeComponent {
      componentDidUpdate() {
        updates += 1
      }

      render() {
        return React.createElement("div", null, this.props.name)
      }
    }

    const Component = shapeComponent(SamePropsShape)
    /** @type {import("react-test-renderer").ReactTestRenderer} */
    let renderer

    act(() => {
      renderer = TestRenderer.create(React.createElement(Component, {name: "Donald"}))
    })

    act(() => {
      renderer.update(React.createElement(Component, {name: "Donald"}))
    })

    act(() => {
      renderer.unmount()
    })

    expect(updates).toBe(0)
  })
})
