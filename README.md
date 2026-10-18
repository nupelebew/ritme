# Ritme

Jadwal harian pribadi berbentuk PWA: timeline per jam, tugas dengan "3 hal terpenting", kebiasaan, timer fokus, rencana besok berbantuan Claude, dan track record. Dibuat untuk mahasiswa tingkat akhir yang mulai freelance dan tetap ingin punya waktu santai serta waktu bareng pasangan.

**100% gratis dan offline.** Tidak ada akun, server, atau kunci API. Semua data tersimpan di IndexedDB perangkatmu.

## Fitur

| Bagian | Isi |
|---|---|
| **Hari ini** | Timeline per jam dengan garis waktu sekarang dan blok berwarna per kategori. Bisa tambah, ubah, geser (tekan lama di HP), ubah durasi, dan hapus dengan urungkan. Ada kegiatan berulang (harian, hari kerja, atau hari pilihan; ubah satu kejadian atau seluruh seri). Di atasnya ada cincin ringkasan harian, 3 hal terpenting, dan centang kebiasaan. |
| **Tugas** | Prioritas, tenggat, subtugas, dan estimasi waktu. Tambah cepat cukup diketik, mis. `Kirim draft besok !3 #skripsi 30m`. Skor prioritas lokal menentukan "3 hal terpenting" lengkap dengan alasannya. Tombol *Jadwalkan* memasukkan tugas ke slot kosong. |
| **Kebiasaan** | Streak (hari libur tidak memutus streak), kalender 30 hari yang bisa dicentang mundur, dan statistik. |
| **Fokus** | Pomodoro dengan cincin timer, terhubung ke tugas atau kategori. Sesi tercatat otomatis, timer tetap jalan walau halaman di-reload, dan ada pil timer di halaman lain. |
| **Rencana besok** | Brain dump, lalu tombol **Buat prompt AI** menyalin prompt lengkap ke clipboard. Tempel balasan Claude untuk divalidasi dan dipratinjau sebelum diterapkan. Cadangannya: **susun otomatis tanpa AI**. |
| **Rekap mingguan** | Angka minggu ini, grafik per hari, keseimbangan kategori, dan prompt evaluasi untuk Claude. |
| **Track record** | Tren mingguan/bulanan, heatmap kalender, fokus per kategori, streak terpanjang, serta riwayat per tanggal dengan mood 1–5 dan catatan. |
| **Data** | Ekspor/impor JSON (cadangan lengkap) dan CSV (sesi, tugas, riwayat harian). Impor bisa digabung atau mengganti semua, dan bisa diurungkan. |
| **Notifikasi agenda** | Satu notifikasi "Agenda hari ini" yang menetap dan selalu terbarui: kegiatan sekarang/berikutnya, 3 tugas penting, kebiasaan yang belum dicentang. Tombol **✓ Selesai** mencentang tugas teratas tanpa membuka aplikasi, **⏱ Mulai fokus** langsung menjalankan timer. Android + Chrome juga bisa memunculkan ringkasan pagi otomatis. |
| **Pintasan & bagikan** | Tekan lama ikon untuk **Tambah tugas / Mulai fokus / Rencana besok**. Dari aplikasi lain → **Bagikan → Ritme** untuk menjadikan teks tugas atau brain dump besok (Android). Ada angka tugas jatuh tempo di ikon, dan layar tetap menyala selama fokus. |
| **Pengingat** | Notifikasi lokal sebelum kegiatan dan pengingat rencana besok di malam hari. Kalau notifikasi tidak tersedia, muncul banner saat aplikasi dibuka malam hari. |
| **Skripsi** | Milestone dengan target tanggal, cincin progres, hitung mundur sidang & laju yang dibutuhkan, jam fokus per milestone. Log bimbingan: poin revisi dosen langsung jadi tugas. |
| **Freelance** | Klien dengan tarif per jam/proyek. Sesi fokus pada tugas klien jadi jam tertagih. Invoice dengan status lunas, jatuh tempo, dan teks tagihan siap kirim. |
| **Bareng Pasangan** | Tukar kode QR jam sibuk 7 hari (tanpa isi kegiatan), lalu lihat slot kosong bersama dan langsung jadwalkan. Tanggal penting (anniversary, ulang tahun) dengan hitung mundur, dan daftar ide kencan dengan tombol acak. |
| **Perencanaan pintar** | Target jam mingguan per kategori, jam emas (jam paling fokus), rasio estimasi vs kenyataan, check-in energi pagi, jam tidur, dan template hari. Semuanya dipakai penyusun otomatis dan ikut masuk ke prompt AI. |
| **Bantuan kerja** | "Pecah langkah" (Claude atau pola umum) untuk tugas besar, "5 menit dulu" untuk tugas yang dihindari, suara latar fokus (hujan/derau), istirahat mata 20-20-20, dan tambah tugas pakai suara. |
| **Motivasi** | XP & level, 16 lencana, konfeti saat 3 tugas beres, refleksi malam 30 detik, dan **Ritme Wrapped** bulanan yang bisa dibagikan sebagai gambar. |
| **Lain-lain** | Pencarian global, tempat sampah 30 hari, ekspor ke Google Calendar (.ics), bagikan jadwal sebagai gambar, 5 warna aksen, kunci sidik jari/wajah, dan pengingat cadangan mingguan. |

Tampilannya glassmorphism dengan latar aurora, mode gelap (utama) dan terang, mobile-first dengan navigasi bawah. Ukuran sentuh minimal 44px, dan pengaturan *reduced motion* dihormati.

## Menjalankan di komputer

Butuh Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tes unit (Vitest)
npm run build      # hasil statis di dist/
npm run preview    # coba hasil build + service worker di http://localhost:4173
```

Struktur singkat:

```
src/
  app/          kerangka aplikasi, navigasi, tema, error boundary
  components/   komponen UI kaca (Card, Button, Sheet, Toast, …)
  db/           skema Dexie/IndexedDB, operasi data, cadangan
  features/     today, tasks, habits, focus, plan, review, stats, settings, reminders
  lib/          logika murni + tesnya (jadwal berulang, skor prioritas, timer, validasi rencana, statistik, CSV)
```

## Pakai Claude untuk menyusun jadwal (gratis)

1. Buka **Lainnya → Rencana besok** lalu tulis brain dump.
2. Ketuk **Buat prompt AI**. Prompt berisi konteksmu, jadwal tetap, tugas tertunda (beserta ID), kebiasaan, dan format JSON yang diminta, lalu tersalin ke clipboard.
3. Ketuk **Buka Claude**, tempel prompt di claude.ai (akun gratis cukup), lalu salin seluruh balasannya.
4. Tempel di kolom **Tempel hasil dari Claude**. Ritme mengecek format, jam, kategori, dan tabrakan jadwal, lalu menampilkan pratinjau.
5. Ketuk **Terapkan ke jadwal**. Masih bisa diurungkan.

Tidak ada data yang dikirim otomatis ke mana pun. Kamu sendiri yang menyalin dan menempel.

## Deploy gratis

Ritme memakai `HashRouter`, jadi tidak perlu aturan rewrite di hosting mana pun.

### Opsi A — Vercel (paling mudah)
1. Push folder ini ke repo GitHub.
2. Masuk ke [vercel.com](https://vercel.com) pakai akun GitHub → **Add New → Project** → pilih repo.
3. Vercel otomatis mendeteksi Vite (build `npm run build`, output `dist`) → **Deploy**.

### Opsi B — Netlify
1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import from Git** → pilih repo.
2. Build command `npm run build`, publish directory `dist` → **Deploy**.

Bisa juga tanpa Git: jalankan `npm run build`, lalu seret folder `dist/` ke halaman **Deploy manually** di Netlify.

### Opsi C — GitHub Pages
Workflow-nya sudah ada di `.github/workflows/deploy-pages.yml`.
1. Push ke branch `main`.
2. Di repo: **Settings → Pages → Source: GitHub Actions**.
3. Tunggu workflow selesai. Situs ada di `https://<username>.github.io/<nama-repo>/`.

Kalau build manual untuk subfolder, pakai `BASE=/nama-repo/ npm run build`.

> Notifikasi dan service worker butuh HTTPS. Ketiga hosting di atas sudah HTTPS otomatis.

## Pasang di layar utama

**Android (Chrome):** buka URL situsmu, ketuk menu **⋮ → Instal aplikasi** (atau **Tambahkan ke layar utama**). Bisa juga lewat **Lainnya → Pengaturan → Pasang Ritme**.

**iPhone/iPad (Safari):** buka URL di **Safari**, ketuk **Bagikan** (kotak dengan panah), pilih **Tambah ke Layar Utama**, lalu **Tambah**. Notifikasi di iOS hanya jalan setelah dipasang (iOS 16.4+).

**Laptop (Chrome/Edge):** klik ikon instal di ujung kanan address bar.

Setelah dibuka sekali saat online, Ritme bisa dipakai sepenuhnya offline. Kalau ada versi baru, muncul tombol **Perbarui**.

## Data, privasi, dan cadangan

- Data hanya ada di browser/perangkat tempat Ritme dipasang. HP dan laptop **tidak tersinkron otomatis**. Pindahkan data lewat **Ekspor JSON** di satu perangkat, lalu **Impor file** di perangkat lain.
- Menghapus data situs/browser berarti menghapus data Ritme. Cadangkan rutin (mis. seminggu sekali ke Drive atau chat pribadi).

## Batasan yang perlu diketahui

- **Widget layar utama** tidak tersedia untuk PWA di Android/iPhone. Penggantinya notifikasi agenda yang menetap, pintasan ikon, badge, dan ekspor .ics ke Google Calendar (widget kalender HP ikut menampilkannya). Ekspor .ics satu arah, jadi ekspor ulang setelah jadwal berubah.
- **Dikte suara** memakai pengenalan suara bawaan browser. Di Chrome prosesnya lewat server Google, jadi butuh internet. Fitur lainnya tetap offline.
- **Kunci sidik jari/wajah** adalah tirai privasi lokal (WebAuthn), bukan enkripsi data. Kuncinya terikat ke perangkat dan tidak ikut terbawa saat impor cadangan ke HP lain.
- **QR cari waktu bareng**: pemindai bawaan dipakai di Chrome Android, sedangkan browser lain memakai pustaka jsQR. Yang dibagikan hanya jam sibuk, tidak termasuk judul kegiatan.
- **Ringkasan pagi otomatis** memakai *Periodic Background Sync*: hanya Chrome Android dengan Ritme terpasang, dan jamnya ditentukan Android (tidak pasti).
- **Pengingat**: tanpa server push, notifikasi hanya bisa dikirim selama Ritme terbuka atau masih hidup di latar belakang. Kalau aplikasi ditutup total, Android/iOS tidak membangunkannya. Karena itu ada banner malam sebagai cadangan.
- Timer fokus tetap akurat walau aplikasi ditutup (berbasis jam akhir), tapi bunyi/notifikasi selesai baru muncul saat Ritme dibuka lagi bila sistem sudah menghentikannya.
- Kualitas rencana dari Claude bergantung pada balasannya. Validator menolak format yang salah dan memberi peringatan untuk tabrakan jadwal, tapi tetap cek pratinjaunya.
