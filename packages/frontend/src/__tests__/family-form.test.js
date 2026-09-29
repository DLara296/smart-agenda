import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FamilyForm from '../features/family/FamilyForm';

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

test('renders household registration fields', () => {
  render(<FamilyForm />);
  expect(screen.getByLabelText(/family name/i)).toBeInTheDocument();
  expect(screen.getByLabelText('School')).toBeInTheDocument();
  expect(screen.getAllByLabelText(/full name/i)).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
});

test('opens registered schools and offers add new school', () => {
  render(<FamilyForm />);
  fireEvent.click(screen.getByRole('button', { name: 'Select school' }));
  expect(screen.getByRole('option', { name: /Westfield Elementary/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /add new school/i }));
  expect(screen.getByLabelText(/new school name/i)).toBeInTheDocument();
});

test('keeps dependent selectors disabled until their parent is selected', () => {
  render(<FamilyForm />);
  expect(screen.getByLabelText('Grade')).toBeDisabled();
  expect(screen.getByLabelText('Group name')).toBeDisabled();
});

test('hides Grade and Group creation shortcuts for the guest default', () => {
  render(<FamilyForm />);
  expect(screen.queryByRole('button', { name: /new grade/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /new group/i })).not.toBeInTheDocument();
});

test('shows Grade and Group creation shortcuts only when enabled for an admin', () => {
  render(<FamilyForm allowStructureChanges />);
  expect(screen.getByRole('button', { name: /new grade/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /new group/i })).toBeInTheDocument();
});

test('lets a guest select mocked preregistered Grade and Group data without creating either', async () => {
  global.fetch = jest.fn((url, options = {}) => {
    if (options.method === 'POST' && url === '/v1/families') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { id: 'family-1' } }) });
    }
    if (url === '/v1/schools') return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ id: 'school-1', name: 'Westfield Elementary' }] }) });
    if (url === '/v1/schools/school-1/grades') return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ id: 'grade-1', name: 'Grade 1' }, { id: 'grade-2', name: 'Grade 2' }] }) });
    if (url === '/v1/grades/grade-1/groups') return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ id: 'group-1a', name: 'Group A' }, { id: 'group-1b', name: 'Group B' }] }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });
  const onSuccess = jest.fn();
  render(<FamilyForm onSuccess={onSuccess} />);

  fireEvent.click(screen.getByRole('button', { name: 'Select school' }));
  fireEvent.click(screen.getByRole('option', { name: /Westfield Elementary/i }));
  await screen.findByRole('option', { name: 'Grade 1' });
  fireEvent.change(screen.getByLabelText('Grade'), { target: { value: 'grade-1' } });
  expect(await screen.findByRole('option', { name: 'Group A' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Group name'), { target: { value: 'group-1b' } });

  expect(screen.getAllByRole('option').map(option => option.value)).toEqual(expect.arrayContaining(['grade-1', 'grade-2', 'group-1a', 'group-1b']));
  expect(screen.queryByRole('button', { name: /new grade/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /new group/i })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Register' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  const creationRequests = global.fetch.mock.calls.filter(([url, request]) => request?.method === 'POST' && ['/v1/grades', '/v1/groups'].includes(url));
  expect(creationRequests).toHaveLength(0);
  const [, options] = global.fetch.mock.calls.find(([url, request]) => url === '/v1/families' && request?.method === 'POST');
  expect(JSON.parse(options.body).children[0]).toEqual(expect.objectContaining({ gradeId: 'grade-1', groupId: 'group-1b' }));
});

test('adds and removes guardians or relatives and children', () => {
  render(<FamilyForm />);
  fireEvent.click(screen.getByRole('button', { name: /add guardian or relative/i }));
  fireEvent.click(screen.getByRole('button', { name: /add child/i }));
  expect(screen.getAllByLabelText(/full name/i)).toHaveLength(4);
  expect(screen.getAllByLabelText('Grade')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Remove child 2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove guardian 2' }));
  expect(screen.getAllByLabelText(/full name/i)).toHaveLength(2);
});

test('selects multiple guardian languages from a list', () => {
  render(<FamilyForm />);
  const trigger = screen.getByRole('button', { name: /languages/i });
  expect(trigger).toHaveTextContent('Select languages');
  fireEvent.click(trigger);
  const list = screen.getByRole('listbox');
  expect(list).toHaveAttribute('aria-multiselectable', 'true');
  fireEvent.click(screen.getByRole('checkbox', { name: 'English' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Spanish' }));
  expect(trigger).toHaveTextContent('English, Spanish');
  fireEvent.click(screen.getByRole('checkbox', { name: 'English' }));
  expect(trigger).toHaveTextContent('Spanish');
});

test('chooses built-in avatars for the household, guardians, and children', () => {
  render(<FamilyForm />);
  expect(screen.getAllByRole('img', { name: 'Avatar' })[0]).toHaveTextContent('🏠');
  fireEvent.click(screen.getAllByRole('button', { name: 'Choose avatar' })[2]);
  fireEvent.click(screen.getByRole('button', { name: 'Avatar girl' }));
  expect(screen.getAllByRole('img', { name: 'Avatar' })[2]).toHaveTextContent('👧');
  expect(screen.getAllByLabelText('Upload photo')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: 'Use default' }));
  expect(screen.getAllByRole('img', { name: 'Avatar' })[2]).toHaveTextContent('🧒');
});

test('prefills an existing family and saves changes to the account family', async () => {
  global.fetch = jest.fn((url, options = {}) => {
    if (options.method === 'PUT') return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { id: 'family-1' } }) });
    if (url === '/v1/schools') return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ id: 'school-1', name: 'Westfield Elementary' }] }) });
    if (url.endsWith('/grades')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ id: 'grade-1', name: 'Grade 1' }] }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ id: 'group-a', name: 'Group A' }] }) });
  });
  const onSuccess = jest.fn();
  const family = { id: 'family-1', displayName: 'Lara Family', schoolId: 'school-1', guardians: [{ id: 'g1', name: 'David', email: 'd@example.com', relationship: 'Father', supportedLanguages: ['es'] }], children: [{ id: 'c1', name: 'Juliette', gradeId: 'grade-1', groupId: 'group-a' }] };
  render(<FamilyForm family={family} onSuccess={onSuccess} />);
  expect(screen.getByLabelText('Family name')).toHaveValue('Lara Family');
  await screen.findByRole('option', { name: 'Group A' });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  const [url, options] = global.fetch.mock.calls.find(([, requestOptions]) => requestOptions?.method === 'PUT');
  expect(url).toBe('/v1/families/me');
  expect(JSON.parse(options.body)).toEqual(expect.objectContaining({ displayName: 'Lara Family', avatar: 'preset:house', children: [{ id: 'c1', avatar: 'preset:child', name: 'Juliette', gradeId: 'grade-1', groupId: 'group-a' }] }));
});
