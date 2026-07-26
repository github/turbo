import { unindent, getMetaContent } from "../../util"

export class ProgressBar {
  static animationDuration = 300 /*ms*/

  static get defaultCSS() {
    return unindent`
      .turbo-progress-bar {
        position: fixed;
        display: block;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background: #0076ff;
        z-index: 2147483647;
        transform-origin: 0 0;
        transform: scaleX(0) translateZ(0);
        transition:
          transform ${ProgressBar.animationDuration}ms ease-out,
          opacity ${ProgressBar.animationDuration / 2}ms ${ProgressBar.animationDuration / 2}ms ease-in;
        will-change: transform, opacity;
      }
    `
  }

  readonly stylesheetElement: HTMLStyleElement
  readonly progressElement: HTMLDivElement

  hiding = false
  trickleInterval?: number
  value = 0
  visible = false

  constructor() {
    this.stylesheetElement = this.createStylesheetElement()
    this.progressElement = this.createProgressElement()
    this.installStylesheetElement()
    this.setValue(0)
  }

  show() {
    if (!this.visible) {
      this.visible = true
      this.installProgressElement()
      this.startTrickling()
    }
  }

  hide() {
    if (this.visible && !this.hiding) {
      this.hiding = true
      this.fadeProgressElement(() => {
        this.uninstallProgressElement()
        this.stopTrickling()
        this.visible = false
        this.hiding = false
      })
    }
  }

  setValue(value: number) {
    this.value = value
    this.refresh()
  }

  // Private

  installStylesheetElement() {
    document.head.insertBefore(this.stylesheetElement, document.head.firstChild)
  }

  installProgressElement() {
    this.progressElement.style.transform = "scaleX(0) translateZ(0)"
    this.progressElement.style.opacity = "1"
    document.documentElement.insertBefore(this.progressElement, document.body)
    this.refresh()
  }

  fadeProgressElement(callback: () => void) {
    this.progressElement.style.opacity = "0"
    setTimeout(callback, ProgressBar.animationDuration * 1.5)
  }

  uninstallProgressElement() {
    if (this.progressElement.parentNode) {
      document.documentElement.removeChild(this.progressElement)
    }
  }

  startTrickling() {
    if (!this.trickleInterval) {
      this.trickleInterval = window.setInterval(this.trickle, ProgressBar.animationDuration)
    }
  }

  stopTrickling() {
    window.clearInterval(this.trickleInterval)
    delete this.trickleInterval
  }

  trickle = () => {
    this.setValue(this.value + Math.random() / 100)
  }

  refresh() {
    requestAnimationFrame(() => {
      const scale = (10 + this.value * 90) / 100
      this.progressElement.style.transform = `scaleX(${scale}) translateZ(0)`
    })
  }

  createStylesheetElement() {
    const element = document.createElement("style")
    element.type = "text/css"
    element.textContent = ProgressBar.defaultCSS
    if (this.cspNonce) {
      element.nonce = this.cspNonce
    }
    return element
  }

  createProgressElement() {
    const element = document.createElement("div")
    element.className = "turbo-progress-bar"
    return element
  }

  get cspNonce() {
    return getMetaContent("csp-nonce")
  }
}
