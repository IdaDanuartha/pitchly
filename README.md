# Pitchly

> **Simulator Panel Juri** untuk presentasi kompetisi dan akademik.

Tim **ASTAGA REG** · Universitas Primakara · BISA AI National AI Agent Challenge 2026.

Pitchly membantu peserta kompetisi melatih kemampuan presentasi dengan mensimulasikan sesi tanya-jawab dari tiga persona juri berbeda yang ditenagai AI (LangGraph + GPT-4o / Gemini). Sistem membaca dokumen proposal, menganalisis kelemahannya, lalu menjalankan simulasi panel juri interaktif dan menghasilkan scorecard + rencana perbaikan.

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Arsitektur](#arsitektur)
- [Struktur Monorepo](#struktur-monorepo)
- [Tech Stack](#tech-stack)
- [Cara Cepat (Docker)](#cara-cepat-docker)
- [Variabel Lingkungan](#variabel-lingkungan)
- [Pengembangan Lokal (tanpa Docker)](#pengembangan-lokal-tanpa-docker)
- [Alur Demo](#alur-demo)
- [Endpoint API](#endpoint-api)
- [Menjalankan Tes](#menjalankan-tes)
- [CI/CD & Container Registry](#cicd--container-registry)

---

## Fitur Utama

| Kategori | Fitur |
|---|---|
| **Onboarding** | Registrasi email + verifikasi, login Google OAuth, JWT refresh |
| **Manajemen Tim** | Buat tim, undang anggota, mode sesi individu / tim |
| **Upload Dokumen** | PDF ≤ 20 MB (konfigurasikan lewat `MAX_UPLOAD_MB`), enkripsi at-rest opsional |
| **Analisis Dokumen** | Ekstrak kelemahan proposal terstruktur dengan LLM |
| **Simulasi Panel Juri** | 3 persona juri (Teknis, Dampak, Skeptis) via LangGraph agentic graph |
| **Input Suara** | STT via Azure Speech / Edge-TTS fallback; TTS jawaban juri |
| **Cek Orisinalitas** | Vector search (ChromaDB) + Tavily web search untuk gap check |
| **Scorecard** | Skor per kategori, kekuatan/kelemahan, rencana perbaikan, cetak PDF |
| **Riwayat & Tren** | Dashboard sesi sebelumnya, grafik progres skor |
| **Privasi** | Hapus dokumen, hapus akun + data (GDPR-friendly) |
| **Billing** | Paket Free / Pro / Tim, toggle monthly/yearly |

---

## Arsitektur

```
Browser
  │
  ▼
┌──────────────────────────────┐
│  Next.js 16 (App Router)     │  :3010 (Docker) / :3000 (dev)
│  pitchly-fe                  │
│  · Landing · Auth · Dashboard│
│  · Session Wizard · Scorecard│
└────────────┬─────────────────┘
             │ HTTP (Route Handlers → proxy)
             ▼
┌──────────────────────────────┐
│  FastAPI  pitchly-be         │  :8000
│                              │
│  ┌─────────────────────────┐ │
│  │  LangGraph Agents       │ │
│  │  · panel_graph          │ │
│  │  · scorecard_graph      │ │
│  │  · suggestion_graph     │ │
│  │  · calibration_graph    │ │
│  └─────────┬───────────────┘ │
│            │                 │
│  ┌─────────▼───────────────┐ │
│  │  LLM Client             │ │
│  │  GPT-4o → Gemini (fall) │ │
│  └─────────────────────────┘ │
│                              │
│  SQLAlchemy async · ChromaDB │
└─────────────┬────────────────┘
              │
    ┌─────────▼─────────┐  ┌──────────────┐
    │  PostgreSQL 16     │  │  ChromaDB    │
    │  (pgdata volume)   │  │  (chroma vol)│
    └────────────────────┘  └──────────────┘
```

---

## Struktur Monorepo

```
pitchly/
├── docker-compose.yml
├── .env.example
├── pitchly-be/                  # Backend Python
│   ├── app/
│   │   ├── agents/              # LangGraph graphs & personas
│   │   │   ├── panel_graph.py   # Agentic panel juri (3 persona)
│   │   │   ├── scorecard_graph.py
│   │   │   ├── suggestion_graph.py
│   │   │   ├── calibration_graph.py
│   │   │   └── personas.py      # Prompt persona Teknis/Dampak/Skeptis
│   │   ├── api/                 # FastAPI routers
│   │   │   ├── auth.py          # Register, login, Google OAuth, refresh
│   │   │   ├── sessions.py      # CRUD sesi + semua sub-resource
│   │   │   ├── documents.py     # Upload, extract, enkripsi
│   │   │   ├── teams.py         # Tim & anggota
│   │   │   ├── rubrics.py       # Rubrik penilaian kustom
│   │   │   ├── billing.py       # Paket harga
│   │   │   ├── tts.py           # Text-to-speech juri
│   │   │   ├── transcribe.py    # Speech-to-text peserta
│   │   │   └── avatar.py        # D-ID / portrait fallback
│   │   ├── llm/                 # Abstraksi LLM (OpenAI ↔ Gemini)
│   │   ├── vector/              # ChromaDB wrapper (orisinalitas)
│   │   ├── storage/             # File handler + enkripsi at-rest
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic schemas (request/response)
│   │   ├── core/                # Config (pydantic-settings), JWT, security
│   │   ├── db/                  # Async engine, session, init_db
│   │   └── main.py              # App entrypoint & router mounting
│   ├── tests/                   # 22 modul tes (pytest-asyncio)
│   └── pyproject.toml
│
└── pitchly-fe/                  # Frontend TypeScript
    ├── src/
    │   ├── app/                 # Next.js App Router
    │   │   ├── page.tsx         # Landing page
    │   │   ├── (auth)/          # Login & register pages
    │   │   ├── dashboard/       # Dashboard, new-session wizard
    │   │   ├── session/[id]/    # Halaman sesi aktif & scorecard
    │   │   ├── verify/          # Email verification callback
    │   │   └── api/             # Route handlers (proxy ke backend)
    │   ├── components/
    │   │   ├── landing/         # Hero, Features, HowItWorks, Pricing, dll
    │   │   ├── dashboard/       # Sidebar, SessionCard, TeamManager
    │   │   ├── session/         # SessionWizard, JuriAvatar, Scorecard
    │   │   ├── auth/            # AuthForm, GoogleButton
    │   │   └── ui/              # Button, Input, dll (design system)
    │   ├── i18n/                # Dictionary Bahasa Indonesia
    │   └── lib/                 # Billing helpers, fetcher, utils
    └── package.json
```

---

## Tech Stack

### Backend

| Layer | Library / Tool |
|---|---|
| Framework | FastAPI 0.115+ |
| Runtime | Python 3.12, Uvicorn |
| ORM / DB | SQLAlchemy 2.0 async, asyncpg, PostgreSQL 16 |
| Migrasi | Alembic |
| Validasi | Pydantic v2, pydantic-settings |
| Auth | python-jose (JWT), bcrypt, Google OAuth via httpx |
| AI Agent | LangGraph 0.2+ |
| LLM | OpenAI (gpt-4o-mini / gpt-4o) dengan fallback Gemini (google-genai) |
| PDF | pypdf |
| Vector DB | ChromaDB 0.5+ |
| TTS | edge-tts (fallback), Azure Speech (opsional) |
| Email | Resend (opsional, auto-verify jika kosong) |
| Avatar | D-ID API (opsional) |
| Web Search | Tavily API (opsional, fitur orisinalitas Pro) |
| Testing | pytest, pytest-asyncio, httpx, aiosqlite |
| Container | Docker, docker-compose |

### Frontend

| Layer | Library / Tool |
|---|---|
| Framework | Next.js 16 (App Router) |
| Runtime | React 19 |
| Bahasa | TypeScript 5 |
| Styling | Tailwind CSS 4 (CSS-first config) |
| Animasi | GSAP 3 (ScrollTrigger scroll animations) |
| Icons | Lucide React |
| 3D | @react-three/fiber + drei (opsional) |
| Package Manager | pnpm 10 |

---

## Cara Cepat (Docker)

### Prasyarat

- Docker Engine ≥ 24 & Docker Compose V2
- Kunci API LLM (minimal salah satu: `OPENAI_API_KEY` atau `GEMINI_API_KEY`)

### Langkah

```bash
# 1. Clone repo
git clone https://github.com/IdaDanuartha/pitchly.git
cd pitchly

# 2. Siapkan environment
cp .env.example .env
# Edit .env — isi minimal OPENAI_API_KEY atau GEMINI_API_KEY, dan JWT_SECRET

# 3. Build & jalankan
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3010 |
| Backend API | http://localhost:8000 |
| Health check | http://localhost:8000/health |
| PostgreSQL | `localhost:5432` (dari host, jika port di-expose) |

> **Catatan:** Skema database dibuat otomatis saat container backend start (`app.db.init_db`).
> Data persisten di named volumes `pgdata`, `uploads`, `chroma`.

---

## Variabel Lingkungan

Salin `.env.example` ke `.env` dan isi sesuai kebutuhan.

### Wajib

| Variabel | Keterangan |
|---|---|
| `POSTGRES_USER` | User PostgreSQL (default: `pitchly`) |
| `POSTGRES_PASSWORD` | Password PostgreSQL |
| `POSTGRES_DB` | Nama database (default: `pitchly`) |
| `JWT_SECRET` | String acak panjang untuk signing JWT |
| `OPENAI_API_KEY` **atau** `GEMINI_API_KEY` | Minimal satu kunci LLM harus diisi |

### LLM

| Variabel | Keterangan | Default |
|---|---|---|
| `PRIMARY_MODEL` | Model utama OpenAI | `gpt-4o-mini` |
| `FALLBACK_MODEL` | Model Gemini fallback (koma-dipisah, dicoba berurutan) | `gemini-3.6-flash,...` |
| `EMBEDDING_MODEL` | Model embedding untuk ChromaDB | `text-embedding-3-small` |

### Fitur Opsional

| Variabel | Keterangan |
|---|---|
| `RESEND_API_KEY` | Email verifikasi (kosong = auto-verify saat dev) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Login Google OAuth |
| `TAVILY_API_KEY` | Cek orisinalitas via web search (Pro) |
| `DOCUMENT_ENCRYPTION_KEY` | Enkripsi dokumen at-rest (jangan ganti setelah ada data) |
| `DID_API_KEY` + `DID_SOURCE_*` | Avatar talking photo D-ID per persona |
| `AZURE_SPEECH_KEY` / `AZURE_REGION` | Azure STT/TTS (fallback: edge-tts) |
| `MAX_UPLOAD_MB` | Batas ukuran PDF (default: `20`) |

---

## Pengembangan Lokal (tanpa Docker)

### Prasyarat

- Python 3.12+
- Node.js 20+ & pnpm 10+
- PostgreSQL 16 berjalan lokal

### Backend

```bash
cd pitchly-be

# Buat virtual env
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Siapkan .env backend
cp .env.example .env
# Isi DATABASE_URL, JWT_SECRET, OPENAI_API_KEY / GEMINI_API_KEY

# Jalankan server
uvicorn app.main:app --reload
# → http://localhost:8000
```

### Frontend

```bash
cd pitchly-fe

# Install dependencies
pnpm install

# Isi BACKEND_URL jika backend tidak di port default
# (default sudah http://localhost:8000)

# Jalankan dev server
pnpm dev
# → http://localhost:3000
```

---

## Alur Demo

1. Buka **http://localhost:3010** (Docker) atau **http://localhost:3000** (dev).
2. Klik **Mulai Latihan** → daftar akun (atau masuk via Google).
3. Di dashboard, klik **Mulai Sesi Baru**.
4. Unggah proposal PDF (≤ 20 MB), isi nama kompetisi. Pedoman rubrik opsional.
5. Klik **Mulai Analisis Dokumen** → lihat temuan kelemahan proposal terstruktur.
6. Klik **Mulai Simulasi Panel Juri** → jawab 6 pertanyaan dari 3 persona juri:
   - 🔵 **Teknis** — detail implementasi & metodologi
   - 🟢 **Dampak** — relevansi sosial & sustainability
   - 🔴 **Skeptis** — kelemahan & risiko
7. Jawab lewat teks atau klik ikon mikrofon (STT).
8. Setelah sesi selesai, klik **Lihat Scorecard** → skor per kategori, kekuatan/kelemahan, dan rencana perbaikan.
9. Cetak scorecard sebagai PDF lewat `Ctrl+P` / `Cmd+P` browser.

> **Tanpa kunci LLM**, langkah analisis & simulasi akan gagal dengan pesan yang jelas.
> Isi minimal `OPENAI_API_KEY` atau `GEMINI_API_KEY` untuk menjalankan analisis nyata.

---

## Endpoint API

Base URL: `http://localhost:8000`

| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/auth/register` | Daftar akun baru |
| `POST` | `/auth/login` | Login, dapat JWT |
| `POST` | `/auth/refresh` | Refresh access token |
| `GET` | `/auth/google` | Redirect ke Google OAuth |
| `GET` | `/auth/google/callback` | Callback Google OAuth |
| `GET` | `/account/me` | Info profil pengguna |
| `PATCH` | `/account/me` | Update profil |
| `DELETE` | `/account/me` | Hapus akun + semua data |
| `GET` | `/sessions` | Daftar sesi milik user |
| `POST` | `/sessions` | Buat sesi baru |
| `GET` | `/sessions/{id}` | Detail sesi |
| `DELETE` | `/sessions/{id}` | Hapus sesi |
| `POST` | `/sessions/{id}/documents` | Upload dokumen PDF ke sesi |
| `POST` | `/sessions/{id}/analysis` | Trigger analisis kelemahan dokumen |
| `POST` | `/sessions/{id}/questions` | Generate pertanyaan dari juri |
| `POST` | `/sessions/{id}/answers` | Submit jawaban peserta |
| `POST` | `/sessions/{id}/scorecard` | Generate scorecard akhir |
| `POST` | `/sessions/{id}/suggestions` | Generate rencana perbaikan |
| `POST` | `/sessions/{id}/originality` | Cek orisinalitas (Pro) |
| `GET` | `/teams` | Daftar tim user |
| `POST` | `/teams` | Buat tim baru |
| `POST` | `/teams/{id}/members` | Undang anggota |
| `DELETE` | `/teams/{id}/members/{uid}` | Keluarkan anggota |
| `GET` | `/rubrics` | Daftar rubrik penilaian |
| `POST` | `/rubrics` | Buat rubrik kustom |
| `GET` | `/billing/plans` | Daftar paket harga |
| `POST` | `/tts` | Text-to-speech jawaban juri |
| `POST` | `/transcribe` | Speech-to-text input peserta |
| `GET` | `/avatar/{persona}` | URL avatar per persona |

Dokumentasi interaktif lengkap tersedia di **`/docs`** (Swagger UI) dan **`/redoc`**.

---

## Menjalankan Tes

```bash
cd pitchly-be

# Pastikan virtual env aktif
pytest                    # semua tes (aiosqlite, tanpa Postgres nyata)
pytest -v                 # verbose
pytest tests/test_auth.py # modul tertentu
pytest --tb=short -q      # ringkas
```

Terdapat **22 modul tes** mencakup: auth, sessions, documents, agents, LLM client, TTS, STT, originality, improvements, teams, rubrics, avatar, security, dan storage.

---

## CI/CD & Container Registry

Image Docker dipublikasikan ke **GitHub Container Registry** (GHCR) via GitHub Actions:

```
ghcr.io/idadanuartha/pitchly/pitchly-be:latest
ghcr.io/idadanuartha/pitchly/pitchly-fe:latest
```

`docker-compose.yml` akan menggunakan image dari GHCR jika tidak di-build ulang, atau build lokal dengan `--build`. Workflow CI berada di `.github/`.

---

## Lisensi

Proyek ini dibuat untuk keperluan kompetisi BISA AI National AI Agent Challenge 2026.
