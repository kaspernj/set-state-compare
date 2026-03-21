import {arrayReferenceDifferent, referenceDifferent} from "./diff-utils.js"
import {dig} from "diggerize"
import fetchingObject from "fetching-object"
import memoCompareProps from "./memo-compare-props.js"
import PropTypes from "prop-types"
import shared from "./shared.js"
import {useLayoutEffect, useMemo, useState} from "react"

/**
 * @typedef {object} ShapeHookLifecycleHooks
 * @property {(prevProps: Record<string, any>, prevState: Record<string, any>) => void} [componentDidUpdate]
 * @property {() => void} [componentDidMount]
 * @property {() => void} [componentWillUnmount]
 * @property {{children: [import("react").ReactNode]}} props
 * @property {() => void} [setup]
 */

class ShapeHook {
  /** @type {Record<string, any> | undefined} */
  static defaultProps = undefined

  /** @type {Record<string, import("prop-types").Validator>} */
  static propTypes = undefined

  /** @type {Record<string, {dependencies?: any[], value: any}> | undefined} */
  static __staticCaches = undefined

  /**
   * @param {Record<string, any>} props
   */
  constructor(props) {
    this.__caches = {}
    this.__mounting = true
    this.__mounted = false
    this.__committed = false
    this.__committedProps = props
    this.__committedState = {}
    this.__pendingDidUpdate = undefined
    this.props = props
    this.setStates = {}
    this.state = {}
    this.__firstRenderCompleted = false
    this.tt = fetchingObject(this)
    this.p = fetchingObject(() => this.props)
    this.s = fetchingObject(this.state)
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
   * @param {Record<string, any>} variables
   * @returns {void}
   */
  setInstance(variables) {
    for (const name in variables) {
      this[name] = variables[name]
    }
  }

  /**
   * @param {Record<string, any>} statesList
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
      shared.enqueueRenderCallback(callback)
    }
  }

  /**
   * @param {Record<string, any>} statesList
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
   * @param {string} stateName
   * @param {any} defaultValue
   * @returns {any}
   */
  useState(stateName, defaultValue) {
    const [stateValue, setState] = useState(defaultValue)

    if (!(stateName in this.state)) {
      this.state[stateName] = stateValue
      this.setStates[stateName] = (newValue, args) => {
        if (referenceDifferent(this.state[stateName], newValue)) {
          const lifecycle = /** @type {ShapeHookLifecycleHooks} */ (/** @type {unknown} */ (this))
          const prevState = {...this.state}

          this.state[stateName] = newValue

          // Avoid React error if using set-state while rendering or not mounted (like in a useMemo callback).
          if (!args?.silent) {
            if (lifecycle.componentDidUpdate) {
              this.queueDidUpdate(this.__committedProps, prevState)
            }

            if (shared.rendering > 0 || !this.isMounted()) {
              shared.enqueueRenderCallback(() => setState(newValue))
            } else {
              setState(newValue)
            }
          }
        }
      }
    }

    return this.setStates[stateName]
  }

  /**
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
        const defaultValue = statesList[stateName]

        this.useState(stateName, defaultValue)
      }
    }
  }
}

/**
 * @template {ShapeHook} T
 * @param {typeof ShapeHook & (new (props: Record<string, any>) => T)} ShapeHookClass
 * @param {Record<string, any>} props
 * @returns {T}
 */
function useShapeHook(ShapeHookClass, props) {
  // Count rendering to avoid setting state while rendering which causes a console-error from React.
  shared.rendering += 1

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
      const validateProps = {}

      for (const key in actualProps) {
        // Accessing "key" will result in a warning in the console.
        if (key == "key") continue

        validateProps[key] = actualProps[key]
      }

      PropTypes.checkPropTypes(ShapeHookClass.propTypes, validateProps, "prop", ShapeHookClass.name)
    }

    const shape = useMemo(() => new ShapeHookClass(actualProps), [])
    const lifecycle = /** @type {ShapeHookLifecycleHooks} */ (/** @type {unknown} */ (shape))
    const prevProps = shape.props

    shape.props = actualProps
    const propsChanged = !memoCompareProps(prevProps, actualProps)

    if (shape.setup) {
      shape.setup()
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

    return shape
  } finally {
    shared.scheduleAfterPaint(() => {
      shared.rendering = Math.max(0, shared.rendering - 1)
    })
  }
}

export {ShapeHook, useShapeHook}
export default useShapeHook
