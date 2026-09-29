import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SchoolManagement from '../features/school/SchoolManagement';

const savedSchool = { id: 'school-1', name: 'Green Valley', timezone: 'America/Mexico_City', locale: 'es-MX', status: 'active' };
const ok = data => Promise.resolve({ ok: true, json: () => Promise.resolve({ data }) });

function mockApi({ schools = [savedSchool], failList = false, failSave = false } = {}) {
  let current = [...schools];
  let listFailuresRemaining = failList ? 1 : 0;
  global.fetch = jest.fn((url, options = {}) => {
    if (url === '/v1/admin/schools' && options.method === 'POST') {
      if (failSave) return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: { message: 'School save failed.' } }) });
      const created = { id: 'school-2', ...JSON.parse(options.body), status: 'active' };
      current = [...current, created];
      return ok(created);
    }
    if (url === '/v1/admin/schools' && (!options.method || options.method === 'GET')) {
      if (listFailuresRemaining > 0) {
        listFailuresRemaining -= 1;
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      }
      return ok(current);
    }
    if (url === '/v1/admin/schools/school-1' && (!options.method || options.method === 'GET')) return ok(savedSchool);
    if (url === '/v1/admin/schools/school-1' && options.method === 'PATCH') {
      if (failSave) return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: { message: 'School update failed.' } }) });
      const updated = { ...savedSchool, ...JSON.parse(options.body) };
      current = current.map(school => school.id === updated.id ? updated : school);
      return ok(updated);
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
  });
}

test('lists Schools with model fields and opens a prepopulated edit form', async () => {
  mockApi();
  render(<SchoolManagement />);

  expect(await screen.findByRole('heading', { name: 'Schools' })).toBeInTheDocument();
  expect(await screen.findByText('Green Valley')).toBeInTheDocument();
  expect(screen.getByText('America/Mexico_City · es-MX')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Green Valley' }));
  expect(await screen.findByRole('heading', { name: 'Edit School' })).toBeInTheDocument();
  expect(await screen.findByLabelText('School name *')).toHaveValue('Green Valley');
  expect(screen.getByLabelText('Timezone *')).toHaveValue('America/Mexico_City');
  expect(screen.getByLabelText('Locale *')).toHaveValue('es-MX');
});

test('creates a School, confirms persistence, and returns to the updated list', async () => {
  mockApi({ schools: [] });
  render(<SchoolManagement />);
  fireEvent.click(await screen.findByRole('button', { name: '＋ Add School' }));
  fireEvent.change(screen.getByLabelText('School name *'), { target: { value: 'Sunrise Academy' } });
  fireEvent.change(screen.getByLabelText('Timezone *'), { target: { value: 'UTC' } });
  fireEvent.change(screen.getByLabelText('Locale *'), { target: { value: 'en-US' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create School' }));

  expect(await screen.findByRole('status')).toHaveTextContent('School created successfully.');
  expect(screen.getByRole('heading', { name: 'Schools' })).toBeInTheDocument();
  expect(screen.getByText('Sunrise Academy')).toBeInTheDocument();
});

test('shows required-field validation and retains values after save failure', async () => {
  mockApi({ schools: [], failSave: true });
  render(<SchoolManagement />);
  fireEvent.click(await screen.findByRole('button', { name: '＋ Add School' }));
  fireEvent.click(screen.getByRole('button', { name: 'Create School' }));
  expect(screen.getByText('Enter a school name.')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('School name *'), { target: { value: 'Oak School' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create School' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('School save failed.');
  expect(screen.getByLabelText('School name *')).toHaveValue('Oak School');
});

test('provides an empty state and a retry action for list failures', async () => {
  mockApi({ schools: [], failList: true });
  render(<SchoolManagement />);
  expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load the schools.");
  fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
  expect(await screen.findByText('No schools registered yet')).toBeInTheDocument();
});

test('validates an invalid time zone and saves edits to the school API', async () => {
  mockApi();
  render(<SchoolManagement />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Green Valley' }));
  await screen.findByRole('heading', { name: 'Edit School' });
  fireEvent.change(screen.getByLabelText('Timezone *'), { target: { value: 'Not/A_Timezone' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(screen.getByText('Enter a valid time zone, such as America/Mexico_City.')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Timezone *'), { target: { value: 'Europe/Madrid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/v1/admin/schools/school-1', expect.objectContaining({ method: 'PATCH' })));
  expect(await screen.findByRole('status')).toHaveTextContent('School updated successfully.');
});
