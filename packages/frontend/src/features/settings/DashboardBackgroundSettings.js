import React, { useState } from 'react';
import { OVERLAY_MAX, usePreferences } from './PreferencesContext';
import { BackgroundImageError, prepareBackgroundImage } from './backgroundImage';

export const BACKGROUND_PRESETS = [
  { key: 'meadow', name: 'Meadow' },
  { key: 'ocean', name: 'Ocean' },
  { key: 'sunset', name: 'Sunset' },
  { key: 'library', name: 'Library' },
  { key: 'night-sky', name: 'Night sky' },
  { key: 'playful', name: 'Playful' },
];

const presetUrl = key => `/assets/backgrounds/${key}.svg`;

// Built-in backgrounds are stored as "preset:<key>"; uploaded ones as image data URLs.
export function resolveBackground(value) {
  if (!value) return null;
  if (value.startsWith('preset:')) {
    const key = value.slice('preset:'.length);
    return BACKGROUND_PRESETS.some(preset => preset.key === key) ? presetUrl(key) : null;
  }
  return value;
}

export function dashboardBackgroundStyle(image, overlay, resolvedTheme) {
  const source = resolveBackground(image);
  if (!source) return undefined;
  const alpha = Math.min(Math.max(overlay, 0), OVERLAY_MAX) / 100;
  const tint = resolvedTheme === 'dark' ? `rgba(15, 22, 20, ${alpha})` : `rgba(245, 247, 243, ${alpha})`;
  return { '--dashboard-image': `url("${source}")`, '--dashboard-tint': tint };
}

function DashboardBackgroundSettings() {
  const { dashboardBackground, backgroundOverlay, resolvedTheme, saveDashboardBackground } = usePreferences();
  const [draftImage, setDraftImage] = useState(undefined);
  const [draftOverlay, setDraftOverlay] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  const previewImage = draftImage === undefined ? dashboardBackground : draftImage;
  const overlay = draftOverlay ?? backgroundOverlay;
  const dirty = draftImage !== undefined || (draftOverlay !== null && draftOverlay !== backgroundOverlay);
  const reset = () => { setDraftImage(undefined); setDraftOverlay(null); };

  const choose = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    setStatus(null);
    setBusy('processing');
    try {
      setDraftImage(await prepareBackgroundImage(file));
    } catch (chooseError) {
      setError(chooseError instanceof BackgroundImageError ? chooseError.message : "We couldn't process this image. Please try another one.");
    } finally {
      setBusy(null);
    }
  };

  const save = async (changes, successMessage) => {
    setError(null);
    setStatus(null);
    setBusy('saving');
    try {
      await saveDashboardBackground(changes);
      reset();
      setStatus(successMessage);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(null);
    }
  };

  const apply = () => save({ ...(draftImage !== undefined ? { dashboardBackground: draftImage } : {}), backgroundOverlay: overlay }, 'Dashboard background updated.');
  const remove = () => save({ dashboardBackground: null }, 'Default dashboard background restored.');

  return (
    <div className="settings-field dashboard-background-settings">
      <span className="settings-field-title" id="dashboard-background-title">Dashboard background</span>
      <div className="background-preview" style={dashboardBackgroundStyle(previewImage, overlay, resolvedTheme)} aria-labelledby="dashboard-background-title" role="img">
        <div className="background-preview-content" aria-hidden="true">
          <div className="background-preview-heading"><strong>Good morning 👋</strong><span>Here's what's happening today.</span></div>
          <div className="background-preview-cards">
            <div className="stat-card"><span className="stat-icon green">◷</span><div><span className="stat-label">Upcoming sessions</span><strong>3</strong></div></div>
            <div className="stat-card"><span className="stat-icon blue">✓</span><div><span className="stat-label">Sample card</span><strong>Confirmed</strong></div></div>
          </div>
        </div>
        {!previewImage && <span className="background-preview-default">Default SmartAgenda background</span>}
      </div>

      <fieldset className="background-presets">
        <legend>Default backgrounds</legend>
        <div className="background-preset-grid">
          {BACKGROUND_PRESETS.map(preset => {
            const value = `preset:${preset.key}`;
            return (
              <button key={preset.key} type="button" className="background-preset" aria-pressed={previewImage === value} disabled={busy !== null} onClick={() => { setDraftImage(value); setError(null); setStatus(null); }}>
                <span className="background-preset-thumb" style={{ backgroundImage: `url("${presetUrl(preset.key)}")` }} aria-hidden="true" />
                <span>{previewImage === value && <span className="background-preset-check" aria-hidden="true">✓ </span>}{preset.name}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="background-actions">
        <span className="background-actions-label">Or use your own photo</span>
        <input id="dashboard-background-file" className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy !== null} onChange={choose} />
        <label className="button-secondary background-choose" htmlFor="dashboard-background-file">{previewImage?.startsWith('data:') ? 'Replace image' : 'Choose image'}</label>
        {dashboardBackground && <button type="button" className="button-secondary" disabled={busy !== null} onClick={remove}>Remove background</button>}
      </div>

      <label htmlFor="dashboard-background-overlay">Background overlay</label>
      <div className="overlay-control">
        <span aria-hidden="true">Light</span>
        <input id="dashboard-background-overlay" type="range" min="0" max={OVERLAY_MAX} step="5" value={overlay} aria-valuetext={`${overlay}% overlay`} disabled={!previewImage || busy !== null} onChange={event => setDraftOverlay(Number(event.target.value))} />
        <span aria-hidden="true">Strong</span>
      </div>

      {busy === 'processing' && <p className="form-status" role="status">Preparing image...</p>}
      {error && <p className="form-status error" role="alert">{error}</p>}
      {status && <p className="form-status success" role="status">{status}</p>}

      <div className="background-apply-row">
        <button type="button" className="button-secondary" disabled={!dirty || busy !== null} onClick={() => { reset(); setError(null); }}>Cancel</button>
        <button type="button" className="small-action" disabled={!dirty || busy !== null} onClick={apply}>{busy === 'saving' ? 'Saving...' : 'Apply'}</button>
      </div>
    </div>
  );
}

export default DashboardBackgroundSettings;
