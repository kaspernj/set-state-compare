import React from "react"
import TestRenderer, {act} from "react-test-renderer"
import {ShapeComponent, shapeComponent} from "../src/shape-component.js"
import {ShapeHook, useShapeHook} from "../src/shape-hook.js"
import memo from "../src/memo.js"
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

/**
 * @typedef {object} TypedProps
 * @property {string} name
 * @property {number} count
 */

/**
 * @typedef {object} TypedState
 * @property {string} label
 * @property {boolean} active
 */

describe("generic type forwarding", () => {
  beforeEach(() => {
    resetShared()
  })

  describe("ShapeHook with typed props", () => {
    it("passes typed props through useShapeHook", () => {
      /** @type {TypedHook | undefined} */
      let hookInstance

      /** @augments {ShapeHook<TypedProps>} */
      class TypedHook extends ShapeHook {
        setup() {
          this.useState("ready", false)
        }
      }

      /**
       * @param {TypedProps} props
       * @returns {import("react").ReactElement}
       */
      function TypedHost(props) {
        const hook = useShapeHook(TypedHook, props)
        hookInstance = hook

        // Type-checked: props.name is string, props.count is number
        return React.createElement("div", null, `${hook.props.name}:${hook.props.count}`)
      }

      /** @type {import("react-test-renderer").ReactTestRenderer} */
      let renderer

      act(() => {
        renderer = TestRenderer.create(React.createElement(TypedHost, {name: "Donald", count: 5}))
      })

      act(() => {
        flushAfterPaint()
      })

      expect(hookInstance.props.name).toBe("Donald")
      expect(hookInstance.props.count).toBe(5)

      // Verify p proxy also returns typed values
      expect(hookInstance.p.name).toBe("Donald")
      expect(hookInstance.p.count).toBe(5)

      act(() => {
        renderer.unmount()
      })
    })
  })

  describe("ShapeHook with typed state", () => {
    it("passes typed state through useShapeHook", () => {
      /** @type {StatefulHook | undefined} */
      let hookInstance

      /** @augments {ShapeHook<{name: string}, TypedState>} */
      class StatefulHook extends ShapeHook {
        setup() {
          this.useStates({label: "hello", active: false})
        }
      }

      /**
       * @param {{name: string}} props
       * @returns {import("react").ReactElement}
       */
      function StatefulHost(props) {
        const hook = useShapeHook(StatefulHook, props)
        hookInstance = hook

        return React.createElement("div", null, `${hook.state.label}:${hook.state.active}`)
      }

      /** @type {import("react-test-renderer").ReactTestRenderer} */
      let renderer

      act(() => {
        renderer = TestRenderer.create(React.createElement(StatefulHost, {name: "Donald"}))
      })

      act(() => {
        flushAfterPaint()
      })

      expect(hookInstance.state.label).toBe("hello")
      expect(hookInstance.state.active).toBe(false)

      // Verify s proxy returns typed values
      expect(hookInstance.s.label).toBe("hello")
      expect(hookInstance.s.active).toBe(false)

      act(() => {
        hookInstance.setState({label: "world"})
      })

      expect(hookInstance.state.label).toBe("world")

      act(() => {
        renderer.unmount()
      })
    })
  })

  describe("ShapeComponent with typed props via shapeComponent", () => {
    it("forwards prop types through shapeComponent wrapper", () => {
      /** @type {TypedComponent | undefined} */
      let componentInstance

      /** @augments {ShapeComponent<TypedProps>} */
      class TypedComponent extends ShapeComponent {
        render() {
          componentInstance = this

          return React.createElement("div", null, `${this.props.name}:${this.props.count}`)
        }
      }

      const Component = shapeComponent(TypedComponent)
      /** @type {import("react-test-renderer").ReactTestRenderer} */
      let renderer

      act(() => {
        renderer = TestRenderer.create(React.createElement(Component, {name: "Daisy", count: 3}))
      })

      act(() => {
        flushAfterPaint()
      })

      expect(componentInstance.props.name).toBe("Daisy")
      expect(componentInstance.props.count).toBe(3)
      expect(componentInstance.p.name).toBe("Daisy")
      expect(componentInstance.p.count).toBe(3)

      const output = renderer.toJSON()

      expect(output.children).toEqual(["Daisy:3"])

      act(() => {
        renderer.unmount()
      })
    })
  })

  describe("ShapeComponent with typed props and state via memo", () => {
    it("forwards prop types through memo(shapeComponent(...)) wrapper", () => {
      /** @type {MemoComponent | undefined} */
      let componentInstance

      /**
       * @augments {ShapeComponent<TypedProps, TypedState>}
       */
      class MemoComponent extends ShapeComponent {
        setup() {
          this.useStates({label: "initial", active: true})
        }

        render() {
          componentInstance = this

          return React.createElement("div", null, `${this.props.name}:${this.state.label}:${this.state.active}`)
        }
      }

      const Component = memo(shapeComponent(MemoComponent))
      /** @type {import("react-test-renderer").ReactTestRenderer} */
      let renderer

      act(() => {
        renderer = TestRenderer.create(React.createElement(Component, {name: "Huey", count: 1}))
      })

      act(() => {
        flushAfterPaint()
      })

      // Props
      expect(componentInstance.props.name).toBe("Huey")
      expect(componentInstance.props.count).toBe(1)
      expect(componentInstance.p.name).toBe("Huey")

      // State
      expect(componentInstance.state.label).toBe("initial")
      expect(componentInstance.state.active).toBe(true)
      expect(componentInstance.s.label).toBe("initial")
      expect(componentInstance.s.active).toBe(true)

      // setState with typed partial state
      act(() => {
        componentInstance.setState({active: false})
      })

      expect(componentInstance.state.active).toBe(false)
      expect(componentInstance.s.active).toBe(false)

      const output = renderer.toJSON()

      expect(output.children).toEqual(["Huey:initial:false"])

      act(() => {
        renderer.unmount()
      })
    })
  })

  describe("ShapeComponent with class field state", () => {
    it("auto-registers state from class fields without useStates", () => {
      /** @type {ClassFieldComponent | undefined} */
      let componentInstance

      /**
       * @augments {ShapeComponent<{name: string}, {label: string, active: boolean}>}
       */
      class ClassFieldComponent extends ShapeComponent {
        state = /** @type {{label: string, active: boolean}} */ ({label: "default", active: false})

        render() {
          componentInstance = this

          return React.createElement("div", null, `${this.props.name}:${this.state.label}:${this.state.active}`)
        }
      }

      const Component = shapeComponent(ClassFieldComponent)
      /** @type {import("react-test-renderer").ReactTestRenderer} */
      let renderer

      act(() => {
        renderer = TestRenderer.create(React.createElement(Component, {name: "Dewey"}))
      })

      act(() => {
        flushAfterPaint()
      })

      // State was auto-registered from class field
      expect(componentInstance.state.label).toBe("default")
      expect(componentInstance.state.active).toBe(false)
      expect(componentInstance.s.label).toBe("default")
      expect(componentInstance.s.active).toBe(false)

      // setState works on auto-registered state
      act(() => {
        componentInstance.setState({label: "updated"})
      })

      expect(componentInstance.state.label).toBe("updated")
      expect(componentInstance.s.label).toBe("updated")

      const output = renderer.toJSON()

      expect(output.children).toEqual(["Dewey:updated:false"])

      act(() => {
        renderer.unmount()
      })
    })

    it("re-renders after setState on class field state", () => {
      /** @type {RerenderComponent | undefined} */
      let componentInstance
      let renderCount = 0

      /**
       * @augments {ShapeComponent<{name: string}, {count: number}>}
       */
      class RerenderComponent extends ShapeComponent {
        state = /** @type {{count: number}} */ ({count: 0})

        render() {
          renderCount += 1
          componentInstance = this

          return React.createElement("div", null, `count:${this.state.count}`)
        }
      }

      const Component = shapeComponent(RerenderComponent)
      /** @type {import("react-test-renderer").ReactTestRenderer} */
      let renderer

      act(() => {
        renderer = TestRenderer.create(React.createElement(Component, {name: "Louie"}))
      })

      act(() => {
        flushAfterPaint()
      })

      const initialRenderCount = renderCount

      act(() => {
        componentInstance.setState({count: 42})
      })

      expect(renderCount).toBe(initialRenderCount + 1)
      expect(componentInstance.state.count).toBe(42)

      const output = renderer.toJSON()

      expect(output.children).toEqual(["count:42"])

      act(() => {
        renderer.unmount()
      })
    })
  })
})
