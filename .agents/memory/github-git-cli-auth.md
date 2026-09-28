---
name: GitHub provider and CLI authentication
description: Caveat when a Replit Git Provider is Active but shell Git pushes still fail.
---

Do not assume that an Active GitHub provider means command-line Git can write to the remote. Verify the shell push path independently before relying on it.

**Why:** In this workspace, GitHub provider rows showed Active while HTTPS `git push` still failed authentication; GitHub CLI and SSH authentication were also unavailable.

**How to apply:** If shell pushes fail despite an Active provider, avoid repeating the push unchanged. Use another explicitly authorized Git workflow or ask the user to choose how to refresh access.