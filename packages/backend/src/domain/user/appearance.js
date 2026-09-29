const THEMES = ['light', 'dark', 'system'];
const INTERFACE_EFFECTS = ['solid', 'glass', 'minimal'];
const DEFAULT_INTERFACE_EFFECT = 'glass';
const BACKGROUND_PRESETS = ['meadow', 'ocean', 'sunset', 'library', 'night-sky', 'playful'];
const MAX_BACKGROUND_BYTES = 1.5 * 1024 * 1024;
const OVERLAY_RANGE = { min: 0, max: 80 };
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+=*)$/;

function appearanceError(message) {
  const error = new Error(message);
  error.code = 'INVALID_APPEARANCE';
  return error;
}

// The declared type is not trusted; the decoded bytes must carry a matching file signature.
function detectImageType(bytes) {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

function validateBackground(value) {
  if (value === null) return null;
  if (typeof value === 'string' && value.startsWith('preset:') && BACKGROUND_PRESETS.includes(value.slice('preset:'.length))) return value;
  const match = typeof value === 'string' ? DATA_URL.exec(value) : null;
  if (!match) throw appearanceError('Please upload a JPG, PNG, or WebP image.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > MAX_BACKGROUND_BYTES) throw appearanceError('The background image is too large.');
  if (detectImageType(bytes) !== match[1]) throw appearanceError('The background image is invalid.');
  return value;
}

function validateTheme(value) {
  if (!THEMES.includes(value)) throw appearanceError('Choose Light, Dark, or System.');
  return value;
}

function validateOverlay(value) {
  if (!Number.isInteger(value) || value < OVERLAY_RANGE.min || value > OVERLAY_RANGE.max) throw appearanceError(`The overlay must be between ${OVERLAY_RANGE.min} and ${OVERLAY_RANGE.max}.`);
  return value;
}

function validateInterfaceEffect(value) {
  if (!INTERFACE_EFFECTS.includes(value)) throw appearanceError('Choose Solid, Glass, or Minimal Transparency.');
  return value;
}

module.exports = { BACKGROUND_PRESETS, DEFAULT_INTERFACE_EFFECT, INTERFACE_EFFECTS, MAX_BACKGROUND_BYTES, OVERLAY_RANGE, validateBackground, validateTheme, validateOverlay, validateInterfaceEffect };
