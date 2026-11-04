import {assertShapeHookLifecycleSupportsHooks, enqueueRenderCallback, getRenderDepth} from "./shared.js"
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
  assertShapeHookLifecycleSupportsHooks("useState")

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

  /**
   * Queues the write while React is rendering, and applies it straight away otherwise.
   *
   * The check used to be the paint-window counter, which stays raised until the
   * after-paint callback runs. A keystroke landing in that window was queued, so the
   * value React holds for the next commit lagged behind the field and the commit wrote
   * that stale value back over what the user had typed.
   * @param {SetStateAction<T>} newValue
   * @returns {void}
   */
  const setDeferredState = (newValue) => {
    if (renderingRef.current || getRenderDepth() > 0 || !mountedRef.current) {
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
