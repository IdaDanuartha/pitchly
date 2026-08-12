import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Gaya = Literal["kritis", "seimbang", "santai"]
Kedalaman = Literal["ringkas", "detail"]
Bahasa = Literal["formal", "santai"]


Jenis = Literal["kompetisi", "akademik"]


class SessionCreate(BaseModel):
    document_id: uuid.UUID
    rubric_id: uuid.UUID | None = None
    team_id: uuid.UUID | None = None
    jenis: Jenis = "kompetisi"
    kategori: str = "umum"
    gaya: Gaya = "seimbang"
    kedalaman: Kedalaman = "ringkas"
    bahasa: Bahasa = "formal"
    durasi_menit: int = Field(default=15, ge=10, le=30)
    dengan_presentasi: bool = False
    durasi_presentasi_menit: int = Field(default=0, ge=0, le=15)


class PresentationSubmit(BaseModel):
    transkrip: str = Field(default="", max_length=20000)


class TurnPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    urutan: int
    persona: str
    pertanyaan: str
    jawaban: str | None
    waktu_tempuh_ms: int | None
    target_peran: str | None = None
    target_nama: str | None = None
    delivery_json: dict | None = None
    ekspresi_json: dict | None = None
    is_followup: bool = False


class SessionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID | None
    rubric_id: uuid.UUID | None
    team_id: uuid.UUID | None
    mode: str
    jenis: str
    kategori: str
    dengan_presentasi: bool
    durasi_presentasi_menit: int
    presentasi_selesai: bool
    status: str
    gaya: str
    kedalaman: str
    bahasa: str
    durasi_menit: int
    sisa_detik: int
    persona_order: list[str]
    turns: list[TurnPublic]


class NextTurnResponse(BaseModel):
    done: bool
    turn: TurnPublic | None = None


class AnswerRequest(BaseModel):
    turn_id: uuid.UUID
    jawaban: str
    waktu_tempuh_ms: int | None = None
    delivery: dict | None = None


class SessionListItem(BaseModel):
    id: uuid.UUID
    document_filename: str | None
    nama_kompetisi: str
    mode: str
    status: str
    skor_rata_rata: int | None
    created_at: datetime


class OverviewResponse(BaseModel):
    total_sesi: int
    sesi_selesai: int
    skor_terakhir: int | None
    dokumen_dianalisis: int


class ScorecardPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    skor_per_kategori_json: dict
    ringkasan_kekuatan: str
    ringkasan_kelemahan: str
    rencana_perbaikan_json: list
    pacing_json: dict | None = None
    penilaian_presentasi_json: dict | None = None
    model_used: str
    created_at: datetime


Hasil = Literal["menang", "finalis", "lolos", "gugur"]


class OutcomeCreate(BaseModel):
    kritik_juri_asli: str = Field(min_length=1, max_length=5000)
    hasil: Hasil
    catatan: str | None = Field(default=None, max_length=2000)


class OutcomePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    kritik_juri_asli: str
    hasil: str
    catatan: str | None
    analisis_json: dict | None
    model_used: str | None
    created_at: datetime


class SuggestionItem(BaseModel):
    urutan: int
    pertanyaan: str
    jawaban: str | None
    koreksi: str
    jawaban_lebih_baik: str


class SuggestionsResponse(BaseModel):
    items: list[SuggestionItem]


class InsightKategori(BaseModel):
    nama: str
    rata: int
    sesi_lemah: int
    total_sesi: int


class InsightsResponse(BaseModel):
    cukup_data: bool
    total_sesi_dinilai: int
    kategori: list[InsightKategori]
