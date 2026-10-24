/**
 * Fighters and arenas from the team's Frontend-design repo
 * ("Dojo_Animationen_Teil_1-3" sprites and "Maps"). Every fighter has six
 * clips packed as horizontal WebP strips in public/dojo/fighters/<id>/<clip>.webp,
 * 300px square frames facing right.
 */
export type FighterId = 'monk' | 'brawler' | 'ninja' | 'valkyrie' | 'storm' | 'colossus';
export type ClipName = 'idle' | 'jab' | 'heavy' | 'special' | 'hurt' | 'block';

export interface ClipSpec {
  frames: number;
  fps: number;
  loop: boolean;
  /** Frame (0-based) where the effect connects; damage timing aligns this frame with the hit. */
  contact: number;
}

export const CLIPS: Record<ClipName, ClipSpec> = {
  idle: { frames: 12, fps: 10, loop: true, contact: 0 },
  jab: { frames: 8, fps: 18, loop: false, contact: 3 },
  heavy: { frames: 10, fps: 15, loop: false, contact: 5 },
  special: { frames: 12, fps: 12, loop: false, contact: 8 },
  hurt: { frames: 6, fps: 14, loop: false, contact: 0 },
  block: { frames: 8, fps: 16, loop: false, contact: 3 },
};

export interface FighterArt {
  id: FighterId;
  name: string;
  /** Element colour for auras, bursts and the attack trail. */
  element: string;
  /** Relative size; 1 is a normal fighter. */
  scale: number;
  /** Where the feet sit, as a fraction of the frame height from the top. */
  feetY: number;
}

export function clipUrl(fighter: FighterArt, clip: ClipName) {
  return `/dojo/fighters/${fighter.id}/${clip}.webp`;
}

export const FIGHTERS: Record<FighterId, FighterArt> = {
  monk: { id: 'monk', name: 'Apprentice', element: '#7fd4ff', scale: 1, feetY: 0.977 },
  brawler: { id: 'brawler', name: 'Ember Fist', element: '#ff8a3d', scale: 1, feetY: 0.97 },
  ninja: { id: 'ninja', name: 'Kasumi', element: '#5fe3c8', scale: 1, feetY: 0.977 },
  valkyrie: { id: 'valkyrie', name: 'Void Valkyrie', element: '#c58cff', scale: 1, feetY: 0.967 },
  storm: { id: 'storm', name: 'Raikō', element: '#9db8ff', scale: 1, feetY: 0.977 },
  colossus: {
    id: 'colossus',
    name: 'Stone Colossus',
    element: '#ff5a4f',
    scale: 1.16,
    feetY: 0.97,
  },
};

export const HERO = FIGHTERS.monk;
export const BOSS = FIGHTERS.colossus;

export interface Arena {
  name: string;
  map: string;
  small: string;
  ambience: 'dust' | 'fireflies' | 'rain' | 'leaves' | 'embers';
}

function arena(name: string, id: string, ambience: Arena['ambience']): Arena {
  return { name, map: `/dojo/maps/${id}.webp`, small: `/dojo/maps/${id}-small.webp`, ambience };
}

/** Tower level → villain and arena. Level 5 is the Sensei's final form. */
const LEVELS: Record<string, { villain: FighterId; arena: Arena }> = {
  '1': { villain: 'brawler', arena: arena('Cage Fight', 'floor-1', 'dust') },
  '2': { villain: 'ninja', arena: arena('Lake Fight', 'floor-2', 'fireflies') },
  '3': { villain: 'valkyrie', arena: arena('Neon Drift', 'floor-3', 'rain') },
  '4': { villain: 'storm', arena: arena('Jungle Fight', 'floor-4', 'leaves') },
  boss: { villain: 'colossus', arena: arena('Lava Fuji', 'floor-5', 'embers') },
};

export const FINAL_ARENA = arena('Final Fuji', 'final', 'leaves');

export function levelFor(floorId: string | undefined) {
  const level = LEVELS[floorId ?? ''] ?? LEVELS['1'];
  return { villain: FIGHTERS[level.villain], arena: level.arena };
}

export function villainForFloor(floorId: string | undefined): FighterArt {
  return levelFor(floorId).villain;
}

export const TOWER_LEVELS = ['1', '2', '3', '4', 'boss'] as const;
export type TowerLevel = (typeof TOWER_LEVELS)[number];

/** Art level for a learning floor by its 1-based order; dojos with more floors cycle the four. */
export function artLevelForOrder(order: number): Exclude<TowerLevel, 'boss'> {
  const levels = ['1', '2', '3', '4'] as const;
  return levels[(Math.max(1, Math.floor(order)) - 1) % levels.length];
}

export function levelForOrder(order: number) {
  return levelFor(artLevelForOrder(order));
}
