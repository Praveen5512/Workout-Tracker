import { render, screen } from '@testing-library/react';
import App from './App';

test('renders ApexTrack app header and overview', () => {
  render(<App />);
  const titleElement = screen.getByText(/Apex/i);
  expect(titleElement).toBeInTheDocument();
  const overviewHeading = screen.getByText(/Weekly Overview/i);
  expect(overviewHeading).toBeInTheDocument();
});
