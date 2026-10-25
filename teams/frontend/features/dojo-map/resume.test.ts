import { describe, expect, it } from 'vitest';
import { resumePath } from './useDojoProgress';

const floors = ['f1', 'f2', 'f3'];

describe('resumePath', () => {
  it('lands on the open lesson, battle, boss, or the tower once mastered', () => {
    expect(resumePath('d', floors, { floorCount: 3, currentFloor: 2, stage: 'lesson' })).toBe(
      '/dojo/d/floor/f2',
    );
    expect(resumePath('d', floors, { floorCount: 3, currentFloor: 2, stage: 'battle' })).toBe(
      '/dojo/d/floor/f2/battle',
    );
    expect(resumePath('d', floors, { floorCount: 3, currentFloor: 3, stage: 'boss' })).toBe(
      '/dojo/d/boss',
    );
    expect(resumePath('d', floors, { floorCount: 3, currentFloor: 3, stage: 'complete' })).toBe(
      '/dojo/d',
    );
  });

  it('falls back to the tower when the floor is unknown', () => {
    expect(resumePath('d', [], { floorCount: 1, currentFloor: 1, stage: 'lesson' })).toBe(
      '/dojo/d',
    );
  });
});
