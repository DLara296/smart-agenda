import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'smartAgendaPreferences';

export const THEMES = ['light', 'dark', 'system'];
export const DATE_FORMATS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
export const TIME_FORMATS = ['12h', '12h-padded', '24h'];

const DEFAULTS = { theme: 'system', dateFormat: 'MM/DD/YYYY', timeFormat: '12h', cookiesAllowed: false };

const pad = value => String(value).padStart(2, '0');

function parseDate(value) {
  if (value instanceof Date) return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  // Date-only strings are parsed as local dates to avoid a UTC day shift.
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
}

export function formatDateWith(format, value) {
  if (value === null || value === undefined || value === '') return '';
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const [year, month, day] = [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())];
  if (format === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
  if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  return `${month}/${day}/${year}`;
}

export function formatTimeWith(format, value) {
  if (value === null || value === undefined || value === '') return '';
  let hours;
  let minutes;
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value));
  if (match) {
    [hours, minutes] = [Number(match[1]), Number(match[2])];
  } else {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    [hours, minutes] = [date.getHours(), date.getMinutes()];
  }
  if (format === '24h') return `${pad(hours)}:${pad(minutes)}`;
  const suffix = hours < 12 ? 'AM' : 'PM';
  const twelve = hours % 12 || 12;
  return `${format === '12h-padded' ? pad(twelve) : twelve}:${pad(minutes)} ${suffix}`;
}

function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return {
      theme: THEMES.includes(saved.theme) ? saved.theme : DEFAULTS.theme,
      dateFormat: DATE_FORMATS.includes(saved.dateFormat) ? saved.dateFormat : DEFAULTS.dateFormat,
      timeFormat: TIME_FORMATS.includes(saved.timeFormat) ? saved.timeFormat : DEFAULTS.timeFormat,
      cookiesAllowed: typeof saved.cookiesAllowed === 'boolean' ? saved.cookiesAllowed : DEFAULTS.cookiesAllowed,
    };
  } catch {
    return DEFAULTS;
  }
}

const systemPrefersDark = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;

const PreferencesContext = createContext({
  ...DEFAULTS,
  resolvedTheme: 'light',
  updatePreferences: () => {},
  formatDate: value => formatDateWith(DEFAULTS.dateFormat, value),
  formatTime: value => formatTimeWith(DEFAULTS.timeFormat, value),
});

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(loadPreferences);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = event => setSystemDark(event.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  const resolvedTheme = preferences.theme === 'system' ? (systemDark ? 'dark' : 'light') : preferences.theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const value = useMemo(() => ({
    ...preferences,
    resolvedTheme,
    updatePreferences: changes => setPreferences(current => {
      const next = { ...current, ...changes };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    }),
    formatDate: date => formatDateWith(preferences.dateFormat, date),
    formatTime: time => formatTimeWith(preferences.timeFormat, time),
  }), [preferences, resolvedTheme]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
