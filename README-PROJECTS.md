# Malyan — مليان للتجارة والحدائق

Everything stays in **one folder: مليان**. No extra folder outside.

## 1. Dashboard (website) — لوحة التحكم

- **Path:** `dashboard/index.html`
- **Use:** Internal company dashboard (orders, team, stats, tasks). For management and Fatima.
- **Open:** Double-click `dashboard/index.html` or open in browser. No install needed.

---

## 2. Driver App (mobile — iOS & Android)

- **Path:** `driver-app/`
- **Use:** For drivers and field technicians (today’s deliveries, map, call, mark delivered).
- **Tech:** Expo (React Native). Same code runs on **Apple** and **Android**.
- **Run:**  
  ```bash
  cd driver-app
  npm install
  npx expo start
  ```  
  Then scan QR with **Expo Go** on your phone.
- **Build for stores:** Use [EAS Build](https://docs.expo.dev/build/introduction/) or `npx expo run:ios` / `npx expo run:android`.  
- **Web demo:** `driver-app/index.html` (optional; main product is the mobile app).

---

## 3. Customer App (mobile — iOS & Android)

- **Path:** `customer-app/`
- **Use:** For customers (services, catalog, my orders, contact).
- **Tech:** Expo (React Native). Same code runs on **Apple** and **Android**.
- **Run:**  
  ```bash
  cd customer-app
  npm install
  npx expo start
  ```  
  Then scan QR with **Expo Go** on your phone.
- **Build for stores:** Use [EAS Build](https://docs.expo.dev/build/introduction/) or run:ios / run:android.  
- **Web demo:** `customer-app/index.html` (optional; main product is the mobile app).

---

## Summary

| Product        | Type        | Where        | Run / open                    |
|----------------|------------|-------------|--------------------------------|
| Dashboard      | Website    | `dashboard/` | Open `index.html` in browser   |
| Driver App     | Mobile app | `driver-app/` | `npm install` then `npx expo start` |
| Customer App   | Mobile app | `customer-app/` | `npm install` then `npx expo start` |

You need **Node.js** installed to run the two mobile apps. Dashboard works without Node.
