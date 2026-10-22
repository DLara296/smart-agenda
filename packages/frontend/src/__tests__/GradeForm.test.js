import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import GradeForm from '../features/family/GradeForm';

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'grade-1', schoolId: 'school-1', name: 'Grade 1' }) }));
});

test('requires a school and preselects the originating school', () => {
  render(<GradeForm schools={[{ id: 'school-1', name: 'Westfield Elementary' }]} initialSchoolId="school-1" onCancel={() => {}} onSuccess={() => {}} />);
  expect(screen.getByLabelText('School')).toHaveValue('school-1');
  expect(screen.getByRole('button', { name: 'Save Grade' })).toBeDisabled();
});

test('creates a grade for the selected school', async () => {
  const onSuccess = jest.fn();
  render(<GradeForm schools={[{ id: 'school-1', name: 'Westfield Elementary' }]} onCancel={() => {}} onSuccess={onSuccess} />);
  fireEvent.change(screen.getByLabelText('School'), { target: { value: 'school-1' } });
  fireEvent.change(screen.getByLabelText('Grade name'), { target: { value: 'Grade 1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Grade' }));
  expect(await screen.findByRole('button', { name: 'Save Grade' })).toBeInTheDocument();
  expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 'school-1' }));
});
