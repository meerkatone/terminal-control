import { readFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"))
const check = process.argv.includes("--check")

if (check) {
  run("npm", ["publish", "--dry-run", "--access", "public"])
  console.log(`validated ${manifest.name}@${manifest.version} release`)
  process.exit(0)
}

if (isPublished(manifest.name, manifest.version)) {
  console.log(`skipping already published ${manifest.name}@${manifest.version}`)
  process.exit(0)
}

run("npm", ["publish", "--access", "public", "--provenance"])

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
  if (result.status !== 0) process.exit(result.status ?? 1)
}
