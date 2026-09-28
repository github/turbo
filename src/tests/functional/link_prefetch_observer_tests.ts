import "../helpers/trusted_type_setup"
import { Page, Request, test } from "@playwright/test"
import { assert } from "chai"
import { nextEventOnTarget, readEventLogs, sleep } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/hover_to_prefetch.html")
  await readEventLogs(page)
})

test("prefetches only links that opt in directly", async ({ page }) => {
  const requests = collectPrefetchRequests(page)

  await page.hover("#unmarked-link")
  await sleep(150)
  await page.hover("#parent-only-link")
  await sleep(150)
  await page.hover("#disabled-link")
  await sleep(150)
  await page.hover("#unsafe-link")
  await sleep(150)

  assert.lengthOf(requests, 0)

  const requestPromise = waitForRequest(page, "waste")
  await page.hover("#waste-link")
  await requestPromise

  assert.lengthOf(requests, 1)
})

test("uses the default delay and accepts a per-link delay", async ({ page }) => {
  const requests = collectPrefetchRequests(page)

  await page.hover("#custom-delay-link")
  await sleep(150)
  assert.lengthOf(requests, 0)

  await waitForRequest(page, "custom-delay")
  assert.lengthOf(requests, 1)

  const detail = await nextEventOnTarget(page, "custom-delay-link", "turbo:prefetch-start")
  assert.equal(detail.delay, 250)

  await page.mouse.move(0, 0)
  const defaultRequest = waitForRequest(page, "waste")
  await page.hover("#waste-link")
  await defaultRequest

  const defaultDetail = await nextEventOnTarget(page, "waste-link", "turbo:prefetch-start")
  assert.equal(defaultDetail.delay, 100)
})

test("cancels a delayed prefetch when hover ends", async ({ page }) => {
  const requests = collectPrefetchRequests(page)

  await page.hover("#cancel-delay-link")
  await sleep(50)
  await page.mouse.move(0, 0)
  await sleep(300)

  assert.lengthOf(requests, 0)
  assert.isTrue(await noLifecycleEvents(page))
})

test("sends the resolved Turbo-Frame header and omits it for _top", async ({ page }) => {
  const explicitRequest = waitForRequest(page, "explicit-frame")
  await page.hover("#explicit-frame-link")
  assert.equal((await explicitRequest).headers()["turbo-frame"], "part")

  await page.mouse.move(0, 0)

  const topRequest = waitForRequest(page, "top")
  await page.hover("#top-link")
  assert.notProperty((await topRequest).headers(), "turbo-frame")
})

test("reuses a frame prefetch and reports hit and waste rates", async ({ page }) => {
  const requests = collectPrefetchRequests(page)
  await installMetricCounters(page)

  const wastedRequest = waitForRequest(page, "waste")
  await page.hover("#waste-link")
  await wastedRequest
  const wasteStart = await nextEventOnTarget(page, "waste-link", "turbo:prefetch-start")

  await page.mouse.move(0, 0)
  const waste = await nextEventOnTarget(page, "waste-link", "turbo:prefetch-waste")
  assert.equal(waste.id, wasteStart.id)
  assert.equal(waste.reason, "mouseleave")
  assert.isAtLeast(waste.duration, 0)

  const hitRequest = waitForRequest(page, "hit")
  await page.hover("#hit-link")
  await hitRequest
  const hitStart = await nextEventOnTarget(page, "hit-link", "turbo:prefetch-start")

  await page.click("#hit-link")
  const hit = await nextEventOnTarget(page, "hit-link", "turbo:prefetch-hit")
  await nextEventOnTarget(page, "part", "turbo:frame-load")

  assert.equal(hit.id, hitStart.id)
  assert.equal(hit.frame, "part")
  assert.isAtLeast(hit.duration, 0)
  assert.lengthOf(requests, 2, "click reuses the prefetched response")

  const metrics = await metricCounters(page)
  assert.equal(metrics.starts, 2)
  assert.equal(metrics.hits, 1)
  assert.equal(metrics.wastes, 1)
  assert.equal(metrics.hitRate, 0.5)
  assert.equal(metrics.wasteRate, 0.5)
})

test("reports an unused prefetch as waste when it expires", async ({ page }) => {
  await page.evaluate(() => {
    const meta = document.createElement("meta")
    meta.name = "turbo-prefetch-cache-time"
    meta.content = "50"
    document.head.appendChild(meta)
  })

  const request = waitForRequest(page, "expiry")
  await page.hover("#expiry-link")
  await request

  const waste = await nextEventOnTarget(page, "expiry-link", "turbo:prefetch-waste")
  assert.equal(waste.reason, "expired")
})

function collectPrefetchRequests(page: Page) {
  const requests: Request[] = []
  page.on("request", (request) => {
    if (request.headers()["vnd.prefetch"] === "true") requests.push(request)
  })
  return requests
}

function waitForRequest(page: Page, search: string) {
  return page.waitForRequest((request) => {
    const url = new URL(request.url())
    return url.search === `?${search}` && request.headers()["vnd.prefetch"] === "true"
  })
}

async function noLifecycleEvents(page: Page) {
  const records = await readEventLogs(page)
  return records.every(([name]) => !name.startsWith("turbo:prefetch-"))
}

function installMetricCounters(page: Page) {
  return page.evaluate(() => {
    const metrics = ((window as any).prefetchMetrics = { starts: 0, hits: 0, wastes: 0 })
    addEventListener("turbo:prefetch-start", () => metrics.starts++)
    addEventListener("turbo:prefetch-hit", () => metrics.hits++)
    addEventListener("turbo:prefetch-waste", () => metrics.wastes++)
  })
}

function metricCounters(page: Page) {
  return page.evaluate(() => {
    const metrics = (window as any).prefetchMetrics
    return {
      ...metrics,
      hitRate: metrics.hits / metrics.starts,
      wasteRate: metrics.wastes / metrics.starts,
    }
  })
}
