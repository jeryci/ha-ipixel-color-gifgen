"""Native text protocol for iPIXEL devices.

The official app sends text as a structured binary payload rather than
rendering it to a PNG. This module implements the properties header and glyph
record format used by opcode 0x0100.

Payload structure:
  [properties (14 bytes)] [record1] [record2] ...

Properties header (14 bytes):
  bytes 0-1:  glyph/record count (2-byte LE)
  byte 2:     horizontal alignment  (the app always sends 0x01)
  byte 3:     vertical alignment    (the app always sends 0x01)
  byte 4:     animation / effect (see the TEXT_ANIM_* constants in const.py)
  byte 5:     speed (0-100)
  byte 6:     rainbow / style mode (0-9)
  bytes 7-9:  foreground RGB
  byte 10:    background enable flag (the app always sends 0x01)
  bytes 11-13: background RGB

Glyph records come in two shapes, distinguished by the leading byte:

  0x00  ->  [00][R][G][B][bitmap]      8x16  glyph, 1 byte per row
  0x01  ->  [01][R][G][B][bitmap]     16x16  glyph, 2 bytes per row
  0x02  ->  [02][R][G][B][bitmap]     16x32  glyph, 2 bytes per row
  0x80  ->  [80][R][G][B][W][H][bitmap]  variable W x H glyph

The 0x80 variable-size form is *not* supported by the 32x32 LED Pixel Board
(DonKracho, ESPHome-component-iPixel-ble helpers.cpp), so this module emits the
fixed-size forms.

Row bits are packed MSB-first and then the bits of every byte are reversed --
equivalently the legacy invertFrames -> switchEndian -> logicReverseBitsOrder
chain, which nets out to the same per-byte reversal.

Cross-checked against:
  - lucagoc/pypixelcolor commands/send_text (encoding.py, image_processing.py)
  - DonKracho/ESPHome-component-iPixel-ble (iPixelCommands.cpp, helpers.cpp)
  - sdolphin-JP/ipixel-ctrl docs/DeviceCommands.md section 0x0100
  - ToBiDi0410/iPixel-ESP32 iPixelCommands.cpp
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from ..const import (
    SAFE_ANIMATION_DIMENSIONS,
    TEXT_ANIMATION_NAMES,
    TEXT_ANIM_BLINK,
    TEXT_ANIM_BREEZE,
    TEXT_ANIM_LASER,
    TEXT_ANIM_SCROLL_LEFT,
    TEXT_ANIM_SCROLL_RIGHT,
    TEXT_ANIM_SNOW,
    TEXT_ANIM_STATIC,
    UNSAFE_TEXT_ANIMATIONS,
)

_LOGGER = logging.getLogger(__name__)

# Max text payload buffer size (from app)
MAX_TEXT_BUFFER = 102400

# Max glyphs the device accepts in one text payload
MAX_TEXT_RECORDS = 500

# Text alignment constants
ALIGN_LEFT = 0
ALIGN_CENTER = 1
ALIGN_RIGHT = 2
ALIGN_TOP = 0
ALIGN_MIDDLE = 1
ALIGN_BOTTOM = 2

# Text effects. Re-exported under the historical EFFECT_* names; the values now
# follow the ipixel-ctrl spec rather than a guessed sequential ordering.
EFFECT_STATIC = TEXT_ANIM_STATIC
EFFECT_SCROLL_LEFT = TEXT_ANIM_SCROLL_LEFT
EFFECT_SCROLL_RIGHT = TEXT_ANIM_SCROLL_RIGHT
EFFECT_BLINK = TEXT_ANIM_BLINK
EFFECT_BREEZE = TEXT_ANIM_BREEZE
EFFECT_SNOW = TEXT_ANIM_SNOW
EFFECT_LASER = TEXT_ANIM_LASER

# Glyph record types: record_type -> (width, height, bytes_per_row)
GLYPH_RECORD_TYPES: dict[int, tuple[int, int, int]] = {
    0x00: (8, 16, 1),
    0x01: (16, 16, 2),
    0x02: (16, 32, 2),
}

# Greyscale cutoff used when a font does not configure its own.
DEFAULT_PIXEL_THRESHOLD = 96

# Fonts the panel can render with. "file" is resolved against the integration's
# assets/fonts folder first, then pypixelcolor's bundled fonts. Pixel fonts are
# designed for 1-bit rendering and keep their crisp edges at a high threshold;
# proportional fonts need a lower one or their thin strokes drop out.
TEXT_FONTS: dict[str, dict[str, object]] = {
    "pixeloid": {
        "label": "Pixeloid",
        "file": "PixeloidSans.ttf",
        "threshold": 128,
    },
    "cusong": {
        "label": "CUSONG (app default)",
        "file": "CUSONG.ttf",
        "threshold": 128,
    },
    "vcr": {
        "label": "VCR OSD Mono",
        "file": "VCR_OSD_MONO.ttf",
        "threshold": 128,
    },
    "simsun": {
        "label": "SimSun",
        "file": "SIMSUN.ttf",
        "threshold": 128,
    },
    "arial": {
        "label": "Arial",
        "file": "ARIAL.TTF",
        "threshold": 96,
    },
    "arial_bold": {
        "label": "Arial Nova Bold",
        "file": "ArialNova-Bold.ttf",
        "threshold": 96,
    },
    "google_sans": {
        "label": "Google Sans",
        "file": "GoogleSans-Medium.ttf",
        "threshold": 96,
    },
    "cusong_italic": {
        "label": "CUSONG Italic",
        "file": "cusong16_zitidi.ttf",
        "threshold": 128,
    },
}

DEFAULT_TEXT_FONT = "cusong"

# Fonts pypixelcolor accepts by name, for the image-rendering fallback.
PYPXELCOLOR_FONT_ALIASES = {
    "pixeloid": "SIMSUN",
    "cusong": "CUSONG",
    "cusong_italic": "CUSONG",
    "vcr": "VCR_OSD_MONO",
    "simsun": "SIMSUN",
    "arial": "SIMSUN",
    "arial_bold": "SIMSUN",
    "google_sans": "SIMSUN",
}


class UnsafeAnimationError(ValueError):
    """Raised when a caller asks for an animation known to brick the device."""


def resolve_animation(animation: int | str) -> int:
    """Turn an effect name or numeric code into a device animation code.

    Accepts the numeric codes the service UI offers, the names the Lovelace
    text card sends (which come from the renderer's effect registry), or a
    numeric string. Renderer-only effects that have no device equivalent --
    the ambient and colour effects such as "plasma" or "neon" -- fall back to
    static, because the device cannot reproduce them.

    Args:
        animation: Effect name or numeric code.

    Returns:
        Numeric device animation code.
    """
    if isinstance(animation, str):
        key = animation.strip().lower()
        if key in TEXT_ANIMATION_NAMES:
            return TEXT_ANIMATION_NAMES[key]
        try:
            return int(key)
        except ValueError:
            _LOGGER.debug(
                "Effect %r has no device animation, falling back to static",
                animation,
            )
            return TEXT_ANIM_STATIC
    return int(animation)


def validate_animation(
    animation: int | str,
    width: int | None = None,
    height: int | None = None,
) -> int:
    """Reject text animations that are known to boot-loop the device.

    Animations 3 and 4 write a payload the firmware cannot re-read at boot on
    panels other than 32x32. Recovery requires racing a clear command into a
    very short window at power-on, so this is treated as a hard error rather
    than a warning.

    Args:
        animation: Requested animation, as a numeric code or an effect name.
        width: Panel width, if known.
        height: Panel height, if known.

    Returns:
        The resolved numeric animation code, when it is safe to send.

    Raises:
        UnsafeAnimationError: If the animation is known-unsafe for this panel.
        ValueError: If the animation is outside the accepted range.
    """
    animation = resolve_animation(animation)

    if animation < 0 or animation > 8:
        raise ValueError(f"Text animation must be 0-8, got {animation}")

    if animation not in UNSAFE_TEXT_ANIMATIONS:
        return animation

    is_known_safe_panel = (
        width is not None
        and height is not None
        and (width, height) == SAFE_ANIMATION_DIMENSIONS
    )
    if is_known_safe_panel:
        _LOGGER.warning(
            "Text animation %d is only known to work on %dx%d panels. "
            "Sending it because this device reports %dx%d, but a malformed "
            "payload can still boot-loop the device.",
            animation,
            *SAFE_ANIMATION_DIMENSIONS,
            width,
            height,
        )
        return animation

    raise UnsafeAnimationError(
        f"Text animation {animation} is known to put non-32x32 iPIXEL panels "
        f"into a boot loop and is blocked "
        f"(device reports {width}x{height}). "
        f"Use 0 (static), 1 (scroll left) or 2 (scroll right) instead."
    )


@dataclass
class TextStyle:
    """Style settings for native text display.

    The alignment and background-enable defaults match what the official app
    sends on the wire; no other values have been observed in a capture.
    """

    h_align: int = 1
    v_align: int = 1
    effect: int = EFFECT_SCROLL_LEFT
    speed: int = 50
    rainbow_mode: int = 0
    fg_color: tuple[int, int, int] = (255, 255, 255)
    bg_color: tuple[int, int, int] = (0, 0, 0)
    bg_enabled: bool = True


def build_text_header(record_count: int, style: TextStyle) -> bytes:
    """Build the 14-byte text properties header.

    Args:
        record_count: Number of glyph records following the header.
        style: Text style configuration.

    Returns:
        14-byte header.
    """
    header = bytearray()

    # Glyph count (2 bytes LE)
    header.extend((record_count & 0xFFFF).to_bytes(2, "little"))

    # Alignment
    header.append(style.h_align & 0xFF)
    header.append(style.v_align & 0xFF)

    # Animation and speed
    header.append(style.effect & 0xFF)
    header.append(style.speed & 0xFF)

    # Rainbow / style mode
    header.append(style.rainbow_mode & 0xFF)

    # Foreground colour
    header.extend(bytes(style.fg_color))

    # Background enable flag + colour
    header.append(0x01 if style.bg_enabled else 0x00)
    header.extend(bytes(style.bg_color))

    return bytes(header)


def pick_record_type(
    font_size: int,
    advance: float | None = None,
    spacing: str | None = None,
) -> int:
    """Choose a glyph record type for the requested character height.

    The device advances to the next glyph by the full cell width of the
    record type, not by the glyph's ink width. Picking a cell wider than the
    font's own pitch therefore adds phantom gaps between letters, which is
    very visible on an 8px-pitch font such as CUSONG placed in a 16px cell.

    Args:
        font_size: Requested character height in pixels.
        advance: Natural horizontal advance of the font in pixels. When given,
            the narrowest cell that still fits it is chosen.
        spacing: "auto" (default) matches the cell to the font's pitch,
            "wide" always uses the 16px cell so letters get an 8px gap, and
            "tight" always uses the 8px cell. Ignored for heights that have
            only one possible cell.

    Returns:
        Record type byte (a key of GLYPH_RECORD_TYPES).
    """
    if font_size >= 32:
        return 0x02

    if font_size <= 8:
        return 0x00

    choice = (spacing or "auto").strip().lower()
    if choice == "wide":
        return 0x01
    if choice == "tight":
        return 0x00

    if advance is not None and advance <= GLYPH_RECORD_TYPES[0x00][0]:
        return 0x00

    return 0x01


def natural_advance(size: int, font_name: str | None = None) -> float | None:
    """Return the font's own horizontal advance per character.

    Used to size the glyph cell to the font's pitch. Returns None when the
    metrics cannot be read, so callers can fall back to the height-only
    choice.

    Args:
        size: Font size in pixels.
        font_name: Font value to measure with.

    Returns:
        Advance width in pixels, or None if unavailable.
    """
    try:
        from PIL import Image, ImageDraw

        font = _load_font(size, font_name)
        draw = ImageDraw.Draw(Image.new("L", (1, 1), 0))
        # "M" is the widest glyph in most text faces and avoids the zero
        # advance of a space.
        advance = draw.textlength("M", font=font)
        return advance if advance > 0 else None
    except Exception:  # noqa: BLE001 - metrics are a best-effort hint
        _LOGGER.debug("Could not measure font advance for %r", font_name)
        return None


def _reverse_bits(value: int) -> int:
    """Reverse the bits of a single byte."""
    value = ((value & 0xF0) >> 4) | ((value & 0x0F) << 4)
    value = ((value & 0xCC) >> 2) | ((value & 0x33) << 2)
    value = ((value & 0xAA) >> 1) | ((value & 0x55) << 1)
    return value & 0xFF


def _font_search_paths() -> list[Path]:
    """Font files the panel can render with, most specific first."""
    integration_root = Path(__file__).parent.parent
    candidates = [
        integration_root / "assets" / "fonts",
        integration_root / "fonts",
    ]
    try:
        import pypixelcolor

        candidates.append(Path(pypixelcolor.__file__).parent / "fonts")
    except (ImportError, AttributeError):
        pass

    return [path for path in candidates if path.is_dir()]


def _resolve_font_file(font_name: str | None) -> Path | None:
    """Find a font file by name across the bundled and pypixelcolor folders.

    Matching is case-insensitive, because the fonts ship with inconsistent
    casing and HA runs on a case-sensitive filesystem.
    """
    if not font_name:
        return None

    wanted = font_name.strip()
    if not wanted:
        return None
    if not wanted.lower().endswith((".ttf", ".otf")):
        wanted = f"{wanted}.ttf"

    wanted_lower = wanted.lower()
    for directory in _font_search_paths():
        for found in sorted(directory.iterdir()):
            if found.is_file() and found.name.lower() == wanted_lower:
                return found
    return None


def resolve_font(font: str | None) -> tuple[str | None, int]:
    """Resolve a font value to a concrete font file and threshold.

    Falls back to the first bundled font that resolves, so a missing file
    degrades to a readable pixel font instead of PIL's bitmap default.

    Args:
        font: Font value, one of the TEXT_FONTS keys, a filename, or None for
            the built-in default.

    Returns:
        Tuple of (resolved filename or None, 1-bit threshold).
    """
    if font and font in TEXT_FONTS:
        entry = TEXT_FONTS[font]
        if _resolve_font_file(entry["file"]):
            return str(entry["file"]), entry["threshold"]
        _LOGGER.warning(
            "Font file %s for %r is not installed, trying another font",
            entry["file"],
            font,
        )

    if font:
        found = _resolve_font_file(font)
        if found:
            return found.name, DEFAULT_PIXEL_THRESHOLD

    preferred = TEXT_FONTS[DEFAULT_TEXT_FONT]
    if _resolve_font_file(preferred["file"]):
        return str(preferred["file"]), preferred["threshold"]

    for entry in TEXT_FONTS.values():
        if _resolve_font_file(entry["file"]):
            _LOGGER.warning(
                "Default font is missing, falling back to %s", entry["file"]
            )
            return str(entry["file"]), entry["threshold"]

    return None, DEFAULT_PIXEL_THRESHOLD


def _load_font(size: int, font_name: str | None = None):
    """Load a bitmap-friendly font at the requested size."""
    from PIL import ImageFont

    resolved, _ = resolve_font(font_name)
    if resolved:
        found = _resolve_font_file(resolved)
        if found:
            try:
                return ImageFont.truetype(str(found), size)
            except (OSError, IOError):
                _LOGGER.debug("Could not load font %s at %dpx", resolved, size)

    return ImageFont.load_default()


def _baseline_offset(font, bbox: tuple[int, int, int, int], height: int) -> int:
    """Vertical draw offset that sits the glyph on the panel's bottom edge.

    Centring the ink in the cell instead leaves the text floating in the
    middle of a short panel, because a font at size N rarely fills its full
    em box: CUSONG at 16px draws 10px of ink with 6px of leading around it.

    Placing the glyph on the font's own baseline rather than centring it keeps
    every letter on one line, which is what makes descenders (g, p, q, y) sit
    correctly relative to the rest of the word.

    Args:
        font: Loaded PIL font.
        bbox: Result of draw.textbbox((0, 0), char, font).
        height: Cell height in pixels.

    Returns:
        Y offset to draw at. May be negative for a font too tall for the cell,
        which clips the top rather than pushing the text off the bottom.
    """
    try:
        ascent, _ = font.getmetrics()
    except AttributeError:
        ascent = height

    # Baseline sits as low as the cell allows while leaving room for
    # descenders, so the row of ink lands flush with the bottom edge.
    baseline = min(ascent, height - 1)
    # textbbox's bottom edge is exclusive, hence the +1.
    return baseline - bbox[3] + 1


def render_glyph_bitmap(
    char: str,
    record_type: int,
    pixel_threshold: int | None = None,
    font_name: str | None = None,
) -> bytes:
    """Render one character into the fixed-size bitmap the device expects.

    The glyph is drawn on the font's baseline and flush with the left edge of
    its cell, so consecutive letters sit close together and the text rests on
    the bottom of the panel.

    Args:
        char: Single character to render.
        record_type: Glyph record type (key of GLYPH_RECORD_TYPES).
        pixel_threshold: Greyscale cutoff for the 1-bit conversion. Defaults to
            the threshold configured for the resolved font.
        font_name: Font value to render with (key of TEXT_FONTS or a filename).

    Returns:
        Packed bitmap, exactly height * bytes_per_row bytes.
    """
    width, height, row_bytes = GLYPH_RECORD_TYPES[record_type]

    if pixel_threshold is None:
        _, pixel_threshold = resolve_font(font_name)

    try:
        from PIL import Image, ImageDraw
    except ImportError:
        _LOGGER.warning("Pillow not available, emitting blank glyph for %r", char)
        return bytes(height * row_bytes)

    font = _load_font(height, font_name)

    img = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(img)

    bbox = draw.textbbox((0, 0), char, font=font)
    # Left-aligned: the device advances by the full cell anyway, so centring
    # here would only trade leading space for trailing space.
    offset_x = -bbox[0]
    offset_y = _baseline_offset(font, bbox, height)
    draw.text((offset_x, offset_y), char, fill=255, font=font)

    bitmap = bytearray()
    for y in range(height):
        row = 0
        for x in range(width):
            if img.getpixel((x, y)) > pixel_threshold:
                row |= 1 << (width - 1 - x)
        row_data = row.to_bytes(row_bytes, "big")
        # The device reads each byte LSB-first.
        bitmap.extend(_reverse_bits(b) for b in row_data)

    return bytes(bitmap)


def build_char_record(
    char: str,
    color: tuple[int, int, int] = (255, 255, 255),
    record_type: int = 0x02,
    font_name: str | None = None,
) -> bytes:
    """Build a single glyph record.

    Record format: [record_type][R][G][B][bitmap...]

    Args:
        char: Single character.
        color: RGB colour tuple for this glyph.
        record_type: Glyph record type (key of GLYPH_RECORD_TYPES).
        font_name: Font value to render with.

    Returns:
        Glyph record bytes.
    """
    if record_type not in GLYPH_RECORD_TYPES:
        raise ValueError(
            f"Unsupported glyph record type 0x{record_type:02x}; "
            f"expected one of {sorted(GLYPH_RECORD_TYPES)}"
        )

    record = bytearray()
    record.append(record_type & 0xFF)
    record.extend(bytes(color))
    record.extend(render_glyph_bitmap(char, record_type, font_name=font_name))
    return bytes(record)


def cell_height_for(font_size: int) -> int:
    """Return the pixel height glyphs are drawn at for a font size.

    Glyphs are always rendered at the full height of their record type, so this
    -- not font_size -- is the size the font is loaded at.

    Args:
        font_size: Requested character height in pixels.

    Returns:
        Glyph height in pixels.
    """
    return GLYPH_RECORD_TYPES[pick_record_type(font_size)][1]


def measure_text_width(
    text: str,
    font_size: int = 16,
    font_name: str | None = None,
    spacing: str | None = None,
) -> int:
    """Estimate the rendered pixel width of a string.

    The device lays glyphs out on a fixed grid, advancing by the record type's
    cell width for every character, so the layout width is exactly
    ``len(text) * cell_width``. That is what decides whether the text needs to
    scroll, so it must not be padded: an extra cell here would start scrolling
    text that in fact fits.

    Args:
        text: Text string to measure.
        font_size: Requested glyph height; selects the record type.
        font_name: Font value to measure with.
        spacing: Letter spacing override, see pick_record_type.

    Returns:
        Width in pixels as the device will lay the text out.
    """
    if not text:
        return 0

    record_type = pick_record_type(
        font_size,
        natural_advance(cell_height_for(font_size), font_name),
        spacing,
    )
    return len(text) * GLYPH_RECORD_TYPES[record_type][0]


def build_native_text_payload(
    text: str,
    style: TextStyle | None = None,
    font_size: int = 16,
    color: tuple[int, int, int] = (255, 255, 255),
    font_name: str | None = None,
    spacing: str | None = None,
) -> bytes:
    """Build a complete native text protocol payload.

    Args:
        text: Text string to display.
        style: Text style (defaults to a left-scrolling white style).
        font_size: Requested glyph height; selects the record type.
        color: Default text colour, used when no style is supplied.
        font_name: Font value to render with.
        spacing: Letter spacing override, see pick_record_type.

    Returns:
        Complete text payload, ready to be wrapped in 0x0100 frames.
    """
    if style is None:
        style = TextStyle(fg_color=color)

    record_type = pick_record_type(
        font_size,
        natural_advance(cell_height_for(font_size), font_name),
        spacing,
    )

    records = []
    for char in text:
        if len(records) >= MAX_TEXT_RECORDS:
            _LOGGER.warning(
                "Text exceeds %d glyphs, truncating", MAX_TEXT_RECORDS
            )
            break
        records.append(
            build_char_record(char, style.fg_color, record_type, font_name)
        )

    payload = bytearray(build_text_header(len(records), style))
    for record in records:
        payload.extend(record)

    if len(payload) > MAX_TEXT_BUFFER:
        raise ValueError(
            f"Text payload is {len(payload)} bytes, device limit is "
            f"{MAX_TEXT_BUFFER}"
        )

    return bytes(payload)
