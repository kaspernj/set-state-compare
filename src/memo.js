import memoCompareProps, {memoComparePropsWithDebug} from "./memo-compare-props.js"
import React from "react"

const memo = (component) => React.memo(component, memoCompareProps)
const memoWithDebug = (component) => React.memo(component, memoComparePropsWithDebug)

export {memoWithDebug}
export default memo
