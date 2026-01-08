import {referenceDifferent} from "./diff-utils.js"
import {useEffect, useMemo, useState} from "react"
import fetchingObject from "fetching-object"
import shared from "./shared.js"

class Shape {
  constructor() {
    this.__mounting = true
    this.__mounted = false
    this.setStates = {}
    this.__setStatesActual = {}
    this.__setStatesLater = {}

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

  __afterRender() {
    for (const stateName in this.__setStatesLater) {
      const stateValue = this.__setStatesLater[stateName]
      const setState = this.__setStatesActual[stateName]

      setState(stateValue)
      delete this.__setStatesLater[stateName]
    }
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
   * @param {string} stateName
   * @param {any} defaultValue
   * @returns {void}
   */
  useState(stateName, defaultValue) {
    const [stateValue, setState] = useState(defaultValue)

    this.__setStatesActual[stateName] = setState

    if (!(stateName in this.state)) {
      this.state[stateName] = stateValue
      this.setStates[stateName] = (newValue, args) => {
        if (referenceDifferent(this.state[stateName], newValue)) {
          this.state[stateName] = newValue

          if (!args?.silent) {
            if (shared.rendering > 0 || !this.__mounted) { // Avoid React error if using set-state while rendering or not mounted (like in a useMemo callback)
              this.__setStatesLater[stateName] = newValue
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
 * @param {typeof Shape} ShapeClass
 * @returns {import("react").ReactElement | null}
 */
const shapeComponent = (ShapeClass) => {
  return (props) => {
    const shape = useMemo(() => new ShapeClass(), [])

    shape.updateProps(props)

    if (shape.setup) {
      shape.setup()
    }

    return shape.render()
  }
}

/**
 * @param {Record<string, any>} props
 * @param {object} [opts]
 * @param {typeof Shape} [opts.shapeClass]
 * @returns {Shape}
 */
function useShape(props, opts) {
  /** @type {Shape} */
  const shape = useMemo(
    () => {
      const ShapeClass = opts?.shapeClass || Shape

      return new ShapeClass()
    },
    []
  )

  useEffect(() => {
    shape.__mounting = false
    shape.__mounted = true
    shape.__afterRender()

    return () => {
      shape.__mounted = false
    }
  }, [])

  shape.updateProps(props)

  return shape
}

export {shapeComponent, Shape}
export default useShape
