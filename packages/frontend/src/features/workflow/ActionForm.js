import React, { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';

function ActionForm({ type, onCancel }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  const copy = { session: [t('manageReading'), t('sessionOps'), t('communicationHelp')], volunteer: [t('assignTitle'), t('coverage'), t('communicationHelp')], notification: [t('sendTitle'), t('communication'), t('communicationHelp')] };
  const [title, eyebrow, help] = copy[type];
  const submit = event => { event.preventDefault(); setDone(true); };
  return <form className="family-form workflow-form" onSubmit={submit}>
    <div className="form-heading"><div><p className="app-eyebrow">{eyebrow}</p><h1>{title}</h1></div><button type="button" className="button-secondary" onClick={onCancel}>{t('back')}</button></div>
    <p className="form-help">{help}</p>
    {type === 'session' && <><label htmlFor="session-status">{t('sessionStatus')}</label><select id="session-status" defaultValue="scheduled"><option>{t('scheduled')}</option><option>{t('confirmed')}</option><option>{t('cancelled')}</option></select><label htmlFor="session-note">{t('coordinatorNote')}</label><textarea id="session-note" placeholder={t('coordinatorNote')} /></>}
    {type === 'volunteer' && <><label htmlFor="volunteer-group">{t('groupName')}</label><select id="volunteer-group" defaultValue="group-b"><option>Group B · English</option><option>Group A · Spanish</option></select><label htmlFor="volunteer-name">{t('volunteer')}</label><input id="volunteer-name" placeholder={t('searchPlaceholder')} required /></>}
    {type === 'notification' && <><label htmlFor="notification-channel">{t('channel')}</label><select id="notification-channel" defaultValue="whatsapp"><option>WhatsApp</option><option>Email</option><option>SMS</option></select><label htmlFor="notification-message">{t('message')}</label><textarea id="notification-message" placeholder={t('message')} required /></>}
    {done && <p className="form-status success" role="status">{type === 'volunteer' ? t('assignmentSaved') : type === 'notification' ? t('notificationQueued') : t('saveSession')}</p>}
    <button type="submit">{type === 'volunteer' ? t('assignVolunteer') : type === 'notification' ? t('sendNotification') : t('saveChanges')}</button>
  </form>;
}
export default ActionForm;
