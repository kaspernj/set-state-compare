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

    /** @type {Record<string, (value: any) => void>} */
    this.__setStatesActual = {}

    /** @type {Record<string, boolean>} */
    this.__queuedSetStates = {}

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
   * Schedule the current state value for a hook state after paint.
   *
   * Hook state updates cannot run during another render, but we also do not want
   * to keep a separate replay queue that depends on a future React commit.
   * @param {string} stateName
   * @returns {void}
   */
  queueStateUpdate(stateName) {
    if (this.__queuedSetStates[stateName]) return

    this.__queuedSetStates[stateName] = true
    shared.enqueueRenderCallback(() => {
      delete this.__queuedSetStates[stateName]

      if (!this.__mounted) return

      const setState = this.__setStatesActual[stateName]

      if (!setState) return

      setState(this.state[stateName])
    })
  }

  /**
   * @param {string} stateName
   * @param {any} [defaultValue]
   * @returns {any}
   */
  useState(stateName, defaultValue) {
    const [stateValue, setState] = useState(defaultValue)

    this.__setStatesActual[stateName] = setState

    if (!(stateName in this.state)) {
      this.state[stateName] = stateValue
      this.setStates[stateName] = (/** @type {any} */ newValue, /** @type {{silent?: boolean} | undefined} */ args) => {
        if (referenceDifferent(this.state[stateName], newValue)) {
          this.state[stateName] = newValue

          if (!args?.silent) {
            if (shared.rendering > 0 || !this.__mounted) { // Avoid React error if using set-state while rendering or not mounted (like in a useMemo callback)
              this.queueStateUpdate(stateName)
            } else {
              setState(newValue)
            }
          }
        }
      }
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
  /** @type {UseShapeState} */
  const shape = useMemo(
    () => {
      const ShapeClass = opts?.shapeClass || UseShapeState

      return new ShapeClass()
    },
    []
  )

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
