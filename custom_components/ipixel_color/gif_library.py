"""Server-side storage for user GIFs.

GIFs used to live in the browser's localStorage, which meant a GIF created on a
phone was invisible on every other device. They are kept here instead, under the
Home Assistant config directory, so any device that can reach Home Assistant sees
the same library.

Layout:
    <config>/ipixel_color/gifs/<name>.gif   the animation bytes
    <config>/.storage/ipixel_color.gifs.json the manifest (names and timestamps)

The manifest goes through helpers.storage.Store so writes are atomic and
serialised, and the GIF bytes are kept out of it: a base64 animation would make
every metadata write rewrite the whole library.
"""
from __future__ import annotations

import base64
import binascii
import logging
import re
import time
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

STORAGE_KEY = f"{DOMAIN}.gifs"
STORAGE_VERSION = 1

# A 64x16 animation is tens of kilobytes, so this leaves plenty of headroom
# while still refusing something that would fill the config disk.
MAX_GIF_BYTES = 5 * 1024 * 1024
MAX_GIFS = 200
MAX_NAME_LENGTH = 80

# Names end up in a filename, so anything path-like is rejected outright rather
# than sanitised: a legitimate name never needs a separator or a dot prefix.
_SAFE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 ._-]{0,79}\.gif$")


def sanitize_name(name: str | None) -> str:
    """Return a safe GIF filename, or raise ValueError.

    Args:
        name: Requested name, with or without a .gif suffix.

    Returns:
        A filename ending in .gif.

    Raises:
        ValueError: If the name is unusable as a filename.
    """
    candidate = (name or "").strip()

    if candidate and not candidate.lower().endswith(".gif"):
        candidate = f"{candidate}.gif"

    if len(candidate) > MAX_NAME_LENGTH:
        raise ValueError(f"Name is longer than {MAX_NAME_LENGTH} characters")

    if not _SAFE_NAME.match(candidate):
        raise ValueError(
            "Name must start with a letter or digit and may only contain "
            "letters, digits, spaces, dots, dashes and underscores"
        )

    return candidate


def decode_gif(data: str | None) -> bytes:
    """Decode a base64 GIF, accepting a data URL or bare base64.

    Args:
        data: Data URL or bare base64 payload.

    Returns:
        The decoded GIF bytes.

    Raises:
        ValueError: If the payload is not a base64 GIF within the size limit.
    """
    payload = (data or "").strip()

    if payload.startswith("data:"):
        _, _, payload = payload.partition(",")

    payload = re.sub(r"\s+", "", payload)

    if not payload:
        raise ValueError("No GIF data supplied")

    try:
        raw = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as err:
        raise ValueError(f"Not valid base64: {err}") from err

    if len(raw) > MAX_GIF_BYTES:
        raise ValueError(
            f"GIF is {len(raw)} bytes, limit is {MAX_GIF_BYTES}"
        )

    if not raw.startswith(b"GIF"):
        raise ValueError(f"Data is not a GIF (starts with {raw[:3]!r})")

    return raw


class GifLibrary:
    """Stores user GIFs on the Home Assistant host."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialise the library.

        Args:
            hass: Home Assistant instance.
        """
        from homeassistant.helpers.storage import Store

        self._store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._data: dict[str, Any] | None = None
        self._dir = Path(hass.config.path(DOMAIN)) / "gifs"

    async def async_load(self) -> dict[str, Any]:
        """Return the manifest, reading it from disk on first use."""
        if self._data is None:
            self._dir.mkdir(parents=True, exist_ok=True)
            self._data = await self._store.async_load() or {}
            self._data.setdefault("gifs", {})
        return self._data

    def _path_for(self, name: str) -> Path:
        """Return the on-disk path for a stored GIF."""
        return self._dir / name

    async def async_list(self) -> list[dict[str, Any]]:
        """Return metadata for every stored GIF, newest first.

        Returns:
            List of {name, added_at, size} dicts.
        """
        data = await self.async_load()
        entries = [
            {
                "name": name,
                "added_at": meta.get("added_at", 0),
                "size": meta.get("size", 0),
            }
            for name, meta in data["gifs"].items()
            if self._path_for(name).is_file()
        ]
        entries.sort(key=lambda item: item["added_at"], reverse=True)
        return entries

    async def async_save(self, name: str, data: str | None) -> dict[str, Any]:
        """Store a GIF, replacing any existing GIF with the same name.

        Args:
            name: Requested filename.
            data: Data URL or bare base64 GIF.

        Returns:
            The stored entry metadata.

        Raises:
            ValueError: If the name or payload is unusable, or the library is
                full.
        """
        safe_name = sanitize_name(name)
        raw = decode_gif(data)

        data_manifest = await self.async_load()

        if (
            safe_name not in data_manifest["gifs"]
            and len(data_manifest["gifs"]) >= MAX_GIFS
        ):
            raise ValueError(
                f"Library holds the maximum of {MAX_GIFS} GIFs, delete one first"
            )

        self._dir.mkdir(parents=True, exist_ok=True)

        # Write to a temporary name and rename, so a failure partway through
        # cannot leave a truncated GIF under the real name.
        target = self._path_for(safe_name)
        temp = target.with_suffix(".gif.part")
        temp.write_bytes(raw)
        temp.replace(target)

        entry = {
            "name": safe_name,
            "added_at": time.time(),
            "size": len(raw),
        }
        data_manifest["gifs"][safe_name] = entry
        await self._store.async_save(data_manifest)

        _LOGGER.info(
            "Stored GIF %s (%d bytes, %d total)",
            safe_name,
            len(raw),
            len(data_manifest["gifs"]),
        )
        return entry

    async def async_delete(self, name: str) -> bool:
        """Delete a stored GIF.

        Args:
            name: Filename to delete.

        Returns:
            True if a GIF was deleted, False if it was not there.
        """
        safe_name = sanitize_name(name)
        data_manifest = await self.async_load()

        if safe_name not in data_manifest["gifs"]:
            return False

        path = self._path_for(safe_name)
        # Guard against a manifest entry whose file is already gone.
        path.unlink(missing_ok=True)
        del data_manifest["gifs"][safe_name]
        await self._store.async_save(data_manifest)

        _LOGGER.info("Deleted GIF %s", safe_name)
        return True

    async def async_get(self, name: str) -> str | None:
        """Return a stored GIF as a base64 data URL.

        Args:
            name: Filename to read.

        Returns:
            A data URL, or None if the GIF does not exist.
        """
        safe_name = sanitize_name(name)
        path = self._path_for(safe_name)

        if not path.is_file():
            return None

        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
        return f"data:image/gif;base64,{encoded}"


def async_register_websocket_api(hass: HomeAssistant) -> None:
    """Register the websocket commands the card uses to reach the library.

    Args:
        hass: Home Assistant instance.
    """
    from homeassistant.components import websocket_api

    library = GifLibrary(hass)
    hass.data.setdefault(DOMAIN, {})["gif_library"] = library

    @websocket_api.websocket_command(
        {vol.Required("type"): f"{DOMAIN}/gif/list"}
    )
    async def ws_list(connection: websocket_api.ActiveConnection, msg: dict) -> None:
        """Send the stored GIF metadata."""
        connection.send_result(await library.async_list())

    @websocket_api.websocket_command(
        {
            vol.Required("type"): f"{DOMAIN}/gif/save",
            vol.Required("name"): str,
            vol.Required("data"): str,
        }
    )
    async def ws_save(connection: websocket_api.ActiveConnection, msg: dict) -> None:
        """Store a GIF.

        A bad name or payload is reported back as a websocket error, which the
        card surfaces instead of silently discarding the animation.
        """
        try:
            entry = await library.async_save(msg["name"], msg["data"])
        except (ValueError, OSError) as err:
            raise HomeAssistantError(f"Could not store the GIF: {err}") from err

        connection.send_result(entry)

    @websocket_api.websocket_command(
        {
            vol.Required("type"): f"{DOMAIN}/gif/delete",
            vol.Required("name"): str,
        }
    )
    async def ws_delete(connection: websocket_api.ActiveConnection, msg: dict) -> None:
        """Delete a GIF."""
        try:
            deleted = await library.async_delete(msg["name"])
        except (ValueError, OSError) as err:
            raise HomeAssistantError(f"Could not delete the GIF: {err}") from err

        connection.send_result({"deleted": deleted})

    @websocket_api.websocket_command(
        {
            vol.Required("type"): f"{DOMAIN}/gif/get",
            vol.Required("name"): str,
        }
    )
    async def ws_get(connection: websocket_api.ActiveConnection, msg: dict) -> None:
        """Send one stored GIF as a data URL."""
        try:
            data_url = await library.async_get(msg["name"])
        except (ValueError, OSError) as err:
            raise HomeAssistantError(f"Could not read the GIF: {err}") from err

        if data_url is None:
            raise HomeAssistantError(f"No stored GIF called {msg['name']}")

        connection.send_result({"name": msg["name"], "data_url": data_url})

    websocket_api.async_register_command(hass, ws_list)
    websocket_api.async_register_command(hass, ws_save)
    websocket_api.async_register_command(hass, ws_delete)
    websocket_api.async_register_command(hass, ws_get)