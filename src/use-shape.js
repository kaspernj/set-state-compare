import {anythingDifferent} from "./diff-utils.js"
import {useCallback, useMemo, useState} from "react"
import fetchingObject from "fetching-object"

class Shape {
  constructor() {
    this.state = {}
    this.props = {}
    this.meta = {}
    this.m = fetchingObject(() => this.meta)
    this.p = fetchingObject(() => this.props)
    this.s = fetchingObject(this.state)
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
    }

    return patchedSetState
  }
}

const useShape = (props) => {
  const shape = useMemo(() => new Shape(), [])

  shape.updateProps(props)

  return shape
}

export default useShape
