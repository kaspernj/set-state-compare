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
    if (settings.mode == "setState") {
      const renderCount = this.__renderCount++

      this.__component.setState(
        {__renderCount: renderCount, __shapeDate: new Date()},
        () => this.__shapeCallCallbacks()
      )
    } else {
      this.__component.forceUpdate(() => this.__shapeCallCallbacks())
    }
  }

  __shapeCallCallbacks() {
    const stateCallbacks = this.__stateCallbacks

    this.__stateCallbacks = []

    for (const stateCallback of stateCallbacks) {
      stateCallback()
    }
  }

  __shapeRenderLater() {
    if (settings.renderLaterTimeout) {
      clearTimeout(settings.renderLaterTimeout)
    }

    this.__shapeAddOrReplaceRender()
    settings.renderLaterTimeout = setTimeout(() => callRenders(), 0)
  }

  __shapeAddOrReplaceRender() {
    const renderPosition = settings.renderComponents.indexOf(this)

    if (renderPosition > -1) {
      settings.renderComponents.splice(renderPosition, 1)
    }

    settings.renderComponents.push(this)
  }
}

module.exports = Shape
