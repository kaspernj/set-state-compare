const _globalThis = /** @type {Record<string, any>} */ (globalThis)

if (!_globalThis.setStateCompareData) {
  _globalThis.setStateCompareData = {
    rendering: 0,
    renderingCallbacks: [],
    afterPaintCallbacks: [],
    afterPaintHandle: undefined
  }
}

const shared = _globalThis.setStateCompareData

if (!shared.afterPaintCallbacks) {
  shared.afterPaintCallbacks = []
}

if (!("afterPaintHandle" in shared)) {
  shared.afterPaintHandle = undefined
}

if (!shared.renderingCallbacks) {
  shared.renderingCallbacks = []
}

if (!shared.scheduleAfterPaint) {
  shared.scheduleAfterPaint = (/** @type {() => void} */ callback) => {
    shared.afterPaintCallbacks.push(callback)

    if (shared.afterPaintHandle !== undefined) {
      return shared.afterPaintHandle
    }

    const schedule =
      globalThis.requestAnimationFrame || ((next) => setTimeout(next, 0))

    shared.afterPaintHandle = schedule(() => {
      const callbacks = shared.afterPaintCallbacks

      shared.afterPaintHandle = undefined
      shared.afterPaintCallbacks = []

      for (const queuedCallback of callbacks) {
        queuedCallback()
      }
    })

    return shared.afterPaintHandle
  }
}

if (!shared.flushRenderingCallbacks) {
  shared.flushRenderingCallbacks = () => {
    if (shared.renderingCallbacks.length === 0) {
      return
    }

    const callbacks = shared.renderingCallbacks

    shared.renderingCallbacks = []

    for (const queuedCallback of callbacks) {
      queuedCallback()
    }
  }
}

if (!shared.enqueueRenderCallback) {
  shared.enqueueRenderCallback = (/** @type {() => void} */ callback) => {
    shared.renderingCallbacks.push(callback)
    shared.scheduleAfterPaint(shared.flushRenderingCallbacks)
  }
}

export default shared
