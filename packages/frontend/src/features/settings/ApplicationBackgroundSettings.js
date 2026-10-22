import React, { useState } from 'react';
import { INTERFACE_EFFECTS, OVERLAY_MAX, usePreferences } from './PreferencesContext';
import { BACKGROUND_PRESETS, backgroundLayerStyle, presetUrl } from './ApplicationBackground';
import { BackgroundImageError, prepareBackgroundImage } from './backgroundImage';

const EFFECT_LABELS = { solid: 'Solid', glass: 'Glass', minimal: 'Minimal Transparency' };
const EFFECT_HELP = {
  solid: 'Mostly opaque surfaces.',
  glass: 'Translucent surfaces with a soft blur.',
  minimal: 'Subtle transparency without blur.',
};

function ShellPreview({ image, overlay, effect, resolvedTheme }) {
  const hasImage = Boolean(backgroundLayerStyle(image, overlay, resolvedTheme));
  return (
    <div
      className={`background-preview shell-preview ${hasImage ? `has-app-background effect-${effect}` : ''}`}
      style={backgroundLayerStyle(image, overlay, resolvedTheme)}
      role="img"
      aria-labelledby="application-background-title"
      data-effect={effect}
    >
      <div className="shell-preview-sidebar" aria-hidden="true">
        <span className="shell-preview-brand" />
        <span className="shell-preview-nav active" />
        <span className="shell-preview-nav" />
        <span className="shell-preview-nav" />
        <span className="shell-preview-nav" />
      </div>
      <div className="shell-preview-workspace" aria-hidden="true">
        <div className="shell-preview-topbar"><span /><span /></div>
        <div className="shell-preview-main">
          <div className="background-preview-heading"><strong>Good morning 👋</strong><span>Here's what's happening today.</span></div>
          <div className="background-preview-cards">
            <div className="stat-card"><span className="stat-icon green">◷</span><div><span className="stat-label">Upcoming sessions</span><strong>3</strong></div></div>
            <div className="stat-card"><span className="stat-icon blue">✓</span><div><span className="stat-label">Sample card</span><strong>Confirmed</strong></div></div>
          </div>
        </div>
      </div>
      {!hasImage && <span className="background-preview-default">Default SmartAgenda background</span>}
    </div>
  );
}

function ApplicationBackgroundSettings() {
  const { applicationBackground, backgroundOverlay, interfaceEffect, resolvedTheme, saveAppearance } = usePreferences();
  const [draftImage, setDraftImage] = useState(undefined);
  const [draftOverlay, setDraftOverlay] = useState(null);
  const [draftEffect, setDraftEffect] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  const previewImage = draftImage === undefined ? applicationBackground : draftImage;
  const overlay = draftOverlay ?? backgroundOverlay;
  const effect = draftEffect ?? interfaceEffect;
  const dirty = draftImage !== undefined
    || (draftOverlay !== null && draftOverlay !== backgroundOverlay)
    || (draftEffect !== null && draftEffect !== interfaceEffect);
  const reset = () => { setDraftImage(undefined); setDraftOverlay(null); setDraftEffect(null); };

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
      await saveAppearance(changes);
      reset();
      setStatus(successMessage);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(null);
    }
  };

  const apply = () => save({ ...(draftImage !== undefined ? { applicationBackground: draftImage } : {}), backgroundOverlay: overlay, interfaceEffect: effect }, 'Application Background updated.');
  const remove = () => save({ applicationBackground: null }, 'Default application background restored.');

  return (
    <div className="settings-field application-background-settings">
      <span className="settings-field-title" id="application-background-title">Application Background</span>
      <p className="form-help background-help">Shown behind every page, including the navigation and top bar.</p>
      <ShellPreview image={previewImage} overlay={overlay} effect={effect} resolvedTheme={resolvedTheme} />

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
        <input id="application-background-file" className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy !== null} onChange={choose} />
        <label className="button-secondary background-choose" htmlFor="application-background-file">{previewImage?.startsWith('data:') ? 'Replace image' : 'Choose image'}</label>
        {applicationBackground && <button type="button" className="button-secondary" disabled={busy !== null} onClick={remove}>Remove background</button>}
      </div>

      <label htmlFor="application-background-overlay">Background overlay</label>
      <div className="overlay-control">
        <span aria-hidden="true">Light</span>
        <input id="application-background-overlay" type="range" min="0" max={OVERLAY_MAX} step="5" value={overlay} aria-valuetext={`${overlay}% overlay`} disabled={!previewImage || busy !== null} onChange={event => setDraftOverlay(Number(event.target.value))} />
        <span aria-hidden="true">Dark</span>
      </div>

      <fieldset className="background-effects">
        <legend>Interface effect</legend>
        <div className="radio-options" role="radiogroup" aria-label="Interface effect">
          {INTERFACE_EFFECTS.map(option => (
            <label key={option} className={`radio-option ${effect === option ? 'selected' : ''}`} title={EFFECT_HELP[option]}>
              <input type="radio" name="interface-effect" value={option} checked={effect === option} disabled={busy !== null} onChange={() => setDraftEffect(option)} />
              <span>{EFFECT_LABELS[option]}</span>
            </label>
          ))}
        </div>
        <p className="form-help">{EFFECT_HELP[effect]}</p>
      </fieldset>

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

export default ApplicationBackgroundSettings;
