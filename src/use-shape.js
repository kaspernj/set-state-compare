import {anythingDifferent} from "./diff-utils.js"
import {useMemo, useState} from "react"
import fetchingObject from "fetching-object"

class Shape {
  constructor() {
    this.setStates = {}
    this.state = {}
    this.props = {}
    this.meta = {}
    this.m = fetchingObject(() => this.meta)
    this.p = fetchingObject(() => this.props)
    this.s = fetchingObject(this.state)
  }

  set(statesList) {
    for (const stateName in statesList) {
      const newValue = statesList[stateName]

      if (!(stateName in this.setStates)) {
        throw new Error(`No such state: ${stateName}`)
      }

      this.setStates[stateName](newValue)
    }
  }

  updateMeta(newMeta) {
    Object.assign(this.meta, newMeta)
  }

  updateProps(newProps) {
    this.props = newProps
  }

  useState(stateName, defaultValue) {
    const [stateValue, setState] = useState(defaultValue)

    if (!(stateName in this.state)) {
      this.state[stateName] = stateValue
      this.setStates[stateName] = (newValue) => {
        if (anythingDifferent(this.state[stateName], newValue)) {
          this.state[stateName] = newValue
          setState(newValue)
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

const useShape = (props, opts) => {
  const ShapeClass = opts?.shapeClass || Shape
  const shape = useMemo(() => new ShapeClass(), [])

  shape.updateProps(props)

  return shape
}

export {Shape}
export default useShape
