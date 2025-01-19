if (!globalThis.setStateCompareData) {
  globalThis.setStateCompareData = {
    rendering: 0,
    renderingCallbacks: []
  }
}

const shared = globalThis.setStateCompareData

export default shared
