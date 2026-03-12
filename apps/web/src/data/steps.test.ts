import { steps } from './steps';

describe('steps', () => {
  it('contains exactly 3 steps', () => {
    expect(steps).toHaveLength(3);
  });

  it('steps are numbered sequentially starting from 1', () => {
    expect(steps[0].number).toBe(1);
    expect(steps[1].number).toBe(2);
    expect(steps[2].number).toBe(3);
  });

  it('every step has a non-empty id', () => {
    for (const step of steps) {
      expect(step.id.length).toBeGreaterThan(0);
    }
  });

  it('every step has an iconName', () => {
    for (const step of steps) {
      expect(step.iconName.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate step numbers', () => {
    const numbers = steps.map((s) => s.number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('has no duplicate ids', () => {
    const ids = steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each step object has exactly 3 keys', () => {
    for (const step of steps) {
      expect(Object.keys(step)).toHaveLength(3);
    }
  });

  it('first step is about creating a profile', () => {
    expect(steps[0].id).toBe('createProfile');
  });

  it('last step is about walking together', () => {
    expect(steps[2].id).toBe('walkTogether');
  });
});
