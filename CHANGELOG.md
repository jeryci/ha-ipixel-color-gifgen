# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.1]

### Fixed
- Letters are no longer spaced too far apart. The panel advances one fixed
  cell per glyph, and the cell was always 16px, so an 8px-pitch font such as
  CUSONG got a phantom 8px gap between every letter. The cell now matches the
  font's own pitch.
- Text no longer floats in the middle of the panel. Glyph ink was centred
  inside its cell; it is now drawn on the font's baseline and rests on the
  bottom edge, which also puts descenders on the correct line.
- `measure_text_width` no longer adds a spare cell, so text that fits is not
  needlessly scrolled. More text now fits per line: `HELLO` in CUSONG is 40px
  and static, where it was 80px and scrolling.

### Added
- `spacing` option on `set_matrix_text` and in the Text tab: `auto` (match the
  font), `wide` (8px gap) or `tight` (packed, may clip wider fonts)

## [0.5.0]

### Added
- Single primary `ipixel-control-card` that switches between Text and GIF
- Eight selectable bundled fonts, with per-font 1-bit thresholds and a
  fallback chain so a missing font file degrades to a readable pixel font
- Automatic scrolling: text is static when it fits the 64x16 panel and
  scrolls left when it does not, with configurable effect and speed
- `display_gif_data` service accepting a data URL or base64 GIF
- Optional `device_id` on `display_local_gallery`, falling back to the first
  loaded iPIXEL device
- Browser-side GIF encoding and creation, stored in `localStorage`
- GIF Library, Create and Mine tabs, plus a live `LEDMatrixRenderer` preview

### Changed
- Consolidates the previous seven cards and three transport modules into one
  card, taking the frontend bundle from 182kb to 67kb
- Ambient images now use the reliable GIF/image delivery path

## [0.1.0] - 2024-11-19

### Added
- Initial release of iPIXEL Color Home Assistant integration
- Bluetooth auto-discovery of iPIXEL devices (`LED_BLE_*` pattern)
- Basic power on/off control via switch entity
- Manual device configuration as fallback
- Proper Home Assistant device registry integration
- Connection management with error handling
- Configuration flow with discovery and manual entry options
- English translations and UI strings

### Technical Details
- Implements core Bluetooth protocol commands based on reverse-engineered documentation
- Uses `bleak` library for cross-platform Bluetooth Low Energy communication
- Follows Home Assistant integration best practices
- Power commands: `[5, 0, 7, 1, 1]` (on) / `[5, 0, 7, 1, 0]` (off)
- Bluetooth UUIDs:
  - Write: `0000fa02-0000-1000-8000-00805f9b34fb`
  - Notify: `0000fa03-0000-1000-8000-00805f9b34fb`

### Limitations
- Only basic power control in this version
- No brightness, color, or image upload features yet
- Single switch entity per device

### Coming in Future Versions
- v0.2.0: Brightness control and basic light entity
- v0.3.0: RGB color control and display modes
- v0.4.0: Image/GIF upload and media player entity
- v1.0.0: Complete feature set and HACS submission