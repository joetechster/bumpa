import {
  Flight,
  Rect,
  displayedCount,
  flightReducer,
  initialFlightState,
} from '../flightController';

const rect = (x = 0, y = 0): Rect => ({ x, y, width: 64, height: 100 });

const start = (source = rect()) =>
  ({ type: 'started', source, target: rect(300, 40), coverUrl: null }) as const;

describe('flightReducer - the controller state machine (idle → flying → landed)', () => {
  it('starting a flight appends it with a fresh id', () => {
    const state = flightReducer(initialFlightState, start());

    expect(state.flights).toHaveLength(1);
    expect(state.flights[0]).toMatchObject({ id: 1, source: rect(), target: rect(300, 40) });
    expect(state.nextId).toBe(2);
  });

  it('landing removes exactly that flight, by id', () => {
    let state = flightReducer(initialFlightState, start(rect(0, 0)));
    state = flightReducer(state, start(rect(10, 10)));

    state = flightReducer(state, { type: 'landed', id: 1 });

    expect(state.flights.map((f) => f.id)).toEqual([2]);
  });

  it('landing is idempotent - a cancelled ghost landing twice cannot corrupt state', () => {
    let state = flightReducer(initialFlightState, start());
    state = flightReducer(state, { type: 'landed', id: 1 });
    state = flightReducer(state, { type: 'landed', id: 1 });

    expect(state.flights).toEqual([]);
  });

  it('ten rapid starts produce ten flights with ten distinct ids (overlap, not queue)', () => {
    let state = initialFlightState;
    for (let i = 0; i < 10; i++) state = flightReducer(state, start(rect(i, i)));

    expect(state.flights).toHaveLength(10);
    expect(new Set(state.flights.map((f: Flight) => f.id)).size).toBe(10);

    // Landing out of order (real overlap) leaves the others untouched.
    state = flightReducer(state, { type: 'landed', id: 5 });
    state = flightReducer(state, { type: 'landed', id: 1 });
    expect(state.flights).toHaveLength(8);
    expect(state.flights.some((f) => f.id === 5 || f.id === 1)).toBe(false);
  });
});

describe('displayedCount - the badge lags the store by the in-flight ghosts', () => {
  it('shows true minus in-flight', () => {
    expect(displayedCount(10, 10)).toBe(0);
    expect(displayedCount(10, 3)).toBe(7);
    expect(displayedCount(10, 0)).toBe(10);
  });

  it('never goes negative when items are removed mid-flight', () => {
    expect(displayedCount(1, 5)).toBe(0);
    expect(displayedCount(0, 2)).toBe(0);
  });
});
