const {simpleObjectDifferent} = require("./diff-utils.cjs")

class Shape {
  constructor(component, data = {}) {
    this.__component = component
    this.__shapeRenderCount = 0
    this.__stateCallbacks = []

    if (data) {
      this.set(data)
    }
  }

  set(newData, callback) {
    if (simpleObjectDifferent(newData, this, false)) {
      for (const key in newData) {
        this[key] = newData[key]
      }

      if (callback) {
        this.__stateCallbacks.push(callback)
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
    if (this.__component.state) {
      // Render by setting a state to queue up with anything that might be using state to render
      this.__component.setState({__shapeRenderCount: ++this.__shapeRenderCount}, () => this.__shapeCallCallbacks())
    } else {
      this.__component.forceUpdate(() => this.__shapeCallCallbacks())
    }
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
