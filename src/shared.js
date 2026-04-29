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
/** @typedef {"constructor" | "setup" | "refresh"} ShapeHookLifecycleName */
/**
 * @typedef {object} ShapeHookLifecycleFrame
 * @property {ShapeHookLifecycleName} name
 * @property {string} className
 */
/** @type {ShapeHookLifecycleFrame | undefined} */
let currentShapeHookLifecycle = undefined
const shapeHookLifecycleErrorKey = Symbol.for("set-state-compare/shape-hook-lifecycle-error")

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

/** @returns {boolean} */
function isProductionRuntime() {
  const runtimeGlobal = /** @type {typeof globalThis & {__DEV__?: boolean, process?: {env?: {NODE_ENV?: string}}}} */ (globalThis)

  return runtimeGlobal.process?.env?.NODE_ENV === "production" || runtimeGlobal.__DEV__ === false
}

/**
 * @param {string} hookName
 * @param {ShapeHookLifecycleFrame} lifecycle
 * @returns {Error}
 */
function buildShapeHookLifecycleHookError(hookName, lifecycle) {
  /** @type {Error} */
  let error

  if (lifecycle.name == "constructor") {
    error = new Error(`${hookName} cannot be called from ${lifecycle.className}'s constructor. ShapeHook constructors run inside React.useMemo, so hooks there violate React's rules of hooks. Move the hook call to setup(), which runs unconditionally on every render before render(). For hook-derived fields, declare the field with this.hookField() and assign it in setup().`)
  } else {
    error = new Error(`${hookName} cannot be called from ${lifecycle.className}.refresh(). ShapeHook.refresh() skips the first render, so hooks there change the hook count between the first and later renders. Move the hook call to setup(), which runs unconditionally on every render before render().`)
  }

  /** @type {Error & Record<symbol, boolean>} */ (error)[shapeHookLifecycleErrorKey] = true

  return error
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isShapeHookLifecycleHookError(error) {
  return Boolean(
    error &&
    typeof error == "object" &&
    shapeHookLifecycleErrorKey in error
  )
}

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
function errorMessageFor(value) {
  if (value instanceof Error) return value.message
  if (typeof value == "string") return value

  return undefined
}

/**
 * @param {string} message
 * @returns {boolean}
 */
function isReactHookLifecycleMessage(message) {
  return (
    /Do not call Hooks inside/.test(message) ||
    /Invalid hook call/.test(message) ||
    /React has detected a change in the order of Hooks called/.test(message) ||
    /Rendered more hooks than during the previous render/.test(message) ||
    /Rendered fewer hooks than expected/.test(message) ||
    /Should have a queue\. You are likely calling Hooks conditionally/.test(message)
  )
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isReactHookLifecycleError(error) {
  const message = errorMessageFor(error)

  return Boolean(message && isReactHookLifecycleMessage(message))
}

/**
 * @param {ShapeHookLifecycleFrame} lifecycle
 * @returns {(() => void) | undefined}
 */
function installShapeHookLifecycleConsoleGuard(lifecycle) {
  if (isProductionRuntime()) return undefined
  if (lifecycle.name == "setup") return undefined

  const previousConsoleError = console.error

  console.error = (...args) => {
    const hasReactHookWarning = args.some((arg) => {
      const message = errorMessageFor(arg)

      return Boolean(message && isReactHookLifecycleMessage(message))
    })

    if (hasReactHookWarning) {
      throw buildShapeHookLifecycleHookError("React hooks", lifecycle)
    }

    previousConsoleError.apply(console, args)
  }

  return () => {
    console.error = previousConsoleError
  }
}

/**
 * @template T
 * @param {ShapeHookLifecycleFrame} lifecycle
 * @param {() => T} callback
 * @returns {T}
 */
export function withShapeHookLifecycle(lifecycle, callback) {
  const previousLifecycle = currentShapeHookLifecycle
  const restoreConsoleGuard = installShapeHookLifecycleConsoleGuard(lifecycle)

  currentShapeHookLifecycle = lifecycle

  try {
    return callback()
  } catch (error) {
    if (
      !isProductionRuntime() &&
      lifecycle.name != "setup" &&
      !isShapeHookLifecycleHookError(error) &&
      isReactHookLifecycleError(error)
    ) {
      throw buildShapeHookLifecycleHookError("React hooks", lifecycle)
    }

    throw error
  } finally {
    restoreConsoleGuard?.()
    currentShapeHookLifecycle = previousLifecycle
  }
}

/**
 * @param {string} hookName
 * @returns {void}
 */
export function assertShapeHookLifecycleSupportsHooks(hookName) {
  if (isProductionRuntime()) return
  if (!currentShapeHookLifecycle) return
  if (currentShapeHookLifecycle.name == "setup") return

  throw buildShapeHookLifecycleHookError(hookName, currentShapeHookLifecycle)
}

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
  currentShapeHookLifecycle = undefined
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
