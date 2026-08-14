import {
  defaultPrefetchDelay,
  defaultPrefetchTtl,
  prefetchCache,
  PrefetchWasteReason,
} from "../core/drive/prefetch_cache"
import { expandURL } from "../core/url"
import {
  FetchMethod,
  FetchRequest,
  FetchRequestDelegate,
  FetchRequestHeaders,
  TurboBeforeFetchRequestEvent,
} from "../http/fetch_request"
import { FetchResponse } from "../http/fetch_response"
import { dispatch, getMetaContent, uuid } from "../util"

export interface LinkPrefetchObserverDelegate {
  canPrefetchRequestToLocation(link: Element, location: URL): boolean
}

export interface PrefetchEventDetail {
  delay: number
  frame: string | null
  id: string
  url: string
}

export type TurboBeforePrefetchEvent = CustomEvent
export type TurboPrefetchStartEvent = CustomEvent<PrefetchEventDetail>
export type TurboPrefetchHitEvent = CustomEvent<PrefetchEventDetail & { duration: number }>
export type TurboPrefetchWasteEvent = CustomEvent<
  PrefetchEventDetail & { duration: number; reason: PrefetchWasteReason }
>

export class LinkPrefetchObserver implements FetchRequestDelegate {
  readonly delegate: LinkPrefetchObserverDelegate
  readonly eventTarget: Document
  started = false
  private prefetchedLink?: Element

  constructor(delegate: LinkPrefetchObserverDelegate, eventTarget: Document) {
    this.delegate = delegate
    this.eventTarget = eventTarget
  }

  start() {
    if (this.started) return

    if (this.eventTarget.readyState === "loading") {
      this.eventTarget.addEventListener("DOMContentLoaded", this.enable, { once: true })
    } else {
      this.enable()
    }
  }

  stop() {
    this.eventTarget.removeEventListener("DOMContentLoaded", this.enable)
    this.eventTarget.defaultView?.removeEventListener("pagehide", this.pageWillUnload)

    if (this.started) {
      this.eventTarget.removeEventListener("mouseenter", this.tryToPrefetchRequest, true)
      this.eventTarget.removeEventListener("mouseleave", this.cancelRequestIfObsolete, true)
      this.eventTarget.removeEventListener("turbo:before-fetch-request", this.tryToUsePrefetchedRequest, true)
      this.started = false
    }

    this.prefetchedLink = undefined
    prefetchCache.clear("session_stopped")
  }

  prepareHeadersForRequest(headers: FetchRequestHeaders, request: FetchRequest) {
    headers["VND.PREFETCH"] = "true"

    const frame = request.target ? frameTargetForLink(request.target) : null
    if (frame) headers["Turbo-Frame"] = frame
  }

  requestStarted(_request: FetchRequest) {}

  requestPreventedHandlingResponse(_request: FetchRequest, _response: FetchResponse) {}

  requestSucceededWithResponse(_request: FetchRequest, _response: FetchResponse) {}

  requestFailedWithResponse(_request: FetchRequest, _response: FetchResponse) {}

  requestErrored(_request: FetchRequest, _error: Error) {}

  requestFinished(_request: FetchRequest) {}

  private enable = () => {
    if (this.started) return

    this.eventTarget.addEventListener("mouseenter", this.tryToPrefetchRequest, {
      capture: true,
      passive: true,
    })
    this.eventTarget.addEventListener("mouseleave", this.cancelRequestIfObsolete, {
      capture: true,
      passive: true,
    })
    this.eventTarget.addEventListener("turbo:before-fetch-request", this.tryToUsePrefetchedRequest, true)
    this.eventTarget.defaultView?.addEventListener("pagehide", this.pageWillUnload)
    this.started = true
  }

  private pageWillUnload = () => {
    this.prefetchedLink = undefined
    prefetchCache.clear("page_unload")
  }

  private tryToPrefetchRequest = (event: MouseEvent) => {
    if (getMetaContent("turbo-prefetch") === "false") return

    const link = event.target
    if (!(link instanceof Element) || !link.matches("a[href]:not([target^=_]):not([download])")) return
    if (!linkIsPrefetchable(link)) return

    const location = locationForLink(link)
    if (!this.delegate.canPrefetchRequestToLocation(link, location)) return

    this.prefetchedLink = link

    const delay = prefetchDelayForLink(link)
    const frame = frameTargetForLink(link)
    const id = uuid()
    const detail = { delay, frame, id, url: location.href }
    let startedAt = 0
    const fetchRequest = new FetchRequest(this, FetchMethod.get, location, new URLSearchParams(), link)

    prefetchCache.putLater(location, frame, fetchRequest, delay, prefetchTtl(), {
      started: () => {
        startedAt = Date.now()
        dispatch<TurboPrefetchStartEvent>("turbo:prefetch-start", { target: link, detail })
      },
      hit: () => {
        dispatch<TurboPrefetchHitEvent>("turbo:prefetch-hit", {
          target: link,
          detail: { ...detail, duration: Date.now() - startedAt },
        })
      },
      wasted: (reason) => {
        dispatch<TurboPrefetchWasteEvent>("turbo:prefetch-waste", {
          target: link,
          detail: { ...detail, duration: Date.now() - startedAt, reason },
        })
      },
    })
  }

  private cancelRequestIfObsolete = (event: MouseEvent) => {
    if (event.target === this.prefetchedLink) {
      this.prefetchedLink = undefined
      prefetchCache.clear("mouseleave")
    }
  }

  private tryToUsePrefetchedRequest = (event: Event) => {
    const fetchEvent = event as TurboBeforeFetchRequestEvent
    const { fetchOptions, url } = fetchEvent.detail

    if (fetchEvent.target instanceof HTMLFormElement || fetchOptions.method !== "GET") return
    if (headerValue(fetchOptions.headers, "VND.PREFETCH") === "true") return

    const frame = headerValue(fetchOptions.headers, "Turbo-Frame")
    const request = prefetchCache.take(url, frame)
    if (request) {
      fetchEvent.detail.fetchRequest = request
    } else {
      prefetchCache.clear("navigation")
    }

    this.prefetchedLink = undefined
  }
}

function linkIsPrefetchable(link: Element) {
  const href = link.getAttribute("href")
  if (!href || !link.hasAttribute("data-turbo-prefetch")) return false
  if (link.getAttribute("data-turbo-prefetch") === "false") return false

  const location = locationForLink(link)
  if (location.origin !== document.location.origin) return false
  if (!["http:", "https:"].includes(location.protocol)) return false
  if (link.hasAttribute("target")) return false
  if (location.pathname + location.search === document.location.pathname + document.location.search) return false
  if (href.trim().startsWith("#")) return false
  if (linkIsUnsafe(link)) return false

  const event = dispatch<TurboBeforePrefetchEvent>("turbo:before-prefetch", { target: link, cancelable: true })
  return !event.defaultPrevented
}

function linkIsUnsafe(link: Element) {
  const turboMethod = link.getAttribute("data-turbo-method")
  if (turboMethod && turboMethod.toLowerCase() !== "get") return true

  return (
    link.hasAttribute("data-remote") ||
    link.hasAttribute("data-behavior") ||
    link.hasAttribute("data-confirm") ||
    link.hasAttribute("data-method") ||
    link.hasAttribute("data-turbo-confirm") ||
    link.hasAttribute("data-turbo-stream")
  )
}

function locationForLink(link: Element) {
  return expandURL(link.getAttribute("href") || "")
}

function frameTargetForLink(link: Element): string | null {
  const frame = link.closest("turbo-frame")
  const target = link.getAttribute("data-turbo-frame") || frame?.getAttribute("target") || frame?.id

  return target && target !== "_top" ? target : null
}

function prefetchDelayForLink(link: Element) {
  return nonNegativeNumber(link.getAttribute("data-turbo-prefetch-delay")) ?? defaultPrefetchDelay
}

function prefetchTtl() {
  return positiveNumber(getMetaContent("turbo-prefetch-cache-time")) ?? defaultPrefetchTtl
}

function nonNegativeNumber(value: string | null) {
  if (value === null || value.trim() === "") return

  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : undefined
}

function positiveNumber(value: string | null) {
  const number = nonNegativeNumber(value)
  return number !== undefined && number > 0 ? number : undefined
}

function headerValue(headers: HeadersInit | undefined, name: string) {
  return headers ? new Headers(headers).get(name) : null
}
