const {simpleObjectValuesDifferent} = require("./diff-utils.cjs")
const settings = {
  mode: "queuedForceUpdate",
  renderCallbacks: [],
  renderLaterTimeout: undefined
}
const validModes = ["queuedForceUpdate", "setState"]

const callRenders = () => {
  const renderCallbacks = settings.renderCallbacks

  settings.renderCallbacks = []

  for (const renderCallback of renderCallbacks) {
    renderCallback()
  }
}

class Shape {
  static setMode(newMode) {
    if (!validModes.includes(newMode)) {
      throw new Error(`Invalid mode: ${newMode}`)
    }

    settings.mode = newMode
  }

  constructor(component, data = {}) {
    this.__component = component
    this.__stateCallbacks = []

    if (data) {
      this.__setDataOnThis(data)
    }
  }

  set(newData, callback) {
    if (callback) {
      this.__stateCallbacks.push(callback)
    }

    if (simpleObjectValuesDifferent(newData, this)) {
      this.__setDataOnThis(newData)
      this.__shapeRenderLater()
    }
  }

  __setDataOnThis(newData) {
    for (const key in newData) {
      this[key] = newData[key]
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
    const stateCallbacks = this.__stateCallbacks

    this.__stateCallbacks = []

    for (const stateCallback of stateCallbacks) {
      stateCallback()
    }
  }

  __shapeRenderLater() {
    if (settings.mode == "setState") {
      this.__component.setState(
        {__shapeDate: new Date()},
        () => this.__shapeCallCallbacks()
      )
    } else {
      if (settings.renderLaterTimeout) {
        clearTimeout(settings.renderLaterTimeout)
      }

      settings.renderCallbacks.push(() => this.__shapeRender())
      settings.renderLaterTimeout = setTimeout(callRenders, 0)
    }
  }
}

module.exports = Shape
