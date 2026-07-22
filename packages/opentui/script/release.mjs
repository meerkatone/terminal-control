import { readFile, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const manifestUrl = new URL("../package.json", import.meta.url)
const originalManifest = await readFile(manifestUrl, "utf8")
const manifest = JSON.parse(originalManifest)
const terminalControl = JSON.parse(
  await readFile(new URL("../../test/package.json", import.meta.url), "utf8"),
)
const check = process.argv.includes("--check")

const aligned = manifest.version !== terminalControl.version
if (aligned) {
  console.log(`aligning ${manifest.name} from ${manifest.version} to ${terminalControl.version}`)
  manifest.version = terminalControl.version
  await writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`)
}

if (check) {
  try {
    run("npm", ["publish", "--dry-run", "--access", "public"])
    console.log(`validated ${manifest.name}@${manifest.version} release`)
  } finally {
    if (aligned) await writeFile(manifestUrl, originalManifest)
  }
} else if (isPublished(manifest.name, manifest.version)) {
  console.log(`skipping already published ${manifest.name}@${manifest.version}`)
} else {
  run("npm", ["publish", "--access", "public", "--provenance"])
}

function isPublished(name, version) {
  const result = spawnSync("npm", ["view", `${name}@${version}`, "version", "--json"], {
    encoding: "utf8",
  })
  if (result.status !== 0) return false
  const published = JSON.parse(result.stdout)
  const versions = Array.isArray(published) ? published : [published]
  if (!versions.includes(version)) {
    throw new Error(`npm returned unexpected version for ${name}@${version}: ${published}`)
  }
  return true
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: fileURLToPath(new URL("..", import.meta.url)), stdio: "inherit" })
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`)
}
