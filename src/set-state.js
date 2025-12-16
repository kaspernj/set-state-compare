import {simpleObjectDifferent} from "./diff-utils.js"

/**
 * @param {any} component
 * @param {Record<string, any> | function(Record<string, any>): Record<string, any>} state
 * @returns {Promise<void>} Resolves when the state is set or skipped.
 */
export default function setState(component, state, callback) {
  return new Promise((resolve) => {
    let finish

    // Support being a drop-in replacement by passing an extra callback option but dont spawn an extra function unless given
    if (callback) {
      finish = function() {
        resolve()
        callback()
      }
    } else {
      finish = resolve
    }

    if (typeof state == "function") {
      // We can't skip this type of setState
      component.setState(
        (prevState) => {
          const newState = state(prevState)

          if (simpleObjectDifferent(newState, prevState, false)) {
            return newState
          }

          return null
        },
        finish
      )
    } else {
      if (simpleObjectDifferent(state, component.state, false)) {
        component.setState(state, finish)
      } else {
        finish()
      }
    }
  })
}
