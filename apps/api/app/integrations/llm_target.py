"""Generic, SSRF-hardened HTTP client to an arbitrary target LLM.

First-order security: resolve & validate every IP, pin the connection to a
validated IP (no DNS rebinding), https outside dev, no redirects, timeout,
streamed size cap, secrets never logged.
"""
from __future__ import annotations

import ipaddress
import json
import socket
from dataclasses import dataclass

import httpx

from app.core.config import get_settings
from app.core.errors import APIError

_METADATA = {"169.254.169.254", "fd00:ec2::254"}


@dataclass(frozen=True)
class TargetConfig:
    url: str
    method: str
    headers: dict[str, str]
    body_template: str
    response_path: str


def _bad(detail: str) -> APIError:
    return APIError(detail, title="Unprocessable Entity", status=422)


def extract(data: object, path: str) -> str:
    """Restricted dotted/index path resolver (no eval). Raises APIError 422."""
    cur: object = data
    for part in path.split("."):
        if isinstance(cur, list):
            try:
                cur = cur[int(part)]
            except (ValueError, IndexError) as exc:
                raise _bad(
                    f"response_path : index « {part} » invalide."
                ) from exc
        elif isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            raise _bad(
                f"response_path : segment « {part} » introuvable."
            )
    if not isinstance(cur, str):
        raise _bad("response_path : la valeur extraite n'est pas du texte.")
    return cur


def _resolve_ips(host: str) -> list[str]:
    infos = socket.getaddrinfo(host, None)
    return [str(i[4][0]) for i in infos]


def _is_blocked(ip: str) -> bool:
    addr = ipaddress.ip_address(ip)
    return (
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_multicast
        or addr.is_reserved
        or addr.is_unspecified
    )


def _assert_public(url: str) -> tuple[str, list[str]]:
    """Validate scheme + every resolved IP. Returns (host, validated_ips)."""
    s = get_settings()
    parsed = httpx.URL(url)
    scheme = parsed.scheme
    host = parsed.host
    if scheme not in ("http", "https"):
        raise _bad("URL cible : schéma non autorisé.")
    if scheme == "http" and not (
        s.api_env.lower() == "development" or s.llm_target_allow_http
    ):
        raise _bad("URL cible : https requis.")
    if not host:
        raise _bad("URL cible : hôte manquant.")
    try:
        ips = _resolve_ips(host)
    except OSError as exc:
        raise _bad("URL cible : hôte non résolu.") from exc
    if not ips:
        raise _bad("URL cible : aucune adresse résolue.")
    for ip in ips:
        if ip in _METADATA:
            raise _bad("URL cible : adresse de métadonnées interdite.")
        try:
            blocked = _is_blocked(ip)
        except ValueError as exc:
            raise _bad("URL cible : adresse résolue invalide.") from exc
        if blocked:
            raise _bad(
                "URL cible : adresse non publique interdite (SSRF)."
            )
    return host, ips


async def call_target_llm(cfg: TargetConfig, prompt: str) -> str:
    """POST the prompt-substituted body to the validated, IP-pinned target.

    Raises APIError on SSRF/validation (422) or transport/non-2xx (502).
    """
    host, ips = _assert_public(cfg.url)
    s = get_settings()
    parsed = httpx.URL(cfg.url)
    # Pin the connection to the validated IP (anti-DNS-rebinding) while
    # keeping Host + TLS SNI = the original hostname.
    pinned = parsed.copy_with(host=ips[0])
    body = cfg.body_template.replace(
        "{prompt}", json.dumps(prompt)[1:-1]
    )
    timeout = httpx.Timeout(float(s.llm_target_timeout_s))
    max_bytes = s.llm_target_max_bytes
    chunks: list[bytes] = []
    try:
        async with httpx.AsyncClient(
            timeout=timeout, follow_redirects=False
        ) as client:
            req = client.build_request(
                cfg.method,
                pinned,
                content=body.encode(),
                headers={
                    **cfg.headers,
                    "Host": host,
                    "Content-Type": "application/json",
                },
                extensions={"sni_hostname": host},
            )
            resp = await client.send(req, stream=True)
            try:
                size = 0
                async for c in resp.aiter_bytes():
                    size += len(c)
                    if size > max_bytes:
                        raise _bad("Réponse du LLM cible trop volumineuse.")
                    chunks.append(c)
            finally:
                await resp.aclose()
            resp.raise_for_status()
    except APIError:
        raise
    except httpx.HTTPError as exc:
        raise APIError(
            "Le LLM cible est injoignable ou a renvoyé une erreur.",
            title="Bad Gateway",
            status=502,
        ) from exc
    try:
        data = json.loads(b"".join(chunks).decode())
    except (ValueError, UnicodeDecodeError) as exc:
        raise APIError(
            "Réponse du LLM cible illisible (JSON attendu).",
            title="Bad Gateway",
            status=502,
        ) from exc
    return extract(data, cfg.response_path)
