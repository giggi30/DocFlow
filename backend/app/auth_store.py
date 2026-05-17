from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import threading
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parents[2]
AUTH_DIR = BASE_DIR / "archive"
AUTH_PATH = AUTH_DIR / "users.json"
AUTH_LOCK = threading.Lock()


def _empty_store() -> dict[str, Any]:
  return {"users": {}}


def _read_store() -> dict[str, Any]:
  if not AUTH_PATH.exists():
    return _empty_store()

  try:
    data = json.loads(AUTH_PATH.read_text(encoding="utf-8"))
  except json.JSONDecodeError:
    return _empty_store()

  if not isinstance(data, dict):
    return _empty_store()

  users = data.get("users")
  if not isinstance(users, dict):
    data["users"] = {}
  return data


def _write_store(data: dict[str, Any]) -> None:
  AUTH_DIR.mkdir(parents=True, exist_ok=True)
  temp_path = AUTH_PATH.with_suffix(".tmp")
  temp_path.write_text(
    json.dumps(data, indent=2, ensure_ascii=True),
    encoding="utf-8",
  )
  temp_path.replace(AUTH_PATH)


def _normalize_email(email: str) -> str:
  return email.strip().lower()


def _hash_password(password: str, salt_hex: str) -> str:
  digest = hashlib.pbkdf2_hmac(
    "sha256",
    password.encode("utf-8"),
    bytes.fromhex(salt_hex),
    100_000,
  )
  return digest.hex()


def create_user(email: str, password: str, company_name: str) -> tuple[str, str]:
  normalized_email = _normalize_email(email)
  normalized_company = company_name.strip()

  if not normalized_email:
    raise ValueError("email is required")
  if not password:
    raise ValueError("password is required")
  if not normalized_company:
    raise ValueError("company name is required")

  with AUTH_LOCK:
    data = _read_store()
    users = data.setdefault("users", {})
    if normalized_email in users:
      raise ValueError("email already registered")

    salt = secrets.token_hex(16)
    password_hash = _hash_password(password, salt)
    token = secrets.token_urlsafe(32)

    users[normalized_email] = {
      "email": normalized_email,
      "companyName": normalized_company,
      "passwordHash": password_hash,
      "salt": salt,
      "token": token,
    }
    _write_store(data)

  return token, normalized_company


def verify_user(email: str, password: str) -> tuple[str, str] | None:
  normalized_email = _normalize_email(email)
  if not normalized_email or not password:
    return None

  with AUTH_LOCK:
    data = _read_store()
    users = data.get("users", {})
    if not isinstance(users, dict):
      return None

    record = users.get(normalized_email)
    if not isinstance(record, dict):
      return None

    salt = record.get("salt")
    stored_hash = record.get("passwordHash")
    if not isinstance(salt, str) or not isinstance(stored_hash, str):
      return None

    password_hash = _hash_password(password, salt)
    if not hmac.compare_digest(password_hash, stored_hash):
      return None

    token = record.get("token")
    company_name = record.get("companyName")
    if isinstance(token, str) and isinstance(company_name, str):
      return token, company_name

  return None


def get_company_name_by_token(token: str) -> str | None:
  if not token:
    return None

  with AUTH_LOCK:
    data = _read_store()
    users = data.get("users", {})
    if not isinstance(users, dict):
      return None

    for record in users.values():
      if not isinstance(record, dict):
        continue
      if record.get("token") == token:
        company_name = record.get("companyName")
        if isinstance(company_name, str):
          return company_name

  return None
