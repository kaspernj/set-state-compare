import {simpleObjectValuesDifferent} from "./diff-utils.js"

/**
 * @param {any} component
 * @param {Record<string, any>} nextProps
 * @param {Record<string, any>} [nextState]
 * @returns {boolean} Whether the component should update or not. True means it should update. False means it should not update.
 */
export default function shouldComponentUpdate(component, nextProps, nextState) {
  if (Object.keys(nextProps).length != Object.keys(component.props).length) {
    return true
  }

  if (component.state && Object.keys(nextState).length != Object.keys(component.state).length) {
    return true
  }

  if (simpleObjectValuesDifferent(nextProps, component.props)) {
    return true
  }

  if (nextState && !component.state) {
    return true
  }

  return simpleObjectValuesDifferent(nextState, component.state)
}
