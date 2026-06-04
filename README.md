# 🚀 EAS Build & Deployment Guide — POS UMKM

> **Versi dokumen:** Juni 2026 · disusun ulang untuk **Expo SDK 56** (React Native 0.85)
> **Package manager:** PNPM
> **Basis:** audit codebase aktual (83 file, typecheck & lint PASSED) + riset dokumentasi Expo & store terkini.
>
> Dokumen ini menggantikan guide lama. Semua error di bagian 10 nyata pernah terjadi & sudah ada solusinya.

---

## Daftar Isi

0. [Ringkasan Fitur Aplikasi](#0-ringkasan-fitur-aplikasi)
1. [Hasil Audit — Codebase vs Konfigurasi](#1-hasil-audit--codebase-vs-konfigurasi)
2. [Prasyarat](#2-prasyarat)
3. [Setup Awal (EAS + Dev Client)](#3-setup-awal-eas--dev-client)
4. [Konfigurasi File (`app.json`, `.env`, `eas.json`)](#4-konfigurasi-file)
5. [⚠️ Library Printer — Keputusan Penting](#5-️-library-printer--keputusan-penting)
6. [Perintah Build](#6-perintah-build)
7. [Metro & Development](#7-metro--development)
8. [Rilis ke Google Play Store](#8-rilis-ke-google-play-store)
9. [Rilis ke Apple App Store](#9-rilis-ke-apple-app-store)
10. [Error & Solusi](#10-error--solusi)
11. [Checklist Sebelum Build & Rilis](#11-checklist-sebelum-build--rilis)

---

## 0. Ringkasan Fitur Aplikasi

POS UMKM adalah aplikasi kasir **offline-first** untuk warung/UMKM Indonesia. Database 100% lokal (SQLite); koneksi internet **hanya** dibutuhkan satu kali saat aktivasi lisensi. Berikut fitur lengkap hasil pembacaan kode.

### A. Kasir & Pembayaran
- Pilih produk via daftar/grid dengan filter **kategori**.
- Keranjang dengan stepper qty, **diskon preset** (berbasis persen).
- Metode bayar: **Tunai**, **QRIS**, **Transfer**, **Debit** (sebagian di-*gate* per tier — lihat tabel tier).
- Tunai: input uang diterima + **hitung kembalian** otomatis.
- **Preview struk** + cetak ke printer thermal Bluetooth (ESC/POS).

### B. Menu, Kategori & Stok
- CRUD **produk**: nama, harga, kategori, status tersedia, stok, stok minimum.
- CRUD **kategori**.
- Dua **mode pelacakan stok** per produk (hybrid):
  - `product` — stok dihitung langsung per produk.
  - `recipe` — stok diturunkan dari **bahan** (Bill of Materials).
- **Kelola stok**: Restock (barang masuk) & **Opname** (hitung fisik) — semua tercatat di `stock_log`.

### C. Bahan Baku & Resep / BOM
- CRUD **bahan**: nama, satuan bebas (g/kg/ml/l/pcs/…), stok (REAL, **boleh minus**), stok minimum, harga beli.
- **Editor resep** per menu: tautkan bahan + qty per porsi.
- Saat menu mode `recipe` terjual → **stok bahan otomatis berkurang** sesuai resep.
- Hitung **HPP (perkiraan biaya bahan) per porsi**.

### D. Promo Otomatis *(tier v2+)*
- **BOGO** (Beli 1 Gratis 1) & **Buy2Get1** (Beli 2 Gratis 1).
- Aturan promo per produk dengan rentang tanggal.
- Item gratis otomatis dihitung di kasir (tidak menambah subtotal berbayar).

### E. Pembayaran QRIS Digital *(tier v2+)*
- Payment gateway: **Xendit, Midtrans, DOKU** (adapter terpisah).
- Generate QR dinamis, **polling status** (lifecycle-aware + adaptive backoff, ramah rate-limit & baterai).
- **Rekonsiliasi** otomatis saat app start & kembali ke foreground (pengganti webhook).
- Mode **sandbox/production** per provider; **anti-transaksi-ganda**.
- Secret PG disimpan di **SecureStore** (Keychain/Keystore), bukan di DB biasa.

### F. Riwayat & Koreksi Transaksi
- Daftar transaksi + detail (struk).
- **Void** transaksi (dikeluarkan dari rekap omzet).
- **Refund** dengan alasan *(tier v2+)*.
- **Cetak ulang** struk.

### G. Dashboard & Analitik
- Ringkasan **omzet**: hari ini, minggu ini, bulan ini.
- Ringkasan **refund** & **nilai BOGO** bulan ini.
- **Grafik batang 7 hari**: minggu ini vs minggu lalu (dengan tooltip interaktif).
- **Produk terlaris**, **analisa diskon**.
- **Laporan stok produk** & **laporan stok bahan** (nilai stok, menipis, habis).
- Banner **pengingat backup**.

### H. Notifikasi Stok (lokal)
- Alert **stok menipis / habis** (produk **dan** bahan).
- Pengingat terjadwal: **pagi**, **sore**, **mingguan** (jam & hari bisa diatur).
- > **Penting:** aplikasi hanya memakai **notifikasi LOKAL** (`scheduleNotificationAsync`). **Tidak ada push remote / FCM** → Anda **tidak perlu** setup Firebase atau push token sama sekali.

### I. Backup
- **Export Excel** (transaksi, item, menu) → share file `.xlsx`.
- **Import Excel** untuk restore.

### J. Keamanan & Aktivasi
- **Kunci aplikasi** biometrik/PIN (opsional, saat cold start).
- **Aktivasi lisensi**: offline (berbasis checksum) atau online (via `DEV_SERVER` → mengembalikan tier).
- Sistem **tier v1/v2/v3**.

### K. Fondasi Teknis
- **Offline-first** SQLite + **migration runner** berurut (4 migrasi: core → QRIS → stok → bahan/resep).
- **Bottom sheet native** (`@expo/ui/community/bottom-sheet`).
- **Toast in-app** (React Native Animated, tanpa dependency tambahan).
- Ikon vektor **lucide** (bukan emoji), Safe Area, desain "Warung Modern" (terracotta).
- **Aman di Expo Go**: modul notifikasi di-*lazy-load* (no-op di Expo Go) sehingga app tetap boot.

### Tabel Tier (sumber: `src/lib/config/features.ts`)

| Fitur | v1 | v2 | v3 |
|---|:--:|:--:|:--:|
| Kasir tunai + stok + menu + bahan/resep | ✅ | ✅ | ✅ |
| Dashboard, riwayat, void, backup, notifikasi | ✅ | ✅ | ✅ |
| Metode bayar non-tunai (Transfer/Debit) | ❌ | ✅ | ✅ |
| **QRIS digital** (Xendit/Midtrans/DOKU) | ❌ | ✅ | ✅ |
| Promo engine (BOGO/Buy2Get1) + kelola promo | ❌ | ✅ | ✅ |
| **Refund** | ❌ | ✅ | ✅ |
| Fitur lanjutan (placeholder: multi-kasir, dll) | ❌ | ❌ | ✅ |

> ⚠️ **Koreksi dokumentasi lama:** komentar di `.env` versi sebelumnya menulis *"v1 — Tunai + QRIS"*. Itu **salah** menurut kode. Pada v1, hanya **Tunai** yang aktif (`features.payment = false`, `features.qris = false`). QRIS & metode non-tunai baru muncul di **v2**.

---

## 1. Hasil Audit — Codebase vs Konfigurasi

Audit membandingkan `app.json` / `.env` yang Anda kirim terhadap kode aktual.

| # | Temuan | Status | Tindakan |
|---|---|---|---|
| 1 | `app.json` versi Anda **sudah lebih lengkap** dari guide lama (punya `extra.eas.projectId`, izin `USE_BIOMETRIC`/`USE_FINGERPRINT`). | ✅ Pakai versi Anda | Guide lama **tidak punya `projectId`** → itu akan menggagalkan EAS build. |
| 2 | Semua **plugin** di `app.json` dipakai kode (router, splash, sqlite, secure-store, local-authentication, notifications). | ✅ Cocok | — |
| 3 | **Library printer**: kode `struk.ts` memakai `react-native-bluetooth-escpos-printer`, tapi library itu pakai `jcenter()` (mati 2021) + `compileSdkVersion 27` → **tidak akan build di SDK 56**. | ⚠️ **Aksi wajib** | Lihat **Bagian 5**. |
| 4 | `.env` menyebut **Supabase** (`EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY`), tapi **kode tidak meng-import Supabase SDK** sama sekali. Aktivasi online hanya memanggil `POST {EXPO_PUBLIC_DEV_SERVER}/api/aktivasi`. | ⚠️ Variabel tak terpakai | Hapus var Supabase dari `.env` (lihat `.env.example` final). |
| 5 | `.env` tier menulis v1/v2 saja, tapi kode mendukung **v1/v2/v3**; deskripsi v1 keliru (lihat §0). | ⚠️ Komentar usang | Diperbaiki di `.env.example` final. |
| 6 | Izin **`SCHEDULE_EXACT_ALARM`** di `app.json`. Sejak Android 13 izin ini **ditolak default** & Play Store **melarang publish** kecuali app jam/kalender. Reminder stok tidak butuh presisi menit. | ⚠️ Risiko tolak review | **Disarankan dihapus** (lihat §4 & §6 error). |
| 7 | `@expo/ui/community/bottom-sheet` = drop-in resmi pengganti `@gorhom/bottom-sheet`, **stabil di SDK 56**. Butuh `react-native-reanimated` (babel plugin) + `react-native-gesture-handler` (sudah ada `GestureHandlerRootView` di root). | ✅ Cocok | Pastikan `react-native-reanimated/plugin` ada di `babel.config.js`. |
| 8 | `@react-navigation/bottom-tabs` — kode **sudah** memakai `expo-router/js-tabs` (SDK 56 melepas React Navigation). | ✅ Sudah benar | Pastikan paket `@react-navigation/*` di-uninstall. |
| 9 | `expo-file-system/legacy` dipakai di `excel.ts`. Di SDK 56 API baru sudah default. | ℹ️ Catatan | Masih jalan; pertimbangkan migrasi ke API baru di masa depan (bukan blocker build). |

**Kesimpulan:** `app.json` Anda **hampir sesuai**. Yang perlu diputuskan/diubah: **(a) library printer** (wajib), **(b) `SCHEDULE_EXACT_ALARM`** (disarankan lepas), **(c) bersihkan var Supabase di `.env`**.

---

## 2. Prasyarat

- **Node.js ≥ 20.19.4** — SDK 56 / RN 0.85 menolak Node lebih lama. Cek: `node -v`.
- **PNPM** terinstall: `npm install -g pnpm`
- **EAS CLI** (versi terbaru): `npm install -g eas-cli`
- Akun **Expo** ([expo.dev](https://expo.dev)).
- **HP fisik Android** untuk testing (notifikasi & Bluetooth **tidak** jalan di emulator).
- **Build iOS native** butuh **macOS + Xcode 26.4+** (iOS minimum SDK 56 = iOS 16.4). Build di EAS Cloud tidak perlu Mac, tapi submit/testing tetap lebih mudah dengan device.

> SDK 56 rilis stabil 21 Mei 2026: React Native 0.85, React 19.2, Hermes v1 default, dan **New Architecture wajib** (tidak bisa dimatikan).

---

## 3. Setup Awal (EAS + Dev Client)

### 3.1 Login & inisialisasi
```bash
eas login
eas init        # generate/link projectId ke akun Expo
```
> `projectId` Anda saat ini: `2228d75c-7503-4a64-9963-d309e2d13bee` (tertanam di `app.json` → `extra.eas.projectId`). Kalau `eas init` membuat ID baru, samakan dengan ini atau biarkan `eas init` yang menulis ulang.

### 3.2 Install expo-dev-client (wajib)
```bash
npx expo install expo-dev-client
```
> Setelah ini, project pakai **Development Build**. **Expo Go tidak bisa lagi** menjalankan fitur native custom (printer, biometrik, notifikasi). Bottom sheet `@expo/ui` sendiri sudah jalan di Expo Go sejak SDK 56, tapi modul lain tidak.

### 3.3 Pastikan dependency native terpasang via `expo install`
Gunakan `npx expo install` (bukan `pnpm add` langsung) untuk paket Expo agar versinya cocok dengan SDK 56:
```bash
npx expo install @expo/ui react-native-reanimated react-native-gesture-handler \
  react-native-safe-area-context react-native-svg react-native-qrcode-svg \
  expo-router expo-sqlite expo-secure-store expo-local-authentication \
  expo-notifications expo-constants expo-application expo-file-system \
  expo-sharing expo-document-picker expo-status-bar expo-splash-screen
```
Library JS murni tetap via PNPM:
```bash
pnpm add xlsx lucide-react-native @noble/hashes node-forge
```

### 3.4 `babel.config.js`
Pastikan plugin Reanimated **paling akhir** (dibutuhkan oleh `@expo/ui/community/bottom-sheet`):
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'], // WAJIB & paling akhir
  };
};
```

### 3.5 Cek kesehatan project
```bash
npx expo-doctor@latest
```

---

## 4. Konfigurasi File

### 4.1 `app.json` — FINAL (siap pakai, SDK 56)

> Perubahan vs versi Anda: **`SCHEDULE_EXACT_ALARM` dihapus** (lihat catatan di bawah). Sisanya dipertahankan karena sudah cocok dengan kode.

```json
{
  "expo": {
    "name": "POS UMKM",
    "slug": "pos-umkm",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "posumkm",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#FAF7F2"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.posumkm.app",
      "infoPlist": {
        "NSFaceIDUsageDescription": "Membuka aplikasi kasir dengan Face ID."
      }
    },
    "android": {
      "package": "com.posumkm.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png",
        "backgroundColor": "#FAF7F2"
      },
      "permissions": [
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.USE_BIOMETRIC",
        "android.permission.USE_FINGERPRINT"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      "expo-router",
      "expo-splash-screen",
      "expo-sqlite",
      "expo-secure-store",
      [
        "expo-local-authentication",
        {
          "faceIDPermission": "Membuka aplikasi kasir dengan Face ID."
        }
      ],
      [
        "expo-notifications",
        {
          "color": "#C75B39",
          "defaultChannel": "stock-alert"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "router": {},
      "eas": {
        "projectId": "2228d75c-7503-4a64-9963-d309e2d13bee"
      }
    }
  }
}
```

> #### Tentang `SCHEDULE_EXACT_ALARM` (dihapus)
> Sejak **Android 13+**, izin ini **ditolak secara default** dan Google Play **mencegah publish** app yang mendeklarasikannya kecuali app tergolong **jam/kalender**. Aplikasi ini hanya butuh reminder stok (pagi/sore/mingguan) yang **tidak kritikal ke menit**, jadi `expo-notifications` cukup memakai **inexact alarm** — notifikasi tetap muncul (mungkin sedikit tertunda saat HP *Doze*). Menghapus izin = **review Play Store lebih lancar**.
>
> Kalau Anda *benar-benar* butuh presisi menit, tambahkan kembali `"android.permission.SCHEDULE_EXACT_ALARM"` **dan** siap mengisi form deklarasi izin di Play Console (berisiko ditolak untuk app non-jam).

> #### Field yang DIHAPUS dari versi sangat lama (jangan dipakai lagi)
> - `newArchEnabled` — **diabaikan** di SDK 55+; New Architecture selalu aktif. Hapus.
> - `experiments.srcDir` — invalid di schema SDK 56.
> - Plugin `expo-notifications` properti `"icon"` — hanya tambahkan jika file `assets/notification-icon.png` sudah ada (PNG 96×96, putih solid, latar transparan).

> #### (Opsional) Target Android 16 / API 36
> Mulai **31 Agustus 2026**, app & update baru di Play Store wajib **target API 36 (Android 16)** (sebelum itu: API 35). SDK 56 sudah memakai targetSdk terbaru, tapi untuk memastikan saat submit setelah tanggal tsb, Anda bisa pin via `expo-build-properties`:
> ```bash
> npx expo install expo-build-properties
> ```
> Lalu tambahkan ke `plugins`:
> ```json
> ["expo-build-properties", { "android": { "compileSdkVersion": 36, "targetSdkVersion": 36 } }]
> ```
> Verifikasi dulu default SDK 56 dengan `npx expo-doctor`; tambahkan hanya jika perlu.

### 4.2 `.env.example` — FINAL

Lihat file terpisah **`.env.example`**. Ringkasnya hanya **2 variabel** yang dipakai kode:

```dotenv
EXPO_PUBLIC_POS_VERSION=v1
EXPO_PUBLIC_DEV_SERVER=
```

- **`EXPO_PUBLIC_POS_VERSION`** — `v1` (default) / `v2` / `v3`. Menentukan tier fitur (lihat tabel §0). Bertindak sebagai **lantai** tier; aktivasi online hanya bisa **menaikkan**, tidak menurunkan.
- **`EXPO_PUBLIC_DEV_SERVER`** — base URL server aktivasi (endpoint `POST /api/aktivasi`). Boleh kosong jika hanya pakai **aktivasi offline** (kode `POS-XXXX-XXXX`).
- **Var Supabase dihapus** — tidak ada di kode. Jika kebetulan server aktivasi Anda di-host di Supabase Edge Function, cukup taruh URL fungsinya di `EXPO_PUBLIC_DEV_SERVER`.

> Setelah mengubah `.env`, **wajib** restart Metro dengan clear cache: `pnpm expo start -c`. Skema SQLite identik di v1/v2/v3 — ganti tier **tidak** butuh migrasi DB.

### 4.3 `eas.json` — FINAL

`eas.json` Anda sudah valid untuk SDK 56. Yang perlu diisi hanya **placeholder submit** (lihat §8 & §9).

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      },
      "ios": {
        "simulator": true
      },
      "env": {
        "APP_ENV": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      },
      "env": {
        "APP_ENV": "preview"
      }
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "APP_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "ISI_EMAIL_APPLE_ID_ANDA",
        "ascAppId": "ISI_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "ISI_APPLE_TEAM_ID"
      }
    }
  }
}
```

> - `appVersionSource: "remote"` + `autoIncrement: true` (production) → **versionCode/buildNumber dikelola otomatis oleh EAS**. Anda tidak perlu menaikkannya manual tiap rilis.
> - `serviceAccountKeyPath` mengasumsikan file JSON ada di root project. **Alternatif lebih aman:** unggah key ke **EAS dashboard** (Credentials), lalu Anda bisa menghapus baris `serviceAccountKeyPath` ini. Jangan commit file JSON ke Git.

---

## 5. ⚠️ Library Printer — Keputusan Penting

Ini temuan paling kritis. **Kode `src/lib/printer/struk.ts` saat ini di-tulis untuk `react-native-bluetooth-escpos-printer`** (memanggil `BluetoothManager` & `BluetoothEscposPrinter`). Tapi:

- Library itu (januslo) **tidak terawat**: pakai `jcenter()` (sunset Mei 2021) & `compileSdkVersion 27` → **gagal build di SDK 56 / Gradle modern**.
- Saran guide lama (`react-native-thermal-receipt-printer-image-qr`) juga **sudah usang** (v0.1.12, rilis 2023) dan **API-nya berbeda** (`BLEPrinter`/`USBPrinter`) → akan **merusak `struk.ts`** jika dipasang apa adanya.

Kabar baik: **mencetak bersifat opsional & degradable.** `printerTersedia()` mengembalikan `false` jika modul tidak ada → app tetap jalan dan hanya menampilkan pesan "printer tidak tersedia". Jadi Anda bisa rilis dulu tanpa printer, tambahkan belakangan.

### Pilih salah satu:

#### 🅐 Patch library lama (`patch-package`) — **paling ringan, paling rapuh**
Pertahankan `struk.ts` apa adanya; tambal `build.gradle` library.
```bash
pnpm add -D patch-package
# edit node_modules/react-native-bluetooth-escpos-printer/android/build.gradle:
#   ganti jcenter() -> mavenCentral()
#   naikkan compileSdkVersion -> 35/36, buildToolsVersion, classpath AGP
npx patch-package react-native-bluetooth-escpos-printer
```
Tambahkan `"postinstall": "patch-package"` di `package.json` → `scripts`.
> Risiko: library era RN 0.59; selain `jcenter` kemungkinan butuh tambalan lain (AGP, namespace, AndroidX) dan **belum tentu kompatibel New Architecture**. Cocok hanya jika Anda siap *trial-and-error* di dev build.

#### 🅑 Migrasi ke fork terawat — **direkomendasikan untuk produksi**
Pakai fork yang masih dipelihara, mis. **`@conodene/react-native-thermal-receipt-printer-image-qr`** (lebih baru, dukung RN ≥0.74) atau **`@intechnity/react-native-thermal-printer`**.
```bash
pnpm remove react-native-bluetooth-escpos-printer
pnpm add @intechnity/react-native-thermal-printer   # contoh
```
**Konsekuensi:** Anda **wajib menulis ulang** fungsi printer di `struk.ts`, karena API berubah:

| Fungsi di `struk.ts` (lama) | Padanan (fork baru) |
|---|---|
| `BluetoothManager.enableBluetooth()` / `getPairedDevices` | `BLEPrinter.init()` + `BLEPrinter.getDeviceList()` |
| `BluetoothManager.connect(addr)` | `BLEPrinter.connectPrinter(mac)` |
| `BluetoothEscposPrinter.printText(teks)` | `BLEPrinter.printBill(...)` / `printText(...)` |

`renderStrukText()` (murni, tanpa native) **tidak perlu diubah** — hanya bagian koneksi & kirim ke printer.
> Tetap **verifikasi di development build** apakah fork pilihan benar-benar build di RN 0.85 + New Architecture.

#### 🅒 Rilis dulu **tanpa printer** — **tercepat ke store**
Jangan pasang library printer apa pun. Karena `printerTersedia()` sudah aman, app build & jalan normal; tombol cetak menampilkan pesan ramah. Tambahkan printer (lewat 🅑) di update berikutnya.
> Ini jalur paling cepat kalau target Anda **secepatnya upload ke Play Store/App Store** sambil mematangkan dukungan printer.

**Rekomendasi:** **🅒 untuk peluncuran perdana** (cepat & aman), lalu **🅑 untuk fitur cetak produksi**.

---

## 6. Perintah Build

### Development (APK debug, testing harian)
```bash
eas build --profile development --platform android
```

### Preview (APK release, untuk dibagikan ke tester)
```bash
eas build --profile preview --platform android
```

### Production
```bash
# Android (AAB → Play Store)
eas build --profile production --platform android
# iOS (→ App Store / TestFlight)
eas build --profile production --platform ios
```

### Utilitas
```bash
eas build:list      # status semua build
eas build:view      # detail build terakhir
```

---

## 7. Metro & Development

```bash
pnpm expo start -c   # -c = clear cache (wajib setelah ubah .env / app.json)
```

**Alur setelah APK dev terinstall di HP:**
1. Jalankan `pnpm expo start -c` di laptop.
2. Buka app **POS UMKM** langsung di HP (**bukan** Expo Go).
3. App otomatis konek ke Metro; hot reload aktif.

### Expo Go vs Development Build

| | Expo Go | Development Build |
|---|:--:|:--:|
| Bottom sheet `@expo/ui` | ✅ (sejak SDK 56) | ✅ |
| Bluetooth printer | ❌ | ✅ |
| Biometrik (kunci app) | ❌ | ✅ |
| Notifikasi lokal | ❌ | ✅ |
| Hot reload / Scan QR | ✅ | ✅ |

> Project ini **wajib Development Build** untuk menguji printer, biometrik, dan notifikasi.

---

## 8. Rilis ke Google Play Store

### 8.1 Prasyarat
- **Akun Google Play Developer** (biaya **$25 sekali seumur hidup**) → daftar di [Play Console](https://play.google.com/console).
- App **harus diunggah manual minimal sekali** sebelum `eas submit` (lewat API) bisa jalan — ini batasan Google Play API.
- Format produksi = **AAB** (`buildType: "app-bundle"` — sudah benar di `eas.json`).

### 8.2 Membuat `google-service-account.json` (untuk isi placeholder)
Ini kunci agar `eas submit` bisa upload otomatis. Panduan resmi: <https://expo.fyi/creating-google-service-account.md>

1. Buka **Google Cloud Console** → buat/Pilih project.
2. Aktifkan **Google Play Android Developer API** (halaman API Library → Enable).
3. **IAM & Admin → Service Accounts → Create Service Account** → beri nama (mis. `eas-submit`) → Create.
4. Pada service account → **Actions (⋮) → Manage keys → Add key → Create new key → JSON** → unduh file. **Simpan aman, jangan commit.**
5. Salin **email** service account itu.
6. Di **Play Console → Users and permissions → Invite new users** → tempel email service account → beri izin minimal: *Release to production/testing*, *Manage app information* (atau Admin untuk simpel).
7. Letakkan JSON di root project sebagai `google-service-account.json` **atau** unggah ke **EAS Dashboard → Credentials → Android** (lebih aman; lalu hapus `serviceAccountKeyPath` dari `eas.json`).

> Aktivasi kredensial Google bisa makan waktu **hingga 24–36 jam**. Jika muncul *"Invalid Play Store credentials"*, tunggu dan pastikan API sudah Enable + app sudah pernah diupload manual.

### 8.3 Submit
```bash
eas submit --platform android --profile production
# atau bangun + submit sekaligus:
eas build --platform android --profile production --auto-submit
```
> `track: "internal"` di `eas.json` = masuk **Internal testing** dulu (aman). Ganti ke `"production"` saat siap rilis publik.

### 8.4 Wajib dilengkapi di Play Console (manual, satu kali)
Listing toko, ikon, screenshot, **Privacy Policy URL**, kuesioner **Data safety**, rating konten, dan kategori. (POS UMKM menyimpan data lokal & hanya online saat aktivasi — jawab kuesioner Data safety sesuai itu.)

---

## 9. Rilis ke Apple App Store

### 9.1 Prasyarat
- **Apple Developer Program** (biaya **$99/tahun**).
- **macOS + Xcode 26.4+** untuk build lokal (atau pakai EAS Cloud).
- Buat app di **App Store Connect** dulu: **My Apps → + → New App** (pilih Bundle ID `com.posumkm.app`, isi nama, bahasa, SKU).

### 9.2 Mengisi placeholder `eas.json` (iOS)
| Field | Cara mendapatkan |
|---|---|
| **`appleId`** | Email akun **Apple Developer** Anda (mis. `nama@email.com`). |
| **`ascAppId`** | **App Store Connect** → pilih app → tab **App Store** → **App Information** → **General Information** → **Apple ID** (angka, mis. `1234567890`). |
| **`appleTeamId`** | **Apple Developer** → **Membership** (Program Resources) → **Team ID** (10 karakter, mis. `12LE34XI45`). |

> **Disarankan pakai ASC API Key** ketimbang password Apple ID: saat menjalankan `eas submit -p ios`, pilih **"Add a new ASC API Key"** → EAS akan generate & menyimpannya. Lebih aman & tahan 2FA.

### 9.3 Submit
```bash
eas submit --platform ios --profile production
# atau:
eas build --platform ios --profile production --auto-submit
```
> Build iOS masuk **TestFlight** dulu; rilis publik dilakukan dari App Store Connect setelah lolos **App Review**.

### 9.4 Catatan App Review
- Siapkan **Privacy Policy URL** & jawab **App Privacy** (data lokal; online hanya saat aktivasi).
- iOS minimum SDK 56 = **iOS 16.4** (otomatis dari konfigurasi).
- `NSFaceIDUsageDescription` sudah ada di `app.json` (wajib karena pakai `expo-local-authentication`).

---

## 10. Error & Solusi

### ❌ 1 — `notification-icon.png` tidak ada
```
ENOENT: no such file or directory, open './assets/notification-icon.png'
```
**Solusi:** Jangan tambahkan properti `"icon"` di plugin `expo-notifications` sampai file-nya ada (PNG 96×96, putih solid, latar transparan).

### ❌ 2 — Field invalid di `app.json`
```
should NOT have additional property 'newArchEnabled'
experiments - should NOT have additional property 'srcDir'
```
**Solusi:** Hapus `newArchEnabled` & `experiments.srcDir`. New Architecture selalu aktif di SDK 55+.

### ❌ 3 — `@react-navigation/bottom-tabs` konflik (SDK 56)
```
As of SDK 56, expo-router is no longer compatible with react-navigation.
"@react-navigation/bottom-tabs" should be removed.
```
**Solusi:**
```bash
pnpm remove @react-navigation/bottom-tabs @react-navigation/native @react-navigation/core
```
Kode sudah memakai `useBottomTabBarHeight` dari `expo-router/js-tabs` — tidak perlu ubah kode.

### ❌ 4 — Printer pakai `jcenter()` yang sudah mati
```
Could not find method jcenter() ...
react-native-bluetooth-escpos-printer/android/build.gradle line: 3
```
**Solusi:** Lihat **Bagian 5** (patch-package, migrasi fork, atau rilis tanpa printer dulu).

### ❌ 5 — Build ditolak Play Store karena `SCHEDULE_EXACT_ALARM`
Gejala: form deklarasi izin muncul / app ditolak untuk izin alarm.
**Solusi:** Hapus `android.permission.SCHEDULE_EXACT_ALARM` dari `app.json` (reminder stok tidak butuh exact alarm). Notifikasi tetap jalan via inexact alarm.

### ❌ 6 — Node terlalu lama
```
error ... requires Node >= 20.19.4
```
**Solusi:** Update Node (mis. via `nvm install 20`). Cek CI/laptop sebelum build.

### ❌ 7 — HP tidak bisa konek ke Metro (`IOException failed to download`)
**Penyebab:** HP & laptop beda jaringan, atau firewall blokir port 8081.

- **A — Buka port 8081 (PowerShell as Administrator):**
  ```powershell
  netsh advfirewall firewall add rule name="Expo Metro" dir=in action=allow protocol=TCP localport=8081
  ```
- **B — Samakan WiFi** HP & laptop, lalu jalankan ulang Metro.
- **C — Tunnel mode** (paling lambat, paling mudah):
  ```bash
  npm install --global @expo/ngrok@4.1.0
  pnpm expo start -c --tunnel
  ```
  > Tunnel **tidak kompatibel** dengan Cloudflare WARP — matikan WARP dulu.

### ❌ 8 — ngrok error
```
CommandError: Install @expo/ngrok@^4.1.0 and try again
```
**Solusi:** Install via **npm** (bukan pnpm), tanpa `^`: `npm install --global @expo/ngrok@4.1.0`

### ❌ 9 — `netsh` tidak dikenal di PowerShell
**Solusi:** Tambahkan `.\` di depan: `.\netsh advfirewall ...` (atau jalankan dari `cmd`).

### ❌ 10 — Cloudflare WARP blokir koneksi
```
CF_HAPPY_EYEBALLS_MITM_FAILURE
```
**Solusi:** Matikan Cloudflare WARP dari system tray sebelum menjalankan Metro/tunnel.

### ❌ 11 — `Invalid Play Store credentials` saat submit
**Solusi:** Pastikan (a) Google Play Android Developer API **Enabled**, (b) app **sudah diupload manual minimal sekali**, (c) email service account sudah di-invite di Play Console, lalu tunggu hingga **24–36 jam**.

---

## 11. Checklist Sebelum Build & Rilis

### Sebelum `eas build` (dev/preview)
```bash
# 1. Bersihkan paket React Navigation (SDK 56 lepas dari RN Navigation)
pnpm remove @react-navigation/bottom-tabs @react-navigation/native @react-navigation/core

# 2. Putuskan strategi printer (Bagian 5):
#    - rilis dulu tanpa printer, ATAU
#    - migrasi ke fork terawat + tulis ulang struk.ts

# 3. Node ≥ 20.19.4
node -v

# 4. Cek project
npx expo-doctor@latest

# 5. Typecheck & lint
pnpm run typecheck
pnpm run lint

# 6. Build
eas build --profile development --platform android
```

### Checklist `app.json`
- [ ] **Tidak ada** `newArchEnabled` & `experiments.srcDir`
- [ ] **Tidak ada** `SCHEDULE_EXACT_ALARM` (kecuali sengaja + siap deklarasi Play Console)
- [ ] Plugin `expo-notifications` **tanpa** `"icon"` (kecuali file sudah ada)
- [ ] `extra.eas.projectId` terisi (`2228d75c-...`)
- [ ] Izin biometrik (`USE_BIOMETRIC`, `USE_FINGERPRINT`) + `NSFaceIDUsageDescription` ada

### Checklist `.env`
- [ ] `EXPO_PUBLIC_POS_VERSION` di-set (v1/v2/v3)
- [ ] Variabel **Supabase dihapus** (tidak dipakai kode)
- [ ] Restart Metro dengan `-c` setelah perubahan

### Checklist jaringan (dev)
- [ ] HP & laptop satu jaringan
- [ ] Port 8081 dibuka di firewall
- [ ] Cloudflare WARP dimatikan

### Checklist rilis store
- [ ] **Play:** akun Developer ($25), `google-service-account.json` dibuat & di-invite, app diupload manual sekali, Data safety + Privacy Policy diisi
- [ ] **App Store:** Apple Developer ($99/th), app dibuat di App Store Connect, `appleId`/`ascAppId`/`appleTeamId` diisi (atau ASC API Key), App Privacy diisi
- [ ] (Opsional) `expo-build-properties` set `targetSdkVersion: 36` jika submit Android setelah 31 Agustus 2026

---

## Lampiran — Catatan Tambahan

### Ikon notifikasi (tambahkan nanti)
File `assets/notification-icon.png`: 96×96 px, putih solid, latar transparan. Setelah ada, tambahkan `"icon": "./assets/notification-icon.png"` ke plugin `expo-notifications`.

### Hapus rule firewall (jika perlu)
```powershell
netsh advfirewall firewall delete rule name="Expo Metro"
```

### Migrasi SDK di masa depan (rekomendasi Expo)
Untuk naik SDK berikutnya, Expo menyarankan:
```bash
npx expo install expo@^57.0.0 --fix   # contoh versi berikutnya
npx expo-doctor@latest
```
Atau, jika pakai AI coding agent, gunakan **Expo Skills** (`upgrading-expo`).
