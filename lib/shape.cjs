const {simpleObjectValuesDifferent} = require("./diff-utils.cjs")
const settings = {
  mode: "queuedForceUpdate",
  renderComponents: [],
  renderLaterTimeout: undefined
}
const validModes = ["queuedForceUpdate", "setState"]

const callRenders = () => {
  const renderComponents = settings.renderComponents

  settings.renderComponents = []

  for (const renderComponent of renderComponents) {
    renderComponent.__shapeRender()
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
    this.__renderCount = 0

    if (settings.mode == "setState" && component.state === undefined) {
      component.state = {}
    }

    if (data) {
      this.__setDataOnThis(data)
    }
  }

  set(newData, callback) {
    if (simpleObjectValuesDifferent(newData, this)) {
      if (callback) {
        this.__stateCallbacks.push(callback)
      }

      this.__setDataOnThis(newData)
      this.__shapeRenderLater()
    } else if (callback) {
      if (this.renderPending) {
        // There is nothing to render because of the given new data, but a render is pending, so we need to put this in queue to call callbacks in correct order
        this.__stateCallbacks.push(callback)
      } else {
        // Nothing to render and not pending a render - so call callback instantly
        callback()
      }
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
    if (settings.mode == "setState") {
      this.__component.setState(
        {__renderCount: this.__renderCount++},
        () => this.__shapeAfterRender()
      )
    } else {
      this.__component.forceUpdate(() => this.__shapeAfterRender())
    }
  }

  __shapeAfterRender() {
    this.renderPending = false
    this.__shapeCallCallbacks()
  }

  __shapeCallCallbacks() {
    for (const stateCallback of this.__stateCallbacks) {
      stateCallback()
    }

    this.__stateCallbacks = []
  }

  __shapeRenderLater() {
    if (settings.renderLaterTimeout) {
      clearTimeout(settings.renderLaterTimeout)
    }

    const renderPosition = settings.renderComponents.indexOf(this)

    if (renderPosition > -1) {
      settings.renderComponents.splice(renderPosition, 1)
    }

    settings.renderComponents.push(this)
    settings.renderLaterTimeout = setTimeout(() => callRenders(), 0)
    this.renderPending = true
  }
}

module.exports = Shape
