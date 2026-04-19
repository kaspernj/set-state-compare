/**
 * Preserve React's lazy-initializer semantics for function defaults while
 * still storing the resolved value directly on local state.
 * @param {any} defaultValue
 * @returns {any}
 */
export default function resolveInitialStateValue(defaultValue) {
  if (typeof defaultValue == "function") {
    return defaultValue()
  }

  return defaultValue
}
