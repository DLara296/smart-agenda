import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SchoolManagement from '../features/school/SchoolManagement';

const savedSchool = { id: 'school-1', name: 'Green Valley', timezone: 'America/Mexico_City', locale: 'es-MX', status: 'active' };
const ok = data => Promise.resolve({ ok: true, json: () => Promise.resolve({ data }) });

function mockApi({ schools = [savedSchool], failList = false, failSave = false, failGroupOnce = false } = {}) {
  let current = [...schools];
  let listFailuresRemaining = failList ? 1 : 0;
  let groupFailuresRemaining = failGroupOnce ? 1 : 0;
  let grades = [{ id: 'grade-1', schoolId: 'school-1', name: 'Grade 1', academicPeriod: null, groups: [] }];
  let groups = [{ id: 'group-1a', gradeId: 'grade-1', name: 'Group A', code: 'GROUP-A' }];
  let teachers = [{ id: 'teacher-1', schoolId: 'school-1', name: 'Mariela Garcia', email: 'mariela@example.test' }];
  global.fetch = jest.fn((url, options = {}) => {
    if (url === '/v1/grades' && options.method === 'POST') {
      const created = { id: `grade-${grades.length + 1}`, status: 'active', ...JSON.parse(options.body) };
      grades = [...grades, created];
      return Promise.resolve({ ok: true, json: () => Promise.resolve(created) });
    }
    if (url === '/v1/groups' && options.method === 'POST') {
      if (groupFailuresRemaining > 0) {
        groupFailuresRemaining -= 1;
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: { message: 'Group save failed.' } }) });
      }
      const created = { id: `group-${groups.length + 1}`, status: 'active', ...JSON.parse(options.body) };
      groups = [...groups, created];
      return Promise.resolve({ ok: true, json: () => Promise.resolve(created) });
    }
    if (url === '/v1/admin/schools' && options.method === 'POST') {
      if (failSave) return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: { message: 'School save failed.' } }) });
      const created = { id: 'school-2', ...JSON.parse(options.body), status: 'active' };
      current = [...current, created];
      return ok(created);
    }
    if (url === '/v1/admin/schools/school-2' && options.method === 'PATCH') {
      const updated = { ...current.find(school => school.id === 'school-2'), ...JSON.parse(options.body) };
      current = current.map(school => school.id === updated.id ? updated : school);
      return ok(updated);
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
    if (url === '/v1/schools/school-1/grades') return ok(grades);
    if (url.startsWith('/v1/grades/') && url.endsWith('/groups')) {
      const gradeId = url.split('/')[3];
      return ok(groups.filter(group => group.gradeId === gradeId));
    }
    if (url === '/v1/teachers?schoolId=school-1') return ok(teachers);
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
  expect(screen.getByRole('heading', { name: 'Academic Structure' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Grade 1' })).toBeInTheDocument();
  expect(screen.getByText('Group A')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Teachers' })).toBeInTheDocument();
  expect(screen.getByText('Mariela Garcia')).toBeInTheDocument();
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

test('creates a School with multiple Grades and Groups using returned parent IDs', async () => {
  mockApi({ schools: [] });
  render(<SchoolManagement />);
  fireEvent.click(await screen.findByRole('button', { name: '＋ Add School' }));
  fireEvent.change(screen.getByLabelText('School name *'), { target: { value: 'Sunrise Academy' } });

  fireEvent.change(screen.getByLabelText('Add Grade'), { target: { value: 'Grade 1' } });
  fireEvent.click(screen.getByRole('button', { name: '＋ Add Grade' }));
  fireEvent.change(screen.getByLabelText('Add Group to Grade 1'), { target: { value: 'Group A' } });
  fireEvent.click(screen.getAllByRole('button', { name: '＋ Add Group' })[0]);
  fireEvent.change(screen.getByLabelText('Add Grade'), { target: { value: 'Grade 2' } });
  fireEvent.click(screen.getByRole('button', { name: '＋ Add Grade' }));
  fireEvent.change(screen.getByLabelText('Add Group to Grade 2'), { target: { value: 'Group A' } });
  fireEvent.click(screen.getAllByRole('button', { name: '＋ Add Group' })[1]);
  fireEvent.click(screen.getByRole('button', { name: 'Create School' }));

  expect(await screen.findByRole('status')).toHaveTextContent('School created successfully.');
  const gradeCalls = global.fetch.mock.calls.filter(([url, options]) => url === '/v1/grades' && options?.method === 'POST');
  const groupCalls = global.fetch.mock.calls.filter(([url, options]) => url === '/v1/groups' && options?.method === 'POST');
  expect(gradeCalls).toHaveLength(2);
  expect(groupCalls).toHaveLength(2);
  expect(JSON.parse(gradeCalls[0][1].body).schoolId).toBe('school-2');
  expect(JSON.parse(groupCalls[0][1].body).gradeId).toBe('grade-2');
  expect(JSON.parse(groupCalls[1][1].body).gradeId).toBe('grade-3');
});

test('reports partial structure failure and retry does not duplicate completed Grades', async () => {
  mockApi({ schools: [], failGroupOnce: true });
  render(<SchoolManagement />);
  fireEvent.click(await screen.findByRole('button', { name: '＋ Add School' }));
  fireEvent.change(screen.getByLabelText('School name *'), { target: { value: 'Oak School' } });
  fireEvent.change(screen.getByLabelText('Add Grade'), { target: { value: 'Grade 1' } });
  fireEvent.click(screen.getByRole('button', { name: '＋ Add Grade' }));
  fireEvent.change(screen.getByLabelText('Add Group to Grade 1'), { target: { value: 'Group A' } });
  fireEvent.click(screen.getByRole('button', { name: '＋ Add Group' }));
  fireEvent.click(screen.getByRole('button', { name: 'Create School' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('School saved, but some academic structure could not be saved. Retry to continue; completed items are preserved. Group save failed.');
  fireEvent.click(screen.getByRole('button', { name: 'Create School' }));
  expect(await screen.findByRole('status')).toHaveTextContent('School created successfully.');
  expect(global.fetch.mock.calls.filter(([url, options]) => url === '/v1/admin/schools' && options?.method === 'POST')).toHaveLength(1);
  expect(global.fetch.mock.calls.filter(([url, options]) => url === '/v1/grades' && options?.method === 'POST')).toHaveLength(1);
  expect(global.fetch.mock.calls.filter(([url, options]) => url === '/v1/groups' && options?.method === 'POST')).toHaveLength(2);
});

test('removes an unsaved Group draft while keeping persisted Groups intact', async () => {
  mockApi();
  render(<SchoolManagement />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Green Valley' }));
  await screen.findByRole('heading', { name: 'Grade 1' });
  expect(screen.getByText('Group A')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Remove Group A from Grade 1' })).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Add Group to Grade 1'), { target: { value: 'Temporary Group' } });
  fireEvent.click(screen.getByRole('button', { name: '＋ Add Group' }));
  expect(screen.getByText('Temporary Group')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remove Temporary Group from Grade 1' }));

  expect(screen.queryByText('Temporary Group')).not.toBeInTheDocument();
  expect(screen.getByText('Group A')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Add Grade'), { target: { value: 'Temporary Grade' } });
  fireEvent.click(screen.getByRole('button', { name: '＋ Add Grade' }));
  expect(screen.getByRole('heading', { name: 'Temporary Grade' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remove Temporary Grade' }));
  expect(screen.queryByRole('heading', { name: 'Temporary Grade' })).not.toBeInTheDocument();
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

test('hands the persisted School to the existing Teacher creation flow', async () => {
  mockApi();
  const onAddTeacher = jest.fn();
  render(<SchoolManagement onAddTeacher={onAddTeacher} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Green Valley' }));
  await screen.findByRole('heading', { name: 'Edit School' });
  fireEvent.click(screen.getByRole('button', { name: '＋ Add Teacher' }));

  expect(onAddTeacher).toHaveBeenCalledWith(savedSchool);
});
