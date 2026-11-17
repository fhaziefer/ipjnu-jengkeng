# DESIGN.md — Jengkeng

Acuan tampilan. Baca ini sebelum mengubah UI. Token ada di `src/app/globals.css`.

## Arah

Alat hitung untuk dipakai di tengah tongkrongan, satu tangan, cahaya redup. Jadi:
datar, kontras tinggi, satu aksen, angka mudah dibaca. Kepribadian datang dari
copy berbahasa Jawa dan emote, bukan dari efek visual.

## Yang tidak boleh disentuh

- **Emoji rank dan emote** (👑 😜 😭 💩 👊🏻 🤕) adalah karakter game, bukan ikon.
  Jangan dihapus, diganti SVG, atau dipindah logikanya. Aturan generik "tanpa emoji"
  dari alat desain mana pun kalah dari poin ini.
- **Copy** ("Wayahe Ngitung", "Sreeet", "Sing Ngesret", dst). Tidak dirapikan, tidak diterjemahkan.
- **Alur** suara (TTS) dan tie-break: waktu kunci tombol, modal yang tidak bisa ditutup, spin di-commit dulu.

## Aturan

1. **Datar.** Tanpa gradient, glow, `blur`, `backdrop-blur`, atau `shadow-*` dekoratif.
   Pemisah antar elemen pakai `border-line`, bukan bayangan.
2. **Satu aksen.** `accent` (amber) untuk aksi utama dan yang menang. `danger` (rose) hanya untuk
   makna: kalah, hukuman, hapus. Warna lain tidak dipakai sebagai dekorasi.
3. **Hanya token.** Dilarang `zinc-*`, `amber-*`, `rose-*`, atau hex di komponen. Butuh warna baru?
   Tambah token dulu, jelaskan kenapa.
4. **Sinyal game tetap statis.** Tembus +1000 = cincin `accent`, tembus -1000 = cincin `danger`
   (`ring-2 ring-inset`). Tanpa animasi berputar.
5. **Target sentuh ≥ 44px** untuk tombol aksi dan ikon; jarak antar target ≥ 8px
   (pengecualian: baris pintasan skor, 6px, karena 7 tombol harus muat di 360px).
6. **Kontras ≥ 4.5:1** untuk semua teks, termasuk placeholder. `fg-subtle` adalah yang terendah
   yang masih boleh dipakai untuk teks. Jangan turunkan.
7. **Teks ≥ 12px.** Chip label dan stempel kecil boleh 11px. Tidak ada 9px/10px.
8. **Radius:** kontrol `rounded-xl`, kartu dan sheet `rounded-2xl`, pil `rounded-full`. Tidak ada `3xl`.
9. **Gerak hanya yang berfungsi.** Tidak ada kelas animasi dekoratif (`animate-in`, `zoom-in`, dll. tidak
   ada di build ini; jangan ditulis). `prefers-reduced-motion` sudah dihormati di `globals.css`.
10. **Fokus keyboard selalu terlihat** (`:focus-visible` global). Tombol ikon wajib `aria-label`.
11. Angka skor pakai `font-mono`; kolom angka sejajar memakai `tabular-nums`.

## Token

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `bg` | #09090b | latar halaman |
| `surface` / `surface-2` / `surface-3` | #18181b / #27272a / #3f3f46 | kartu, kontrol, hover |
| `line` / `line-strong` | #27272a / #3f3f46 | border |
| `fg` / `fg-soft` / `fg-muted` / `fg-subtle` | #fafafa / #d4d4d8 / #a1a1aa / #94949d | teks, dari utama ke paling redup |
| `accent` / `accent-hover` / `on-accent` | #f59e0b / #fbbf24 / #09090b | aksi utama, pemenang |
| `danger` / `danger-solid` | #fb7185 / #e11d48 | teks kalah; isi tombol hapus |
| `success` | #34d399 | konfirmasi (impor berhasil) |

`#09090b` juga dipakai sebagai `backgroundColor` saat export PNG di `FinishedScreen`
dan `theme_color` di `manifest.json`. Ubah `bg` = ubah ketiganya.

## Sebelum merge perubahan UI

- Foto ulang layar utama di 360px dan 390px; cek modal Wayahe Ngitung tidak meluber.
- Jalankan alur seri sampai vonis (modal spin tidak boleh bisa ditutup).
- Export PNG ("Share Hasile") dan lihat hasilnya.
- Buka dengan state game yang sedang berjalan dari versi sebelumnya (jangan hapus `localStorage`).

## Catatan alat

Arah ini disusun dengan bantuan skill `ui-ux-pro-max` (hanya dipakai sebagai referensi, tidak
dipasang di repo). Generator `--design-system`-nya salah membaca "game" sebagai gaming dan
merekomendasikan gaya 3D serta pola landing page; yang dipakai hanya prinsip gaya
Minimalism & Swiss dan panduan UX (target sentuh, jarak, fokus, reduced-motion).
