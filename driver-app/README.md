# Malyan Driver App — مليان سائق

Mobile app for **drivers and field technicians** (iOS + Android). Built with **Expo (React Native)**.

## Run on your phone (Expo Go)

1. Install **Node.js** from https://nodejs.org (LTS).
2. In this folder, run:
   ```bash
   npm install
   npx expo start
   ```
3. Install **Expo Go** on your iPhone or Android phone from App Store / Play Store.
4. Scan the QR code shown in the terminal with your phone (iPhone: Camera app; Android: Expo Go app).
5. The app opens in Expo Go with **RTL Arabic** layout.

## Build for App Store / Play Store

- **iOS:** `npx expo run:ios` (need Mac with Xcode) or use [EAS Build](https://docs.expo.dev/build/introduction/).
- **Android:** `npx expo run:android` or use [EAS Build](https://docs.expo.dev/build/introduction/).

For production builds (e.g. EAS): https://docs.expo.dev/build/setup/

## Screens

- **Today** — list of today’s deliveries, call, map, mark delivered.
- **History** — past deliveries.
- **Profile** — driver profile and logout.

All inside the same **مليان** folder; no separate folder outside.
