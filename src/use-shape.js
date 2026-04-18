import {referenceDifferent} from "./diff-utils.js"
import {useEffect, useMemo, useState} from "react"
import fetchingObject from "fetching-object"
import {shapeComponent} from "./shape-component.js"
import shared from "./shared.js"

class UseShapeState {
  constructor() {
    this.__mounting = true
    this.__mounted = false

    /** @type {Record<string, (newValue: any, args?: {silent?: boolean}) => void>} */
    this.setStates = {}

    // Set by useShape each render to React's stable counter setter.
    // A single counter drives every re-render; per-key React state is gone.
    /** @type {(() => void) | undefined} */
    this.__requestRender = undefined
    this.__renderQueued = false

    /** @type {Record<string, any>} */
    this.state = {}

    /** @type {Record<string, any>} */
    this.props = {}

    /** @type {Record<string, any>} */
    this.meta = {}

    this.m = fetchingObject(() => this.meta)
    this.p = fetchingObject(() => this.props)
    this.s = fetchingObject(this.state)
  }

  /**
   * @param {Record<string, any>} statesList
   * @param {object} [args]
   * @param {boolean} [args.silent]
   */
  set(statesList, args) {
    for (const stateName in statesList) {
      const newValue = statesList[stateName]

      if (!(stateName in this.setStates)) {
        throw new Error(`No such state: ${stateName}`)
      }

      this.setStates[stateName](newValue, {silent: args?.silent})
    }
  }

  /** @param {Record<string, any>} newMeta */
  updateMeta(newMeta) {
    Object.assign(this.meta, newMeta)
  }

  /** @param {Record<string, any>} newProps */
  updateProps(newProps) {
    this.props = newProps
  }

  /**
   * Requests a re-render via the instance's update counter. No-op when
   * unmounted so writes after teardown do not trigger React warnings.
   * Defers via the after-paint queue when called mid-render.
   * @returns {void}
   */
  scheduleRender() {
    if (!this.__mounted) return
    if (!this.__requestRender) return

    if (shared.rendering > 0) {
      if (this.__renderQueued) return
      this.__renderQueued = true
      shared.enqueueRenderCallback(() => {
        this.__renderQueued = false
        if (this.__mounted && this.__requestRender) this.__requestRender()
      })
      return
    }

    this.__requestRender()
  }

  /**
   * Registers a state key. Idempotent — default applies only on first
   * registration. Re-registering returns the existing setter; the
   * default value is ignored on later calls.
   * @param {string} stateName
   * @param {any} [defaultValue]
   * @returns {(newValue: any, args?: {silent?: boolean}) => void}
   */
  useState(stateName, defaultValue) {
    if (Object.hasOwn(this.setStates, stateName)) {
      return this.setStates[stateName]
    }

    if (!(stateName in this.state)) {
      this.state[stateName] = defaultValue
    }

    this.setStates[stateName] = (/** @type {any} */ newValue, /** @type {{silent?: boolean} | undefined} */ args) => {
      if (!referenceDifferent(this.state[stateName], newValue)) return

      this.state[stateName] = newValue

      if (args?.silent) return

      this.scheduleRender()
    }

    return this.setStates[stateName]
  }

  /** @param {Record<string, any> | string[]} statesList */
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
 * @param {Record<string, any>} props
 * @param {object} [opts]
 * @param {typeof UseShapeState} [opts.shapeClass]
 * @returns {UseShapeState}
 */
function useShape(props, opts) {
  // One counter per instance drives all re-renders; state values live on
  // shape.state so writes after unmount can update silently.
  const [, setUpdateCount] = useState(0)

  /** @type {UseShapeState} */
  const shape = useMemo(
    () => {
      const ShapeClass = opts?.shapeClass || UseShapeState

      return new ShapeClass()
    },
    []
  )

  // setUpdateCount is stable across renders; assign once per instance.
  shape.__requestRender ??= () => setUpdateCount((n) => n + 1)

  useEffect(() => {
    shape.__mounting = false
    shape.__mounted = true

    return () => {
      shape.__mounted = false
    }
  }, [])

  shape.updateProps(props)

  return shape
}

export {shapeComponent, UseShapeState as Shape}
export default useShape
