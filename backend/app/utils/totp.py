import json
import secrets

import bcrypt
import pyotp


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def get_totp_uri(secret: str, email: str, issuer: str = "Araguaney") -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=issuer)


def verify_totp_code(secret: str, code: str) -> bool:
    return pyotp.TOTP(secret).verify(code, valid_window=1)


def generate_backup_codes(count: int = 10) -> tuple[list[str], list[str]]:
    """Return (plaintext_codes, bcrypt_hashed_codes)."""
    codes = [secrets.token_hex(4).upper() for _ in range(count)]
    hashed = [bcrypt.hashpw(c.encode(), bcrypt.gensalt()).decode() for c in codes]
    return codes, hashed


def verify_backup_code(code: str, hashed_codes_json: str) -> tuple[bool, list[str]]:
    """Verify a backup code. Returns (valid, remaining_hashed_codes)."""
    hashed = json.loads(hashed_codes_json)
    upper = code.upper()
    for i, h in enumerate(hashed):
        if bcrypt.checkpw(upper.encode(), h.encode()):
            return True, hashed[:i] + hashed[i + 1:]
    return False, hashed
