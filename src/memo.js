import {simpleObjectValuesDifferent} from "./diff-utils.js"

const memo = (prevProps, nextProps) => {
  if (Object.keys(nextProps).length != Object.keys(prevProps).length) {
    return true
  }

  return simpleObjectValuesDifferent(nextProps, prevProps)
}

export default memo
