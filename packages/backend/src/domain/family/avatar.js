const AVATAR_PRESETS = ['house', 'family', 'adult', 'grandparent', 'child', 'girl', 'boy', 'baby', 'bear', 'fox', 'owl', 'cat', 'book', 'star'];
const DEFAULT_AVATARS = { household: 'preset:house', guardian: 'preset:adult', child: 'preset:child' };
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/;
const MAX_IMAGE_LENGTH = 400 * 1024;

function resolveAvatar(value, kind) {
  if (value === undefined || value === null || value === '') return DEFAULT_AVATARS[kind];
  if (typeof value === 'string' && value.startsWith('preset:') && AVATAR_PRESETS.includes(value.slice('preset:'.length))) return value;
  if (typeof value === 'string' && value.length <= MAX_IMAGE_LENGTH && IMAGE_DATA_URL.test(value)) return value;
  const error = new Error('Avatars must be a built-in avatar or a PNG, JPEG, WEBP, or GIF image under 300 KB.');
  error.code = 'FAMILY_VALIDATION';
  throw error;
}

module.exports = { AVATAR_PRESETS, DEFAULT_AVATARS, resolveAvatar };
