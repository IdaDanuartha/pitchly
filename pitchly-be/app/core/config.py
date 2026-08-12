from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://pitchly:pitchly@localhost:5432/pitchly"

    # Auth
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24

    # LLM
    openai_api_key: str = ""
    gemini_api_key: str = ""
    primary_model: str = "gpt-4o-mini"
    # Comma-separated list of Gemini fallback models, tried in order.
    fallback_model: str = "gemini-2.0-flash"
    stt_model: str = "whisper-1"
    tts_model: str = "gpt-4o-mini-tts"
    vision_model: str = "gpt-4o"

    # Azure Speech (TTS Indonesia native) — primary bila diisi, fallback OpenAI.
    azure_speech_key: str = ""
    azure_region: str = "southeastasia"

    @property
    def azure_tts_enabled(self) -> bool:
        return bool(self.azure_speech_key)

    # D-ID talking-photo avatar (photoreal lip-sync). Needs realistic face
    # image URLs reachable from the public internet.
    did_api_key: str = ""
    did_source_teknis: str = ""
    did_source_dampak: str = ""
    did_source_skeptis: str = ""
    did_voice_teknis: str = "id-ID-ArdiNeural"
    did_voice_dampak: str = "id-ID-GadisNeural"
    did_voice_skeptis: str = "id-ID-ArdiNeural"

    def did_source(self, persona: str) -> str:
        return {
            "teknis": self.did_source_teknis,
            "dampak": self.did_source_dampak,
            "skeptis": self.did_source_skeptis,
        }.get(persona, self.did_source_teknis)

    def did_voice(self, persona: str) -> str:
        return {
            "teknis": self.did_voice_teknis,
            "dampak": self.did_voice_dampak,
            "skeptis": self.did_voice_skeptis,
        }.get(persona, self.did_voice_teknis)

    @property
    def did_enabled(self) -> bool:
        return bool(
            self.did_api_key
            and (self.did_source_teknis or self.did_source_dampak or self.did_source_skeptis)
        )

    @property
    def fallback_model_list(self) -> list[str]:
        return [m.strip() for m in self.fallback_model.split(",") if m.strip()]
    embedding_model: str = "text-embedding-3-small"

    # Web search for real existing-solution check (Tavily). Empty = fall back to
    # the local seeded corpus.
    tavily_api_key: str = ""

    @property
    def web_search_enabled(self) -> bool:
        return bool(self.tavily_api_key)

    # Storage
    upload_dir: str = "/data/uploads"
    chroma_dir: str = "/data/chroma"
    # When set, uploaded documents are encrypted at rest (PRD §3.4). Any string;
    # a Fernet key is derived from it. Leave empty to store plaintext.
    document_encryption_key: str = ""

    @property
    def document_encryption_enabled(self) -> bool:
        return bool(self.document_encryption_key)

    # CORS — frontend origin
    frontend_origin: str = "http://localhost:3000"

    # Email (Resend) — verifikasi email pendaftaran
    resend_api_key: str = ""
    email_from: str = "Pitchly <onboarding@resend.dev>"
    app_base_url: str = "http://localhost:3000"

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:3000/auth/google/callback"

    @property
    def email_enabled(self) -> bool:
        return bool(self.resend_api_key)

    @property
    def google_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)


# Fallback rubric used when extraction from an uploaded pedoman is unavailable
# (PRD §5.3 — template rubrik umum sebagai cadangan).
DEFAULT_RUBRIC_KRITERIA = [
    "Kejelasan problem statement",
    "Kelayakan teknis solusi",
    "Dampak dan skalabilitas",
    "Orisinalitas ide",
    "Kualitas penyampaian",
]
DEFAULT_RUBRIC_BOBOT = {
    "Kejelasan problem statement": 20,
    "Kelayakan teknis solusi": 25,
    "Dampak dan skalabilitas": 25,
    "Orisinalitas ide": 15,
    "Kualitas penyampaian": 15,
}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
