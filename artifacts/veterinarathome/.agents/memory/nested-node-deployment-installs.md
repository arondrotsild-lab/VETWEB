---
name: Nested Node deployment installs
description: Prevents production builds from resolving incompatible root packages in a project with separate client and server packages.
---

For nested Node packages, production installation must use each package's lockfile and explicitly include build-time dev dependencies.

**Why:** Production environments may omit dev dependencies. Build commands can then resolve incompatible binaries from the root package instead of the nested client or server.

**How to apply:** Use reproducible installs such as `npm ci --include=dev --prefix <package>` before compiling nested TypeScript, Vite, or Tailwind projects.