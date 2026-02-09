import memoCompareProps from "./memo-compare-props.js"
import PropTypes from "prop-types"
import shared from "./shared.js"
import {ShapeComponent} from "./shape-component.js"
import {useEffect, useMemo} from "react"

class ShapeHook extends ShapeComponent {}

/**
 * @template {ShapeHook} T
 * @param {typeof ShapeHook & (new (props: Record<string, any>) => T)} ShapeHookClass
 * @param {Record<string, any>} props
 * @returns {T}
 */
function useShapeHook(ShapeHookClass, props) {
  // Count rendering to avoid setting state while rendering which causes a console-error from React.
  shared.rendering += 1

  try {
    // Calculate and validate props.
    let actualProps

    if (ShapeHookClass.defaultProps) {
      // Undefined values are removed from the props because they shouldn't override default values.
      const propsWithoutUndefined = Object.assign({}, props)

      for (const key in propsWithoutUndefined) {
        const value = propsWithoutUndefined[key]

        if (value === undefined) {
          delete propsWithoutUndefined[key]
        }
      }

      actualProps = Object.assign({}, ShapeHookClass.defaultProps, propsWithoutUndefined)
    } else {
      actualProps = props
    }

    if (ShapeHookClass.propTypes) {
      const validateProps = {}

      for (const key in actualProps) {
        // Accessing "key" will result in a warning in the console.
        if (key == "key") continue

        validateProps[key] = actualProps[key]
      }

      PropTypes.checkPropTypes(ShapeHookClass.propTypes, validateProps, "prop", ShapeHookClass.name)
    }

    const shape = useMemo(() => new ShapeHookClass(actualProps), [])
    const prevProps = shape.props

    shape.props = actualProps
    const propsChanged = !memoCompareProps(prevProps, actualProps)

    if (shape.setup) {
      shape.setup()
    }

    if (shape.componentDidUpdate && shape.__firstRenderCompleted && propsChanged) {
      shape.componentDidUpdate(prevProps, shape.state)
    }

    useEffect(() => {
      shape.__mounting = false
      shape.__mounted = true

      if (shape.componentDidMount) {
        shape.componentDidMount()
      }

      return () => {
        shape.__mounted = false

        if (shape.componentWillUnmount) {
          shape.componentWillUnmount()
        }
      }
    }, [])

    shape.__firstRenderCompleted = true

    return shape
  } finally {
    shared.scheduleAfterPaint(() => {
      shared.rendering = Math.max(0, shared.rendering - 1)
    })
  }
}

export {ShapeHook, useShapeHook}
export default useShapeHook
