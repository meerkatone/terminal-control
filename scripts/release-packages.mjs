import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

const repository = resolve(import.meta.dirname, "..")

run(process.execPath, [resolve(import.meta.dirname, "publish-npm-tarballs.mjs"), "npm-artifacts"])
run(process.execPath, [resolve(repository, "packages/opentui/script/release.mjs")])

function run(command, args) {
  const result = spawnSync(command, args, { cwd: repository, stdio: "inherit" })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
