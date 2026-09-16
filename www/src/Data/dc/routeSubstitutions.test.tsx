import { describe, it, expect } from 'vitest';
import { DC_ROUTE_SUBSTITUTIONS, dcElement } from './routeSubstitutions';

describe('routeSubstitutions', () => {
  it('registers Home and Pin Mapping', () => {
    expect(Object.keys(DC_ROUTE_SUBSTITUTIONS)).toEqual(
      expect.arrayContaining(['/', '/pin-mapping']),
    );
  });
  it('dcElement substitutes only when enabled and mapped', () => {
    const stock = <div data-testid="stock" />;
    expect(dcElement('/pin-mapping', true, stock)).not.toBe(stock); // substituted
    expect(dcElement('/pin-mapping', false, stock)).toBe(stock); // stock
    expect(dcElement('/settings', true, stock)).toBe(stock); // unmapped -> stock
  });
});
