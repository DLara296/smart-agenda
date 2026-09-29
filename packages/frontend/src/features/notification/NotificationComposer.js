import React, { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';

const CHANNELS = ['sms', 'whatsapp', 'email'];
const CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'Email' };
const ENABLED_CHANNELS = [];
const UNAVAILABLE_MESSAGE = 'Delivery is not implemented yet. No message was sent.';
const HEADERS = { 'Content-Type': 'application/json', 'x-user-role': 'admin' };

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: { ...HEADERS, ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || 'Unable to complete this notification action.');
  return payload;
}

function NotificationComposer({ onCancel }) {
  const { t } = useI18n();
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState('');
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [individualChannel, setIndividualChannel] = useState('whatsapp');
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupEditor, setGroupEditor] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [groupChannel, setGroupChannel] = useState('whatsapp');
  const [groupMembers, setGroupMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [channelNotice, setChannelNotice] = useState('');

  const loadSchoolData = async id => {
    setSchoolId(id);
    setSelected([]);
    setContacts([]);
    setGroups([]);
    setError('');
    if (!id) return;
    try {
      const [recipientPayload, groupPayload] = await Promise.all([
        request(`/v1/notification-recipients?schoolId=${encodeURIComponent(id)}`),
        request(`/v1/notification-groups?schoolId=${encodeURIComponent(id)}`),
      ]);
      setContacts(recipientPayload.data || []);
      setGroups(groupPayload.data || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    request('/v1/schools').then(payload => setSchools(payload.data || [])).catch(loadError => setError(loadError.message));
  }, []);

  const availableContacts = contacts.filter(contact => contact.eligibleChannels.includes(individualChannel));
  const matchingContacts = availableContacts.filter(contact => `${contact.name} ${contact.role}`.toLowerCase().includes(search.trim().toLowerCase()));
  const matchingGroups = groups.filter(group => group.name.toLowerCase().includes(groupSearch.trim().toLowerCase()));
  const currentSelected = useMemo(() => selected.map(item => {
    if (item.type === 'group') {
      const group = groups.find(candidate => candidate.id === item.id);
      return group ? { ...item, name: group.name, channel: group.channel } : null;
    }
    const contact = contacts.find(candidate => candidate.id === item.id && candidate.type === item.memberType);
    return contact ? { ...item, name: contact.name, role: contact.role, channel: individualChannel, valid: contact.eligibleChannels.includes(individualChannel) } : null;
  }).filter(Boolean), [contacts, groups, individualChannel, selected]);
  const selectedIsValid = currentSelected.length > 0 && currentSelected.every(item => item.type === 'group' || item.valid);
  const selectedChannelsAvailable = currentSelected.every(item => ENABLED_CHANNELS.includes(item.channel));

  const preview = useMemo(() => {
    const resolved = new Set();
    let unavailable = 0;
    currentSelected.forEach(item => {
      if (item.type === 'group') {
        const group = groups.find(candidate => candidate.id === item.id);
        (group?.members || []).forEach(member => {
          if (!member.active || !member.eligibleChannels.includes(group.channel)) unavailable += 1;
          else resolved.add(`${member.type}:${member.id}:${group.channel}`);
        });
      } else if (item.valid) resolved.add(`${item.memberType}:${item.id}:${item.channel}`);
    });
    return { recipientCount: resolved.size, unavailable };
  }, [currentSelected, groups]);

  const toggleSelection = item => {
    const removing = selected.some(current => current.key === item.key);
    setSelected(previous => removing ? previous.filter(current => current.key !== item.key) : [...previous, item]);
    if (!removing) {
      const channel = item.type === 'group' ? groups.find(group => group.id === item.id)?.channel : individualChannel;
      if (channel) setChannelNotice(UNAVAILABLE_MESSAGE);
    }
    if (removing && selected.length === 1) setChannelNotice('');
  };

  const selectIndividualChannel = channel => {
    setIndividualChannel(channel);
    setChannelNotice(UNAVAILABLE_MESSAGE);
  };

  const selectGroupChannel = channel => {
    setGroupChannel(channel);
    setChannelNotice(UNAVAILABLE_MESSAGE);
  };

  const openGroupForm = group => {
    setGroupEditor(group || null);
    setGroupName(group?.name || '');
    setGroupChannel(group?.channel || 'whatsapp');
    setGroupMembers((group?.members || []).map(member => ({ id: member.id, type: member.type, name: member.name, role: member.role })));
    setShowGroupForm(true);
    setError('');
    setStatus('');
  };

  const toggleGroupMember = member => setGroupMembers(previous => previous.some(item => item.id === member.id && item.type === member.type)
    ? previous.filter(item => item.id !== member.id || item.type !== member.type)
    : [...previous, { id: member.id, type: member.type, name: member.name, role: member.role }]);

  const invalidGroupMembers = groupMembers.map(member => ({
    reference: member,
    contact: contacts.find(contact => contact.id === member.id && contact.type === member.type)
      || groupEditor?.members.find(contact => contact.id === member.id && contact.type === member.type),
  })).filter(({ contact }) => !contact || !contact.active || !contact.eligibleChannels.includes(groupChannel));

  const saveGroup = async event => {
    event.preventDefault();
    setError('');
    setStatus('');
    if (!groupName.trim()) { setError('Enter a group name.'); return; }
    if (groupMembers.length === 0) { setError('Choose at least one member.'); return; }
    if (invalidGroupMembers.length > 0) { setError('Remove members who cannot receive this channel before saving.'); return; }
    setSaving(true);
    try {
      const payload = await request(groupEditor ? `/v1/notification-groups/${groupEditor.id}` : '/v1/notification-groups', {
        method: groupEditor ? 'PATCH' : 'POST',
        body: JSON.stringify({ schoolId, name: groupName, channel: groupChannel, members: groupMembers.map(({ id, type }) => ({ id, type })) }),
      });
      const saved = payload.data;
      setGroups(previous => groupEditor ? previous.map(group => group.id === saved.id ? saved : group) : [...previous, saved].sort((left, right) => left.name.localeCompare(right.name)));
      setSelected(previous => groupEditor ? previous : [...previous, { key: `group:${saved.id}`, type: 'group', id: saved.id, name: saved.name }]);
      if (!ENABLED_CHANNELS.includes(saved.channel)) setChannelNotice(UNAVAILABLE_MESSAGE);
      setShowGroupForm(false);
      setGroupEditor(null);
      setStatus(`Saved ${saved.name}.`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async group => {
    if (confirmDeleteId !== group.id) { setConfirmDeleteId(group.id); return; }
    try {
      await request(`/v1/notification-groups/${group.id}?schoolId=${encodeURIComponent(schoolId)}`, { method: 'DELETE' });
      setGroups(previous => previous.filter(item => item.id !== group.id));
      setSelected(previous => previous.filter(item => item.key !== `group:${group.id}`));
      setConfirmDeleteId(null);
      setStatus(`Deleted ${group.name}.`);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const send = async event => {
    event.preventDefault();
    setError('');
    setStatus('');
    if (!schoolId) { setError('Select a school.'); return; }
    if (currentSelected.length === 0) { setError('Choose at least one recipient or notification group.'); return; }
    if (!selectedIsValid) { setError('Change the channel or remove individual recipients without a valid contact for it.'); return; }
    if (!selectedChannelsAvailable) { setChannelNotice(UNAVAILABLE_MESSAGE); return; }
    if (preview.recipientCount === 0) { setError('No selected group members currently have a valid contact for their channel.'); return; }
    if (!message.trim()) { setError('Enter a message.'); return; }
    setSending(true);
    try {
      const recipients = currentSelected.map(item => item.type === 'group'
        ? { groupId: item.id }
        : { id: item.id, type: item.memberType, channel: item.channel });
      const idempotencyKey = window.crypto?.randomUUID?.() || `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const payload = await request('/v1/notifications', { method: 'POST', body: JSON.stringify({ schoolId, recipients, message: message.trim(), idempotencyKey }) });
      setStatus(`Notification queued for ${payload.data.recipientCount} recipient${payload.data.recipientCount === 1 ? '' : 's'}${payload.data.unavailableCount ? `; ${payload.data.unavailableCount} unavailable contact${payload.data.unavailableCount === 1 ? '' : 's'} skipped` : ''}.`);
      setSelected([]);
      setMessage('');
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setSending(false);
    }
  };

  return <form className="family-form workflow-form notification-composer" onSubmit={send}>
    <div className="form-heading"><div><p className="app-eyebrow">{t('communication')}</p><h1>{t('sendTitle')}</h1></div><button type="button" className="button-secondary" onClick={onCancel}>{t('back')}</button></div>
    <p className="form-help">Choose a school and confirm the audience before queueing a notification.</p>
    <div className="session-field"><label htmlFor="notification-school">School</label><select id="notification-school" value={schoolId} onChange={event => loadSchoolData(event.target.value)} required><option value="">Select a school</option>{schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}</select></div>

    {schoolId && <>
      <section className="notification-recipient-section" aria-labelledby="recipient-heading">
        <div className="notification-section-heading"><h2 id="recipient-heading">Recipients <span aria-hidden="true">*</span></h2><button type="button" className="button-secondary" onClick={() => openGroupForm(null)}>＋ Create notification group</button></div>
        {currentSelected.length > 0 && <div className="notification-selection" aria-label="Selected recipients">{currentSelected.map(item => <span className="notification-chip" key={item.key}>{item.name}{item.type === 'group' ? ` · ${CHANNEL_LABELS[item.channel]}` : ` · ${item.role}`}{item.type === 'individual' && !item.valid ? ' · unavailable' : ''}<button type="button" aria-label={`Remove ${item.name}`} onClick={() => setSelected(previous => previous.filter(selection => selection.key !== item.key))}>×</button></span>)}</div>}
        <div className="session-field"><label htmlFor="individual-channel">Channel for individuals</label><select id="individual-channel" value={individualChannel} onChange={event => selectIndividualChannel(event.target.value)}>{CHANNELS.map(channel => <option key={channel} value={channel}>{CHANNEL_LABELS[channel]}</option>)}</select></div>
        <fieldset className="notification-choice-list"><legend>Saved groups</legend><label className="notification-search" htmlFor="group-search">Search groups<input id="group-search" value={groupSearch} onChange={event => setGroupSearch(event.target.value)} placeholder="Search notification groups" /></label>
          {matchingGroups.length === 0 ? <p className="selector-empty">No saved groups for this school yet.</p> : matchingGroups.map(group => {
            const key = `group:${group.id}`;
            return <label className="notification-choice" key={group.id}><input type="checkbox" checked={selected.some(item => item.key === key)} onChange={() => toggleSelection({ key, type: 'group', id: group.id, name: group.name, channel: group.channel })} /><span><strong>{group.name}</strong><small>{CHANNEL_LABELS[group.channel]} · {group.members.length} members</small></span></label>;
          })}
        </fieldset>
        <fieldset className="notification-choice-list"><legend>Individuals</legend><label className="notification-search" htmlFor="contact-search">Search Parents, Relatives, and Teachers<input id="contact-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name or role" /></label>
          {matchingContacts.length === 0 ? <p className="selector-empty">No contacts are available for {CHANNEL_LABELS[individualChannel]}.</p> : matchingContacts.map(contact => {
            const key = `individual:${contact.type}:${contact.id}`;
            return <label className="notification-choice" key={key}><input type="checkbox" checked={selected.some(item => item.key === key)} onChange={() => toggleSelection({ key, type: 'individual', memberType: contact.type, id: contact.id, name: contact.name })} /><span><strong>{contact.name}</strong><small>{contact.role} · {CHANNEL_LABELS[individualChannel]} available</small></span></label>;
          })}
        </fieldset>
      </section>

      {groups.length > 0 && <section className="notification-recipient-section" aria-labelledby="manage-groups-heading"><h2 id="manage-groups-heading">Manage notification groups</h2>{groups.map(group => <div className="notification-group-row" key={group.id}><span><strong>{group.name}</strong><small>{CHANNEL_LABELS[group.channel]} · {group.members.length} members</small></span><button type="button" className="button-secondary" onClick={() => openGroupForm(group)}>Edit</button><button type="button" className="text-action" onClick={() => deleteGroup(group)}>{confirmDeleteId === group.id ? 'Confirm delete' : 'Delete'}</button></div>)}</section>}

      {showGroupForm && <section className="notification-group-editor" aria-labelledby="group-editor-heading"><div className="notification-section-heading"><h2 id="group-editor-heading">{groupEditor ? 'Edit notification group' : 'Create notification group'}</h2><button type="button" className="button-secondary" onClick={() => setShowGroupForm(false)}>Cancel</button></div>
        <label htmlFor="group-name">Group name *</label><input id="group-name" maxLength="80" value={groupName} onChange={event => setGroupName(event.target.value)} required />
        <label htmlFor="group-channel">Channel *</label><select id="group-channel" value={groupChannel} onChange={event => selectGroupChannel(event.target.value)}>{CHANNELS.map(channel => <option key={channel} value={channel}>{CHANNEL_LABELS[channel]}</option>)}</select>
        <label htmlFor="group-member-search">Search members</label><input id="group-member-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search Parents, Relatives, and Teachers" />
        <fieldset className="notification-choice-list"><legend>Members *</legend>{contacts.filter(contact => `${contact.name} ${contact.role}`.toLowerCase().includes(search.trim().toLowerCase())).map(contact => {
          const key = `${contact.type}:${contact.id}`;
          const checked = groupMembers.some(member => member.id === contact.id && member.type === contact.type);
          const eligible = contact.eligibleChannels.includes(groupChannel) && contact.active;
          return <label className="notification-choice" key={key}><input type="checkbox" checked={checked} disabled={!eligible && !checked} onChange={() => toggleGroupMember(contact)} /><span><strong>{contact.name}</strong><small>{contact.role} · {eligible ? `${CHANNEL_LABELS[groupChannel]} available` : `No ${CHANNEL_LABELS[groupChannel]} contact`}</small></span></label>;
        })}</fieldset>
        {invalidGroupMembers.length > 0 && <div className="form-status error" role="alert"><strong>{invalidGroupMembers.length} selected member{invalidGroupMembers.length === 1 ? '' : 's'} cannot receive {CHANNEL_LABELS[groupChannel]}.</strong><ul>{invalidGroupMembers.map(({ reference, contact }) => <li key={`${reference.type}:${reference.id}`}>{contact?.name || reference.name || 'Unavailable member'} · {contact?.active ? `No ${CHANNEL_LABELS[groupChannel]} contact` : 'No longer active in this school'} <button type="button" className="text-action" onClick={() => setGroupMembers(previous => previous.filter(member => member.id !== reference.id || member.type !== reference.type))}>Remove</button></li>)}</ul></div>}
        <button type="button" disabled={saving || groupMembers.length === 0 || invalidGroupMembers.length > 0} onClick={saveGroup}>{saving ? 'Saving...' : groupEditor ? 'Save group' : 'Create group'}</button>
      </section>}

      <section className="notification-send-preview" aria-labelledby="notification-preview-heading"><h2 id="notification-preview-heading">Before sending</h2><p>{preview.recipientCount} valid recipient{preview.recipientCount === 1 ? '' : 's'}{preview.unavailable ? ` · ${preview.unavailable} unavailable in selected groups` : ''}</p><div className="session-field"><label htmlFor="notification-message">Message</label><textarea id="notification-message" maxLength="5000" value={message} onChange={event => setMessage(event.target.value)} placeholder="Write your message" required /></div></section>
    </>}

    {channelNotice && <p className="form-status error" role="status" aria-live="polite">{channelNotice}</p>}
    {error && <p className="form-status error" role="alert">{error}</p>}
    {status && <p className="form-status success" role="status">{status}</p>}
    <button type="submit" disabled={sending || !schoolId || !selectedIsValid || !selectedChannelsAvailable || preview.recipientCount === 0}>{sending ? 'Queueing...' : t('sendNotification')}</button>
  </form>;
}

export default NotificationComposer;
