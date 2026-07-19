# Releasing The npm Packages

The npm workspace publishes `@kitlangton/terminal-control` with fixed-version platform packages: `@kitlangton/terminal-control-darwin-arm64`, `@kitlangton/terminal-control-darwin-x64`, `@kitlangton/terminal-control-linux-arm64-gnu`, and `@kitlangton/terminal-control-linux-x64-gnu`. The client is compiled to ESM JavaScript with declarations; each native package receives the release Rust executable during the `npm release` workflow.

## Release Steps

For user-facing npm changes:

1. Create a Changeset with `bun run changeset` and commit the generated release metadata.
2. Run `bun run version-packages`, refresh `bun.lock`, and commit the versioned package metadata.
3. Run the `npm-release.yml` workflow with `publish: false` to assemble packages only, or `publish: true` to publish assembled tarballs after its clean Bun and Node/Vitest consumer validation passes.

Publishing is retry-safe: the release script skips an exact package version already present in npm before continuing through the fixed package set.

## Trusted Publishing

The publish job uses npm trusted publishing through GitHub Actions OIDC. In npm package settings, `anomalyco/terminal-control` with workflow `npm-release.yml` must be configured as the trusted publisher for the client and each platform package before using `publish: true`.
