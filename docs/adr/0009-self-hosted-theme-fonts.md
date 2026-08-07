# Self-hosted theme fonts

The Warm theme's typefaces (Josefin Sans, DM Sans, DM Mono) are bundled as local assets via the `@fontsource/*` npm packages and loaded with `@import`-free `@font-face` CSS, instead of linking Google Fonts' CDN as the original design mockup does. Simpler is a local-first, offline-capable desktop app (Tauri); a remote font CDN would mean unstyled or system-fallback text on first launch without network, and a silent runtime dependency on an external host thereafter.

`@fontsource` packages were chosen over manually downloading `.woff2` files because they pin exact, license-checked font files as versioned dependencies, so updating or adding another Google Fonts family later is an `npm install` away rather than a manual asset-management step. Only the Latin subset and the weights actually used by the theme (Josefin Sans 400/500/600/700, DM Sans 400/500/600, DM Mono 400/500) are imported, to keep bundle size down.
