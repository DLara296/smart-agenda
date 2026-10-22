import React, { useState } from 'react';

export const AVATAR_PRESETS = {
  house: '🏠', family: '👨‍👩‍👧', adult: '🧑', grandparent: '👵', child: '🧒', girl: '👧', boy: '👦',
  baby: '👶', bear: '🐻', fox: '🦊', owl: '🦉', cat: '🐱', book: '📚', star: '⭐',
};
export const DEFAULT_AVATARS = { household: 'preset:house', guardian: 'preset:adult', child: 'preset:child' };
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const MAX_STORED_LENGTH = 400 * 1024;
const AVATAR_SIZE = 256;

const readAsDataUrl = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

// Photos are shrunk to a small square JPEG so they stay light to store and send.
async function toAvatarDataUrl(file) {
  const source = await readAsDataUrl(file);
  const image = await new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = reject;
    element.src = source;
  }).catch(() => null);
  const canvas = document.createElement('canvas');
  const context = image && canvas.getContext ? canvas.getContext('2d') : null;
  if (!context) return source;
  const side = Math.min(image.width, image.height);
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function FamilyAvatar({ value, kind = 'household', name = '', size = 'medium' }) {
  const avatar = value || DEFAULT_AVATARS[kind];
  const className = `family-avatar family-avatar-${size}`;
  if (avatar.startsWith('data:image/')) return <img className={className} src={avatar} alt={name ? `${name} avatar` : ''} />;
  const preset = AVATAR_PRESETS[avatar.slice('preset:'.length)] || AVATAR_PRESETS[DEFAULT_AVATARS[kind].slice('preset:'.length)];
  return <span className={className} role="img" aria-label={name ? `${name} avatar` : 'Avatar'}>{preset}</span>;
}

export function AvatarPicker({ id, label, kind, value, name, onChange }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const current = value || DEFAULT_AVATARS[kind];

  const upload = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_SOURCE_BYTES) {
      setError('Choose a PNG, JPEG, WEBP, or GIF image under 5 MB.');
      return;
    }
    const dataUrl = await toAvatarDataUrl(file).catch(() => null);
    if (!dataUrl || dataUrl.length > MAX_STORED_LENGTH) {
      setError('This image could not be used. Try a smaller photo.');
      return;
    }
    setError(null);
    onChange(dataUrl);
    setOpen(false);
  };

  return (
    <div className="avatar-picker">
      <FamilyAvatar value={current} kind={kind} name={name} size="large" />
      <div className="avatar-picker-body">
        <span className="avatar-picker-label">{label}</span>
        <div className="avatar-picker-actions">
          <button type="button" className="button-secondary" aria-expanded={open} aria-controls={`${id}-options`} onClick={() => setOpen(!open)}>Choose avatar</button>
          <label className="button-secondary avatar-upload" htmlFor={`${id}-upload`}>Upload photo</label>
          <input id={`${id}-upload`} className="visually-hidden" type="file" accept={ACCEPTED_TYPES.join(',')} onChange={upload} />
          {current !== DEFAULT_AVATARS[kind] && <button type="button" className="text-action" onClick={() => { onChange(DEFAULT_AVATARS[kind]); setError(null); }}>Use default</button>}
        </div>
        {open && (
          <div id={`${id}-options`} className="avatar-options" role="group" aria-label={`${label} options`}>
            {Object.entries(AVATAR_PRESETS).map(([key, emoji]) => (
              <button key={key} type="button" aria-label={`Avatar ${key}`} aria-pressed={current === `preset:${key}`} onClick={() => { onChange(`preset:${key}`); setOpen(false); setError(null); }}>{emoji}</button>
            ))}
          </div>
        )}
        {error && <p className="form-status error" role="alert">{error}</p>}
      </div>
    </div>
  );
}
