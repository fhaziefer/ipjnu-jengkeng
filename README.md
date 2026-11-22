This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Cadangan online (Neon)

Riwayat tetap *local-first* di HP. Salinannya dikirim diam-diam ke Neon (Postgres) supaya selamat kalau data browser terhapus. Kalau Neon belum disiapkan, app jalan normal dan kartu "Cadangan online" hanya menampilkan bahwa server belum bisa dihubungi.

**Menyiapkan (sekali saja)**

1. Vercel project → Storage / Marketplace → tambahkan **Neon**. Integrasi mengisi `DATABASE_URL` otomatis.
2. Di pengaturan integrasi, aktifkan *Create database branch for deployment → Preview*, supaya preview tidak menulis ke database produksi.
3. Redeploy. Tabel `backup_games` dan `backup_settings` dibuat sendiri saat request pertama (skema ada di `db/schema.sql`).

**Cara kerjanya**

- Kode cadangan tetap `0000` (satu device penghitung, kode ini bukan rahasia). Karena itu server **append-only** dan tidak punya endpoint hapus.
- Dikirim 3 detik setelah app dibuka, saat koneksi kembali, saat tab aktif lagi, dan beberapa detik setelah game selesai. Gagal = diam, dicoba lagi nanti.
- Pengirim hanya menulis ke store `jengkeng-sync`. Store game dan riwayat tidak pernah disentuh; hanya tombol **Pulihkan** (digerakkan user) yang menggabungkan riwayat dari server.
- Batas server: 50 game per permintaan, 5000 game per kode, 512 KB per body.

**Hapus cadangan di server** (tidak ada lewat HTTP, sengaja): jalankan di SQL Editor Neon

```sql
delete from backup_games;      -- semua game
delete from backup_settings;   -- kalimat TTS
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
