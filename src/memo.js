import memoCompareProps, {memoComparePropsWithDebug} from "./memo-compare-props.js"
import React from "react"

/**
 * @template {Record<string, any>} P
 * @param {import("react").FunctionComponent<P>} component
 * @returns {import("react").NamedExoticComponent<P>}
 */
const memo = (component) => React.memo(component, memoCompareProps)

/**
 * @template {Record<string, any>} P
 * @param {import("react").FunctionComponent<P>} component
 * @returns {import("react").NamedExoticComponent<P>}
 */
const memoWithDebug = (component) => React.memo(component, memoComparePropsWithDebug)

export {memoWithDebug}
export default memo
