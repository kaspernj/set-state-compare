import {simpleObjectValuesDifferent} from "./diff-utils.js"

/**
 * @param {Record<string, any>} prevProps
 * @param {Record<string, any>} nextProps
 * @param {boolean} [debug]
 * @returns {boolean}
 */
const memoCompareProps = (prevProps, nextProps, debug) => {
  if (debug) {
    console.log("memoCompareProps", {prevProps, nextProps})
  }

  if (Object.keys(nextProps).length != Object.keys(prevProps).length) {
    if (debug) {
      console.log(`Keys length was different - prev ${Object.keys(prevProps).length} after ${Object.keys(nextProps).length}`)
    }

    return false
  }

  if (debug) {
    console.log("Running simpleObjectValuesDifferent")
  }

  const result = simpleObjectValuesDifferent(nextProps, prevProps, {debug})

  if (debug) {
    console.log(`Was it different: ${result}`)
  }

  return !result
}

/**
 * @param {Record<string, any>} prevProps
 * @param {Record<string, any>} nextProps
 * @returns {boolean}
 */
const memoComparePropsWithDebug = (prevProps, nextProps) => memoCompareProps(prevProps, nextProps, true)

export {memoComparePropsWithDebug}
export default memoCompareProps
