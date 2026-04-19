# set-state-compare

Lightweight helpers for React state updates, shape-style state containers, and value comparison utilities.

## Install

```bash
npm install set-state-compare
```

## Exports

```js
import {
  anythingDifferent,
  arrayDifferent,
  arrayReferenceDifferent,
  isSimpleObject,
  referenceDifferent,
  simpleObjectDifferent,
  simpleObjectValuesDifferent,
  Shape,
  setState,
  useNow
} from "set-state-compare"
```

## State Helpers

### setState
Drop-in helper that only applies state updates when values actually change.

```js
import setState from "set-state-compare"

await setState(this, {count: 1})
```

### Shape
Class-based state container with batched rendering support.

```js
import {Shape} from "set-state-compare"

const shape = new Shape(component)
shape.set({count: 1}, () => {
  // called after render
})
```

Modes:
- `Shape.setMode("queuedForceUpdate")` uses `forceUpdate` with an after-paint queue.
- `Shape.setMode("setState")` uses `setState` on the component.

## ShapeComponent
Class-style component wrapper with hook-like lifecycle helpers.
`setup()` runs before each render, so it is suitable for derived values and render-time side work. Declare component state on the class-field `state` object.

```js
import {ShapeComponent, shapeComponent} from "set-state-compare/build/shape-component.js"

class Counter extends ShapeComponent {
  state = {count: 0}

  render() {
    return React.createElement("div", null, String(this.state.count))
  }
}

export default shapeComponent(Counter)
```

### Typed Props and State

`ShapeComponent` and `ShapeHook` support generic type parameters for props (`P`) and state (`S`) via JSDoc `@augments`. This gives you type-checked `this.props`, `this.p`, `this.state`, `this.s`, and `this.setState` calls.

#### Typed props

```js
/**
 * @typedef {object} CounterProps
 * @property {string} name
 * @property {number} initialCount
 */

/** @augments {ShapeComponent<CounterProps>} */
class Counter extends ShapeComponent {
  /** @param {CounterProps} props */
  constructor(props) {
    super(props)
    this.state = {count: props.initialCount}
  }

  render() {
    // this.props.name -> string
    // this.p.initialCount -> number
    return React.createElement("div", null, `${this.props.name}: ${this.state.count}`)
  }
}

export default memo(shapeComponent(Counter))
// <Counter name="hello" initialCount={5} />  -> type-checked
```

#### Typed state

```js
/**
 * @typedef {object} TimerState
 * @property {number} elapsed
 * @property {boolean} running
 */

/** @augments {ShapeComponent<{}, TimerState>} */
class Timer extends ShapeComponent {
  state = /** @type {TimerState} */ ({elapsed: 0, running: false})

  render() {
    // this.state.elapsed -> number
    // this.s.running -> boolean
    // this.setState({elapsed: 10}) -> type-checked
    return React.createElement("div", null, String(this.state.elapsed))
  }
}
```

#### Class field state

State is defined as a class field. The keys are auto-registered for `setState` and writable `this.s` access.

```js
/** @augments {ShapeComponent<{name: string}, {label: string, active: boolean}>} */
class MyComponent extends ShapeComponent {
  state = /** @type {{label: string, active: boolean}} */ ({label: "default", active: false})

  render() {
    // this.state.label -> string
    // this.s.active -> boolean
    // this.setState({label: "updated"}) -> type-checked
    return React.createElement("div", null, this.state.label)
  }
}
```

#### Assigning through `this.s`

`this.s` is writable. Assigning to a top-level state key is equivalent to `this.setState({...})` and triggers the same re-render:

```js
class Counter extends ShapeComponent {
  state = {count: 0}

  increment = () => {
    this.s.count += 1          // same as this.setState({count: this.s.count + 1})
    console.log(this.s.count)  // already reflects the new value
  }
}
```

Only registered top-level keys are writable — assigning to an undeclared key throws. Nested mutation (`this.s.user.name = "…"`) writes to the underlying object but does not schedule a re-render; use `this.setState` for deep updates. `this.p` stays read-only.

#### Typed `this.tt`

`this.tt` is a proxy of the instance that throws on unknown property reads. Typed as `this`, so JSX handlers like `onPress={this.tt.onFooPress}` are checked against the subclass's actual method signatures — typos fail typecheck, not just at runtime.

```js
class Counter extends ShapeComponent {
  state = /** @type {{count: number}} */ ({count: 0})

  render() {
    return React.createElement("button", {onPress: this.tt.onIncrementPress}, String(this.s.count))
  }

  onIncrementPress = () => {
    this.s.count += 1
  }
}
```

#### Typed ShapeHook

The same pattern works with `ShapeHook` and `useShapeHook`:

```js
/**
 * @typedef {object} FormHookProps
 * @property {string} formId
 */

/** @augments {ShapeHook<FormHookProps, {submitted: boolean}>} */
class FormHook extends ShapeHook {
  state = {submitted: false}
}

function FormHost(props) {
  const hook = useShapeHook(FormHook, props)
  // hook.props.formId -> string
  // hook.state.submitted -> boolean
}
```

### cache
Instance-level cache with dependency comparison.

```js
const style = this.cache("style", () => ({padding: 8}), [theme, size])
```

### cacheStatic
Class-level cache shared across instances.

```js
const config = this.cacheStatic("config", () => ({padding: 8}), [theme, size])
```

## useShape
Hook-style shape for function components.

```js
import useShape from "set-state-compare/build/use-shape.js"

function Example(props) {
  const shape = useShape(props)
  shape.useState("count", 0)
  return React.createElement("div", null, String(shape.state.count))
}
```

## useShapeHook
Class-based hooks with `ShapeComponent`-style lifecycle methods like `setup`, `componentDidMount`, and `componentWillUnmount`. Declare hook state on the class-field `state` object.

```js
import useShapeHook, {ShapeHook} from "set-state-compare/build/shape-hook.js"

class MyShapeHookClass extends ShapeHook {
  state = {count: 0}
}

function Example(props) {
  const shapeHook = useShapeHook(MyShapeHookClass, props)
  return React.createElement("div", null, String(shapeHook.state.count))
}
```

## useNow

Runs a callback synchronously during render whenever its deps change. Fills the gap between `useMemo` (which fires twice under React 18 StrictMode when misused as an effect) and `useEffect` (which runs after commit, too late if you want work started immediately).

```js
import {useNow} from "set-state-compare"

function Example({userId}) {
  useNow(() => {
    startLoadingUser(userId)
  }, [userId])

  // ...
}
```

Semantics:
- Runs during render, not after commit.
- Fires exactly once per real dep change, even under StrictMode's double render pass (previous deps are tracked on a `useRef` that persists across the pass).
- Dep comparison uses `arrayReferenceDifferent` — same per-element reference equality React uses for hook deps.
- No cleanup phase. If the callback starts async work, cancel it inside the callback (e.g. with a request-id guard).
- A full mount → unmount → remount cycle still re-fires, because the ref is fresh on the new mount. This matches `useMemo`.

## Comparison Utilities

- `anythingDifferent` deep-compares arrays and simple objects.
- `referenceDifferent` uses reference comparison for objects/arrays and `Object.is` for primitives.
- `arrayReferenceDifferent` compares array lengths and each element with `referenceDifferent`.
- `simpleObjectDifferent` and `simpleObjectValuesDifferent` compare plain objects.
- `arrayDifferent` compares arrays by value.
- `isSimpleObject` checks for plain objects (ignores React internal objects).

## Tests

```bash
npm test
npm run typecheck
```
