const {simpleObjectDifferent} = require("./diff-utils.cjs")

class Shape {
  constructor(component, data = {}) {
    this.component = component
    this.data = data || {}
  }

  set(newData) {
    if (simpleObjectDifferent(newData, this.data)) {
      this.data = Object.assign(this.data, newData)
    }
  }

  render() {
    if (this.component.state) {
      // Render by setting a state to queue up with anything that might be using state to render
      const date = new Date()

      this.component.setState({shapeTimestamp: date.getTime()})
    } else {
      this.component.forceUpdate()
    }
  }

  renderLater() {
    if (this.renderLaterTimeout) {
      clearTimeout(this.renderLaterTimeout)
    }

    this.renderLaterTimeout = this.setTimeout(() => this.render(), 0)
  }
}

module.exports = Shape
