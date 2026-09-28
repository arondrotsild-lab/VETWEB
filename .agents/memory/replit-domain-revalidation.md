---
name: Replit custom-domain revalidation
description: Rebinding an existing hostname to a Replit publication when DNS still contains an older verification token.
---

When reconnecting an existing custom hostname, the DNS A record may already point at Replit while the published TXT verification token is stale. Compare the TXT returned by public DNS with the exact token shown in the current Replit domain flow. If they differ, add the current TXT token without disturbing existing A/CNAME records or older TXT values. Replit's manual-setup modal only shows the expected records, not the provider's saved zone; inspect the actual zone and verify against authoritative DNS. Apex `@` and `www` TXT records are separate, and the token must be copied exactly, including its first character.

**Why:** A hostname can have pointed to Replit before and still require fresh ownership verification when its publication binding changes.

**How to apply:** Inspect the actual DNS zone, identify the hostname Replit is verifying (`@` for the apex, `www` for that subdomain), and compare its TXT value with the current Replit token. Check authoritative nameservers directly before using Replit's verification control; don't change unrelated A/CNAME records or remove older TXT values.