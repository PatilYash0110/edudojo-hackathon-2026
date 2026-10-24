export type SpriteClip = {
  frames: number;
  fps: number;
  contactFrames: readonly number[];
  loop: boolean;
};

/** Frontend may tune frames, but combat events must keep using the declared contact frames. */
export const SPRITE_EVENTS = {
  IdleHigh: { frames: 12, fps: 12, contactFrames: [], loop: true },
  IdleLow: { frames: 10, fps: 12, contactFrames: [], loop: true },
  IdleFeint: { frames: 8, fps: 12, contactFrames: [], loop: true },
  FaceOffDash: { frames: 10, fps: 20, contactFrames: [], loop: false },
  HeavyOverhead: { frames: 18, fps: 20, contactFrames: [8], loop: false },
  HeavyReverse: { frames: 18, fps: 20, contactFrames: [8], loop: false },
  HeavySpin: { frames: 19, fps: 20, contactFrames: [9], loop: false },
  Combo1: { frames: 12, fps: 20, contactFrames: [6], loop: false },
  Combo2: { frames: 15, fps: 20, contactFrames: [6, 10], loop: false },
  Combo3: { frames: 19, fps: 20, contactFrames: [6, 10, 14], loop: false },
  Charge: { frames: 30, fps: 18, contactFrames: [20], loop: false },
  Hit: { frames: 8, fps: 18, contactFrames: [0], loop: false },
  Block: { frames: 14, fps: 18, contactFrames: [7], loop: false },
  Parry: { frames: 14, fps: 20, contactFrames: [7], loop: false },
  Dodge: { frames: 16, fps: 20, contactFrames: [7], loop: false },
  Defeat: { frames: 20, fps: 16, contactFrames: [], loop: false },
  BossTransform: { frames: 32, fps: 18, contactFrames: [], loop: false },
} as const satisfies Record<string, SpriteClip>;
