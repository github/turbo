import { FetchRequest } from "../../http/fetch_request"

export const defaultPrefetchDelay = 100
export const defaultPrefetchTtl = 10 * 1000

export type PrefetchWasteReason =
  | "expired"
  | "form_submission"
  | "mouseleave"
  | "navigation"
  | "page_unload"
  | "replaced"
  | "request_error"
  | "session_stopped"

export interface PrefetchLifecycle {
  started(): void
  hit(): void
  wasted(reason: PrefetchWasteReason): void
}

interface PrefetchEntry {
  expiresAt: number
  frame: string | null
  lifecycle: PrefetchLifecycle
  request: FetchRequest
  url: string
}

export class PrefetchCache {
  private entry?: PrefetchEntry
  private expirationTimeout?: number
  private pendingTimeout?: number

  putLater(
    url: URL,
    frame: string | null,
    request: FetchRequest,
    delay: number,
    ttl: number,
    lifecycle: PrefetchLifecycle
  ) {
    this.clear("replaced")

    this.pendingTimeout = window.setTimeout(() => {
      delete this.pendingTimeout

      const requestPromise = request.perform()
      this.entry = { expiresAt: Date.now() + ttl, frame, lifecycle, request, url: url.href }
      this.expirationTimeout = window.setTimeout(() => this.clearRequest(request, "expired"), ttl)
      lifecycle.started()

      requestPromise.catch(() => this.clearRequest(request, "request_error"))
    }, delay)
  }

  take(url: URL, frame: string | null): FetchRequest | undefined {
    if (this.entry && this.entry.expiresAt <= Date.now()) {
      this.clear("expired")
    }

    if (this.entry?.url === url.href && this.entry.frame === frame) {
      const { lifecycle, request } = this.entry
      this.discardEntry()
      lifecycle.hit()
      return request
    }
  }

  clear(reason: PrefetchWasteReason) {
    if (this.pendingTimeout !== undefined) {
      window.clearTimeout(this.pendingTimeout)
      delete this.pendingTimeout
    }

    if (this.entry) {
      const { lifecycle } = this.entry
      this.discardEntry()
      lifecycle.wasted(reason)
    }
  }

  private clearRequest(request: FetchRequest, reason: PrefetchWasteReason) {
    if (this.entry?.request === request) {
      this.clear(reason)
    }
  }

  private discardEntry() {
    if (this.expirationTimeout !== undefined) {
      window.clearTimeout(this.expirationTimeout)
      delete this.expirationTimeout
    }

    delete this.entry
  }
}

export const prefetchCache = new PrefetchCache()
