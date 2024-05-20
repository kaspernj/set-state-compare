import {anythingDifferent} from "./diff-utils.js"
import memoCompareProps from "./memo-compare-props.js"
import PropTypes from "prop-types"
import shared from "./shared.js"
import {useEffect, useMemo, useState} from "react"

class ShapeComponent {
  constructor(props) {
    this.props = props
    this.setStates = {}
    this.state = {}
    this.__firstRenderCompleted = false
    this.__renderCallbacks = []
  }

  setInstance(variables) {
    for (const name in variables) {
      this[name] = variables[name]
    }
  }

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
      this.__renderCallbacks.push(callback)
    }
  }

  useState(stateName, defaultValue) {
    const [stateValue, setState] = useState(defaultValue)

    if (!(stateName in this.state)) {
      this.state[stateName] = stateValue
      this.setStates[stateName] = (newValue) => {
        if (anythingDifferent(this.state[stateName], newValue)) {
          let prevState

          if (this.componentDidUpdate) {
            prevState = Object.assign({}, this.state)
          }

          this.state[stateName] = newValue

          // Avoid React error if using set-state while rendering (like in a useMemo callback)
          if (shared.rendering > 0) {
            setTimeout(() => setState(newValue), 0)
          } else {
            setState(newValue)
          }

          if (this.componentDidUpdate) {
            this.componentDidUpdate(this.props, prevState)
          }
        }
      }
    }

    return this.setStates[stateName]
  }

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

const shapeComponent = (ShapeClass) => {
  const functionalComponent = (props) => {
    try {
      shared.rendering += 1

      let actualProps

      if (ShapeClass.defaultProps) {
        actualProps = Object.assign({}, ShapeClass.defaultProps, props)
      } else {
        actualProps = props
      }

      if (ShapeClass.propTypes) {
        PropTypes.checkPropTypes(ShapeClass.propTypes, actualProps, "prop", ShapeClass.name)
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

      if (shape.componentDidMount || shape.componentWillUnmount) {
        useEffect(() => {
          if (shape.componentDidMount) {
            shape.componentDidMount()
          }

          return () => {
            if (shape.componentWillUnmount) {
              shape.componentWillUnmount()
            }
          }
        }, [])
      }

      shape.__firstRenderCompleted = true

      // Run any callbacks added by setState(states, callback) once rendering is done
      useEffect(() => {
        if (shape.__renderCallbacks) {
          try {
            for (const callback of shape.__renderCallbacks) {
              new Promise(() => callback())
            }
          } finally {
            shape.__renderCallbacks.length = 0
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

  return functionalComponent
}

export {shapeComponent, ShapeComponent}
