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

## Upstream Sync Playbook

1. Tarik perubahan upstream ke branch integrasi (`upstream-sync/*`).
2. Jalankan guardrail rebranding:
   - `.github/workflows/scripts/rebranding-audit.sh`
3. Jalankan verifikasi teknis minimum:
   - `go test ./bifrost-http/lib ./bifrost-http/server` (dari folder `transports`)
   - `helm lint helm-charts/bifrost --set image.tag=<tag>`
   - `helm template mesh-ai-gateway helm-charts/bifrost --set image.tag=<tag>`
4. Jika audit gagal, lakukan patch hanya pada surface branding (URL/copy/default config), jangan menyentuh import path internal upstream.
5. Push perubahan sebagai PR terpisah:
   - PR-A: runtime/compatibility
   - PR-B: docs/ui/helm

## Aturan Patch (Minim Konflik)

1. Pertahankan struktur internal upstream (`github.com/maximhq/bifrost`, key `bifrost.*`) untuk menghindari konflik merge besar.
2. Centralize identitas publik di branding layer/env var, bukan replace string masif lintas package.
3. Legacy fallback hanya di titik yang disengaja:
   - schema lama (`https://www.getbifrost.ai/schema`)
   - release API lama (`https://getbifrost.ai/latest-release`)
   - download endpoint lama (`https://downloads.getmaxim.ai`)
4. Selain allowlist di atas, referensi vendor/domain lama harus dianggap regression dan diblokir CI.
5. Untuk perubahan Helm, utamakan copy publik + default image/referensi docs; key kompatibilitas tetap dipertahankan.

## Checklist Rebranding v1

- [x] Runtime branding layer (`transports/bifrost-http/lib/branding.go`)
- [x] Runtime compatibility fallback (host/config dir/schema/release URL)
- [x] CI guardrail rebranding (`rebranding-audit.yml` + script)
- [x] Allowlist legacy fallback terbatas dan eksplisit
- [x] UI fallback enterprise copy/link distandarkan ke Mesh AI Gateway
- [x] Helm copy + docs + default image dibersihkan dari referensi vendor lama
- [x] Helm `NOTES.txt`, `values.yaml`, `_helpers.tpl`, `README.md` konsisten
- [x] Helm smoke validation (`helm lint`, `helm template`)
- [x] Smoke test migrasi config dir/schema (fresh install + legacy fallback)
- [ ] Manual UI visual regression check (desktop/mobile) pasca-merge

## Catatan

- Rebranding lintas dokumen besar tetap dilakukan bertahap untuk menjaga ukuran diff.
- Fokus v1 adalah mengurangi vendor lock-in tanpa mengorbankan jalur sinkronisasi upstream.
