if (!globalThis.setStateCompareData) {
  globalThis.setStateCompareData = {
    rendering: 0,
    renderingCallbacks: [],
    afterPaintCallbacks: [],
    afterPaintHandle: undefined
  }
}

const shared = globalThis.setStateCompareData

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
  shared.scheduleAfterPaint = (callback) => {
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
  shared.enqueueRenderCallback = (callback) => {
    shared.renderingCallbacks.push(callback)
    shared.scheduleAfterPaint(shared.flushRenderingCallbacks)
  }
}

export default shared
