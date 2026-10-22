import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SettingsView from '../features/settings/SettingsView';
import { PreferencesProvider, formatDateWith, formatTimeWith } from '../features/settings/PreferencesContext';
import { I18nProvider } from '../i18n/I18nContext';

beforeEach(() => localStorage.clear());

test('formats dates and times with each supported format', () => {
  expect(formatDateWith('MM/DD/YYYY', '2026-10-06')).toBe('10/06/2026');
  expect(formatDateWith('DD/MM/YYYY', '2026-10-06')).toBe('06/10/2026');
  expect(formatDateWith('YYYY-MM-DD', '2026-10-06')).toBe('2026-10-06');
  expect(formatTimeWith('12h', '07:40')).toBe('7:40 AM');
  expect(formatTimeWith('12h-padded', '19:40')).toBe('07:40 PM');
  expect(formatTimeWith('24h', '07:40')).toBe('07:40');
});

test('updates appearance and privacy settings', () => {
  render(<I18nProvider><PreferencesProvider><SettingsView /></PreferencesProvider></I18nProvider>);

  fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
  expect(document.documentElement.dataset.theme).toBe('dark');

  fireEvent.change(screen.getByLabelText('Date format'), { target: { value: 'DD/MM/YYYY' } });
  fireEvent.change(screen.getByLabelText('Time format'), { target: { value: '24h' } });
  const cookies = screen.getByRole('switch', { name: 'Allow optional cookies' });
  expect(cookies).toHaveAttribute('aria-checked', 'false');
  fireEvent.click(cookies);
  expect(cookies).toHaveAttribute('aria-checked', 'true');
  expect(JSON.parse(localStorage.getItem('smartAgendaPreferences'))).toEqual({ theme: 'dark', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', cookiesAllowed: true });

  fireEvent.click(screen.getByRole('radio', { name: 'Español' }));
  expect(screen.getByRole('heading', { name: 'Configuración' })).toBeInTheDocument();
});
