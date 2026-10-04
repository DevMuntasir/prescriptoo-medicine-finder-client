import { describe, it, expect } from 'vitest';
import { initialLocator, locatorReducer } from '../src/features/locator/state';
describe('locator request lifecycle', () => {
  it('confirms area pin and requests directions without losing the selected shop', () => {
    let s = locatorReducer(initialLocator, { type: 'origin', origin: 'area' });
    s = locatorReducer(s, { type: 'select', id: 'ph-1' });
    s = locatorReducer(s, { type: 'request', confirmedPin: true });
    expect(s.origin).toBe('pin');
    expect(s.selected).toBe('ph-1');
    expect(s.route).toBe('pending');
  });
  it('invalidates pending routes when destination changes and ignores their late response', () => {
    let s = locatorReducer(initialLocator, { type: 'origin', origin: 'pin' });
    s = locatorReducer(s, { type: 'select', id: 'ph-1' });
    s = locatorReducer(s, { type: 'request' });
    const old = s.requestId;
    s = locatorReducer(s, { type: 'select', id: 'ph-2' });
    s = locatorReducer(s, { type: 'response', id: old, status: 'ready' });
    expect(s.selected).toBe('ph-2');
    expect(s.route).toBe('idle');
    s = locatorReducer(s, { type: 'request' });
    s = locatorReducer(s, { type: 'response', id: s.requestId, status: 'ready' });
    expect(s.route).toBe('ready');
  });
  it('requires a new route after changing origin or mode', () => {
    let s = locatorReducer(initialLocator, { type: 'select', id: 'ph-1' });
    s = locatorReducer(s, { type: 'request' });
    s = locatorReducer(s, { type: 'response', id: s.requestId, status: 'ready' });
    s = locatorReducer(s, { type: 'mode', mode: 'Driving' });
    expect(s.route).toBe('idle');
    s = locatorReducer(s, { type: 'origin', origin: 'area' });
    expect(s.selected).toBeNull();
    expect(s.origin).toBe('area');
    expect(initialLocator.mode).toBe('Walking');
  });
});
