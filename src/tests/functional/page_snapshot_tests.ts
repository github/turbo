import { test } from "@playwright/test"
import { assert } from "chai"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/form.html")
  await page.evaluate(() =>
    window.Turbo.setCSPTrustedTypesPolicy({
      createHTML: (s: string, response: Response) => {
        console.log("---------- ", s)
        response.headers.append("X-TRUSTED", "true")

        return s.replace("Text", "Trusted")
      },
      createScript: (s) => s,
      createScriptURL: (s) => s,
    })
  )
})

test.afterEach(async ({ page }) => {
  await page.evaluate(() => window.Turbo.setCSPTrustedTypesPolicy(null))
})

const mockHTML = `
<html>
  <head></head>
  <body><div>Text</div></body>
</html>`

test("test fromResponse applies CSP Policies", async ({ page }) => {
  const [text, header] = await page.evaluate((html) => {
    const response = new Response(html)
    const snapshot = window.Turbo.PageSnapshot.fromResponse(response, html)
    return [snapshot.element.innerText, response.headers.get("X-TRUSTED")]
  }, mockHTML)

  assert.include(text, "Trusted")
  assert.equal(header, "true")
})

test("test fromResponse without CSP policy doesn't change the response", async ({ page }) => {
  await page.evaluate(() => window.Turbo.setCSPTrustedTypesPolicy(null))

  const [text, header] = await page.evaluate((html) => {
    const response = new Response(html)
    const snapshot = window.Turbo.PageSnapshot.fromResponse(response, html)
    return [snapshot.element.innerText, response.headers.get("X-TRUSTED")]
  }, mockHTML)

  assert.include(text, "Text")
  assert.equal(header, undefined)
})
