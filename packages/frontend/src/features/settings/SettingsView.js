import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { DATE_FORMATS, TIME_FORMATS, THEMES, formatDateWith, formatTimeWith, usePreferences } from './PreferencesContext';
import ApplicationBackgroundSettings from './ApplicationBackgroundSettings';

const SAMPLE_DATE = '2026-10-06';
const SAMPLE_TIME = '19:40';

function RadioGroup({ name, legend, options, value, onChange }) {
  return (
    <fieldset className="settings-field">
      <legend>{legend}</legend>
      <div className="radio-options" role="radiogroup" aria-label={legend}>
        {options.map(option => (
          <label key={option.value} className={`radio-option ${value === option.value ? 'selected' : ''}`}>
            <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SettingsView() {
  const { t, language, languages, setLanguage } = useI18n();
  const { theme, dateFormat, timeFormat, cookiesAllowed, updatePreferences } = usePreferences();

  return (
    <section className="panel settings-view" aria-label={t('settings')}>
      <div className="panel-heading compact"><div><span className="section-kicker">{t('manage')}</span><h1>{t('settings')}</h1></div></div>

      <h2 className="settings-section-title">{t('appearance')}</h2>
      <RadioGroup name="theme" legend={t('theme')} value={theme} onChange={next => updatePreferences({ theme: next })} options={THEMES.map(option => ({ value: option, label: t(`theme_${option}`) }))} />
      <ApplicationBackgroundSettings />
      <RadioGroup name="language" legend={t('language')} value={language} onChange={setLanguage} options={languages.map(option => ({ value: option.code, label: option.name }))} />
      <div className="settings-field">
        <label htmlFor="settings-date-format">{t('dateFormat')}</label>
        <select id="settings-date-format" value={dateFormat} onChange={event => updatePreferences({ dateFormat: event.target.value })}>
          {DATE_FORMATS.map(format => <option key={format} value={format}>{format} ({formatDateWith(format, SAMPLE_DATE)})</option>)}
        </select>
      </div>
      <div className="settings-field">
        <label htmlFor="settings-time-format">{t('timeFormat')}</label>
        <select id="settings-time-format" value={timeFormat} onChange={event => updatePreferences({ timeFormat: event.target.value })}>
          {TIME_FORMATS.map(format => <option key={format} value={format}>{t(`time_${format}`)} ({formatTimeWith(format, SAMPLE_TIME)})</option>)}
        </select>
      </div>

      <h2 className="settings-section-title">{t('privacySecurity')}</h2>
      <div className="switch-row">
        <div><strong id="switch-cookies">{t('cookiePreferences')}</strong><span>{t('cookieHelp')}</span></div>
        <button type="button" role="switch" className="switch" aria-labelledby="switch-cookies" aria-checked={cookiesAllowed} onClick={() => updatePreferences({ cookiesAllowed: !cookiesAllowed })}><span /></button>
      </div>
    </section>
  );
}

export default SettingsView;
