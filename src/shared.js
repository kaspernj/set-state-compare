if (!window.setStateCompareData) {
  window.setStateCompareData = {
    rendering: 0,
    renderingCallbacks: []
  }
}

const shared = window.setStateCompareData

export default shared
