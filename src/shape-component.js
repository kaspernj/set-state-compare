import {anythingDifferent} from "./diff-utils.js"
import {dig} from "diggerize"
import fetchingObject from "fetching-object"
import memoCompareProps from "./memo-compare-props.js"
import PropTypes from "prop-types"
import shared from "./shared.js"
import {useEffect, useMemo, useState} from "react"

/**
 * @typedef {Object} ShapeLifecycleHooks
 * @property {(prevProps: Record<string, any>, prevState: Record<string, any>) => void} [componentDidUpdate]
 * @property {() => void} [componentDidMount]
 * @property {() => void} [componentWillUnmount]
 * @property {{children: [import("react").ReactNode]}} props
 * @property {() => void} [setup]
 */

class ShapeComponent {
  /** @type {Record<string, any> | undefined} */
  static defaultProps = undefined

  /** @type {Record<string, import("prop-types").Validator>} propTypes */
  static propTypes = undefined

  /**
   * @param {Record<string, any>} props
   */
  constructor(props) {
    this.__caches = {}
    this.__mounting = true
    this.__mounted = false
    this.props = props
    this.setStates = {}
    this.state = {}
    this.__firstRenderCompleted = false
    this.tt = fetchingObject(this)
    this.p = fetchingObject(() => this.props)
    this.s = fetchingObject(this.state)
  }

  /**
   * @param {string} name
   * @param {any} value
   * @param {any[]} dependencies
   * @returns {any}
   */
  cache(name, value, dependencies) {
    const oldDependencies = this.__caches[name]?.dependencies

    if (typeof value == "function") {
      value = value()
    }

    if (!(name in this.__caches) || anythingDifferent(oldDependencies, dependencies)) {
      this.__caches[name] = {dependencies, value}
    }

    return this.__caches[name].value
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
   * @param {function() : void} callback
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
      shared.renderingCallbacks.push(callback)
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
        if (anythingDifferent(this.state[stateName], newValue)) {
          let prevState

          // @ts-expect-error
          if (this.componentDidUpdate) {
            prevState = Object.assign({}, this.state)
          }

          this.state[stateName] = newValue

          // Avoid React error if using set-state while rendering (like in a useMemo callback)
          if (!args?.silent) {
            if (shared.rendering > 0) {
              shared.renderingCallbacks.push(() => {
                setState(newValue)
              })
            } else {
              setState(newValue)
            }
          }

          // @ts-expect-error
          if (this.componentDidUpdate) {
            // @ts-expect-error
            this.componentDidUpdate(this.props, prevState)
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
 * @param {typeof ShapeComponent} ShapeClass
 * @returns {Function} React functional component that renders the ShapeClass
 */
const shapeComponent = (ShapeClass) => {
  /**
   * @param {Record<string, any>} props
   * @returns {import("react").ReactNode} React element that renders the ShapeClass
   */
  const functionalComponent = (props) => {
    // Count rendering to avoid setting state while rendering which causes a console-error from React
    shared.rendering += 1

    try {
      // Calculate and validate props
      let actualProps

      if (ShapeClass.defaultProps) {
        // Undefined values are removed from the props because they shouldn't override default values
        const propsWithoutUndefined = Object.assign({}, props)

        for (const key in propsWithoutUndefined) {
          const value = propsWithoutUndefined[key]

          if (value === undefined) {
            delete propsWithoutUndefined[key]
          }
        }

        actualProps = Object.assign({}, ShapeClass.defaultProps, propsWithoutUndefined)
      } else {
        actualProps = props
      }

      if (ShapeClass.propTypes) {
        const validateProps = {}

        for (const key in actualProps) {
          // Accessing 'key' will result in a warning in the console
          if (key == "key") continue

          validateProps[key] = actualProps[key]
        }

        PropTypes.checkPropTypes(ShapeClass.propTypes, validateProps, "prop", ShapeClass.name)
      }

      const shape = useMemo(() => new ShapeClass(actualProps), [])
      const prevProps = shape.props

      shape.props = actualProps

      if (shape.setup) {
        shape.setup()
      }

      if (shape.componentDidUpdate && shape.__firstRenderCompleted && memoCompareProps(shape.props, props)) {
        shape.componentDidUpdate(prevProps, shape.state)
      }

      useEffect(() => {
        shape.__mounting = false
        shape.__mounted = true

        if (shape.componentDidMount) {
          shape.componentDidMount()
        }

        return () => {
          shape.__mounted = false

          if (shape.componentWillUnmount) {
            shape.componentWillUnmount()
          }
        }
      }, [])

      shape.__firstRenderCompleted = true

      // Run any callbacks added by setState(states, callback) once rendering is done
      useEffect(() => {
        if (shared.rendering == 0) {
          try {
            for (const callback of shared.renderingCallbacks) {
              new Promise(() => callback())
            }
          } finally {
            shared.renderingCallbacks.length = 0
          }
        }
      })

      // Finally render the component and return it
      return shape.render()
    } finally {
      shared.rendering -= 1
    }
  }

  functionalComponent.displayName = ShapeClass.name

  Object.defineProperty(functionalComponent, "name", {value: ShapeClass.name})

  return functionalComponent
}

export {shapeComponent, ShapeComponent}
