const {simpleObjectDifferent} = require("./diff-utils.cjs")

class Shape {
  constructor(component, data = {}) {
    this.__component = component

    if (data) {
      this.set(data)
    }
  }

  set(newData) {
    if (simpleObjectDifferent(newData, this)) {
      for (const key in newData) {
        this[key] = newData[key]
      }

      this.__shapeRenderLater()
    }
  }

  __shapeRender() {
    if (this.__component.state) {
      // Render by setting a state to queue up with anything that might be using state to render
      const date = new Date()

      this.__component.setState({shapeTimestamp: date.getTime()})
    } else {
      this.__component.forceUpdate()
    }
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
