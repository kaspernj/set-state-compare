import React from "react"
import shouldComponentUpdate from "./should-component-update.js"

export default class PureComponent extends React.Component {
  /**
   * @param {Record<string, any>} nextProps
   * @param {Record<string, any>} nextState
   * @returns {boolean}
   */
  shouldComponentUpdate(nextProps, nextState) {
    return shouldComponentUpdate(this, nextProps, nextState)
  }
}
