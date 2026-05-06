import base64
import hashlib

from cryptography.fernet import Fernet


def _derive_key(key: str) -> bytes:
    """Derive a valid Fernet key from any string using SHA-256."""
    return base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest())


def encrypt_value(plain_text: str, key: str) -> str:
    fernet_key = _derive_key(key)
    cipher = Fernet(fernet_key)
    encrypted = cipher.encrypt(plain_text.encode("utf-8"))
    return encrypted.decode("utf-8")


def decrypt_value(encrypted_text: str, key: str) -> str:
    fernet_key = _derive_key(key)
    cipher = Fernet(fernet_key)
    decrypted = cipher.decrypt(encrypted_text.encode("utf-8"))
    return decrypted.decode("utf-8")
