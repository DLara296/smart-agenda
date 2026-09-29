import React from 'react';

const STATUS_LABELS = { confirmed: 'Confirmed', completed: 'Completed', upcoming: 'Upcoming', cancelled: 'Cancelled', past: 'Past' };
const STATUS_TONES = { confirmed: 'success', completed: 'success', upcoming: 'info', cancelled: 'danger', past: 'neutral' };
const LANGUAGE_NAMES = { en: 'English', es: 'Spanish' };

export const pad = value => String(value).padStart(2, '0');
export const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const parseDay = value => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day); };

export function statusOf(session, today) {
  if (session.status === 'cancelled') return 'cancelled';
  if (session.status === 'completed') return 'completed';
  if (session.sessionDate < today) return 'past';
  return session.status === 'confirmed' ? 'confirmed' : 'upcoming';
}

export const statusLabel = status => STATUS_LABELS[status];

export function StatusPill({ status }) {
  return <span className={`guest-status ${STATUS_TONES[status]}`}>{STATUS_LABELS[status]}</span>;
}

// Only name a child when the session is really theirs; a shared grade is not participation.
export function relationLabel(session, children) {
  if (session.relatedChildren?.length) return `For ${session.relatedChildren.map(child => child.name).join(' & ')}`;
  if (session.createdByMe) return 'Created by you';
  const sameGrade = children.filter(child => child.gradeId && child.gradeId === session.gradeId);
  if (sameGrade.length) return `${sameGrade.map(child => child.name).join(' & ')}'s grade · other group`;
  return 'Grade session';
}

export const groupNames = session => session.groups?.map(group => group.groupName).filter(Boolean).join(', ') || '';

export function groupSummary(session) {
  return [session.gradeName, groupNames(session)].filter(Boolean).join(' · ') || 'Reading session';
}

export const languageName = code => (code ? LANGUAGE_NAMES[code.toLowerCase()] || code.toUpperCase() : null);

export function sessionLanguage(session, child) {
  const group = session.groups?.find(item => !child || item.groupId === child.groupId) || session.groups?.[0];
  return languageName(group?.language);
}
