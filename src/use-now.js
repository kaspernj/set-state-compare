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
 * If the callback returns a function, that function is called before the next
 * dep-change invocation and once more on unmount. This mirrors the cleanup
 * semantics of `useEffect` while keeping the render-phase timing.
 * @param {() => (void | (() => void))} callback
 * @param {Array<unknown>} deps
 * @returns {void}
 */
export default function useNow(callback, deps) {
  assertShapeHookLifecycleSupportsHooks("useNow")

  /** @type {import("react").MutableRefObject<Array<unknown> | null>} */
  const prev = useRef(null)
  /** @type {import("react").MutableRefObject<(() => void) | undefined>} */
  const cleanup = useRef(undefined)

  if (prev.current === null || arrayReferenceDifferent(prev.current, deps)) {
    if (cleanup.current) {
      cleanup.current()
    }

    prev.current = deps
    cleanup.current = runCallback(callback)
  }

  useEffect(() => {
    return () => {
      if (cleanup.current) {
        cleanup.current()
        cleanup.current = undefined
      }
    }
  }, [])
}
