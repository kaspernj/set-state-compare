import {simpleObjectDifferent} from "./diff-utils.js"

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
