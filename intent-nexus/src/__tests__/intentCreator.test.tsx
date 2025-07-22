import { render, screen } from '@testing-library/react';
import { IntentCreator } from '../components/IntentCreator';

describe('IntentCreator', () => {
  it('renders intent creation form', () => {
    render(<IntentCreator />);
    expect(screen.getByText(/AI Intent Creator/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Intent Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Natural Language Input/i)).toBeInTheDocument();
  });
});
