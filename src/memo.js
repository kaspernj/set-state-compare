import memoCompareProps from "./memo-compare-props.js"
import React from "react"

const memo = (component) => React.memo(component, memoCompareProps)

export default memo
