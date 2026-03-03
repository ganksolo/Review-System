"""
Fernet symmetric encryption for API keys.

Uses ENCRYPTION_KEY from environment variables as the master key.
"""

import logging

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

logger = logging.getLogger(__name__)


class KeyEncryptor:
    """Encrypts / decrypts API keys using Fernet (AES-128-CBC)."""

    def __init__(self, key: str):
        self._cipher = Fernet(key.encode())

    def encrypt(self, plaintext: str) -> str:
        return self._cipher.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> str:
        return self._cipher.decrypt(ciphertext.encode()).decode()

    @staticmethod
    def mask(key: str) -> str:
        if len(key) <= 8:
            return "****"
        return f"{key[:4]}****{key[-4:]}"


def get_encryptor() -> "KeyEncryptor | None":
    if not settings.ENCRYPTION_KEY:
        logger.warning("ENCRYPTION_KEY not set — API key encryption disabled")
        return None
    try:
        return KeyEncryptor(settings.ENCRYPTION_KEY)
    except Exception as e:
        logger.error("Invalid ENCRYPTION_KEY: %s", e)
        return None
