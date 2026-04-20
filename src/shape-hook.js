import {arrayReferenceDifferent, referenceDifferent} from "./diff-utils.js"
import {dig} from "diggerize"
import fetchingObject from "fetching-object"
import memoCompareProps from "./memo-compare-props.js"
import PropTypes from "prop-types"
import resolveInitialStateValue from "./resolve-initial-state-value.js"
import {enqueueRenderCallback, getRendering, scheduleAfterPaint, setRendering} from "./shared.js"
import {useLayoutEffect, useMemo} from "react"
import useState from "./use-state.js"

/**
 * @typedef {object} ShapeHookLifecycleHooks
 * @property {(prevProps: Record<string, any>, prevState: Record<string, any>) => void} [componentDidUpdate]
 * @property {() => void} [componentDidMount]
 * @property {() => void} [componentWillUnmount]
 * @property {{children: [import("react").ReactNode]}} props
 * @property {() => void} [setup]
 */

/**
 * @template {Record<string, any>} [P=Record<string, any>]
 * @template {Record<string, any>} [S=Record<string, any>]
 */
class ShapeHook {
  /** @type {Record<string, any> | undefined} */
  static defaultProps = undefined

  /** @type {Record<string, import("prop-types").Validator<any>> | undefined} */
  static propTypes = undefined

  /** @type {Record<string, {dependencies?: any[], value: any}> | undefined} */
  static __staticCaches = undefined

  /**
   * @param {P} props
   */
  constructor(props) {
    /** @type {Record<string, {dependencies?: any[], value: any}>} */
    this.__caches = {}
    this.__mounting = true
    this.__mounted = false
    this.__committed = false
    this.__committedProps = props

    /** @type {Record<string, any>} */
    this.__committedState = {}
    this.__pendingDidUpdate = undefined

    // Set by useShapeHook each render to React's stable counter setter.
    // A single counter drives every re-render; per-key React state is gone.
    /** @type {(() => void) | undefined} */
    this.__requestRender = undefined
    this.__renderQueued = false

    /** @type {P} */
    this.props = props
    /** @type {Record<string, (newValue: any, args?: {silent?: boolean}) => void>} */
    this.setStates = {}

    /** @type {S} */
    this.state = /** @type {S} */ ({})
    /** @type {string[]} */
    this.__classFieldStateKeys = []
    this.__firstRenderCompleted = false
    /**
     * Proxy for `this` that throws on unknown property reads. Typed as
     * `this` so subclasses get correctly-typed access to their own
     * methods and fields through `this.tt.someHandler` — the same
     * narrowing approach used for `this.p` (`this["props"]`) and
     * `this.s` (`this["state"]`).
     * @type {this}
     */
    this.tt = /** @type {this} */ (fetchingObject(this))

    /**
     * Proxy for `this.props`. Typed as `this["props"]` so subclasses that
     * narrow their props type (or have it inferred via `extends
     * ShapeHook<MyProps>`) get correctly-typed reads through `this.p`
     * without each property degrading to `any`.
     * @type {this["props"]}
     */
    this.p = /** @type {this["props"]} */ (fetchingObject(() => this.props))

    /**
     * Proxy for `this.state`. Typed as `this["state"]` so subclasses that
     * declare state as a class field literal (`state = {foo: 1, bar: ""}`)
     * get reads through `this.s` typed against their actual state shape
     * instead of falling back to the default `Record<string, any>`.
     *
     * Writable: `this.s.foo = value` is equivalent to
     * `this.setState({foo: value})`. Only top-level state keys declared on
     * the class-field `state` object are writable; assigning to an
     * unregistered key throws. Nested mutation
     * (`this.s.foo.bar = 1`) writes to the underlying state object but
     * does NOT schedule a re-render — call `this.setState` explicitly
     * for deep updates.
     * @type {this["state"]}
     */
    this.s = /** @type {this["state"]} */ (new Proxy(/** @type {Record<string, any>} */ ({}), {
      get: (_target, prop) => {
        if (typeof prop !== "string") return Reflect.get(this.state, prop)
        if (prop === "prototype") return this.state.prototype
        if (!(prop in this.state)) throw new Error(`Property not found: ${prop}`)
        return this.state[prop]
      },
      set: (_target, prop, newValue) => {
        if (typeof prop !== "string") return false
        // Own-key check only — `prop in this.setStates` would also match
        // inherited `Object.prototype` keys (`toString`, `constructor`, …)
        // and silently call those instead of failing on a typo.
        if (!Object.hasOwn(this.setStates, prop)) {
          throw new Error(`Cannot assign to this.s.${prop} — state key "${prop}" is not registered. Declare it on the class-field state object.`)
        }
        this.setStates[prop](newValue)
        return true
      }
    }))
  }

  /**
   * @returns {boolean}
   */
  isMounted() {
    return this.__mounted
  }

  /**
   * @returns {boolean}
   */
  isMounting() {
    return this.__mounting
  }

  /**
   * @template T
   * @param {string} name
   * @param {T | (() => T)} value
   * @param {any[]} [dependencies]
   * @returns {T}
   */
  cache(name, value, dependencies) {
    const oldDependencies = this.__caches[name]?.dependencies
    const hasCache = name in this.__caches
    const depsChanged = arrayReferenceDifferent(oldDependencies || [], dependencies || [])

    if (!hasCache || depsChanged) {
      let actualValue

      if (typeof value == "function") {
        // @ts-expect-error
        actualValue = value()
      } else {
        actualValue = value
      }

      this.__caches[name] = {dependencies, value: actualValue}
    }

    return this.__caches[name].value
  }

  /**
   * @template T
   * @param {string} name
   * @param {T | (() => T)} value
   * @param {any[]} [dependencies]
   * @returns {T}
   */
  cacheStatic(name, value, dependencies) {
    const constructor = /** @type {typeof ShapeHook} */ (this.constructor)

    if (!constructor.__staticCaches) {
      constructor.__staticCaches = {}
    }

    const oldDependencies = constructor.__staticCaches[name]?.dependencies

    const hasCache = name in constructor.__staticCaches
    const depsChanged = arrayReferenceDifferent(oldDependencies || [], dependencies || [])

    if (!hasCache || depsChanged) {
      let actualValue

      if (typeof value == "function") {
        // @ts-expect-error
        actualValue = value()
      } else {
        actualValue = value
      }

      constructor.__staticCaches[name] = {dependencies, value: actualValue}
    }

    return constructor.__staticCaches[name].value
  }

  /**
   * Backward-compatible helper for populating instance fields in setup().
   * Existing ShapeComponent consumers rely on `this.setInstance({...})`
   * to attach route params, routers, refs, translations, and handlers.
   * @param {Record<string, any>} variables
   * @returns {void}
   */
  setInstance(variables) {
    for (const name in variables) {
      /** @type {Record<string, any>} */ (this)[name] = variables[name]
    }
  }

  /**
   * @param {Partial<S> | ((state: S) => Partial<S>)} statesList
   * @param {function() : void} [callback]
   * @returns {void}
   */
  setState(statesList, callback) {
    if (typeof statesList == "function") {
      statesList = statesList(this.state)
    }

    for (const stateName in statesList) {
      const newValue = statesList[stateName]

      if (!(stateName in this.setStates)) {
        throw new Error(`No such state: ${stateName}`)
      }

      this.setStates[stateName](newValue)
    }

    if (callback) {
      enqueueRenderCallback(callback)
    }
  }

  /**
   * @param {Partial<S> | ((state: S) => Partial<S>)} statesList
   * @returns {Promise<void>}
   */
  setStateAsync(statesList) {
    return new Promise((resolve) => {
      this.setState(statesList, resolve)
    })
  }

  /**
   * Track the previous committed snapshot for a future componentDidUpdate call.
   * The first state/prop change before a commit wins so the callback sees the
   * same previous values React would expose for the whole commit.
   * @param {Record<string, any>} prevProps
   * @param {Record<string, any>} prevState
   * @returns {void}
   */
  queueDidUpdate(prevProps, prevState) {
    if (!this.__pendingDidUpdate) {
      this.__pendingDidUpdate = {
        prevProps: {...prevProps},
        prevState: {...prevState}
      }
    }
  }

  /**
   * @param {string} stylingName
   * @param {Record<string, any>} style
   * @returns {Record<string, any>}
   */
  stylingFor(stylingName, style = {}) {
    let customStyling = dig(this, "props", "styles", stylingName)

    if (typeof customStyling == "function") {
      customStyling = customStyling({state: this.state, style})
    }

    if (customStyling) {
      return Object.assign(style, customStyling)
    }

    return style
  }

  /**
   * Backward-compatible class-component state registration helper.
   * Prefer class-field `state = {...}` for new code, but existing
   * ShapeComponent consumers still call `this.useState(...)` in `setup()`
   * and `render()`.
   * @param {string} stateName
   * @param {any} [defaultValue]
   * @returns {(newValue: any, args?: {silent?: boolean}) => void}
   */
  useState(stateName, defaultValue) {
    return registerShapeHookState(this, stateName, defaultValue, {resolveInitialValue: true})
  }

  /**
   * Backward-compatible class-component state registration helper.
   * Prefer class-field `state = {...}` for new code.
   * @param {Array<string>|Record<string, any>} statesList
   * @returns {void}
   */
  useStates(statesList) {
    if (Array.isArray(statesList)) {
      for(const stateName of statesList) {
        this.useState(stateName)
      }
    } else {
      for(const stateName in statesList) {
        this.useState(stateName, statesList[stateName])
      }
    }
  }

  /**
   * Requests a re-render via the instance's update counter. Silent no-op
   * only after true teardown (not mounted and not mounting), so writes
   * after unmount do not trigger React warnings. Pre-mount and mid-render
   * writes defer through the after-paint queue and fire once mounted.
   * @returns {void}
   */
  scheduleRender() {
    if (!this.__requestRender) return
    if (!this.isMounted() && !this.isMounting()) return

    if (getRendering() > 0 || !this.isMounted()) {
      if (this.__renderQueued) return
      this.__renderQueued = true
      enqueueRenderCallback(() => {
        this.__renderQueued = false
        if (this.isMounted() && this.__requestRender) this.__requestRender()
      })
      return
    }

    this.__requestRender()
  }

}

/**
 * @param {ShapeHook<Record<string, any>, Record<string, any>>} shape
 * @param {string} stateName
 * @param {any} [defaultValue]
 * @param {{resolveInitialValue?: boolean}} [options]
 * @returns {(newValue: any, args?: {silent?: boolean}) => void}
 */
function registerShapeHookState(shape, stateName, defaultValue, options) {
  if (Object.hasOwn(shape.setStates, stateName)) {
    return shape.setStates[stateName]
  }

  const mutableState = /** @type {Record<string, any>} */ (shape.state)

  if (!(stateName in mutableState)) {
    mutableState[stateName] = options?.resolveInitialValue ? resolveInitialStateValue(defaultValue) : defaultValue
  }

  shape.setStates[stateName] = (newValue, stateArgs) => {
    if (!referenceDifferent(mutableState[stateName], newValue)) return

    const lifecycle = /** @type {ShapeHookLifecycleHooks} */ (/** @type {unknown} */ (shape))
    const prevState = {...shape.state}

    mutableState[stateName] = newValue

    if (stateArgs?.silent) return

    if (lifecycle.componentDidUpdate) {
      shape.queueDidUpdate(shape.__committedProps, prevState)
    }

    shape.scheduleRender()
  }

  return shape.setStates[stateName]
}

/**
 * @template {Record<string, any>} P
 * @template {ShapeHook<P>} T
 * @param {{defaultProps?: Record<string, any>, propTypes?: Record<string, import("prop-types").Validator<any>>, name: string} & (new (props: P) => T)} ShapeHookClass
 * @param {P} props
 * @returns {T}
 */
function useShapeHook(ShapeHookClass, props) {
  // One counter per component drives all re-renders; state values live on
  // the instance (this.state) so writes after unmount can update silently.
  const [, setUpdateCount] = useState(0)

  // Count rendering to avoid setting state while rendering which causes a console-error from React.
  setRendering(getRendering() + 1)

  try {
    // Calculate and validate props.
    let actualProps

    if (ShapeHookClass.defaultProps) {
      // Undefined values are removed from the props because they shouldn't override default values.
      const propsWithoutUndefined = Object.assign({}, props)

      for (const key in propsWithoutUndefined) {
        const value = propsWithoutUndefined[key]

        if (value === undefined) {
          delete propsWithoutUndefined[key]
        }
      }

      actualProps = Object.assign({}, ShapeHookClass.defaultProps, propsWithoutUndefined)
    } else {
      actualProps = props
    }

    if (ShapeHookClass.propTypes) {
      /** @type {Record<string, any>} */
      const validateProps = {}

      for (const key in actualProps) {
        // Accessing "key" will result in a warning in the console.
        if (key == "key") continue

        validateProps[key] = actualProps[key]
      }

      PropTypes.checkPropTypes(ShapeHookClass.propTypes, validateProps, "prop", ShapeHookClass.name)
    }

    const shape = useMemo(() => {
      const instance = new ShapeHookClass(actualProps)

      // Snapshot state keys defined as class fields (before setup adds more).
      instance.__classFieldStateKeys = Object.keys(instance.state)

      return instance
    }, [])

    // setUpdateCount is stable across renders; assign once per instance.
    shape.__requestRender ??= () => setUpdateCount((n) => n + 1)

    const lifecycle = /** @type {ShapeHookLifecycleHooks} */ (/** @type {unknown} */ (shape))
    const prevProps = shape.props

    shape.props = actualProps
    const propsChanged = !memoCompareProps(prevProps, actualProps)

    // Auto-register state keys declared as class fields.
    for (const stateName of shape.__classFieldStateKeys) {
      registerShapeHookState(shape, stateName, shape.state[stateName])
    }

    if (lifecycle.setup) {
      lifecycle.setup()
    }

    if (lifecycle.componentDidUpdate && shape.__firstRenderCompleted && propsChanged) {
      shape.queueDidUpdate(prevProps, shape.__committedState)
    }

    useLayoutEffect(() => {
      shape.__mounting = false
      shape.__mounted = true

      if (lifecycle.componentDidMount) {
        lifecycle.componentDidMount()
      }

      return () => {
        shape.__mounted = false

        if (lifecycle.componentWillUnmount) {
          lifecycle.componentWillUnmount()
        }
      }
    }, [])

    useLayoutEffect(() => {
      const pendingDidUpdate = shape.__pendingDidUpdate
      const hasCommittedRender = shape.__committed

      shape.__committed = true
      shape.__committedProps = shape.props
      shape.__committedState = {...shape.state}

      if (hasCommittedRender && lifecycle.componentDidUpdate && pendingDidUpdate) {
        shape.__pendingDidUpdate = undefined
        lifecycle.componentDidUpdate(pendingDidUpdate.prevProps, pendingDidUpdate.prevState)
      }
    })

    shape.__firstRenderCompleted = true

    return /** @type {T} */ (shape)
  } finally {
    scheduleAfterPaint(() => {
      setRendering(Math.max(0, getRendering() - 1))
    })
  }
}

export {ShapeHook, useShapeHook}
export default useShapeHook
