import {simpleObjectValuesDifferent} from "./diff-utils.js"

const memoCompareProps = (prevProps, nextProps) => {
  if (Object.keys(nextProps).length != Object.keys(prevProps).length) {
    return false
  }

  return !simpleObjectValuesDifferent(nextProps, prevProps)
}

export default memoCompareProps
