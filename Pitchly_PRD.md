# Pitchly — Product Requirements Document

**Simulator Panel Juri untuk Presentasi Kompetisi dan Akademik**
*"Latihan yang Terasa Seperti Kompetisi Sesungguhnya"*

BISA AI National AI Agent Challenge 2026 — Hackathon Sprint
Tim ASTAGA REG · Universitas Primakara
Versi 1.0 · Agustus 2026 · Status: Draft untuk Hackathon Sprint

---

## Daftar Isi

1. [Ringkasan Produk](#1-ringkasan-produk)
2. [Target Pengguna dan Persona](#2-target-pengguna-dan-persona)
3. [Ruang Lingkup Fitur untuk MVP](#3-ruang-lingkup-fitur-untuk-mvp)
4. [Alur Pengguna Utama (End-to-End)](#4-alur-pengguna-utama-end-to-end)
5. [Spesifikasi Fitur Detail](#5-spesifikasi-fitur-detail)
6. [Arsitektur Sistem dan Tech Stack](#6-arsitektur-sistem-dan-tech-stack)
7. [Skema Data Inti](#7-skema-data-inti)
8. [Filosofi dan Konsep Desain](#8-filosofi-dan-konsep-desain)
9. [Information Architecture — Landing Page](#9-information-architecture--landing-page)
10. [Information Architecture — Dashboard](#10-information-architecture--dashboard)
11. [Kebutuhan Non-Fungsional](#11-kebutuhan-non-fungsional)
12. [Roadmap Hackathon Sprint (3 Minggu)](#12-roadmap-hackathon-sprint-3-minggu)
13. [Metrik Keberhasilan MVP](#13-metrik-keberhasilan-mvp)

---

## 1. Ringkasan Produk

### 1.1 Latar Belakang

Sesi tanya jawab dengan juri adalah tahap paling menentukan sekaligus paling ditakuti dalam presentasi kompetisi, seminar proposal, maupun sidang skripsi. Riset menunjukkan kecemasan mahasiswa terhadap sesi ini lebih besar dipicu oleh pertanyaan penguji dan ketidaksiapan menghadapi tekanan tanya jawab, dibanding penguasaan materi itu sendiri. Ruang latihan yang tersedia saat ini terbatas pada dosen pembimbing dan rekan tim, yang tidak selalu bisa mensimulasikan gaya bertanya juri yang beragam maupun tersedia sesering yang dibutuhkan.

Pitchly adalah AI Agent yang mensimulasikan sesi presentasi dan tanya jawab kompetisi secara adaptif. Pengguna mengunggah dokumen proposal/pitch deck beserta pedoman penilaian kompetisi yang diikuti, lalu sistem menjalankan simulasi panel juri multi-persona yang bertanya sesuai gaya dan bobot penilaian kompetisi tersebut, memberikan kritik langsung, serta menyusun rencana perbaikan berdasarkan pola kelemahan yang terdeteksi.

### 1.2 Tujuan Dokumen

Menjabarkan kebutuhan produk untuk membangun Pitchly menjadi Minimum Viable Product (MVP) yang dapat dijalankan dan didemonstrasikan, sesuai ketentuan Hackathon Sprint BISA AI National AI Agent Challenge 2026. Dokumen ini adalah acuan bersama tim ASTAGA REG untuk cakupan fitur, arsitektur teknis, desain antarmuka, dan target penyelesaian selama sprint 3 minggu.

### 1.3 Prinsip Produk

- **Substansi di atas gimmick** — agent menilai kualitas argumentasi dan jawaban, bukan sekadar kelancaran bicara atau gestur.
- **Rubrik mengikuti kompetisi, bukan sebaliknya** — bobot dan gaya penilaian dikalibrasi dari pedoman yang diunggah pengguna, bukan rubrik akademik generik yang tetap.
- **Satuan latihan adalah tim** — koordinasi jawaban antar anggota turut diuji, bukan hanya performa individu.
- **Latihan berulang dengan memori** — sistem mengenali pola kelemahan yang berulang lintas sesi, bukan memberi skor sekali pakai.

---

## 2. Target Pengguna dan Persona

Target pengguna utama: pelajar SMA/SMK/MA dan mahasiswa yang aktif mengikuti kompetisi berbasis presentasi (hackathon, lomba inovasi, business plan competition), serta mahasiswa tingkat akhir yang mempersiapkan seminar proposal atau sidang skripsi.

**Persona 1 — Rangga, Ketua Tim Hackathon**
- Mahasiswa tingkat 3, memimpin tim 3-4 orang, sering ikut kompetisi inovasi teknologi.
- Butuh: latihan menjawab pertanyaan teknis dan bisnis yang tajam, plus memastikan seluruh anggota tim kompak saat dicecar juri.
- Frustrasi saat ini: dosen pembimbing hanya sempat mereview sekali sebelum hari-H.

**Persona 2 — Wulan, Mahasiswa Tingkat Akhir**
- Sedang menyusun sidang proposal skripsi, gugup menghadapi gaya bertanya dosen penguji yang belum ia kenal.
- Butuh: latihan berulang dengan tekanan realistis, serta rekap kelemahan yang konsisten muncul di jawabannya.

**Persona 3 — Bimo, Pembina Unit Kemahasiswaan**
- Mendampingi belasan tim kompetisi sekaligus menjelang keberangkatan lomba eksternal.
- Butuh: alat pendampingan yang bisa diulang mandiri oleh tim tanpa menambah beban pendampingan manualnya.

---

## 3. Ruang Lingkup Fitur untuk MVP

Cakupan disusun dengan pendekatan MoSCoW agar realistis diselesaikan dalam Hackathon Sprint 3 minggu, sekaligus tetap mendemonstrasikan nilai inti Pitchly.

| Fitur | Prioritas MVP | Catatan Cakupan |
|---|---|---|
| Analisis dokumen awal | **Must Have** | Ringkasan kelemahan problem statement, kelayakan teknis, dampak dari 1 LLM call terstruktur |
| Panel juri multi-persona (3 juri) | **Must Have** | Juri Teknis, Juri Dampak, Juri Skeptis — inti demo produk |
| Kalibrasi rubrik per kompetisi | **Must Have** | Upload PDF pedoman lomba, diringkas jadi bobot penilaian oleh LLM |
| Scorecard dan rencana perbaikan | **Must Have** | Wajib ada agar sesi terasa tuntas dan bisa didemokan end-to-end |
| Mode teks (tanpa suara) | **Must Have** | Jalur utama demo, paling stabil untuk ditunjukkan ke juri |
| Simulasi tim (multi anggota, peran) | Should Have | Diprioritaskan jika waktu sprint mencukupi setelah alur individu stabil |
| Pemantau waktu dan pacing | Should Have | Timer sederhana per segmen presentasi |
| Mode suara (STT/TTS) | Could Have | Nilai tambah demo, bukan penentu kelulusan fungsi inti |
| Pemeriksa gap orisinalitas (vector search) | Could Have | Butuh basis data vektor terisi contoh solusi, disiapkan jika waktu tersisa |
| Riwayat lintas sesi & deteksi pola berulang | Won't Have (fase ini) | MVP cukup 1 sesi lengkap; riwayat dibangun setelah Hackathon Sprint |

---

## 4. Alur Pengguna Utama (End-to-End)

1. Pengguna mendaftar/masuk, lalu membuat tim (opsional untuk mode individu).
2. Pengguna memulai sesi baru: mengunggah dokumen proposal/pitch deck dan pedoman penilaian kompetisi.
3. Agent Analisis Dokumen memproses berkas dan menampilkan ringkasan kelemahan awal sebelum simulasi dimulai.
4. Pengguna memilih mode (individu/tim) dan mode input (teks/suara), lalu memulai simulasi.
5. Agent Panel Juri menjalankan tanya jawab bergantian dari tiga persona juri, mengacu pada rubrik yang telah dikalibrasi.
6. Agent Pemantau Waktu melacak pacing selama sesi berlangsung dan menampilkan indikator di layar.
7. Setelah sesi selesai, Agent Scorecard merangkum hasil menjadi laporan penilaian dan rencana perbaikan yang dapat diunduh atau ditinjau ulang.

---

## 5. Spesifikasi Fitur Detail

### 5.1 Analisis Dokumen Awal
Membedah proposal/pitch deck untuk menandai bagian problem statement, kelayakan teknis, dan dampak yang masih lemah, sebelum sesi simulasi dimulai.
- **User story:** Sebagai peserta, saya ingin tahu bagian proposal saya yang masih lemah sebelum dicecar juri, agar saya bisa bersiap secara mental.
- **Acceptance criteria:** minimal 3 temuan kelemahan terstruktur per dokumen, masing-masing menyebut bagian dokumen yang dirujuk.
- **Acceptance criteria:** proses analisis selesai di bawah 60 detik untuk dokumen hingga 15 halaman.

### 5.2 Panel Juri Multi-Persona
Tiga persona juri dalam satu sesi: Juri Teknis (kelayakan implementasi), Juri Dampak (manfaat & skalabilitas), Juri Skeptis (mencari celah pada solusi).
- **User story:** Sebagai peserta, saya ingin dihadapkan pada gaya bertanya yang berbeda-beda seperti kompetisi sungguhan.
- **Acceptance criteria:** tiap persona punya nada dan fokus pertanyaan berbeda dan konsisten sepanjang sesi.
- **Acceptance criteria:** pengguna dapat melihat persona mana yang sedang bertanya pada tiap giliran.

### 5.3 Kalibrasi Rubrik per Kompetisi
Pengguna mengunggah pedoman penilaian kompetisi; sistem meringkas kriteria dan bobotnya, lalu menyesuaikan gaya dan fokus pertanyaan panel juri secara otomatis.
- **User story:** Sebagai peserta, saya ingin panel juri bertanya sesuai rubrik lomba yang saya ikuti, bukan rubrik generik.
- **Acceptance criteria:** sistem mengekstrak minimal kategori penilaian dan bobotnya dari dokumen pedoman.
- **Acceptance criteria:** jika ekstraksi gagal/dokumen tidak lengkap, sistem menawarkan template rubrik umum sebagai cadangan.

### 5.4 Pemantau Waktu dan Pacing
Melacak alokasi waktu presentasi & tanya jawab agar proporsional antara pembukaan, penjelasan solusi, dan penutup.
- **User story:** Sebagai peserta, saya ingin tahu apakah saya terlalu lama di satu bagian sehingga bisa mengatur ulang durasi latihan saya.
- **Acceptance criteria:** indikator waktu berjalan terlihat sepanjang sesi tanpa mengganggu alur tanya jawab.

### 5.5 Simulasi Tim
Setiap anggota tim mengambil peran berbeda, dengan pertanyaan lintas peran yang menguji koordinasi jawaban antar anggota.
- **User story:** Sebagai ketua tim, saya ingin melatih tim saya menjawab kompak, karena juri sungguhan sering melempar pertanyaan ke anggota berbeda.
- **Acceptance criteria:** sistem dapat mengarahkan pertanyaan ke anggota tim tertentu berdasarkan peran yang didaftarkan.

### 5.6 Pemeriksa Gap Orisinalitas
Memindai apakah ide yang diajukan sudah memiliki solusi serupa di pasar.
- **User story:** Sebagai peserta, saya ingin tahu lebih awal jika ide saya terlalu mirip solusi yang sudah ada.
- **Acceptance criteria:** sistem menampilkan daftar solusi dengan kemiripan tertinggi beserta skor kemiripannya.

### 5.7 Scorecard dan Rencana Perbaikan
Merangkum hasil simulasi ke dalam aspek penilaian yang relevan dari rubrik kompetisi, serta menandai pola kelemahan yang perlu diperbaiki.
- **User story:** Sebagai peserta, saya ingin laporan akhir yang jelas menunjukkan apa yang harus saya perbaiki, bukan sekadar angka skor.
- **Acceptance criteria:** laporan memuat skor per kategori rubrik, ringkasan kekuatan, ringkasan kelemahan, dan rekomendasi tindakan konkret.

---

## 6. Arsitektur Sistem dan Tech Stack

### 6.1 Ringkasan Arsitektur

Sistem dibangun dengan pola **multi-agent**: beberapa agent otonom dengan tugas khusus yang saling bertukar konteks melalui satu state bersama. Setiap agent memakai pola reasoning + tool use mengikuti kerangka **ReAct** — LLM menyusun rencana tindakan, memanggil tools relevan, lalu mengevaluasi hasil sebelum melanjutkan.

Lima agent utama: **Agent Analisis Dokumen**, **Agent Panel Juri**, **Agent Pemantau Waktu**, **Agent Rekomendasi Jawaban**, **Agent Scorecard** — diorkestrasi melalui **LangGraph** sebagai graf keadaan bersama.

### 6.2 Tech Stack (Final untuk Hackathon Sprint)

| Layer | Teknologi | Fungsi |
|---|---|---|
| Frontend | **Next.js** (React, App Router) + TypeScript | Landing page dan dashboard, SSR untuk performa dan SEO landing page |
| Styling/UI | Tailwind CSS + komponen kustom, **Lucide Icons** | Sistem desain konsisten, tanpa emoji, ikon single-stroke |
| AI Model — Utama | **GPT** (generasi terbaru, tool calling) | Model utama untuk seluruh reasoning agent: analisis dokumen, panel juri, scorecard |
| AI Model — Fallback | **Gemini** (generasi terbaru, tool calling) | Otomatis mengambil alih bila panggilan GPT gagal/timeout/limit, menjaga sesi tidak terhenti saat demo |
| Orkestrasi Agent | **LangGraph** (Python) | Mengatur graf keadaan dan urutan eksekusi 5 agent, termasuk percabangan logika |
| Backend/API | **Python — FastAPI** | Seluruh REST/streaming API, autentikasi, orkestrasi agent, integrasi model |
| Basis Data Relasional | PostgreSQL | users, teams, sessions, documents, competition_rubrics, scorecards |
| Basis Data Vektor | Chroma | Mendukung pemeriksa gap orisinalitas via pencarian kemiripan semantik |
| Pengenalan Suara | Whisper (STT), TTS opsional | Mode latihan lisan sebagai pelengkap mode teks |
| Penyimpanan Berkas | Object storage (S3-compatible) | Menyimpan dokumen secara terenkripsi |
| Deployment | Docker + VPS | Konsistensi lingkungan dev dan produksi |

**Alasan GPT utama + Gemini fallback:**
- Redundansi model mengurangi risiko sesi macet saat demo langsung akibat rate limit/downtime satu provider.
- Lapisan pemanggilan LLM dibuat generik (satu interface prompt/response) di backend Python, sehingga agent tidak perlu tahu model mana yang aktif — cukup satu titik switch di konfigurasi.
- **Kriteria fallback:** percobaan ke GPT gagal (timeout, error 5xx, atau rate limit) → retry sekali → jika tetap gagal, request otomatis dialihkan ke Gemini dengan prompt yang sama, dicatat di log sesi untuk transparansi.

**Kenapa Next.js untuk frontend:**
- App Router mendukung campuran halaman statis (landing page) dan halaman interaktif penuh (dashboard, sesi live) dalam satu basis kode.
- Route handlers Next.js dapat menjadi lapisan tipis di depan backend FastAPI untuk kebutuhan seperti streaming respons panel juri ke UI.

### 6.3 Alur Data antar Komponen

Dokumen yang diunggah disimpan di object storage dan diindeks di basis data vektor untuk pemeriksa orisinalitas. Agent Analisis Dokumen mengambil isi dokumen dari object storage, memanggil LLM (GPT, fallback Gemini) untuk meringkas kelemahan awal, lalu menuliskan hasilnya ke basis data relasional. Agent Panel Juri membaca pedoman kompetisi dari tabel `competition_rubrics` untuk menentukan gaya dan bobot pertanyaan, lalu menjalankan percakapan tanya jawab melalui antarmuka Next.js yang berkomunikasi dengan backend FastAPI. Setiap giliran tanya jawab dicatat oleh Agent Pemantau Waktu dan diteruskan ke Agent Rekomendasi Jawaban, sebelum digabungkan oleh Agent Scorecard menjadi laporan akhir tersimpan di tabel `scorecards`.

### 6.4 Keamanan dan Privasi Data

- Seluruh dokumen disimpan terenkripsi dan hanya dapat diakses oleh akun pemilik dokumen.
- Kebijakan retensi data memungkinkan penghapusan permanen atas permintaan pengguna.
- Kredensial API model (GPT, Gemini) dan kunci layanan lain disimpan sebagai environment variable di backend, tidak pernah diekspos ke frontend.

---

## 7. Skema Data Inti

| Entitas | Field Kunci | Keterangan |
|---|---|---|
| `users` | id, nama, email, role | Akun pengguna individu |
| `teams` | id, nama_tim, owner_id | Kelompok pengguna untuk mode simulasi tim |
| `team_members` | id, team_id, user_id, peran | Relasi anggota tim beserta peran presentasi |
| `documents` | id, owner_id, tipe, url_storage, status_analisis | Proposal/pitch deck yang diunggah |
| `competition_rubrics` | id, owner_id, nama_kompetisi, kriteria_json, bobot_json | Hasil ekstraksi pedoman penilaian kompetisi |
| `sessions` | id, team_id/user_id, document_id, rubric_id, mode, status, mulai_pada, selesai_pada | Satu kali sesi simulasi panel juri |
| `session_turns` | id, session_id, persona_juri, pertanyaan, jawaban, penjawab_id, waktu_tempuh | Log tiap giliran tanya jawab dalam sesi |
| `scorecards` | id, session_id, skor_per_kategori_json, ringkasan_kekuatan, ringkasan_kelemahan, rencana_perbaikan | Hasil akhir penilaian satu sesi |

---

## 8. Filosofi dan Konsep Desain

### 8.1 Konsep Besar: "Ruang Sidang"

Konsep desain Pitchly disebut **Ruang Sidang** — memadukan ketegangan terarah dari sorotan panggung (spotlight) dengan ketenangan dan kredibilitas ruang dokumen resmi (dossier). Dua suasana ini sengaja dipisahkan mengikuti alur emosional pengguna: saat sesi simulasi berlangsung, antarmuka terasa seperti berdiri di panggung — gelap, fokus, dan bertekanan wajar. Setelah sesi selesai, antarmuka beralih ke suasana dokumen kredibel yang tenang untuk membaca hasil dan merancang perbaikan.

Prinsip ini sengaja menjauh dari bahasa visual generik startup AI. Pitchly tidak menggunakan gradasi ungu-biru mengambang, kartu kaca buram (glassmorphism) di atas blob bercahaya, maskot robot generik, ikon bertumpuk warna-warni, atau elemen bertabur bintang/kilau sebagai penanda "AI-powered". Produk ini menangani kecemasan nyata mahasiswa menghadapi juri sungguhan, sehingga antarmukanya harus terasa presisi dan dapat dipercaya, bukan main-main.

### 8.2 Yang Sengaja Dihindari (Anti AI-Slop Checklist)

- Gradasi ungu-ke-biru sebagai latar utama, atau blob warna mengambang dengan blur berlebihan.
- Glassmorphism berlapis-lapis tanpa fungsi (kartu transparan di atas kartu transparan).
- Maskot robot/otak generik dan ilustrasi "AI" klise (jaringan saraf, sirkuit, partikel bercahaya).
- Ikon rainbow tak konsisten warnanya, drop shadow tebal pada semua elemen, sudut membulat berlebihan pada segala hal.
- Emoji di mana pun dalam antarmuka — semua penanda status memakai Lucide Icon single-stroke.
- Copywriting hiperbolis ("revolusioner", "game-changing") — nada komunikasi tetap presisi dan membumi.

### 8.3 Tipografi

| Peran | Font | Alasan Pemilihan |
|---|---|---|
| Judul/Headline (Display) | **Fraunces** (serif editorial) | Memberi bobot dan gravitas seperti dokumen resmi/dossier kompetisi, membedakan Pitchly dari sans-serif generik produk AI kebanyakan |
| UI dan Teks Isi | **Inter** | Grotesque sans yang sangat terbaca di ukuran kecil, netral, cocok untuk kepadatan informasi dashboard |
| Angka, Skor, Timer | **IBM Plex Mono** | Karakter monospace menegaskan kesan presisi dan pengukuran pada skor dan indikator waktu |

### 8.4 Palet Warna

Palet dibangun dari dua suasana: dasar gelap **Ink Navy** untuk pengalaman panggung/simulasi, dan dasar terang **Warm Paper** untuk pengalaman dokumen/laporan. Warna aksen dipakai secara sangat terbatas dan selalu punya makna semantik, bukan dekorasi.

| Warna | Kode | Penggunaan |
|---|---|---|
| Ink Navy | `#0E1420` | Latar dashboard mode simulasi, teks utama di atas Warm Paper, elemen chrome navigasi |
| Warm Paper | `#F7F4EE` | Latar landing page dan halaman laporan/scorecard, terasa seperti kertas dokumen, bukan putih steril |
| Spotlight Amber | `#B87A1E` | Aksen utama: CTA, indikator giliran aktif, timer berjalan — dipakai sangat sedikit agar tetap terasa istimewa |
| Growth Teal | `#2F6F63` | Semantik positif: skor naik, kekuatan yang teridentifikasi, status "terverifikasi" |
| Critique Rust | `#9C4221` | Semantik perhatian: kelemahan yang ditandai Juri Skeptis, celah orisinalitas — hangat, bukan merah alarm klinis |
| Ink Gray | `#6B6558` | Teks sekunder, label, garis pembatas halus |

**Prinsip pemakaian warna:**
- Amber hanya untuk satu elemen fokus di satu waktu (satu CTA utama, satu timer aktif) — tidak dipakai sebagai warna latar besar.
- Teal dan Rust hanya untuk penanda semantik (status kekuatan/kelemahan), tidak untuk dekorasi acak.
- Mode gelap (Ink Navy) dipakai konsisten selama sesi simulasi berlangsung agar pengguna merasakan tekanan panggung yang realistis; begitu sesi selesai, transisi ke Warm Paper menandai pergeseran ke mode refleksi.

### 8.5 Ikonografi

- Seluruh ikon memakai satu set konsisten: **Lucide Icons**, stroke tunggal 1.5px, tanpa isian (outline), tanpa emoji dalam bentuk apa pun.
- Warna ikon default mengikuti warna teks sekitarnya (Ink atau Ink Gray); warna semantik (Teal/Rust/Amber) hanya dipakai saat ikon menandai status tertentu.
- Ukuran ikon mengikuti skala tetap (16/20/24px) agar konsisten di seluruh dashboard, tidak diperbesar untuk efek dekoratif.

### 8.6 Gerakan dan Interaksi (Motion)

- Gerakan hanya dipakai untuk memberi makna: transisi antar pertanyaan juri (fade + slide halus 200ms), pengisian progress timer, dan perubahan status skor.
- Tidak ada animasi bouncy/spring berlebihan, tidak ada elemen dekoratif yang mengambang otomatis di latar belakang.
- Saat giliran juri berbicara, indikator persona yang aktif diberi highlight statis dengan garis tepi Amber tipis — bukan efek berkedip atau glow menyala.

---

## 9. Information Architecture — Landing Page

Landing page dibangun di atas Next.js sebagai halaman statis/SSR untuk kecepatan muat dan SEO, memakai palet Warm Paper sebagai dasar dengan aksen Amber pada CTA.

**1) Navigation Bar**
- Logo Pitchly (wordmark serif Fraunces) di kiri.
- Menu: Fitur, Cara Kerja, Panel Juri, Tentang Riset.
- Tombol "Masuk" (sekunder) dan "Mulai Latihan" (primer, Amber) di kanan.

**2) Hero Section**
- Headline serif besar mengangkat titik masalah, bukan klaim generik "AI canggih".
- Subheadline: penjelasan singkat cara kerja Pitchly dalam 1-2 kalimat.
- CTA primer "Mulai Latihan Gratis" dan CTA sekunder "Lihat Contoh Simulasi".
- Visual hero: tangkapan layar nyata antarmuka simulasi panel juri (mode gelap Ink Navy), bukan ilustrasi abstrak.

**3) Bagian Masalah**
- Tiga poin statistik singkat dari riset yang mendasari Pitchly (kecemasan tanya jawab sebagai faktor dominan, keterbatasan skala latihan konvensional), masing-masing dengan satu ikon Lucide netral.

**4) Cara Kerja (4 Langkah)**
1. Unggah proposal dan pedoman kompetisi.
2. Sistem mengalibrasi rubrik dan menganalisis kelemahan awal dokumen.
3. Jalani simulasi tanya jawab dengan tiga persona panel juri.
4. Terima scorecard dan rencana perbaikan yang bisa langsung ditindaklanjuti.
- Ditampilkan sebagai daftar bernomor editorial (angka besar serif), bukan ikon panah melingkar generik.

**5) Fitur Utama**
- Grid 7 fitur (lihat Bagian 5), masing-masing satu ikon Lucide, judul, dan deskripsi 1-2 baris — tanpa badge "AI-powered" berulang.

**6) Kenali Panel Juri Anda**
- Tiga kartu persona: Juri Teknis, Juri Dampak, Juri Skeptis — masing-masing dengan ikon berbeda dan contoh gaya pertanyaan.

**7) Simulasi Tim**
- Bagian khusus menonjolkan mode tim: tangkapan layar giliran pertanyaan berpindah antar anggota, dengan copy yang menegaskan bahwa juri sungguhan menguji koordinasi.

**8) Perbandingan dengan Alat Lain**
- Tabel ringkas membandingkan Pitchly dengan alat simulasi sidang skripsi (rubrik tetap) dan alat analisis kelancaran bicara (tidak menilai substansi jawaban).

**9) Dasar Riset**
- Bagian singkat "Dibangun di atas riset", mengutip temuan bahwa pelatihan personal terbatas skalanya dan umpan balik langsung dengan kesempatan mengulang lebih efektif.

**10) FAQ**
- Pertanyaan seputar keamanan dokumen yang diunggah, jenis kompetisi yang didukung, dan bedanya mode individu vs tim.

**11) CTA Penutup**
- Ajakan mendaftar dengan headline singkat dan satu tombol Amber besar.

**12) Footer**
- Logo, tautan navigasi ulang, kontak tim ASTAGA REG, afiliasi Universitas Primakara dan BISA AI National AI Agent Challenge 2026.

---

## 10. Information Architecture — Dashboard

Dashboard memakai shell navigasi tetap (sidebar kiri, Ink Navy) dengan area konten yang berpindah suasana warna sesuai konteks: Warm Paper untuk halaman perencanaan/laporan, Ink Navy penuh untuk layar simulasi langsung.

**A. Autentikasi (Masuk/Daftar)**
- Form minimal: email/password atau OAuth, tanpa elemen dekoratif berlebihan.

**B. Onboarding Singkat**
- Isi nama tim (opsional), pilih mode utama yang ingin dicoba pertama kali (individu/tim), langsung diarahkan ke Dashboard Home.

**C. Dashboard Home / Overview**
- Kartu ringkasan: jumlah sesi selesai, skor rata-rata sesi terakhir, status dokumen yang sedang diproses.
- Tombol utama "Mulai Sesi Baru" (Amber, paling menonjol di halaman).
- Daftar sesi terakhir dengan status masing-masing (dianalisis, siap simulasi, selesai).

**D. Wizard Sesi Baru (multi-step)**
1. Unggah dokumen proposal/pitch deck (drag and drop, validasi format).
2. Unggah pedoman kompetisi atau pilih dari rubrik tersimpan sebelumnya.
3. Pilih mode: individu atau tim; jika tim, tetapkan anggota dan peran presentasi masing-masing.
4. Pilih mode input: teks atau suara.
5. Ringkasan konfigurasi sebelum menekan "Mulai Analisis Dokumen".

**E. Halaman Analisis Dokumen Awal**
- Menampilkan hasil Agent Analisis Dokumen: daftar temuan kelemahan pada problem statement, kelayakan teknis, dan dampak, masing-masing merujuk bagian dokumen terkait.
- Tombol lanjut "Mulai Simulasi Panel Juri" setelah pengguna meninjau temuan.

**F. Layar Simulasi Panel Juri (Live Session)**
- Latar Ink Navy penuh layar untuk memperkuat suasana "panggung".
- Tiga label persona juri di bagian atas, dengan indikator visual siapa yang sedang bertanya.
- Panel pertanyaan aktif di tengah, area jawaban (teks/suara) di bawahnya.
- Indikator timer/pacing di sudut, memakai font monospace IBM Plex Mono.
- Log transkrip percakapan dapat dibuka sebagai panel samping yang dapat disembunyikan.

**G. Varian Sesi Tim**
- Tambahan indikator "giliran menjawab" menunjukkan anggota tim mana yang dituju pertanyaan, dengan opsi anggota lain menambahkan catatan dukungan sebelum jawaban dikirim.

**H. Halaman Scorecard dan Laporan**
- Beralih ke latar Warm Paper, menandai transisi dari panggung ke dokumen refleksi.
- Skor per kategori rubrik ditampilkan sebagai bar chart horizontal sederhana (bukan gauge/donut chart bergaya dashboard AI generik).
- Ringkasan kekuatan (ditandai Teal) dan kelemahan (ditandai Rust) dalam dua kolom berdampingan.
- Daftar rencana perbaikan konkret, dapat ditandai selesai satu per satu.
- Tombol unduh laporan (PDF) dan tombol "Latihan Ulang".

**I. Riwayat Sesi**
- Tabel seluruh sesi dengan tanggal, kompetisi terkait, mode (individu/tim), dan skor akhir.
- Grafik tren skor sederhana lintas sesi (fondasi meski deteksi pola otomatis masuk fase pengembangan berikutnya).

**J. Pustaka Rubrik Kompetisi**
- Daftar pedoman kompetisi yang pernah diunggah/dikalibrasi, dapat dipakai ulang untuk sesi baru tanpa unggah ulang.

**K. Manajemen Tim**
- Daftar anggota tim, undang anggota baru, atur peran presentasi default per anggota.

**L. Pengaturan Akun dan Privasi**
- Informasi akun dasar, opsi permintaan penghapusan permanen dokumen dan data sesi sesuai kebijakan retensi (Bagian 6.4).

---

## 11. Kebutuhan Non-Fungsional

**11.1 Keamanan dan Privasi**
- Enkripsi dokumen tersimpan (at rest) dan enkripsi lalu lintas data (in transit).
- Kontrol akses berbasis kepemilikan dokumen/sesi; anggota tim hanya melihat sesi timnya sendiri.

**11.2 Kinerja**
- Analisis dokumen awal ditargetkan selesai di bawah 60 detik untuk dokumen hingga 15 halaman.
- Latensi respons panel juri per giliran ditargetkan di bawah 5 detik agar sesi terasa mengalir wajar.

**11.3 Keandalan**
- Mekanisme fallback GPT ke Gemini aktif otomatis tanpa intervensi manual saat demo berlangsung.
- Sesi yang terputus di tengah jalan dapat dilanjutkan dari giliran terakhir yang tersimpan.

**11.4 Aksesibilitas dan Bahasa**
- Kontras warna teks terhadap latar (Ink Navy maupun Warm Paper) mengikuti standar keterbacaan minimum WCAG AA.
- Bahasa antarmuka utama adalah Bahasa Indonesia, konsisten dengan konteks kompetisi lokal yang menjadi fokus MVP.

---

## 12. Roadmap Hackathon Sprint (3 Minggu)

**Minggu 1 — Fondasi**
- Setup repository, skema database PostgreSQL, autentikasi dasar, integrasi object storage.
- Implementasi Agent Analisis Dokumen dan pemanggilan LLM (GPT utama, Gemini fallback) end-to-end.
- Landing page versi pertama di Next.js sesuai Bagian 9.

**Minggu 2 — Inti Simulasi**
- Orkestrasi LangGraph untuk Agent Panel Juri tiga persona dan Agent Pemantau Waktu.
- Layar simulasi live di dashboard (mode teks, mode individu) sesuai Bagian 10.F.
- Kalibrasi rubrik dari dokumen pedoman kompetisi yang diunggah.

**Minggu 3 — Penuntasan dan Demo**
- Agent Scorecard dan halaman laporan (Bagian 10.H), termasuk unduh PDF.
- Mode tim jika waktu mencukupi (Should Have); jika tidak, difokuskan untuk stabilitas mode individu.
- Uji coba end-to-end, rekam video demo, susun dokumentasi proyek dan repository GitHub sesuai ketentuan pengumpulan Hackathon Sprint.

---

## 13. Metrik Keberhasilan MVP

- Satu sesi simulasi dapat diselesaikan penuh dari unggah dokumen hingga scorecard tanpa intervensi manual di backend.
- Fallback GPT ke Gemini teruji berfungsi saat model utama disimulasikan gagal.
- Panel juri menghasilkan pertanyaan yang secara kualitatif berbeda gaya antar tiga persona, dapat dinilai oleh dewan juri saat demo.
- Waktu demo end-to-end (unggah sampai scorecard) muat dalam batas 5 menit video demo yang disyaratkan kompetisi.
