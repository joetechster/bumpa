import { makeTransactionReference } from '../reference';

describe('makeTransactionReference', () => {
  it('matches the bn_<timestamp>_<suffix> shape', () => {
    expect(makeTransactionReference(() => 1_700_000_000_000)).toMatch(/^bn_1700000000000_[a-z0-9]+$/);
  });

  it('two consecutive checkouts never collide - even within the same millisecond', () => {
    const frozenNow = () => 1_700_000_000_000;
    const references = new Set(
      Array.from({ length: 100 }, () => makeTransactionReference(frozenNow)),
    );
    expect(references.size).toBe(100);
  });
});
