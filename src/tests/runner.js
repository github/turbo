const { TestServer } = require("../../dist/tests/server")
const { execSync } = require("child_process")
const configuration = require("../../intern.json")
const intern = require("intern").default
const arg = require("arg");

// In codespaces, we can automatically detect the Chrome Driver version, on local machines we know less about the setup so we cannot.
const CHROMEVER = process.env["CHROMEVER"] || (process.env["CODESPACES"] ? execSync("chromedriver --version | cut -d' ' -f2").toString().trim() : undefined)

const args = arg({
  "--grep": String,
  "--environment": String
});

intern.configure(configuration)
intern.configure({ reporters: [ "runner" ] })

if (CHROMEVER) {
  intern.configure({
    tunnelOptions: {
      drivers: [{ name: "chrome", version: CHROMEVER }]
    }
  })
}

if (args["--grep"]) {
  intern.configure({ grep: args["--grep"] })
}

if (args["--environment"]) {
  const envName = args["--environment"]
  const newEnvs = configuration.environments.filter(env => env.browserName === envName)
  intern.configure({ environments : newEnvs })
}

const firstArg = args["_"][0]
if (firstArg == "serveOnly") {
  intern.configure({ serveOnly: true })
}

intern.on("serverStart", server => {
  server._app.use(/\/__turbo/, TestServer)

  const { stack } = server._app._router
  const staticLayerIndex = stack.findIndex(layer => layer.name == "serveStatic")
  const testLayer = stack.pop()
  stack.splice(staticLayerIndex - 1, 0, testLayer)
})

intern.run().catch(error => {
  console.error(error.toString())
  process.exit(1)
})
