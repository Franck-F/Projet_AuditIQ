import datetime

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core.errors import AuthError
from app.core.security import verify_token


@pytest.fixture
def keypair():
    priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return priv, priv.public_key()


def _token(priv, **over):
    now = datetime.datetime.now(tz=datetime.timezone.utc)
    payload = {
        "sub": "11111111-1111-1111-1111-111111111111",
        "email": "u@acme.fr",
        "aud": "authenticated",
        "exp": now + datetime.timedelta(hours=1),
        "iat": now,
    }
    payload.update(over)
    return jwt.encode(payload, priv, algorithm="RS256")


def test_verify_valid_token(keypair):
    priv, pub = keypair
    claims = verify_token(_token(priv), key=pub)
    assert claims["sub"] == "11111111-1111-1111-1111-111111111111"
    assert claims["email"] == "u@acme.fr"


def test_expired_token_raises_auth_error(keypair):
    priv, pub = keypair
    past = datetime.datetime.now(tz=datetime.timezone.utc) - datetime.timedelta(
        hours=2
    )
    with pytest.raises(AuthError):
        verify_token(_token(priv, exp=past), key=pub)


def test_wrong_audience_raises(keypair):
    priv, pub = keypair
    with pytest.raises(AuthError):
        verify_token(_token(priv, aud="other"), key=pub)
