# Pitchly

Simulator Panel Juri untuk presentasi kompetisi dan akademik.
Tim ASTAGA REG · Universitas Primakara · BISA AI National AI Agent Challenge 2026.

Alur berjalan penuh di Docker: **daftar → masuk → unggah dokumen + pedoman rubrik
→ analisis kelemahan awal → simulasi panel juri 3 persona (LangGraph), mode
individu/tim, input teks/suara → scorecard + rencana perbaikan → riwayat & tren
skor**. Termasuk manajemen tim, pemeriksa gap orisinalitas (Chroma vector search),
dan pengaturan privasi (hapus data/akun). Seluruh cakupan MoSCoW PRD (Must +
Should + Could) terbangun.

## Struktur

| Folder | Isi |
|---|---|
| `pitchly-be/` | Backend FastAPI (auth, upload, LLM GPT→Gemini fallback, analisis dokumen) |
| `pitchly-fe/` | Frontend Next.js 16 (landing, auth, dashboard, wizard, hasil analisis) |
| `docs/superpowers/` | Spec dan plan implementasi |

## Menjalankan dengan Docker

```bash
cp .env.example .env       # isi OPENAI_API_KEY dan GEMINI_API_KEY
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000 (health: `/health`, docs: `/docs`)
- PostgreSQL: `localhost:5432`

Skema database dibuat otomatis saat container backend start (`app.db.init_db`).

## Alur demo

1. Buka http://localhost:3000, klik **Mulai Latihan**, daftar akun.
2. Di dashboard, klik **Mulai Sesi Baru**.
3. Unggah proposal PDF, isi nama kompetisi (pedoman opsional), tinjau ringkasan.
4. Klik **Mulai Analisis Dokumen** → lihat temuan kelemahan terstruktur.
5. Klik **Mulai Simulasi Panel Juri** → jawab 6 pertanyaan dari 3 persona juri.
6. Setelah sesi selesai, klik **Lihat Scorecard** → skor per kategori, kekuatan/
   kelemahan, dan rencana perbaikan (cetak PDF lewat browser).

Tanpa kunci LLM, langkah analisis akan gagal dengan pesan yang jelas; isi
`OPENAI_API_KEY`/`GEMINI_API_KEY` di `.env` untuk menjalankan analisis nyata.

## Pengembangan lokal (tanpa Docker)

### Backend

```bash
cd pitchly-be
python -m venv .venv && .venv/Scripts/activate   # PowerShell: .venv\Scripts\Activate.ps1
pip install -e ".[dev]"
pytest                                            # 23 tes
uvicorn app.main:app --reload                     # butuh Postgres + DATABASE_URL
```

### Frontend

```bash
cd pitchly-fe
pnpm install
pnpm dev                                          # http://localhost:3000
```

Set `BACKEND_URL` (default `http://localhost:8000`) agar route handler FE
menemukan backend.

## Tech stack

FastAPI · SQLAlchemy 2.0 async · PostgreSQL · pypdf · OpenAI + Gemini (fallback)
· Next.js 16 (App Router) · React 19 · Tailwind 4 · Lucide · Docker Compose.
