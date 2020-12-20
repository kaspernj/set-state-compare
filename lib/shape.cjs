const {simpleObjectDifferent} = require("./diff-utils.cjs")

class Shape {
  constructor(component, data = {}) {
    this.__component = component
    this.__stateCallbacks = []

    if (data) {
      this.set(data)
    }
  }

  set(newData, callback) {
    if (callback) {
      this.__stateCallbacks.push(callback)
    }

    if (simpleObjectDifferent(newData, this, false)) {
      for (const key in newData) {
        this[key] = newData[key]
      }

      this.__shapeRenderLater()
    }
  }

  setAsync(newData) {
    return new Promise((resolve) => {
      this.set(newData, resolve)
    })
  }

  __shapeRender() {
    this.__component.forceUpdate(() => this.__shapeCallCallbacks())
  }

  __shapeCallCallbacks() {
    for (const stateCallback of this.__stateCallbacks) {
      stateCallback()
    }

    this.__stateCallbacks = []
  }

  __shapeRenderLater() {
    if (this.__renderLaterTimeout) {
      clearTimeout(this.__renderLaterTimeout)
      delete this.__renderLaterTimeout
    }

    this.__renderLaterTimeout = setTimeout(() => this.__shapeRender(), 0)
  }
}

module.exports = Shape
