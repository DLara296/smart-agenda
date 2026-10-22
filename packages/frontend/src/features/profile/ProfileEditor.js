import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { AvatarPicker } from './AvatarPicker';

const defaultProfile = { name: 'David Lara', avatar: { value: 'DL', tone: 'default' } };

function ProfileEditor({ initialProfile = defaultProfile, onCancel, onSave }) {
  const { t } = useI18n();
  const [name, setName] = useState(initialProfile.name || '');
  const [avatar, setAvatar] = useState(initialProfile.avatar || { value: 'DL', tone: 'default' });
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(initialProfile.name || '');
    setAvatar(initialProfile.avatar || { value: 'DL', tone: 'default' });
  }, [initialProfile]);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      if (onSave) await onSave({ name, avatar });
      setStatus('success');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  return <section className="panel profile-editor" aria-label={t('editProfile')}>
    <div className="form-heading"><div><p className="app-eyebrow">{t('profileSettings')}</p><h1>{t('editProfile')}</h1></div><button type="button" className="button-secondary" onClick={onCancel}>{t('back')}</button></div>
    <p className="form-help">{t('profileHelp')}</p>
    <AvatarPicker avatar={avatar} name={name} onChange={nextAvatar => { setAvatar(nextAvatar); setStatus(null); }} />
    <label htmlFor="profile-name">{t('name')}</label>
    <input id="profile-name" value={name} onChange={event => { setName(event.target.value); setStatus(null); }} required />
    {status === 'success' && <p className="form-status success" role="status">{t('changesSaved')}</p>}
    {status === 'error' && <p className="form-status error" role="alert">{t('saveError')}</p>}
    <button type="button" disabled={saving || !name.trim()} onClick={save}>{saving ? t('saving') : t('saveChanges')}</button>
  </section>;
}

export default ProfileEditor;
