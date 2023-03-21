import * as Turbo from "../../index"
import { DOMTestCase } from "../helpers/dom_test_case"
import { activateScriptElement } from "../../util"

export class UtilTests extends DOMTestCase {
  async setup() {
    Turbo.setCSPTrustedTypesPolicy({
      createHTML: (_) => "bar",
      createScript: (_) => "bar",
      createScriptURL: (_) => "https://bar/",
    })
  }

  async teardown() {
    Turbo.setCSPTrustedTypesPolicy(null)
  }

  async "test TrustedTypes activates a script with source code"() {
    const element = document.createElement("script")
    element.textContent = "foo"

    const activatedElement = activateScriptElement(element)
    this.assert.equal(activatedElement.textContent, "bar")
  }

  async "test TyrustedTypes activates a script with source url"() {
    const element = document.createElement("script")
    element.src = "https://foo/"

    const activatedElement = activateScriptElement(element)
    this.assert.equal(activatedElement.src, "https://bar/")
  }

  async "test activates a script with source code"() {
    Turbo.setCSPTrustedTypesPolicy(null)
    const element = document.createElement("script")
    element.textContent = "foo"

    const activatedElement = activateScriptElement(element)
    this.assert.equal(activatedElement.textContent, "foo")
  }

  async "test activates a script with source url"() {
    Turbo.setCSPTrustedTypesPolicy(null)
    const element = document.createElement("script")
    element.src = "https://foo/"

    const activatedElement = activateScriptElement(element)
    this.assert.equal(activatedElement.src, "https://foo/")
  }
}

UtilTests.registerSuite()
