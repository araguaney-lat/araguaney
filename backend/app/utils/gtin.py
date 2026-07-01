"""GS1 check-digit validation for EAN-8, UPC-A (EAN-12), and EAN-13.

Pure algorithm — no network, no API key, no external dependencies.

The GS1 check digit is computed by alternating ×1 and ×3 weights on the
payload digits (all digits except the last), summing, and taking:
    (10 - total % 10) % 10

The weight pattern is determined by position from the *right*:
  - rightmost payload digit → ×3
  - next → ×1, alternating leftward

This single formula covers EAN-8 (payload 7), UPC-A (payload 11), and
EAN-13 (payload 12).
"""

import re

_VALID_LENGTHS = frozenset({8, 12, 13})


def _check_digit(payload: str) -> int:
    n = len(payload)
    total = sum(
        int(d) * (3 if (n - 1 - i) % 2 == 0 else 1)
        for i, d in enumerate(payload)
    )
    return (10 - total % 10) % 10


def validate(code: str) -> bool:
    """Return True if *code* is a structurally valid EAN-8, UPC-A, or EAN-13."""
    digits = re.sub(r"\D", "", code)
    if len(digits) not in _VALID_LENGTHS:
        return False
    return _check_digit(digits[:-1]) == int(digits[-1])


def normalize(code: str) -> str:
    """Strip non-digit characters and return the canonical digit string."""
    return re.sub(r"\D", "", code)
