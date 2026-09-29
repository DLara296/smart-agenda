import React, { memo } from 'react';
import { OVERLAY_MAX } from './PreferencesContext';

export const BACKGROUND_PRESETS = [
  { key: 'meadow', name: 'Meadow' },
  { key: 'ocean', name: 'Ocean' },
  { key: 'sunset', name: 'Sunset' },
  { key: 'library', name: 'Library' },
  { key: 'night-sky', name: 'Night sky' },
  { key: 'playful', name: 'Playful' },
];

export const presetUrl = key => `/assets/backgrounds/${key}.svg`;

// Built-in backgrounds are stored as "preset:<key>"; uploaded ones as image data URLs.
export function resolveBackground(value) {
  if (!value) return null;
  if (value.startsWith('preset:')) {
    const key = value.slice('preset:'.length);
    return BACKGROUND_PRESETS.some(preset => preset.key === key) ? presetUrl(key) : null;
  }
  return value.startsWith('data:image/') ? value : null;
}

export function backgroundLayerStyle(image, overlay, resolvedTheme) {
  const source = resolveBackground(image);
  if (!source) return undefined;
  const alpha = Math.min(Math.max(overlay, 0), OVERLAY_MAX) / 100;
  const tint = resolvedTheme === 'dark' ? `rgba(15, 22, 20, ${alpha})` : `rgba(245, 247, 243, ${alpha})`;
  return { '--app-image': `url("${source}")`, '--app-tint': tint };
}

// Memoized so route changes in the app shell never re-render or reload the image.
const ApplicationBackground = memo(function ApplicationBackground({ image, overlay, resolvedTheme }) {
  const style = backgroundLayerStyle(image, overlay, resolvedTheme);
  if (!style) return null;
  return <div className="app-background" style={style} aria-hidden="true" data-testid="app-background" />;
});

export default ApplicationBackground;
