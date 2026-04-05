import {ShapeHook, useShapeHook} from "./shape-hook.js"

/**
 * @template {Record<string, any>} [P=Record<string, any>]
 * @template {Record<string, any>} [S=Record<string, any>]
 * @augments {ShapeHook<P, S>}
 */
class ShapeComponent extends ShapeHook {}

/**
 * @template {Record<string, any>} P
 * @param {{defaultProps?: Record<string, any>, propTypes?: Record<string, import("prop-types").Validator<any>>, name: string} & (new (props: P) => ShapeComponent<P>)} ShapeClass
 * @returns {import("react").FunctionComponent<P>}
 */
const shapeComponent = (ShapeClass) => {
  /**
   * @param {P} props
   * @returns {import("react").ReactNode}
   */
  const functionalComponent = (props) => {
    const shape = useShapeHook(
      ShapeClass,
      props
    )

    // @ts-expect-error Subclasses are expected to implement render.
    return shape.render()
  }

  functionalComponent.displayName = ShapeClass.name

  Object.defineProperty(functionalComponent, "name", {value: ShapeClass.name})

  return functionalComponent
}

export {shapeComponent, ShapeComponent}
