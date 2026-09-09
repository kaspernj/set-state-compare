import {arrayReferenceDifferent} from "./diff-utils.js"
import {assertShapeHookLifecycleSupportsHooks} from "./shared.js"
import {useEffect, useRef} from "react"

/**
 * @param {() => (void | (() => void))} callback
 * @returns {(() => void) | undefined}
 */
function runCallback(callback) {
  const result = callback()

  return typeof result == "function" ? result : undefined
}

/**
 * Runs `callback` synchronously during render whenever `deps` change.
 *
 * Unlike `useMemo`, the callback fires exactly once per real dep change even
 * when React renders the component twice in StrictMode, because the previous
 * deps are tracked on a ref that persists across the double render pass.
 *
 * Unlike `useEffect`, the callback runs during render (not after commit), so
 * it kicks off work immediately instead of waiting for the next tick.
 *
 * If the callback returns a function, that function tears down the resource the
 * callback started. The resource lifecycle is managed in the committed phase so
 * it survives React's development StrictMode effect replay (setup -> cleanup ->
 * setup) and is never torn down by an abortable concurrent render: the render
 * phase only stages the new resource, and the committed effect is the sole place
 * that disposes the previous resource and promotes the staged one.
 * @param {() => (void | (() => void))} callback
 * @param {Array<unknown>} deps
 * @returns {void}
 */
export default function useNow(callback, deps) {
  assertShapeHookLifecycleSupportsHooks("useNow")

  /** @type {import("react").MutableRefObject<Array<unknown> | null>} */
  const prevDeps = useRef(null)
  /** @type {import("react").MutableRefObject<() => (void | (() => void))>} */
  const callbackRef = useRef(callback)
  /** @type {import("react").MutableRefObject<(() => void) | undefined>} */
  const activeCleanup = useRef(undefined)
  /** @type {import("react").MutableRefObject<(() => void) | undefined>} */
  const pendingCleanup = useRef(undefined)
  /** @type {import("react").MutableRefObject<boolean>} */
  const pendingSet = useRef(false)
  /** @type {import("react").MutableRefObject<boolean>} */
  const expectsResource = useRef(false)

  callbackRef.current = callback

  // Render phase: run the callback once per real dep change so work starts
  // immediately. When it returns a cleanup, stage that cleanup without disposing
  // the committed resource, so an abortable render cannot tear it down.
  if (prevDeps.current === null || arrayReferenceDifferent(prevDeps.current, deps)) {
    prevDeps.current = deps
    pendingCleanup.current = runCallback(callback)
    pendingSet.current = true
    expectsResource.current = pendingCleanup.current !== undefined
  }

  // Committed phase: dispose the previous committed resource, promote the staged
  // one, and recreate the resource if a StrictMode replay disposed it.
  useEffect(() => {
    if (activeCleanup.current) {
      activeCleanup.current()
      activeCleanup.current = undefined
    }

    if (pendingSet.current) {
      activeCleanup.current = pendingCleanup.current
      pendingSet.current = false
      pendingCleanup.current = undefined
    } else if (expectsResource.current && activeCleanup.current === undefined) {
      activeCleanup.current = runCallback(callbackRef.current)
    }

    return () => {
      if (activeCleanup.current) {
        activeCleanup.current()
        activeCleanup.current = undefined
      }
    }
  }, deps)
}
