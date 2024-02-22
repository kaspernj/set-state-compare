import {simpleObjectValuesDifferent} from "./diff-utils.js"

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

const memoComparePropsWithDebug = (prevProps, nextProps) => memoCompareProps(prevProps, nextProps, true)

export {memoComparePropsWithDebug}
export default memoCompareProps
