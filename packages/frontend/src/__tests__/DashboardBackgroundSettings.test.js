import React, { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardBackgroundSettings from '../features/settings/DashboardBackgroundSettings';
import { PreferencesProvider, usePreferences } from '../features/settings/PreferencesContext';
import { BackgroundImageError, prepareBackgroundImage } from '../features/settings/backgroundImage';

jest.mock('../features/settings/backgroundImage', () => {
  const actual = jest.requireActual('../features/settings/backgroundImage');
  return { ...actual, prepareBackgroundImage: jest.fn() };
});

const IMAGE = 'data:image/webp;base64,UklGRg==';
const SAVED = 'data:image/jpeg;base64,/9j/4A==';

function LoadAccount() {
  const { loadAccountAppearance } = usePreferences();
  useEffect(() => { loadAccountAppearance(); }, [loadAccountAppearance]);
  return null;
}

function mockServer({ saved = null, failPut = false } = {}) {
  let state = { theme: 'dark', dashboardBackground: saved, backgroundOverlay: 40 };
  global.fetch = jest.fn((url, options = {}) => {
    if (options.method === 'PUT') {
      if (failPut) return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: { message: 'SQLITE_BUSY: database is locked' } }) });
      state = { ...state, ...JSON.parse(options.body) };
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: state }) });
  });
}

const renderSettings = () => render(<PreferencesProvider><LoadAccount /><DashboardBackgroundSettings /></PreferencesProvider>);
const preview = () => screen.getByRole('img', { name: 'Dashboard background' });
const previewImage = () => preview().style.getPropertyValue('--dashboard-image');
const chooseFile = async (file = new File(['x'], 'photo.png', { type: 'image/png' })) => {
  fireEvent.change(screen.getByLabelText(/choose image|replace image/i), { target: { files: [file] } });
  await waitFor(() => expect(screen.queryByText('Preparing image...')).not.toBeInTheDocument());
};
const puts = () => global.fetch.mock.calls.filter(([, options]) => options?.method === 'PUT');

beforeEach(() => { localStorage.clear(); prepareBackgroundImage.mockReset(); });

test('previews a chosen image and cancels without saving', async () => {
  mockServer();
  prepareBackgroundImage.mockResolvedValue(IMAGE);
  renderSettings();
  await chooseFile();
  expect(previewImage()).toContain(IMAGE);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(previewImage()).toBe('');
  expect(puts()).toHaveLength(0);
});

test('applies the background with the chosen overlay', async () => {
  mockServer();
  prepareBackgroundImage.mockResolvedValue(IMAGE);
  renderSettings();
  await chooseFile();
  fireEvent.change(screen.getByLabelText('Background overlay'), { target: { value: '60' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(await screen.findByText('Dashboard background updated.')).toBeInTheDocument();
  expect(JSON.parse(puts()[0][1].body)).toEqual({ dashboardBackground: IMAGE, backgroundOverlay: 60 });
  expect(preview().style.getPropertyValue('--dashboard-tint')).toContain('0.6');
});

test('rejects unsupported files with a clear message', async () => {
  mockServer();
  prepareBackgroundImage.mockRejectedValue(new BackgroundImageError('This image format is not supported. Please upload a JPG, PNG, or WebP image.'));
  renderSettings();
  await chooseFile(new File(['x'], 'anim.gif', { type: 'image/gif' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Please upload a JPG, PNG, or WebP image.');
  expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
});

test('removes a saved background without changing the theme', async () => {
  mockServer({ saved: SAVED });
  renderSettings();
  const remove = await screen.findByRole('button', { name: 'Remove background' });
  fireEvent.click(remove);
  expect(await screen.findByText('Default dashboard background restored.')).toBeInTheDocument();
  expect(JSON.parse(puts()[0][1].body)).toEqual({ dashboardBackground: null });
  expect(screen.getByText('Default SmartAgenda background')).toBeInTheDocument();
});

test('keeps the saved background and shows a safe message when saving fails', async () => {
  mockServer({ saved: SAVED, failPut: true });
  prepareBackgroundImage.mockResolvedValue(IMAGE);
  renderSettings();
  await waitFor(() => expect(previewImage()).toContain(SAVED));
  await chooseFile();
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent("We couldn't update your Dashboard background. Please try again.");
  expect(alert).not.toHaveTextContent('SQLITE');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(previewImage()).toContain(SAVED);
});
