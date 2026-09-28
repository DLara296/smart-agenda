import React from 'react';

export const presetAvatars = [
  { id: 'sun', label: 'Sunny', value: '☀️', tone: 'sunny' },
  { id: 'rocket', label: 'Rocket', value: '🚀', tone: 'sky' },
  { id: 'panda', label: 'Panda', value: '🐼', tone: 'cloud' },
  { id: 'fox', label: 'Fox', value: '🦊', tone: 'peach' },
  { id: 'star', label: 'Star', value: '⭐', tone: 'gold' },
  { id: 'rainbow', label: 'Rainbow', value: '🌈', tone: 'mint' },
];

export function AvatarPicker({ avatar, name, onChange }) {
  const uploadPhoto = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ value: reader.result, tone: 'photo' });
    reader.readAsDataURL(file);
  };

  return <>
    <div className="profile-preview">
      {avatar?.tone === 'photo' ? <img src={avatar.value} alt={`${name} avatar`} /> : <span className={`profile-avatar-large ${avatar?.tone || 'default'}`}>{avatar?.value || 'DL'}</span>}
      <div><strong>{name || 'Your name'}</strong></div>
    </div>
    <label className="upload-control" htmlFor="profile-photo">Upload local photo<input id="profile-photo" type="file" accept="image/*" onChange={uploadPhoto} /></label>
    <fieldset className="avatar-picker"><legend>Choose a preset avatar</legend><div className="avatar-options">{presetAvatars.map(option => <button key={option.id} type="button" className={`preset-avatar ${option.tone} ${avatar?.value === option.value ? 'selected' : ''}`} aria-label={`Choose ${option.label} avatar`} onClick={() => onChange({ value: option.value, tone: option.tone })}>{option.value}</button>)}</div></fieldset>
  </>;
}
