function anythingDifferent(value1, value2) {
  if (Array.isArray(value1) && Array.isArray(value2)) {
    return arrayDifferent(value1, value2)
  } else if (isSimpleObject(value1) && isSimpleObject(value2)) {
    return simpleObjectDifferent(value1, value2, true)
  } else if (typeof value1 == "object" && typeof value2 == "object" && value1 && value2) {
    return !Object.is(value1, value2)
  } else if (value1 !== value2) {
    return true
  }

  return false
}

function arrayDifferent(array1, array2) {
  if (array1.length != array2.length) {
    return true
  }

  for (const key in array1) {
    if (anythingDifferent(array1[key], array2[key])) {
      return true
    }
  }

  return false
}

function isSimpleObject(value) {
  if (typeof value == "object" && value !== null && value.constructor.name == "Object") {
    return true
  }

  return false
}

function simpleObjectDifferent(object1, object2, checkLength) {
  if (checkLength && Object.keys(object1).length !== Object.keys(object2).length) {
    return true
  }

  for (const key in object1) {
    if (anythingDifferent(object1[key], object2[key])) {
      return true
    }
  }

  return false
}

function setState(component, state, callback) {
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

module.exports = {
  anythingDifferent,
  arrayDifferent,
  isSimpleObject,
  simpleObjectDifferent,
  setState
}
