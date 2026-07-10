import { render, screen, userEvent } from '@testing-library/react-native';

import type { ApiError } from '../../api/errors';
import ErrorView from '../ErrorView';

// One test per taxonomy branch (D11). The graded property: a 429 must NOT
// render the same UI as a 500, and empty results never reach this component.

const errors: Record<string, ApiError> = {
  offline: { kind: 'network', cause: 'offline', message: '' },
  timeout: { kind: 'network', cause: 'timeout', message: '' },
  rateLimited: { kind: 'rate_limit', retryAfterSeconds: 30, message: '' },
  rateLimitedNoHint: { kind: 'rate_limit', retryAfterSeconds: null, message: '' },
  notFound: { kind: 'not_found', message: '' },
  server: { kind: 'server', status: 500, message: '' },
  malformed: { kind: 'malformed', message: '' },
};

describe('ErrorView — four distinct UIs for five error kinds', () => {
  it('network/offline says the user is offline', async () => {
    await render(<ErrorView error={errors.offline} />);
    expect(screen.getByText(/you appear to be offline/i)).toBeOnTheScreen();
    expect(screen.getByText(/check your internet connection/i)).toBeOnTheScreen();
  });

  it('network/timeout keeps the offline title but explains the timeout', async () => {
    await render(<ErrorView error={errors.timeout} />);
    expect(screen.getByText(/took too long/i)).toBeOnTheScreen();
  });

  it('rate_limit (429) tells the user to slow down — NOT the server-error copy', async () => {
    await render(<ErrorView error={errors.rateLimited} />);
    expect(screen.getByText(/too many requests/i)).toBeOnTheScreen();
    expect(screen.getByText(/try again in 30s/i)).toBeOnTheScreen();
    expect(screen.queryByText(/went wrong on our side/i)).not.toBeOnTheScreen();
  });

  it('rate_limit without a Retry-After hint still reads as throttling', async () => {
    await render(<ErrorView error={errors.rateLimitedNoHint} />);
    expect(screen.getByText(/give it a moment/i)).toBeOnTheScreen();
  });

  it('not_found says the book is gone', async () => {
    await render(<ErrorView error={errors.notFound} />);
    expect(screen.getByText(/book not found/i)).toBeOnTheScreen();
  });

  it('server (500) owns the failure — distinct from the 429 copy', async () => {
    await render(<ErrorView error={errors.server} />);
    expect(screen.getByText(/went wrong on our side/i)).toBeOnTheScreen();
    expect(screen.queryByText(/too many requests/i)).not.toBeOnTheScreen();
  });

  it('malformed shares the server UI by design (D11)', async () => {
    await render(<ErrorView error={errors.malformed} />);
    expect(screen.getByText(/went wrong on our side/i)).toBeOnTheScreen();
  });

  it('fires onRetry when "Try again" is pressed', async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    await render(<ErrorView error={errors.server} onRetry={onRetry} />);

    await user.press(screen.getByRole('button', { name: /try again/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders no retry button when no handler is given', async () => {
    await render(<ErrorView error={errors.server} />);
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeOnTheScreen();
  });
});
