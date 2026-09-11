"""Short-lived, in-memory TTL session cache keyed by sender phone number, used to carry
multi-turn SMS conversational context (e.g. a rating that's missing its target or star
count) between separate inbound webhook calls.

This is process-local, which is fine for the current single-replica backend deployment.
If the backend is ever scaled to multiple replicas, swap this out for Redis (same
get/set/clear interface) so session state is shared across pods.
"""

import threading
import time

DEFAULT_TTL_SECONDS = 300

_sessions: dict[str, dict] = {}
_lock = threading.Lock()


def get_session(phone: str) -> dict | None:
    with _lock:
        entry = _sessions.get(phone)
        if not entry:
            return None
        if entry["expires_at"] < time.monotonic():
            del _sessions[phone]
            return None
        return dict(entry["data"])


def set_session(phone: str, data: dict, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> None:
    with _lock:
        _sessions[phone] = {"data": data, "expires_at": time.monotonic() + ttl_seconds}


def clear_session(phone: str) -> None:
    with _lock:
        _sessions.pop(phone, None)
