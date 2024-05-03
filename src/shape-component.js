import {anythingDifferent} from "./diff-utils.js"
import memoCompareProps from "./memo-compare-props.js"

class ShapeComponent {
  constructor(props) {
    this.props = props
    this.setStates = {}
    this.state = {}
  }

  setState(statesList) {
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
    const shape = useMemo(() => new ShapeClass(props), [])
    const prevProps = shape.props

    shape.props = props

    if (shape.setup) {
      shape.setup()
    }

    if (shape.componentDidMount && !shape.__componentDidMountCalled) {
      shape.componentDidMount()
      shape.__componentDidMountCalled = true
    } else if (shape.componentDidUpdate && memoCompareProps(shape.props, props)) {
      shape.componentDidUpdate(prevProps, shape.state)
    }

    return shape.render()
  }

  if (ShapeClass.defaultProps) {
    functionalComponent.defaultProps = ShapeClass.defaultProps
  }

  if (ShapeClass.propTypes) {
    functionalComponent.propTypes = ShapeClass.propTypes
  }

  return functionalComponent
}

export {shapeComponent, ShapeComponent}
