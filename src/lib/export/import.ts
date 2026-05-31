/**
 * import.ts — re-export tipis agar pemanggil lama (pilihDanImport) tetap jalan.
 *
 * Implementasi sebenarnya ada di excel.ts (importExcel). File ini dipertahankan
 * hanya untuk kompatibilitas; gunakan importExcel dari './excel'.
 */
export { importExcel as pilihDanImport, importExcel } from './excel';
