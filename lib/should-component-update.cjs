const {simpleObjectValuesDifferent} = require("./diff-utils.cjs")

function shouldComponentUpdate(component, nextProps, nextState) {
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

module.exports = shouldComponentUpdate
