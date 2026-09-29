import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SessionForm from '../features/session/SessionForm';

const response = data => Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

function mockSchoolApi() {
  global.fetch = jest.fn((url, options = {}) => {
    if (options.method === 'POST') return response({ id: 'session-1', ...JSON.parse(options.body) });
    if (url === '/v1/schools') return response({ data: [{ id: 'school-a', name: 'Lakeside Academy', timezone: 'UTC' }, { id: 'school-b', name: 'Northview Primary', timezone: 'UTC' }] });
    if (url === '/v1/schools/school-a/grades') return response({ data: [{ id: 'grade-a', name: 'Grade 1' }, { id: 'grade-c', name: 'Grade 3' }] });
    if (url === '/v1/schools/school-b/grades') return response({ data: [{ id: 'grade-b', name: 'Grade 2' }] });
    if (url === '/v1/grades/grade-a/groups') return response({ data: [{ id: 'group-a', name: 'Group A' }] });
    if (url === '/v1/grades/grade-c/groups') return response({ data: [{ id: 'group-c', name: 'Group C' }] });
    if (url === '/v1/grades/grade-b/groups') return response({ data: [{ id: 'group-b', name: 'Group B' }] });
    if (url === '/v1/teachers?schoolId=school-a') return response({ data: [{ id: 'teacher-a', name: 'Mariela Garcia', schoolId: 'school-a' }] });
    if (url === '/v1/teachers?schoolId=school-b') return response({ data: [{ id: 'teacher-b', name: 'Jordan Lee', schoolId: 'school-b' }] });
    return response({ data: [] });
  });
}

test('loads teachers for the selected school and submits the chosen teacher with the group', async () => {
  mockSchoolApi();
  const onSuccess = jest.fn();
  render(<SessionForm onCancel={() => {}} onSuccess={onSuccess} />);

  await screen.findByRole('option', { name: 'Lakeside Academy' });
  fireEvent.change(screen.getByLabelText('School'), { target: { value: 'school-a' } });
  await screen.findByRole('option', { name: 'Grade 1' });
  await screen.findByRole('option', { name: 'Mariela Garcia' });
  expect(screen.queryByRole('option', { name: 'Jordan Lee' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Grade'), { target: { value: 'grade-a' } });
  await screen.findByRole('option', { name: 'Group A' });
  fireEvent.change(screen.getByLabelText('Group'), { target: { value: 'group-a' } });
  fireEvent.change(screen.getByLabelText('Assigned teacher (optional)'), { target: { value: 'teacher-a' } });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-06' } });
  fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '07:40' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create session' }));

  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  const [, options] = global.fetch.mock.calls.find(([, requestOptions]) => requestOptions?.method === 'POST');
  expect(JSON.parse(options.body).assignments).toEqual([{ groupId: 'group-a', language: 'es', teacherId: 'teacher-a' }]);
  expect(global.fetch).toHaveBeenCalledWith('/v1/teachers?schoolId=school-a', expect.anything());
});

test('shows the current teacher when editing a session', async () => {
  mockSchoolApi();
  const session = { id: 'session-1', schoolId: 'school-a', gradeId: 'grade-a', groups: [{ groupId: 'group-a', teacherId: 'teacher-a', language: 'es' }], sessionDate: '2026-10-06', startTime: '07:40' };
  render(<SessionForm session={session} onCancel={() => {}} />);

  expect(await screen.findByRole('option', { name: 'Mariela Garcia' })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText('Assigned teacher (optional)')).toHaveValue('teacher-a'));
});

test('clears the selected Group and reloads valid options when Grade changes', async () => {
  mockSchoolApi();
  render(<SessionForm onCancel={() => {}} />);
  await screen.findByRole('option', { name: 'Lakeside Academy' });
  fireEvent.change(screen.getByLabelText('School'), { target: { value: 'school-a' } });
  await screen.findByRole('option', { name: 'Grade 1' });
  fireEvent.change(screen.getByLabelText('Grade'), { target: { value: 'grade-a' } });
  await screen.findByRole('option', { name: 'Group A' });
  fireEvent.change(screen.getByLabelText('Group'), { target: { value: 'group-a' } });

  fireEvent.change(screen.getByLabelText('Grade'), { target: { value: 'grade-c' } });

  expect(screen.getByLabelText('Group')).toHaveValue('');
  expect(await screen.findByRole('option', { name: 'Group C' })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Group A' })).not.toBeInTheDocument();
});
