import "./polyfills"
import "./elements"
import "./script_warning"

import * as Turbo from "./core"

window.Turbo = Turbo
Turbo.start()

export * from "./core"
export * from "./elements"
export * from "./http"
export * from "./trusted_types"
