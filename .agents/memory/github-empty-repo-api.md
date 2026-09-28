---
name: GitHub API initialization for empty repositories
description: Safe sequence for uploading a full project tree to a new, commit-free GitHub repository through the REST API.
---

GitHub's Git Data API can return `409 Git Repository is empty` for blob uploads even when the authenticated account can access the repository.

**Why:** In this workspace, Git Data writes only worked after the Contents API created the first commit in the empty repository.

**How to apply:** Confirm the target branch is empty, then use the Contents API to create an existing project file with its exact source content (for example `.gitignore`). After that, upload remaining blobs, create the tree and commit, and fast-forward the branch. Keep the seed file in the final tree to avoid unrelated history.