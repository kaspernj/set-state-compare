/**
 * @param {any} value1
 * @param {any} value2
 * @param {boolean} [debug]
 * @returns {boolean}
 */
function anythingDifferent(value1, value2, debug) {
  if (Array.isArray(value1) && Array.isArray(value2)) {
    return arrayDifferent(value1, value2)
  } else if (isSimpleObject(value1) && isSimpleObject(value2)) {
    return simpleObjectDifferent(value1, value2, true)
  } else if (typeof value1 == "object" && typeof value2 == "object" && value1 && value2) {
    return !Object.is(value1, value2)
  } else if (value1 !== value2) {
    if (debug) console.log(`Value 1 ${value1} wasn't the same as value 2 ${value2}`)

    return true
  }

  return false
}

/**
 * @param {any} value1
 * @param {any} value2
 * @param {boolean} [debug]
 * @returns {boolean}
 */
function referenceDifferent(value1, value2, debug) {
  const isSame = Object.is(value1, value2)

  if (!isSame && debug) {
    console.log(`Value 1 ${value1} wasn't the same as value 2 ${value2}`)
  }

  return !isSame
}

/**
 * @param {any[]} array1
 * @param {any[]} array2
 * @param {boolean} [debug]
 * @returns {boolean}
 */
function arrayReferenceDifferent(array1, array2, debug) {
  if (array1.length !== array2.length) {
    if (debug) {
      console.log(`Array length ${array1.length} wasn't the same as ${array2.length}`)
    }

    return true
  }

  for (let index = 0; index < array1.length; index += 1) {
    if (referenceDifferent(array1[index], array2[index], debug)) {
      return true
    }
  }

  return false
}

/**
 * @param {any[]} array1
 * @param {any[]} array2
 * @returns {boolean}
 */
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

/**
 * @param {any} value
 * @returns {boolean}
 */
function isSimpleObject(value) {
  // Objects that contain $$typeof are special React objects that have recursive issues
  if (typeof value == "object" && value !== null && value.constructor.name == "Object" && !value["$$typeof"]) {
    return true
  }

  return false
}

/**
 * @param {object} object1
 * @param {object} object2
 * @param {boolean} checkLength
 * @returns {boolean}
 */
function simpleObjectDifferent(object1, object2, checkLength) {
  if (checkLength && Object.keys(object1).length !== Object.keys(object2).length) {
    return true
  }

  return simpleObjectValuesDifferent(object1, object2)
}

/**
 * @param {any} object1
 * @param {any} object2
 * @param {object} [args]
 * @param {boolean} [args.debug]
 * @param {(string) => boolean} [args.ignore]
 * @returns {boolean}
 */
function simpleObjectValuesDifferent(object1, object2, args) {
  for (const key in object1) {
    if (args?.ignore && args.ignore({key})) {
      if (args?.debug) console.log(`Ignoring key ${key}`)
      continue
    }

    if (args?.debug) console.log({key, object1: object1[key], object2: object2[key]})

    if (!(key in object2)) {
      if (args?.debug) {
        console.log(`Key ${key} wasn't found in object`)
      }

      return true
    } else if (anythingDifferent(object1[key], object2[key], args?.debug)) {
      if (args?.debug) {
        console.log(`Something was different for ${key}`)
      }

      return true
    }
  }

  return false
}

export {
  anythingDifferent,
  arrayDifferent,
  arrayReferenceDifferent,
  isSimpleObject,
  referenceDifferent,
  simpleObjectDifferent,
  simpleObjectValuesDifferent
}
