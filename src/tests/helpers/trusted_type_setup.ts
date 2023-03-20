import "../helpers/trusted_type_setup"
import { test } from "@playwright/test"

test.beforeEach(async ({ page }, workerInfo) => {
  if (workerInfo.project.name === "chrome-with-trusted-types") {
    await page.goto("/src/tests/fixtures/form.html")
    await page.evaluate(() =>
      window.Turbo.setCSPTrustedTypesPolicy({
        createHTML: (s) => s,
        createScript: (s) => s,
        createScriptURL: (s) => s,
      })
    )
  }
})

test.afterEach(async ({ page }) => {
  await page.evaluate(() => window.Turbo.setCSPTrustedTypesPolicy(null))
})
