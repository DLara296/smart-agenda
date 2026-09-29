import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import RecordDirectory from '../features/workspace/RecordDirectory';

beforeEach(() => {
  global.fetch = jest.fn((url, options = {}) => {
    if (url === '/v1/schools') return Promise.resolve({ json: () => Promise.resolve({ data: [{ id: 'school-1', name: 'Westfield Elementary' }] }) });
    if (options.method === 'POST') return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });
});

test('shows an error instead of crashing when teachers cannot be loaded', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource.' } }) }));
  render(<RecordDirectory type="Teachers" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission');
  expect(screen.getByText('No teachers registered yet')).toBeInTheDocument();
});

test('requires a school before creating a teacher', async () => {
  render(<RecordDirectory type="Teachers" />);
  fireEvent.click(screen.getByRole('button', { name: /add teacher/i }));
  expect(await screen.findByLabelText('School')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  await screen.findByRole('option', { name: 'Westfield Elementary' });
  fireEvent.change(screen.getByLabelText('School'), { target: { value: 'school-1' } });
  expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
});

test('preselects source School and notifies the caller after Teacher creation', async () => {
  const onCreate = jest.fn();
  global.fetch = jest.fn((url, options = {}) => {
    if (url === '/v1/schools') return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ id: 'school-1', name: 'Westfield Elementary' }] }) });
    if (url === '/v1/teachers' && options.method === 'POST') return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'teacher-1', name: 'Mariela Garcia', schoolId: 'school-1' }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });
  render(<RecordDirectory type="Teachers" initialSchoolId="school-1" onCreate={onCreate} />);

  expect(await screen.findByTestId('add-Teachers-form')).toBeInTheDocument();
  await screen.findByRole('option', { name: 'Westfield Elementary' });
  expect(screen.getByLabelText('School')).toHaveValue('school-1');
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Mariela Garcia' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'mariela@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByRole('status')).toHaveTextContent('Teacher added successfully.');
  expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 'school-1' }));
});

test('shows a clear validation message when a teacher has no school', async () => {
  render(<RecordDirectory type="Teachers" />);
  fireEvent.click(screen.getByRole('button', { name: /add teacher/i }));
  expect(await screen.findByLabelText('School')).toBeInTheDocument();
  fireEvent.submit(screen.getByTestId('add-Teachers-form'));
  expect(screen.getByRole('alert')).toHaveTextContent('Select a school before saving the teacher.');
});

test('loads dependent grades and groups for a student', async () => {
  global.fetch = jest.fn((url) => {
    if (url === '/v1/schools') return Promise.resolve({ json: () => Promise.resolve({ data: [{ id: 'school-1', name: 'Westfield Elementary' }] }) });
    if (url === '/v1/schools/school-1/grades') return Promise.resolve({ json: () => Promise.resolve({ data: [{ id: 'grade-1', name: 'Grade 1' }] }) });
    if (url === '/v1/grades/grade-1/groups') return Promise.resolve({ json: () => Promise.resolve({ data: [{ id: 'group-1', name: 'Group A' }] }) });
    return Promise.resolve({ json: () => Promise.resolve({ data: [] }) });
  });
  render(<RecordDirectory type="Students" />);
  fireEvent.click(screen.getByRole('button', { name: /add student/i }));
  fireEvent.change(await screen.findByLabelText('School'), { target: { value: 'school-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Grade' }));
  fireEvent.click(await screen.findByText('Grade 1'));
  expect(await screen.findByLabelText('Group')).not.toBeDisabled();
  expect(await screen.findByRole('option', { name: 'Group A' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Group'), { target: { value: 'group-1' } });
  expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
});

test('edits a teacher through the existing populated teacher form', async () => {
  global.fetch = jest.fn((url, options = {}) => {
    if (url === '/v1/teachers' && !options.method) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ id: 'teacher-1', name: 'Paola Ruiz', email: 'paola@example.test', phone: '5551234', schoolId: 'school-1' }] }) });
    if (url === '/v1/schools') return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ id: 'school-1', name: 'Westfield Elementary' }] }) });
    if (url === '/v1/teachers/teacher-1' && options.method === 'PATCH') return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { id: 'teacher-1', name: 'Paola Garcia' } }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });
  render(<RecordDirectory type="Teachers" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Paola Ruiz' }));
  expect(await screen.findByTestId('edit-Teachers-form')).toBeInTheDocument();
  expect(screen.getByLabelText('Name')).toHaveValue('Paola Ruiz');
  expect(screen.getByLabelText('Email')).toHaveValue('paola@example.test');
});

test('delete waits for explicit confirmation and Escape cancels safely', async () => {
  const deleteRequest = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { archived: true } }) }));
  global.fetch = jest.fn((url, options = {}) => {
    if (url === '/v1/teachers' && !options.method) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ id: 'teacher-1', name: 'Paola Ruiz', email: 'paola@example.test' }] }) });
    if (options.method === 'DELETE') return deleteRequest(url, options);
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });
  render(<RecordDirectory type="Teachers" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Delete Paola Ruiz' }));
  expect(screen.getByRole('alertdialog')).toHaveTextContent('Paola Ruiz');
  expect(deleteRequest).not.toHaveBeenCalled();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(deleteRequest).not.toHaveBeenCalled();
});