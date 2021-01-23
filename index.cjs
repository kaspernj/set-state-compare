const {anythingDifferent, arrayDifferent, isSimpleObject, simpleObjectDifferent, simpleObjectValuesDifferent} = require("./lib/diff-utils.cjs")

module.exports = {
  anythingDifferent,
  arrayDifferent,
  isSimpleObject,
  simpleObjectDifferent,
  simpleObjectValuesDifferent,
  Shape: require("./lib/shape.cjs"),
  setState: require("./lib/set-state.cjs")
}
