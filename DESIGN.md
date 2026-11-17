# DESIGN.md — Jengkeng

Acuan tampilan. Baca ini sebelum mengubah UI. Token ada di `src/app/globals.css`.

## Arah

Alat hitung untuk dipakai di tengah tongkrongan, satu tangan, cahaya redup. Jadi:
datar, kontras tinggi, satu aksen, angka mudah dibaca. Kepribadian datang dari
copy berbahasa Jawa, emote, dan cincin ±1000, bukan dari efek visual lain.

## Yang tidak boleh disentuh

- **Emoji rank dan emote** (👑 😜 😭 💩 👊🏻 🤕) adalah karakter game, bukan ikon.
  Jangan dihapus, diganti SVG, atau dipindah logikanya. Aturan generik "tanpa emoji"
  dari alat desain atau panduan gaya mana pun kalah dari poin ini.
- **Cincin berputar ±1000** (`SpinBorder.tsx`), desain pemilik. Lihat aturan 4.
- **Copy** ("Wayahe Ngitung", "Sreeet", "Sing Ngesret", dst). Tidak dirapikan, tidak diterjemahkan.
- **Alur** suara (TTS) dan tie-break: waktu kunci tombol, modal yang tidak bisa ditutup, spin di-commit dulu.

## Aturan

1. **Datar.** Tanpa gradient, glow, `blur`, `backdrop-blur`, atau `shadow-*` dekoratif.
   Pemisah antar elemen pakai `border-line`, bukan bayangan.
2. **Orange berarti AKSI.** `accent` hanya untuk tombol utama, fokus/pilihan, dan cincin +1000.
   Bukan untuk status, judul, ikon, atau dekorasi. `danger` (merah muda) hanya untuk makna:
   kalah, hukuman, hapus. Ini pengecualian di luar palet hitam-putih-orange.
3. **Hanya token.** Dilarang `zinc-*`, `amber-*`, `rose-*`, atau hex di komponen. Butuh warna baru?
   Tambah token dulu, jelaskan kenapa. Radius tetap rounded (kontrol `rounded-xl`, kartu dan
   sheet `rounded-2xl`, pil `rounded-full`); jangan diubah jadi 0px.
4. **Pemimpin = putih tebal, bukan orange.** Skor tertinggi `text-fg font-bold` dengan tint `bg-fg/10`;
   skor lain `text-fg-soft`; terendah `text-danger` dengan tint `bg-danger/10`. Tembus +1000 = cincin
   `accent-hover` berputar, tembus -1000 = cincin `danger` berputar. Ini satu-satunya animasi
   dekoratif yang diizinkan. Tanpa glow tambahan di sekelilingnya.
5. **Target sentuh:** tinggi ≥ 44px untuk semua tombol aksi dan ikon. Lebar ≥ 44px kecuali deretan
   7 chip pintasan skor di modal (lebar ≥ 36px, gap 4px), karena 7 chip + input harus muat di 360px.
6. **Kontras ≥ 4.5:1** untuk semua teks, termasuk placeholder. `fg-subtle` adalah yang terendah
   yang masih boleh dipakai untuk teks, dan jangan di atas `surface-3` (4.2:1). Batas input dan tombol
   outline pakai `line-control` (≥ 3:1), bukan `line`.
7. **Teks ≥ 12px.** Chip label dan stempel kecil boleh 11px. Angka ronde 14px (`text-sm`),
   baris terakhir/total 20px. Teks receipt PNG diekspor sebagai gambar, boleh lebih kecil.
8. **Gerak hanya yang berfungsi**, selain cincin ±1000. Tidak ada kelas animasi dekoratif
   (`animate-in`, `zoom-in`, dll. tidak ada di build ini; jangan ditulis). `prefers-reduced-motion`
   dihormati di `globals.css`.
9. **Fokus keyboard selalu terlihat** (`:focus-visible` global). Tombol ikon wajib `aria-label`.
10. Angka skor pakai `font-mono`; kolom angka sejajar memakai `tabular-nums`.
11. **Undo adalah tombol ikon** (`Undo2`, `aria-label="Salah Ngitung"`), outline, di kiri tombol utama.
    Tombol utama "Wayahe Ngitung" memenuhi sisa lebar.

## Token

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `bg` | #121417 | latar halaman |
| `surface` / `surface-2` / `surface-3` | #1a1d21 / #22262b / #2d3238 | kartu, kontrol, hover (diturunkan dari `bg`) |
| `line` / `line-strong` / `line-control` | #262a30 / #3a4048 / #626a75 | pemisah / border kontrol / batas input |
| `fg` / `fg-soft` / `fg-muted` / `fg-subtle` | #f5f5f5 / #d9dce1 / #a9afb8 / #8e949e | teks, dari utama ke paling redup |
| `accent` / `accent-hover` / `on-accent` | #ff5a1f / #ff7440 / #121417 | aksi; cincin +1000 |
| `danger` / `danger-solid` | #fb7185 / #e11d48 | teks kalah; isi tombol hapus |
| `success` | #34d399 | konfirmasi (impor berhasil) |

`#121417` juga dipakai sebagai `backgroundColor` saat export PNG di `FinishedScreen`
dan `background_color`/`theme_color` di `manifest.json`. Ubah `bg` = ubah ketiganya.

Catatan: orange `#ff5a1f` (hue 10°) dan `danger` (hue 351°) dekat. Karena orange hanya muncul di
tombol dan cincin, sedangkan merah muda hanya di skor/hukuman, keduanya jarang berdampingan.
Jangan pakai orange untuk skor atau status.

## Sebelum merge perubahan UI

- Foto ulang layar utama di 360px dan 390px; cek modal Wayahe Ngitung tidak meluber.
- Jalankan alur seri sampai vonis (modal spin tidak boleh bisa ditutup).
- Export PNG ("Share Hasile") dan lihat hasilnya.
- Buka dengan state game yang sedang berjalan dari versi sebelumnya (jangan hapus `localStorage`).

## Catatan alat

Arah ini disusun dengan referensi skill `ui-ux-pro-max` (prinsip Minimalism dan panduan UX: target
sentuh, jarak, fokus, reduced-motion) dan sebuah panduan gaya gelap berorange satu aksen. Dari
panduan itu hanya diambil: orange sebagai aksi, garis tipis, tanpa shadow, kontras tinggi.
Tidak diambil: sudut 0px, font berbayar, bobot 300, atau larangan ikon dekoratif.
