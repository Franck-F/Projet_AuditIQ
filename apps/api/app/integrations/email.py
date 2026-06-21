from __future__ import annotations

import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_RESEND_ENDPOINT = "https://api.resend.com/emails"


def _invitation_html(*, org_name: str, role_label: str, invite_url: str) -> str:
    return (
        "<div style=\"font-family:sans-serif;color:#1a1a1a;line-height:1.5\">"
        f"<p>Bonjour,</p>"
        f"<p>Vous avez été invité·e à rejoindre l'organisation "
        f"<strong>{org_name}</strong> sur AuditIQ en tant que "
        f"<strong>{role_label}</strong>.</p>"
        f"<p><a href=\"{invite_url}\" "
        "style=\"display:inline-block;padding:10px 18px;background:#4f46e5;"
        "color:#fff;text-decoration:none;border-radius:6px\">"
        "Rejoindre l'organisation</a></p>"
        f"<p>Ou copiez ce lien dans votre navigateur :<br>"
        f"<a href=\"{invite_url}\">{invite_url}</a></p>"
        "<p>Cette invitation expire dans 14 jours.</p>"
        "<p style=\"color:#666;font-size:12px\">Si vous n'attendiez pas cette "
        "invitation, vous pouvez ignorer cet e-mail.</p>"
        "</div>"
    )


async def send_invitation_email(
    *,
    to_email: str,
    org_name: str,
    role_label: str,
    invite_url: str,
) -> bool:
    """Send an invitation e-mail via Resend.

    Graceful no-op (returns ``False``) when ``RESEND_API_KEY`` is absent.
    Never reports a false success: any transport/API error also returns
    ``False`` after logging.
    """
    settings = get_settings()
    api_key = settings.resend_api_key.get_secret_value()
    if not api_key:
        return False

    payload = {
        "from": settings.email_from,
        "to": [to_email],
        "subject": f"Invitation à rejoindre {org_name} sur AuditIQ",
        "html": _invitation_html(
            org_name=org_name, role_label=role_label, invite_url=invite_url
        ),
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                _RESEND_ENDPOINT,
                json=payload,
                headers={"Authorization": f"Bearer {api_key}"},
            )
        resp.raise_for_status()
    except Exception:  # noqa: BLE001 - never let e-mail failure break the flow
        logger.warning("Envoi de l'e-mail d'invitation échoué", exc_info=True)
        return False
    return True
