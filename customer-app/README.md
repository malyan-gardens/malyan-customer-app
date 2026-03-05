# Malyan Customer App — مليان للحدائق

Mobile app for **customers** (iOS + Android). Built with **Expo (React Native)**.

## Run on your phone (Expo Go)

1. Install **Node.js** from https://nodejs.org (LTS).
2. In this folder, run:
   ```bash
   npm install
   npx expo start
   ```
3. Install **Expo Go** on your iPhone or Android from App Store / Play Store.
4. Scan the QR code from the terminal with your phone.
5. The app opens in Expo Go with **RTL Arabic** layout.

## Build for App Store / Play Store

- **iOS:** `npx expo run:ios` (Mac + Xcode) or [EAS Build](https://docs.expo.dev/build/introduction/).
- **Android:** `npx expo run:android` or [EAS Build](https://docs.expo.dev/build/introduction/).

## Screens

- **Home** — services (نباتات صناعية، لاندسكيب، زراعة، صيانة) and “Request consultation”.
- **Catalog** — plant gallery.
- **My Orders** — list of orders.
- **Profile** — contact (zaher@malyangardens.com).

The **customer-app** folder also contains a web version: open `index.html` in a browser for a quick preview. The real app is the Expo project (run with `npx expo start`).
