const {anythingDifferent, arrayDifferent, isSimpleObject, simpleObjectDifferent, simpleObjectValuesDifferent} = require("./lib/diff-utils.cjs")

module.exports = {
  anythingDifferent,
  arrayDifferent,
  isSimpleObject,
  shouldComponentUpdate: require("./lib/should-component-update.cjs"),
  simpleObjectDifferent,
  simpleObjectValuesDifferent,
  Shape: require("./lib/shape.cjs"),
  setState: require("./lib/set-state.cjs")
}
