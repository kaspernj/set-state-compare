import {arrayReferenceDifferent} from "./diff-utils.js"
import {useRef} from "react"

/**
 * Runs `callback` synchronously during render whenever `deps` change.
 *
 * Unlike `useMemo`, the callback fires exactly once per real dep change even
 * when React renders the component twice in StrictMode, because the previous
 * deps are tracked on a ref that persists across the double render pass.
 *
 * Unlike `useEffect`, the callback runs during render (not after commit), so
 * it kicks off work immediately instead of waiting for the next tick.
 * @param {() => void} callback
 * @param {Array<unknown>} deps
 * @returns {void}
 */
export default function useNow(callback, deps) {
  /** @type {import("react").MutableRefObject<Array<unknown> | null>} */
  const prev = useRef(null)

  if (prev.current === null || arrayReferenceDifferent(prev.current, deps)) {
    prev.current = deps
    callback()
  }
}
