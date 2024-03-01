import {anythingDifferent} from "./diff-utils.js"
import {useCallback, useMemo, useState} from "react"
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
    const [_state, setState] = useState(defaultValue)
    const patchedSetState = useCallback((newValue) => {
      if (anythingDifferent(this.state[stateName], newValue)) {
        this.state[stateName] = newValue
        setState(newValue)
      }
    }, [])

    if (!(stateName in this.state)) {
      this.state[stateName] = defaultValue
      this.setStates[stateName] = patchedSetState
    }

    return patchedSetState
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

const useShape = (props) => {
  const shape = useMemo(() => new Shape(), [])

  shape.updateProps(props)

  return shape
}

export default useShape
