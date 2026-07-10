import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from '../useDebouncedValue';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useDebouncedValue', () => {
  it('returns the initial value immediately', async () => {
    const { result } = await renderHook(() => useDebouncedValue('a', 400));
    expect(result.current).toBe('a');
  });

  it('trails changes by the delay', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 400),
      { initialProps: { value: 'a' } },
    );

    await rerender({ value: 'ab' });
    expect(result.current).toBe('a'); // not yet

    await act(async () => {
      jest.advanceTimersByTime(399);
    });
    expect(result.current).toBe('a'); // still not yet

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('ab');
  });

  it('restarts the timer on every keystroke — only the final value lands', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 400),
      { initialProps: { value: 'a' } },
    );

    await rerender({ value: 'ab' });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await rerender({ value: 'abc' });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('a'); // both timers were cut short

    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('abc'); // 'ab' never landed
  });

  it('clears the pending timer on unmount (no update after unmount)', async () => {
    const { rerender, unmount } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 400),
      { initialProps: { value: 'a' } },
    );

    await rerender({ value: 'ab' });
    await unmount();

    // If the timer fired after unmount, React would warn and the console trap
    // would fail this test.
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });
  });
});
