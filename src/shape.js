import {simpleObjectValuesDifferent} from "./diff-utils.js"
import shared from "./shared.js"

/** @type {{mode: string, renderComponents: Shape[], renderLaterTimeout: number}} */
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

export default class Shape {
  /**
   * @param {string} newMode
   */
  static setMode(newMode) {
    if (!validModes.includes(newMode)) {
      throw new Error(`Invalid mode: ${newMode}`)
    }

    settings.mode = newMode
  }

  /**
   * @param {any} component
   * @param {Record<string, any>} [data]
   */
  constructor(component, data = {}) {
    this.__component = component
    this.__stateCallbacks = []
    this.__renderCount = 0
    this.__prevShape = {}

    if (settings.mode == "setState" && component.state === undefined) {
      component.state = {}
    }

    if (data) {
      this.__setDataOnThis(data, true)
    }
  }

  /**
   * @param {Record<string, any>} newData
   * @param {function(): void | undefined} callback
   * @returns {void}
   */
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

  /**
   * @private
   * @param {Record<string, any>} newData
   * @param {boolean} [skipDidUpdate]
   * @returns {void}
   */
  __setDataOnThis(newData, skipDidUpdate) {
    let prevShape

    if (this.__component.shapeUpdated && !skipDidUpdate) {
      prevShape = Object.assign({}, this)
    }

    for (const key in newData) {
      this[key] = newData[key]
    }

    if (this.__component.shapeUpdated && !skipDidUpdate) {
      this.__component.shapeUpdated(prevShape)
    }
  }

  /**
   * @param {Record<string, any>} newData
   * @returns {Promise<void>}
   */
  setAsync(newData) {
    return new Promise((resolve, reject) => {
      try {
        this.set(newData, resolve)
      } catch(error) {
        reject(error)
      }
    })
  }

  __shapeRender() {
    if (settings.mode == "setState") {
      this.__component.setState(
        {__renderCount: this.__renderCount++},
        this.__shapeAfterRender
      )
    } else {
      this.__component.forceUpdate(this.__shapeAfterRender)
    }
  }

  __shapeAfterRender = () => {
    this.renderPending = false
    this.__shapeCallCallbacks()
  }

  __shapeCallCallbacks() {
    for (const stateCallback of this.__stateCallbacks) {
      stateCallback()
    }

    if (this.__component.shapeDidUpdate) this.__component.shapeDidUpdate(this.__prevShape)

    this.__prevShape = Object.assign({}, this)
    this.__stateCallbacks = []
  }

  __shapeRenderLater() {
    const renderPosition = settings.renderComponents.indexOf(this)

    if (renderPosition > -1) {
      settings.renderComponents.splice(renderPosition, 1)
    }

    settings.renderComponents.push(this)

    if (!settings.renderLaterTimeout) {
      settings.renderLaterTimeout = shared.scheduleAfterPaint(() => {
        settings.renderLaterTimeout = undefined
        callRenders()
      })
    }

    this.renderPending = true
  }
}
