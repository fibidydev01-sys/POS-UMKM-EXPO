/**
 * use-kasir.ts — DEPRECATED.
 *
 * State kasir sudah dipindah ke Zustand store: src/store/kasir-store.ts
 * File ini hanya ada sebagai catatan migrasi.
 *
 * Jika ada komponen lain yang masih import dari sini,
 * ganti dengan: import { useKasirStore } from '../store/kasir-store';
 *
 * File ini AMAN untuk dihapus.
 */
export { useKasirStore as useKasir } from '../store/kasir-store';
