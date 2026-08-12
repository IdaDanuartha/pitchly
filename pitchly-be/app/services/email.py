import logging

import httpx

from app.core.config import settings

logger = logging.getLogger("pitchly.email")

RESEND_URL = "https://api.resend.com/emails"


def send_verification_email(to: str, nama: str, verify_link: str) -> None:
    """Send an email-verification link via Resend. No-op if not configured."""
    if not settings.email_enabled:
        logger.info("Resend nonaktif — lewati email. Link verifikasi: %s", verify_link)
        return

    html = (
        f"<p>Halo {nama},</p>"
        "<p>Terima kasih telah mendaftar di Pitchly. Klik tautan berikut untuk "
        "memverifikasi email Anda:</p>"
        f'<p><a href="{verify_link}">Verifikasi Email</a></p>'
        "<p>Tautan berlaku 24 jam. Abaikan email ini bila Anda tidak mendaftar.</p>"
    )
    try:
        resp = httpx.post(
            RESEND_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={
                "from": settings.email_from,
                "to": [to],
                "subject": "Verifikasi email Pitchly",
                "html": html,
            },
            timeout=15.0,
        )
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        # Don't fail registration if email sending hiccups.
        logger.error("Gagal kirim email verifikasi: %s", exc)
