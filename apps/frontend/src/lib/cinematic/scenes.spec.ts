import { SCENES, SCENE_COUNT, sceneWindow } from './scenes';

describe('sceneWindow (timeline range math)', () => {
  it('maps a 1-based scene id to its [start, end] second window', () => {
    expect(sceneWindow(1)).toEqual([0, 1]);
    expect(sceneWindow(5)).toEqual([4, 5]);
    expect(sceneWindow(SCENE_COUNT)).toEqual([SCENE_COUNT - 1, SCENE_COUNT]);
  });

  it('produces contiguous, non-overlapping unit windows across the journey', () => {
    for (let id = 1; id < SCENE_COUNT; id += 1) {
      const [, end] = sceneWindow(id);
      const [nextStart] = sceneWindow(id + 1);
      expect(end).toBe(nextStart);
      expect(end - sceneWindow(id)[0]).toBe(1);
    }
  });
});

describe('SCENE_COUNT', () => {
  it('equals the number of scene definitions and is non-empty', () => {
    expect(SCENE_COUNT).toBe(SCENES.length);
    expect(SCENE_COUNT).toBeGreaterThan(0);
  });
});
