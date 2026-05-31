# POS UMKM Offline 🧾

Aplikasi kasir (POS) **offline-first** untuk UMKM Indonesia.
Dibangun dengan React Native + Expo (Expo Router, SDK 56).

> **Bayar sekali, pakai selamanya, tidak butuh internet.**

Online **hanya sekali** saat aktivasi kode. Setelahnya 100% offline — semua data tersimpan lokal di SQLite. Backup cukup satu file Excel.

---

## ✨ Fitur

**Kasir**
- Grid menu responsif (HP 2 kolom · tablet 3–4 kolom), filter per kategori
- Keranjang dengan stepper qty, diskon per transaksi (dari preset)
- Kalkulasi subtotal → diskon → grand total otomatis
- Nomor order urut harian (reset tiap hari)
- Simpan transaksi atomik dengan **snapshot harga** (laporan historis tetap akurat walau harga menu berubah)
- Preview struk + cetak ke **thermal printer Bluetooth (ESC/POS, 58mm)**
- Metode bayar: Tunai + QRIS (V1) · + Transfer + Debit (V2)

**Menu**
- CRUD kategori
- CRUD produk: nama, harga, status tersedia/habis (toggle cepat)

**Dashboard**
- Omzet hari ini · minggu ini · bulan ini
- Grafik omzet 7 hari terakhir
- Produk terlaris
- Analisa diskon per preset bulan ini
- Pengingat backup otomatis

**Riwayat**
- Daftar transaksi + detail per order
- Cetak ulang struk
- Void transaksi (salah input, tidak ada uang keluar)
- Refund transaksi — V2 (pembeli sudah bayar, minta uang kembali)

**Backup & Restore**
- Export **satu file Excel**: Sheet 1 laporan (human-readable) + Sheet 2 `BACKUP_DATA` (machine-readable)
- Bagikan via WhatsApp / Google Drive (expo-sharing)
- Import balik dari file backup untuk pindah / pasang ulang HP

**Pengaturan**
- Profil UMKM (nama, alamat, telp, footer struk) — tampil di struk
- Kelola preset diskon (persen; support desimal, misal 12.5%)
- Program Promo BOGO & Buy2Get1 per produk — V2
- Info aplikasi & status aktivasi

**Aktivasi**
- Onboarding 2 langkah: input kode (validasi Supabase) → isi profil UMKM

---

## 💰 Catatan teknis penting

- Semua nominal **Integer Rupiah** (tanpa desimal/float)
- Transaksi menyimpan **snapshot** harga & nama — laporan tidak pernah JOIN ke menu
- Rounding per-item (bukan per-total) — UI, struk, dan DB selalu angka sama
- Sheet `BACKUP_DATA` jangan diedit manual (format strict untuk import)
- Void ≠ hapus. Semua transaksi tetap di DB; omzet hanya dari `status = 'completed'`

---

## 🔀 V1 vs V2

Satu codebase, satu schema SQLite. Mode dikontrol **satu ENV**:

```
EXPO_PUBLIC_POS_VERSION=v1   # default — launch awal
EXPO_PUBLIC_POS_VERSION=v2   # flip kapanpun siap
```

| Flag | V1 | V2 |
|---|---|---|
| Metode bayar | Tunai + QRIS | + Transfer + Debit |
| Refund | ✗ | ✓ |
| Promo engine (BOGO/Buy2Get1) | ✗ | ✓ |
| Kelola Program Promo | ✗ | ✓ |

> Schema SQLite **identik** di V1 & V2 — flip versi **tidak butuh migrasi** atau reset DB.

Setelah ganti ENV, restart Metro dengan clear cache:
```bash
pnpm expo start -c
```

---

## 📁 Struktur

```
src/
  app/                  # Layar (expo-router file-based)
    (tabs)/             # Beranda, Kasir, Menu, Riwayat, Pengaturan
    aktivasi.tsx        # Onboarding
    promo.tsx           # Kelola Program Promo (V2)
  components/
    dashboard/          # StatCard, ChartOmzet, TopProduk, AnalisaDiskon
    kasir/              # MenuGrid, KeranjangPanel, DiskonInput, StrukPreview
    menu/               # FormMenuItem, KategoriList, MenuItemCard
    pengaturan/         # FormPromoRule
    shared/             # AlertBackup, EmptyState
  lib/
    db/                 # SQLite + query (menu, transaksi, pengaturan, promo)
    export/             # Excel export & import
    printer/            # Cetak struk ESC/POS
    aktivasi/           # Validasi kode (Supabase)
    cart/               # Promo engine
    config/             # Feature flags (V1/V2)
    utils/              # currency, date, device
  constants/            # colors.ts (tema "Warung Modern")
assets/                 # Icon, splash (tetap di root)
.env                    # ENV lokal (jangan di-commit)
```

---

## 🚀 Cara pakai

1. **Ekstrak ZIP**, salin / replace ke folder project.
   - ⚠️ **Hapus `App.tsx`** dari boilerplate — routing sekarang file-based (`src/app/`).
   - `package.json` sudah memakai `"main": "expo-router/entry"`.
   - `app.json` sudah dikonfigurasi `"srcDir": "src"`.

2. **Buat file `.env`** di root (lihat `.env.example`):
   ```
   EXPO_PUBLIC_POS_VERSION=v1
   ```

3. **Pasang dependency**:
   ```bash
   pnpm install
   pnpm expo install --fix
   pnpm approve-builds
   ```

4. **Isi kredensial Supabase** di `src/lib/aktivasi/aktivasi.ts`
   (ganti `SUPABASE_URL` dan `SUPABASE_ANON_KEY`), lalu buat tabel `aktivasi_kode`.

5. **Jalankan**:
   ```bash
   pnpm run android   # device/emulator (printer Bluetooth hanya di sini)
   pnpm run web       # preview UI saja
   ```

> Modul native (printer, document-picker, application) dipanggil dengan _safe require_ —
> UI tetap jalan di web preview, fitur Bluetooth aktif di build Android.

---

## ✅ Konfirmasi cakupan

Seluruh phase roadmap **0 → 3** sudah tersusun: setup struktur & aktivasi, core POS + cetak struk, laporan + backup/restore, hingga polish (profil, empty state, loading & konfirmasi aksi). Siap di-build menjadi APK dan didistribusikan ke UMKM via WhatsApp.