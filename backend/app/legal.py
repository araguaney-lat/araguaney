"""Current version of the legal documents users must accept.

Bump this string whenever the Privacy Notice or Terms materially change
(frontend/src/content/legal/{privacy,terms}.{es,en}.ts each carry a matching
`version` field, and frontend/src/lib/legal.ts mirrors this constant — all
three must be bumped together). Existing users whose `accepted_terms_version`
no longer matches this value are re-gated to /accept-terms on next login.
"""

CURRENT_TERMS_VERSION = "1.0"
