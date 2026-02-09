import {ShapeHook, useShapeHook} from "./shape-hook.js"

class ShapeComponent extends ShapeHook {}

/**
 * @param {typeof ShapeComponent} ShapeClass
 * @returns {function(Record<string, any>): import("react").ReactNode} React functional component that renders the ShapeClass
 */
const shapeComponent = (ShapeClass) => {
  /**
   * @param {Record<string, any>} props
   * @returns {import("react").ReactNode} React element that renders the ShapeClass
   */
  const functionalComponent = (props) => {
    const shape = useShapeHook(
      /** @type {typeof ShapeHook & (new (props: Record<string, any>) => ShapeComponent)} */ (ShapeClass),
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
