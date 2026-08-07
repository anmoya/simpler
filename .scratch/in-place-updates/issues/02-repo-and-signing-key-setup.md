Status: ready-for-human

# Repo setup & signing key provisioning

## Parent

.scratch/in-place-updates/spec.md

## What to build

Human-only setup steps that unblock the rest of the pipeline:

1. Create a public GitHub repository for Simpler (if not already created) and push the existing codebase to it, so `origin` is configured.
2. Generate an ed25519 update-signing keypair using the Tauri CLI signer (`npm run tauri signer generate` or equivalent — confirm exact invocation against the installed Tauri CLI version).
3. Store the generated private key as a GitHub Actions repository secret (e.g. `TAURI_SIGNING_PRIVATE_KEY`, plus its password secret if the key is password-protected).
4. Hand off the generated public key so it can be committed into `src-tauri/tauri.conf.json`'s updater config (this can be done by the human directly, or handed to whoever picks up issue 06/04 to commit).

## Acceptance criteria

- [ ] Repo exists on GitHub, is public, and `origin` is pushed.
- [ ] Ed25519 keypair generated.
- [ ] Private key (and password, if any) stored as GitHub Actions secret(s), documented by name so later workflow YAML can reference them.
- [ ] Public key recorded somewhere accessible (e.g. pasted into this issue's Comments, or committed directly) for use by issue 06.

## Blocked by

None - can start immediately
