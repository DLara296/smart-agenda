import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';

function SchoolProfileEditor({ school, onCancel, onSave }) {
  const { t } = useI18n();
  const [name, setName] = useState(school.name || '');
  const [timezone, setTimezone] = useState(school.timezone || 'UTC');
  const [locale, setLocale] = useState(school.locale || 'en-US');
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(school.name || '');
    setTimezone(school.timezone || 'UTC');
    setLocale(school.locale || 'en-US');
  }, [school]);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await onSave({ name, timezone, locale });
      setStatus('success');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  return <section className="panel profile-editor" aria-label={t('editSchoolProfile')}>
    <div className="form-heading"><div><p className="app-eyebrow">{t('schoolProfileSettings')}</p><h1>{t('editSchoolProfile')}</h1></div><button type="button" className="button-secondary" onClick={onCancel}>{t('back')}</button></div>
    <p className="form-help">{t('schoolProfileHelp')}</p>
    <label htmlFor="school-profile-name">{t('schoolName')}</label>
    <input id="school-profile-name" value={name} onChange={event => { setName(event.target.value); setStatus(null); }} required />
    <label htmlFor="school-profile-timezone">{t('timezone')}</label>
    <input id="school-profile-timezone" value={timezone} onChange={event => { setTimezone(event.target.value); setStatus(null); }} required />
    <label htmlFor="school-profile-locale">{t('locale')}</label>
    <input id="school-profile-locale" value={locale} onChange={event => { setLocale(event.target.value); setStatus(null); }} required />
    {status === 'success' && <p className="form-status success" role="status">{t('changesSaved')}</p>}
    {status === 'error' && <p className="form-status error" role="alert">{t('saveError')}</p>}
    <button type="button" disabled={saving || !name.trim()} onClick={save}>{saving ? t('saving') : t('saveChanges')}</button>
  </section>;
}

export default SchoolProfileEditor;
