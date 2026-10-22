import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import App from '../App';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('smartAgendaLanguage', 'en');
  global.fetch = jest.fn((url, options = {}) => {
    if (url === '/v1/appearance-preferences' && !options.method) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { theme: 'system', applicationBackground: null, backgroundOverlay: 40, interfaceEffect: 'glass' } }) });
    }
    if (options.method === 'PATCH' && url === '/v1/profile') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: JSON.parse(options.body) }) });
    }
    return Promise.reject(new Error('API unavailable in component test'));
  });
});

test('renders the Smart Agenda application shell', async () => {
  render(<App />);
  expect(await screen.findByText('SmartAgenda')).toBeInTheDocument();
  expect(screen.getByText(/Good morning|Buenos días/)).toBeInTheDocument();
  expect(screen.getByText('Group A')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /register family/i })).toBeInTheDocument();
});

test('search and notification controls expose real interactions', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Search' }));
  expect(screen.getByLabelText('Search')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Open notifications'));
  expect(screen.getByText(/teacher confirmation is pending/i)).toBeInTheDocument();
});

test('switches the active language immediately', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Language' }));
  fireEvent.click(screen.getByRole('button', { name: /Español/i }));
  expect(screen.getByText(/Buenos días/i)).toBeInTheDocument();
  expect(localStorage.getItem('smartAgendaLanguage')).toBe('es');
});

test('keeps school and user profile navigation independent', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit School Profile' }));
  expect(screen.getByRole('heading', { name: /edit school profile/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }));
  expect(screen.getByRole('heading', { name: 'Edit Profile' })).toBeInTheDocument();
});

test('persists profile changes across both avatar locations', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Profile' }));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Mariela Garcia' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(await screen.findByText('Mariela Garcia')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('smartAgendaProfile')).name).toBe('Mariela Garcia');
});

test('opens workflow forms from dashboard actions', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: /manage session/i }));
  expect(screen.getByRole('heading', { name: /manage reading session/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));

  fireEvent.click(screen.getAllByRole('button', { name: /assign volunteer/i })[0]);
  expect(screen.getByRole('heading', { name: /assign volunteer/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));

  fireEvent.click(screen.getAllByRole('button', { name: /send notification/i })[0]);
  expect(screen.getByRole('heading', { name: /send notification/i })).toBeInTheDocument();
});
