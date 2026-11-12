/**
 * jsdom 26 lacks PointerEvent, which @testing-library/dom needs for pointer events.
 * Provide a MouseEvent-backed polyfill in the jsdom environment only.
 */
if (typeof window !== "undefined" && typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends window.MouseEvent {
    readonly pointerId: number
    readonly pointerType: string
    readonly isPrimary: boolean
    readonly width: number
    readonly height: number
    readonly pressure: number
    readonly tangentialPressure: number
    readonly tiltX: number
    readonly tiltY: number
    readonly twist: number

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
      this.pointerType = init.pointerType ?? "mouse"
      this.isPrimary = init.isPrimary ?? true
      this.width = init.width ?? 1
      this.height = init.height ?? 1
      this.pressure = init.pressure ?? 0
      this.tangentialPressure = init.tangentialPressure ?? 0
      this.tiltX = init.tiltX ?? 0
      this.tiltY = init.tiltY ?? 0
      this.twist = init.twist ?? 0
    }
  }

  Object.defineProperty(window, "PointerEvent", {
    value: PointerEventPolyfill,
    writable: true,
    configurable: true,
  })
}
