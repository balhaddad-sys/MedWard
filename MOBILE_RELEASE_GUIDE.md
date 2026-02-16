# MedWard Pro Mobile Release Guide

This project now includes Capacitor-based native wrappers for Android and iOS.

## Prerequisites

- Node.js + npm
- Android Studio (for Android release builds)
- Xcode + CocoaPods on macOS (for iOS release builds)

## One-time Setup

```bash
npm install
npm run mobile:add:android
npm run mobile:add:ios
```

## Sync Web App Into Native Projects

```bash
npm run mobile:sync
```

This runs the web build and updates:

- `android/app/src/main/assets/public`
- `ios/App/App/public`

## Open Native IDE Projects

Android:

```bash
npm run mobile:android
```

iOS (macOS only):

```bash
npm run mobile:ios
```

## Release Safety Checks

Run this before creating store builds:

```bash
npm run release:check
```

This validates:

- Mobile platform scaffolding exists
- Production release config files exist
- App Check + rate limiter wiring exists
- Lint/typecheck/tests/build all pass

## Production Environment Requirements

For production builds set:

- `VITE_RELEASE_STAGE=production`
- `VITE_USE_EMULATORS=false`
- `VITE_RECAPTCHA_SITE_KEY=<your key>`

If these are misconfigured, app startup is blocked by `ReleaseGuard`.
