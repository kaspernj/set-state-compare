// @ts-check
import {ShapeHook} from "../src/shape-hook.js"

/** @augments {ShapeHook<Record<string, never>, Record<string, never>>} */
class HookFieldTypeProbe extends ShapeHook {
  /** @type {string} */
  label = this.hookField()

  /** @type {number} */
  count = this.hookField()

  /**
   * @returns {void}
   */
  setup() {
    this.label = "ready"
    this.count = 1
  }

  /**
   * @returns {string}
   */
  readLabel() {
    return this.label
  }

  /**
   * @returns {number}
   */
  readCount() {
    return this.count
  }
}

const hookFieldTypeProbe = new HookFieldTypeProbe({})

hookFieldTypeProbe.setup()

/** @type {string} */
const label = hookFieldTypeProbe.readLabel()
/** @type {number} */
const count = hookFieldTypeProbe.readCount()

void label
void count
