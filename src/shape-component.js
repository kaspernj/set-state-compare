import {anythingDifferent} from "./diff-utils.js"
import memoCompareProps from "./memo-compare-props.js"
import PropTypes from "prop-types"
import useDidMount from "use-did-mount"
import {useMemo, useState} from "react"

class ShapeComponent {
  constructor(props) {
    this.props = props
    this.setStates = {}
    this.state = {}
  }

  setInstance(variables) {
    for (const name in variables) {
      this[name] = variables[name]
    }
  }

  setState(statesList) {
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

          setState(newValue)

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

    if (shape.componentDidMount) {
      useDidMount(() => shape.componentDidMount())
    }

    shape.__firstRenderCompleted = true

    return shape.render()
  }

  functionalComponent.displayName = ShapeClass.name

  return functionalComponent
}

export {shapeComponent, ShapeComponent}
