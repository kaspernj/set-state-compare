import {enqueueRenderCallback, getRendering} from "./shared.js"
import {useLayoutEffect, useRef, useState as reactUseState} from "react"

/**
 * @template T
 * @typedef {T | ((previousState: T) => T)} SetStateAction
 */

/**
 * @template T
 * @param {T} initialState
 * @returns {[T, (newValue: SetStateAction<T>) => void]}
 */
export default function useState(initialState) {
  const [state, setState] = reactUseState(initialState)
  /** @type {import("react").RefObject<boolean>} */
  const mountedRef = useRef(false)
  /** @type {import("react").RefObject<boolean>} */
  const renderingRef = useRef(true)
  /** @type {import("react").RefObject<boolean>} */
  const renderQueuedRef = useRef(false)
  /** @type {import("react").RefObject<Array<SetStateAction<T>>>} */
  const queuedUpdatesRef = useRef([])

  renderingRef.current = true

  useLayoutEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      renderQueuedRef.current = false
      queuedUpdatesRef.current = []
    }
  }, [])

  useLayoutEffect(() => {
    renderingRef.current = false
  })

  /** @returns {void} */
  const flushQueuedUpdates = () => {
    renderQueuedRef.current = false

    if (!mountedRef.current || queuedUpdatesRef.current.length === 0) {
      queuedUpdatesRef.current = []
      return
    }

    const queuedUpdates = queuedUpdatesRef.current

    queuedUpdatesRef.current = []
    setState((previousState) => {
      let nextState = previousState

      for (const queuedUpdate of queuedUpdates) {
        if (typeof queuedUpdate == "function") {
          // @ts-expect-error React's SetStateAction updater keeps the same type.
          nextState = queuedUpdate(nextState)
        } else {
          nextState = queuedUpdate
        }
      }

      return nextState
    })
  }

  /** @param {SetStateAction<T>} newValue */
  const setDeferredState = (newValue) => {
    if (renderingRef.current || getRendering() > 0) {
      queuedUpdatesRef.current.push(newValue)

      if (!renderQueuedRef.current) {
        renderQueuedRef.current = true
        enqueueRenderCallback(flushQueuedUpdates)
      }

      return
    }

    setState(newValue)
  }

  return [state, setDeferredState]
}
