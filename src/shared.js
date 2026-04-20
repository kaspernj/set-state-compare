// @ts-check
/** @type {Array<() => void>} */
let renderingCallbacks = []
/** @type {Array<() => void>} */
let afterPaintCallbacks = []
/** @type {ReturnType<typeof setTimeout> | undefined} */
let afterPaintHandle = undefined

const renderingKey = Symbol.for("set-state-compare/rendering")
/** @type {typeof globalThis & Record<symbol, unknown>} */
const sharedGlobal = globalThis

if (typeof sharedGlobal[renderingKey] !== "number") {
  sharedGlobal[renderingKey] = 0
}

/**
 * @param {unknown[]} errors
 * @returns {void}
 */
function defaultDeferredCallbackErrorReporter(errors) {
  if (errors.length === 0) {
    return
  }

  /** @type {AggregateError | (Error & {errors?: unknown[]})} */
  let callbackError

  if (typeof AggregateError == "function") {
    callbackError = new AggregateError(errors, "Scheduled callbacks failed.")
  } else {
    callbackError = new Error("Scheduled callbacks failed.")
    callbackError.errors = errors
  }

  Promise.resolve().then(() => {
    throw callbackError
  })
}

/** @type {(errors: unknown[]) => void} */
let deferredCallbackErrorReporter = defaultDeferredCallbackErrorReporter

/** @returns {number} */
export function getRendering() {
  return /** @type {number} */ (sharedGlobal[renderingKey])
}

/** @param {number} value */
export function setRendering(value) {
  sharedGlobal[renderingKey] = value
}

/** @returns {Array<() => void>} */
export function getRenderingCallbacks() {
  return renderingCallbacks
}

/** @param {Array<() => void>} value */
export function setRenderingCallbacks(value) {
  renderingCallbacks = value
}

/** @returns {Array<() => void>} */
export function getAfterPaintCallbacks() {
  return afterPaintCallbacks
}

/** @param {Array<() => void>} value */
export function setAfterPaintCallbacks(value) {
  afterPaintCallbacks = value
}

/** @returns {ReturnType<typeof setTimeout> | undefined} */
export function getAfterPaintHandle() {
  return afterPaintHandle
}

/** @param {ReturnType<typeof setTimeout> | undefined} value */
export function setAfterPaintHandle(value) {
  afterPaintHandle = value
}

/**
 * @param {(errors: unknown[]) => void} reporter
 * @returns {void}
 */
export function setDeferredCallbackErrorReporterForTests(reporter) {
  deferredCallbackErrorReporter = reporter
}

/** @returns {void} */
export function resetSharedStateForTests() {
  setRendering(0)
  setRenderingCallbacks([])
  setAfterPaintCallbacks([])
  setAfterPaintHandle(undefined)
  deferredCallbackErrorReporter = defaultDeferredCallbackErrorReporter
}

/**
 * @param {unknown[]} errors
 * @returns {void}
 */
export function reportDeferredCallbackErrors(errors) {
  deferredCallbackErrorReporter(errors)
}

/**
 * @param {Array<() => void>} callbacks
 * @returns {void}
 */
export function flushDeferredCallbacks(callbacks) {
  const errors = []

  for (const queuedCallback of callbacks) {
    try {
      queuedCallback()
    } catch (error) {
      errors.push(error)
    }
  }

  reportDeferredCallbackErrors(errors)
}

/** @returns {void} */
export function flushAfterPaintCallbacks() {
  if (afterPaintCallbacks.length === 0) {
    afterPaintHandle = undefined
    return
  }

  const callbacks = afterPaintCallbacks

  afterPaintCallbacks = []
  afterPaintHandle = undefined
  flushDeferredCallbacks(callbacks)
}

/**
 * @param {() => void} callback
 * @returns {ReturnType<typeof setTimeout> | undefined}
 */
export function scheduleAfterPaint(callback) {
  afterPaintCallbacks.push(callback)

  if (afterPaintHandle !== undefined) {
    return afterPaintHandle
  }

  // Keep the legacy API name for compatibility, but the actual requirement
  // is only "defer until the current render stack has unwound". A single
  // timer works consistently across React Native and web, including headless
  // exported web runs where requestAnimationFrame may stall indefinitely.
  afterPaintHandle = setTimeout(() => {
    flushAfterPaintCallbacks()
  }, 0)

  return afterPaintHandle
}

/** @returns {void} */
export function flushRenderingCallbacks() {
  if (renderingCallbacks.length === 0) {
    return
  }

  const callbacks = renderingCallbacks

  renderingCallbacks = []
  flushDeferredCallbacks(callbacks)
}

/**
 * @param {() => void} callback
 * @returns {void}
 */
export function enqueueRenderCallback(callback) {
  renderingCallbacks.push(callback)
  scheduleAfterPaint(flushRenderingCallbacks)
}
