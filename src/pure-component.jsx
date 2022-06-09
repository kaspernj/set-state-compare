import React from "react"
import shouldComponentUpdate from "./should-component-update.js"

export default class PureComponent extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    return shouldComponentUpdate(this, nextProps, nextState)
  }
}
