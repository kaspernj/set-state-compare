import {useCallback, useEffect, useMemo, useState} from "react"
import fetchingObject from "fetching-object"

class Shape {
  constructor() {
    this.actualState = {}
    this.actualProps = {}
    this.actualMeta = {}
    this.meta = fetchingObject(() => this.actualMeta)
    this.props = fetchingObject(() => this.actualProps)
    this.state = fetchingObject(this.actualState)
  }

  updateMeta(newMeta) {
    this.actualMeta = newMeta
  }

  updateProps(newProps) {
    this.actualProps = newProps
  }

  useState(stateName, defaultValue) {
    const [_state, setState] = useState(defaultValue)
    const patchedSetState = useCallback((newValue) => {
      this.state[stateName] = newValue
      setState(newValue)
    }, [])

    useEffect(() => {
      this.state[stateName] = defaultValue
    }, [])

    return patchedSetState
  }
}

const useShape = ({props}) => {
  const shape = useMemo(new Shape(), [])

  shape.updateProps(props)

  return shape
}

export default useShape
