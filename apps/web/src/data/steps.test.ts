import { steps } from './steps';

describe('steps', () => {
  it('contains exactly 3 steps', () => {
    expect(steps).toHaveLength(3);
  });

  it('steps are numbered sequentially starting from 01', () => {
    expect(steps[0].number).toBe('01');
    expect(steps[1].number).toBe('02');
    expect(steps[2].number).toBe('03');
  });

  it('step numbers are zero-padded two-digit strings', () => {
    for (const step of steps) {
      expect(step.number).toMatch(/^\d{2}$/);
    }
  });

  it('every step has a non-empty title', () => {
    for (const step of steps) {
      expect(step.title.length).toBeGreaterThan(0);
    }
  });

  it('every step has a description of at least 20 characters', () => {
    for (const step of steps) {
      expect(step.description.length).toBeGreaterThanOrEqual(20);
    }
  });

  it('has no duplicate step numbers', () => {
    const numbers = steps.map((s) => s.number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('has no duplicate titles', () => {
    const titles = steps.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('each step object has exactly 3 keys', () => {
    for (const step of steps) {
      expect(Object.keys(step)).toHaveLength(3);
    }
  });

  it('first step is about creating a dog profile', () => {
    expect(steps[0].title).toContain('profilo');
  });

  it('last step is about walking together', () => {
    expect(steps[2].title.toLowerCase()).toContain('passeggia');
  });
});
