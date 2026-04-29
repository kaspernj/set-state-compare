import {ShapeHook} from "../src/shape-hook.js"

class HookFieldStrictPropertyInitializationProbe extends ShapeHook {
  label: string = this.hookField()

  setup(): void {
    this.label = "ready"
  }

  readLabel(): string {
    return this.label
  }
}

const hookFieldStrictPropertyInitializationProbe = new HookFieldStrictPropertyInitializationProbe({})
const label: string = hookFieldStrictPropertyInitializationProbe.readLabel()

void label
