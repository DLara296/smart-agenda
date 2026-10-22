import React, { useEffect } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ApplicationBackgroundSettings from '../features/settings/ApplicationBackgroundSettings';
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
  let state = { theme: 'dark', applicationBackground: saved, backgroundOverlay: 40, interfaceEffect: 'glass' };
  global.fetch = jest.fn((url, options = {}) => {
    if (options.method === 'PUT') {
      if (failPut) return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: { message: 'SQLITE_BUSY: database is locked' } }) });
      state = { ...state, ...JSON.parse(options.body) };
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: state }) });
  });
}

const renderSettings = () => render(<PreferencesProvider><LoadAccount /><ApplicationBackgroundSettings /></PreferencesProvider>);
const preview = () => screen.getByRole('img', { name: 'Application Background' });
const previewImage = () => preview().style.getPropertyValue('--app-image');
const chooseFile = async (file = new File(['x'], 'photo.png', { type: 'image/png' })) => {
  fireEvent.change(screen.getByLabelText(/choose image|replace image/i), { target: { files: [file] } });
  await waitFor(() => expect(screen.queryByText('Preparing image...')).not.toBeInTheDocument());
};
const puts = () => global.fetch.mock.calls.filter(([, options]) => options?.method === 'PUT');

beforeEach(() => { localStorage.clear(); prepareBackgroundImage.mockReset(); });

test('offers built-in backgrounds and applies the selected one', async () => {
  mockServer();
  renderSettings();
  const presets = screen.getByRole('group', { name: 'Default backgrounds' });
  expect(within(presets).getAllByRole('button')).toHaveLength(6);
  fireEvent.click(within(presets).getByRole('button', { name: 'Ocean' }));
  expect(within(presets).getByRole('button', { name: 'Ocean' })).toHaveAttribute('aria-pressed', 'true');
  expect(previewImage()).toContain('/assets/backgrounds/ocean.svg');
  expect(screen.getByLabelText('Choose image')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(await screen.findByText('Application Background updated.')).toBeInTheDocument();
  expect(JSON.parse(puts()[0][1].body)).toEqual({ applicationBackground: 'preset:ocean', backgroundOverlay: 40, interfaceEffect: 'glass' });
});

test('previews the full application shell and applies the chosen interface effect', async () => {
  mockServer({ saved: SAVED });
  renderSettings();
  await waitFor(() => expect(previewImage()).toContain(SAVED));
  expect(preview()).toHaveClass('has-app-background', 'effect-glass');
  const effects = screen.getByRole('radiogroup', { name: 'Interface effect' });
  ['Solid', 'Glass', 'Minimal Transparency'].forEach(name => expect(within(effects).getByRole('radio', { name })).toBeInTheDocument());
  expect(within(effects).getByRole('radio', { name: 'Glass' })).toBeChecked();
  fireEvent.click(within(effects).getByRole('radio', { name: 'Solid' }));
  expect(preview()).toHaveClass('effect-solid');
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(await screen.findByText('Application Background updated.')).toBeInTheDocument();
  expect(JSON.parse(puts()[0][1].body)).toEqual({ backgroundOverlay: 40, interfaceEffect: 'solid' });
});

test('cancelling an effect change keeps the saved appearance', async () => {
  mockServer({ saved: SAVED });
  renderSettings();
  await waitFor(() => expect(previewImage()).toContain(SAVED));
  fireEvent.click(screen.getByRole('radio', { name: 'Minimal Transparency' }));
  expect(preview()).toHaveClass('effect-minimal');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(preview()).toHaveClass('effect-glass');
  expect(puts()).toHaveLength(0);
});

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
  expect(await screen.findByText('Application Background updated.')).toBeInTheDocument();
  expect(JSON.parse(puts()[0][1].body)).toEqual({ applicationBackground: IMAGE, backgroundOverlay: 60, interfaceEffect: 'glass' });
  expect(preview().style.getPropertyValue('--app-tint')).toContain('0.6');
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
  expect(await screen.findByText('Default application background restored.')).toBeInTheDocument();
  expect(JSON.parse(puts()[0][1].body)).toEqual({ applicationBackground: null });
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
  expect(alert).toHaveTextContent("We couldn't update your Application Background. Please try again.");
  expect(alert).not.toHaveTextContent('SQLITE');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(previewImage()).toContain(SAVED);
});
