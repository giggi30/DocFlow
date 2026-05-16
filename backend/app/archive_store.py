from __future__ import annotations

import hashlib
import json
import threading
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parents[2]
ARCHIVE_DIR = BASE_DIR / 'archive'
ARCHIVE_PATH = ARCHIVE_DIR / 'documents.json'
ARCHIVE_LOCK = threading.Lock()


def account_id_from_token(token: str) -> str:
  digest = hashlib.sha256(token.encode('utf-8')).hexdigest()
  return digest[:16]


def _empty_store() -> dict[str, Any]:
  return {'accounts': {}}


def _read_store() -> dict[str, Any]:
  if not ARCHIVE_PATH.exists():
    return _empty_store()

  try:
    data = json.loads(ARCHIVE_PATH.read_text(encoding='utf-8'))
  except json.JSONDecodeError:
    return _empty_store()

  if not isinstance(data, dict):
    return _empty_store()
  accounts = data.get('accounts')
  if not isinstance(accounts, dict):
    data['accounts'] = {}
  return data


def _write_store(data: dict[str, Any]) -> None:
  ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
  temp_path = ARCHIVE_PATH.with_suffix('.tmp')
  temp_path.write_text(
    json.dumps(data, indent=2, ensure_ascii=True),
    encoding='utf-8',
  )
  temp_path.replace(ARCHIVE_PATH)


def list_account_documents(account_id: str) -> list[dict[str, str]]:
  with ARCHIVE_LOCK:
    data = _read_store()
    account = data.get('accounts', {}).get(account_id, {})
    documents = account.get('documents', [])
    if not isinstance(documents, list):
      return []
    return [doc for doc in documents if isinstance(doc, dict)]


def find_account_document(
  account_id: str,
  job_id: str,
  filename: str,
) -> dict[str, str] | None:
  with ARCHIVE_LOCK:
    data = _read_store()
    account = data.get('accounts', {}).get(account_id, {})
    documents = account.get('documents', [])
    if not isinstance(documents, list):
      return None
    for item in documents:
      if not isinstance(item, dict):
        continue
      if item.get('jobId') == job_id and item.get('filename') == filename:
        return item
  return None


def upsert_job_documents(
  account_id: str,
  company_name: str,
  job_id: str,
  documents: list[Path],
) -> None:
  entries: list[dict[str, str]] = []
  for path in documents:
    if not path.exists():
      continue
    try:
      relative_path = str(path.relative_to(BASE_DIR))
    except ValueError:
      relative_path = str(path)
    entries.append(
      {
        'jobId': job_id,
        'filename': path.name,
        'path': relative_path,
      }
    )

  with ARCHIVE_LOCK:
    data = _read_store()
    accounts = data.setdefault('accounts', {})
    account = accounts.setdefault(
      account_id,
      {'companyName': company_name, 'documents': []},
    )
    account['companyName'] = company_name
    existing = account.get('documents', [])
    if not isinstance(existing, list):
      existing = []
    filtered = [
      item for item in existing
      if isinstance(item, dict) and item.get('jobId') != job_id
    ]
    account['documents'] = filtered + entries
    accounts[account_id] = account
    _write_store(data)
