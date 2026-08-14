import { Position } from "../core/types"

export interface ScrollObserverDelegate {
  scrollPositionChanged(position: Position): void
}

export class ScrollObserver {
  readonly delegate: ScrollObserverDelegate
  started = false
  scrollScheduled = false

  constructor(delegate: ScrollObserverDelegate) {
    this.delegate = delegate
  }

  start() {
    if (!this.started) {
      addEventListener("scroll", this.onScroll, false)
      this.onScroll()
      this.started = true
    }
  }

  stop() {
    if (this.started) {
      removeEventListener("scroll", this.onScroll, false)
      this.started = false
    }
  }

  onScroll = () => {
    if (this.scrollScheduled) return

    this.scrollScheduled = true
    requestAnimationFrame(() => {
      this.scrollScheduled = false
      this.updatePosition({ x: window.pageXOffset, y: window.pageYOffset })
    })
  }

  // Private

  updatePosition(position: Position) {
    this.delegate.scrollPositionChanged(position)
  }
}
