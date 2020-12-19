const {anythingDifferent, arrayDifferent, isSimpleObject, simpleObjectDifferent} = require("./lib/diff-utils.cjs")

module.exports = {
  anythingDifferent,
  arrayDifferent,
  isSimpleObject,
  simpleObjectDifferent,
  Shape: require("./lib/shape.cjs"),
  setState: require("./lib/set-state.cjs")
}
