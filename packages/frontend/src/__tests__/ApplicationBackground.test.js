import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../App';

const SAVED = 'data:image/jpeg;base64,/9j/4A==';

function mockServer(appearance) {
  global.fetch = jest.fn(url => {
    if (url === '/v1/appearance-preferences') return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: appearance }) });
    return Promise.reject(new Error('API unavailable in component test'));
  });
}

const appearanceRequests = () => global.fetch.mock.calls.filter(([url]) => url === '/v1/appearance-preferences');
const shell = () => screen.getByTestId('app-shell');
const navigateTo = name => fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name }));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('smartAgendaLanguage', 'en');
});

test('keeps the Application Background on every authenticated section without reloading it', async () => {
  mockServer({ theme: 'light', applicationBackground: SAVED, backgroundOverlay: 40, interfaceEffect: 'glass' });
  render(<App />);
  const layer = await screen.findByTestId('app-background');
  expect(layer.style.getPropertyValue('--app-image')).toContain(SAVED);
  expect(layer).toHaveAttribute('aria-hidden', 'true');
  expect(shell()).toHaveClass('has-app-background', 'effect-glass');

  for (const section of ['Calendar', 'History', 'Notifications', 'Reading Sessions', 'Settings', 'Dashboard']) {
    navigateTo(section);
    expect(screen.getByTestId('app-background')).toBe(layer);
    expect(layer.style.getPropertyValue('--app-image')).toContain(SAVED);
  }
  fireEvent.click(screen.getByRole('button', { name: 'Open profile' }));
  expect(screen.getByTestId('app-background')).toBe(layer);
  expect(appearanceRequests()).toHaveLength(1);
});

test('uses the default shell when no background is saved', async () => {
  mockServer({ theme: 'light', applicationBackground: null, backgroundOverlay: 40, interfaceEffect: 'glass' });
  render(<App />);
  await waitFor(() => expect(appearanceRequests()).toHaveLength(1));
  await screen.findByTestId('app-shell');
  expect(screen.queryByTestId('app-background')).not.toBeInTheDocument();
  expect(shell()).not.toHaveClass('has-app-background');
});
