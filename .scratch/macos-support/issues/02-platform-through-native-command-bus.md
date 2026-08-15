# Prefactor: report the running platform through the native command bus

Status: ready-for-agent

## Parent

`.scratch/macos-support/spec.md`

## What to build

The frontend currently has no way to know which platform it's running on, and three separate pieces of macOS work need to know: paste (03), the title bar (04), and anything later that has to diverge. Extracting it first means those tickets can proceed in parallel instead of one waiting on a detail buried inside the other.

Add the platform to the existing `native_command` bus — payload struct, handler function, branch in `dispatch_native_command`, and a typed wrapper in `src/native/commands.ts` — following how install kind is already reported. There is deliberately no new Tauri command and no new plugin: the single-bus architecture is the pattern this repo established, and Tauri's `os` plugin would be a whole dependency for one string.

Prefer a shape that reads as a capability question at the call sites rather than a raw OS string sprinkled through the UI. Callers asking "am I on macOS?" everywhere is how platform checks metastasise.

This ticket ships no user-visible behaviour on its own. It's a prefactor, and it's first for that reason.

## Acceptance criteria

- [ ] The current platform is readable from the frontend through a typed wrapper in `src/native/commands.ts`
- [ ] It goes through `native_command`; no new Tauri command and no new plugin dependency
- [ ] The value is correct when running on both macOS and Linux (checked live on the Mac, and on Linux before the round closes)
- [ ] Native tests cover the new handler; `npm run test` and `npm run test:native` pass

## Blocked by

- 01
