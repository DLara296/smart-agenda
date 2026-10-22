import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ProfileEditor from '../features/profile/ProfileEditor';

test('allows choosing a preset avatar and saving a profile name', async () => {
  render(<ProfileEditor />);
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Mariela Garcia' } });
  fireEvent.click(screen.getByRole('button', { name: 'Choose Panda avatar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(await screen.findByText('Changes saved successfully.')).toBeInTheDocument();
  expect(screen.getByText('Mariela Garcia')).toBeInTheDocument();
});