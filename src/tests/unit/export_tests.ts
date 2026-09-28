import { DOMTestCase } from "../helpers/dom_test_case"
import * as Turbo from "../../index"

export {
  PageRenderer,
  PageSnapshot,
  PrefetchEventDetail,
  PrefetchWasteReason,
  FrameRenderer,
  FrameElement,
  StreamActions,
  StreamElement,
  StreamSourceElement,
  TurboBeforeCacheEvent,
  TurboBeforeFetchRequestEvent,
  TurboBeforeFetchResponseEvent,
  TurboBeforeFrameRenderEvent,
  TurboBeforePrefetchEvent,
  TurboBeforeRenderEvent,
  TurboBeforeStreamRenderEvent,
  TurboBeforeVisitEvent,
  TurboClickEvent,
  TurboFetchRequestErrorEvent,
  TurboFrameLoadEvent,
  TurboFrameMissingEvent,
  TurboFrameRenderEvent,
  TurboLoadEvent,
  TurboPrefetchHitEvent,
  TurboPrefetchStartEvent,
  TurboPrefetchWasteEvent,
  TurboRenderEvent,
  TurboStreamAction,
  TurboStreamActions,
  TurboSubmitEndEvent,
  TurboSubmitStartEvent,
  TurboVisitEvent,
} from "../../index"

export class ExportTests extends DOMTestCase {
  async "test Turbo interface"() {
    this.assert.equal(typeof Turbo.start, "function")
    this.assert.equal(typeof Turbo.registerAdapter, "function")
    this.assert.equal(typeof Turbo.visit, "function")
    this.assert.equal(typeof Turbo.connectStreamSource, "function")
    this.assert.equal(typeof Turbo.disconnectStreamSource, "function")
    this.assert.equal(typeof Turbo.renderStreamMessage, "function")
    this.assert.equal(typeof Turbo.clearCache, "function")
    this.assert.equal(typeof Turbo.setProgressBarDelay, "function")
    this.assert.equal(typeof Turbo.setConfirmMethod, "function")
    this.assert.equal(typeof Turbo.setFormMode, "function")
    this.assert.equal(typeof Turbo.cache, "object")
    this.assert.equal(typeof Turbo.navigator, "object")
    this.assert.equal(typeof Turbo.session, "object")
  }
}

ExportTests.registerSuite()
