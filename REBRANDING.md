# Mesh AI Gateway Rebranding Strategy

Dokumen ini menjelaskan pendekatan rebranding dari upstream Bifrost ke distribusi **Mesh AI Gateway** tanpa mematahkan kompatibilitas teknis dan tanpa menyulitkan sinkronisasi upstream.

## Tujuan

- Menghilangkan ketergantungan hardcoded terhadap domain/vendor proprietary.
- Menjadikan identitas produk publik sebagai **Mesh AI Gateway**.
- Menjaga jalur sinkronisasi upstream tetap ringan (merge/pull rutin tetap memungkinkan).
- Meminimalkan risiko bug dengan pendekatan kompatibel ke belakang.

## Prinsip Implementasi

1. **Branding layer, bukan fork liar**
- Nama package/module internal upstream tidak diubah secara agresif.
- Identitas publik (banner, URL docs, URL release, path config, pesan CLI) dipusatkan ke variabel branding.
- Ini menjaga diff tetap terkontrol dan konflik merge upstream tetap rendah.

2. **Zero hard dependency ke domain proprietary**
- URL release/docs/schema harus bisa dioverride lewat environment variable.
- Validasi schema tidak lagi wajib mengambil resource dari domain eksternal.

3. **Backward compatibility**
- Tetap dukung path/env legacy bila perlu (`bifrost` dir lama, `BIFROST_HOST`, schema legacy URL).
- Migrasi berjalan bertahap, bukan breaking hard cut.

## Environment Variables Branding

- `MESH_GATEWAY_PRODUCT_NAME`: nama produk publik.
- `MESH_GATEWAY_PROJECT_URL`: URL project utama.
- `MESH_GATEWAY_DOCS_URL`: URL dokumentasi.
- `MESH_GATEWAY_CONFIG_DIR`: override path config penuh.
- `MESH_GATEWAY_CONFIG_DIR_NAME`: nama direktori config default.
- `MESH_GATEWAY_LEGACY_DIR_FALLBACK`: `true/false`, fallback otomatis ke direktori legacy.
- `MESH_GATEWAY_SCHEMA_URL`: URL schema canonical.
- `MESH_GATEWAY_DOWNLOAD_BASE_URL`: base URL untuk binary downloader.
- `MESH_GATEWAY_DOWNLOAD_CHANNEL`: channel/path segment release binary.
- `MESH_GATEWAY_RELEASE_API_URL`: endpoint metadata latest release.
- `MESH_GATEWAY_CACHE_NAMESPACE`: namespace cache binary local.
- `NEXT_PUBLIC_MESH_GATEWAY_RELEASE_API_URL`: endpoint latest release untuk UI.

## Aturan Sync Upstream

1. Pull/merge upstream ke branch integrasi.
2. Jalankan audit rebranding (`.github/workflows/scripts/rebranding-audit.sh`).
3. Perbaiki hanya surface branding layer yang terdampak.
4. Hindari edit massal import/module path internal upstream.
5. Pastikan perubahan lolos test/build sebelum release.

## Catatan

- Rebranding penuh seluruh string historis lintas dokumentasi besar dilakukan bertahap.
- Prioritas awal: runtime path kritis, URL kritis, konfigurasi, dan alat distribusi.
