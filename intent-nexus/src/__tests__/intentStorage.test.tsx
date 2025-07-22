import { render, screen } from '@testing-library/react';
import { IntentStorage } from '../components/IntentStorage';

describe('IntentStorage', () => {
  it('renders intent storage stats', () => {
    render(<IntentStorage />);
    expect(screen.getByText(/Total Intents/i)).toBeInTheDocument();
    expect(screen.getByText(/Active/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending/i)).toBeInTheDocument();
    expect(screen.getByText(/Inactive/i)).toBeInTheDocument();
  });
});
