/**
 * The five tower rooms. Each one frames its floor's battle map (hung on the back wall by
 * tower-scene.ts) with silhouette props, a coloured haze and particles that match the
 * arena's ambience in the battle. The middle of each room stays clear for the fighters.
 */
import * as THREE from 'three';
import { box, standard, type RoomFx } from './tower-kit';

export type RoomTheme = 'cage' | 'lake' | 'neon' | 'jungle' | 'lava';

export interface RoomLight {
  color: number;
  intensity: number;
  distance: number;
}

/** Depth of the facade frame in front of every room. */
export const RING = 0.5;

function floorSlab(fx: RoomFx, material: THREE.Material) {
  const { IW, ID, front, backZ } = fx.dims;
  fx.group.add(box(IW * 2, 0.1, ID + RING, material, 0, 0.05, (front + backZ) / 2));
}

export const ROOMS: Record<RoomTheme, (fx: RoomFx) => RoomLight> = {
  /** Cage Fight: training racks, red banners and lanterns. */
  cage(fx) {
    const { kit, group } = fx;
    const { sw, IW, IH, front, backZ } = fx.dims;
    const sil = kit.silhouette;
    floorSlab(fx, kit.glowFloor('#1a0e12', '#ff6a2a'));
    const rackX = sw * 0.36;
    for (const y of [0.6, 1.0]) group.add(box(1.0, 0.06, 0.06, sil, rackX, y, backZ + 0.5, true));
    for (let i = 0; i < 3; i++) {
      const staff = box(0.9, 0.05, 0.05, sil, rackX - 0.05, 0.8 - i * 0.02, backZ + 0.5, true);
      staff.rotation.z = 0.05;
      group.add(staff);
    }
    for (const x of [-sw * 0.4, sw * 0.4]) {
      group.add(box(0.5, 2.2, 0.04, standard(0x1a0608, { roughness: 0.9 }), x, IH * 0.55, backZ + 0.5));
      group.add(
        box(0.54, 0.1, 0.06, standard(0xff5a2a, { emissive: 0xff5a2a, emissiveIntensity: 1.3 }), x, IH * 0.55 + 1.08, backZ + 0.5),
      );
    }
    for (const side of [-1, 1]) group.add(box(0.3, IH, 0.3, sil, side * (IW - 0.2), IH / 2, front - 0.6, true));
    kit.lantern(group, -sw * 0.3, IH * 0.8, front - 0.5, 0.34, 0xff6a4a, 0xff3a1a);
    kit.lantern(group, sw * 0.3, IH * 0.8, front - 0.5, 0.34, 0xff6a4a, 0xff3a1a);
    fx.haze(0.8, backZ + 1.2, IW * 3, 3.2, 0xff6a2a, 0.24);
    fx.particles(40, 0xffa050, 0.08, 'up', 0.5);
    return { color: 0xff5a24, intensity: 9, distance: 12 };
  },

  /** Lake Fight: moonlit garden with a torii, a crooked pine and fireflies. */
  lake(fx) {
    const { kit, group } = fx;
    const { sw, IW, front, backZ } = fx.dims;
    floorSlab(fx, kit.glowFloor('#0e1322', '#7a9cff'));
    group.add(kit.torii(-sw * 0.36, backZ + 0.8, 0.8, 0x07060e));
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 2.6, 7), kit.silhouette);
    trunk.position.set(sw * 0.38, 1.3, backZ + 0.9);
    trunk.rotation.z = 0.22;
    trunk.castShadow = true;
    group.add(trunk);
    const crown = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: kit.blobTexture(['#0a1410', '#0d1a12', '#08120d'], 51), transparent: true }),
    );
    crown.position.set(sw * 0.4, 2.6, backZ + 0.9);
    crown.scale.set(2.6, 1.9, 1);
    group.add(crown);
    kit.stoneLantern(group, -sw * 0.4, front - 1.0, 0.9, 0xbfe0ff);
    kit.rock(group, sw * 0.36, front - 1.2, 0.3);
    fx.haze(0.7, backZ + 1.3, IW * 3, 3.2, 0x6a86ff, 0.22);
    fx.particles(34, 0xcfe0a0, 0.055, 'up', 0.22);
    return { color: 0x7a90ff, intensity: 7, distance: 12 };
  },

  /** Neon Drift: crates, neon tubes, a row of lanterns, rain and lightning. */
  neon(fx) {
    const { kit, group } = fx;
    const { sw, IW, IH, front, backZ } = fx.dims;
    floorSlab(fx, kit.glowFloor('#0a0a16', '#ff3fa4'));
    for (const [x, half] of [
      [-sw * 0.38, 0.4],
      [sw * 0.38, 0.55],
    ]) {
      group.add(box(0.7, half * 2, 0.7, kit.silhouette, x, half, backZ + 0.8, true));
    }
    for (const [x, color] of [
      [-sw * 0.44, 0xff2f8f],
      [sw * 0.44, 0x39e6ff],
    ]) {
      group.add(box(0.24, 1.5, 0.05, standard(color, { emissive: color, emissiveIntensity: 1.7 }), x, IH * 0.55, backZ + 0.6));
      group.add(kit.glow(x, IH * 0.55, backZ + 0.7, 2.8, 0.7, color));
    }
    for (let k = -2; k <= 2; k++) kit.lantern(group, k * 0.6, IH * 0.84, front - 0.4, 0.26, 0xff5a4a, 0xff3a2a);
    fx.haze(0.7, backZ + 1.4, IW * 3, 3.2, 0xff3fa4, 0.2);
    fx.particles(70, 0xbfe8ff, 0.05, 'down', 1.7);
    fx.flasher(0x9fd0ff);
    return { color: 0xff3f9a, intensity: 8, distance: 12 };
  },

  /** Jungle Fight: bamboo walls, fox guardians, light shafts and falling leaves. */
  jungle(fx) {
    const { kit, group } = fx;
    const { sw, IW, IH, ID, front, backZ } = fx.dims;
    floorSlab(fx, kit.glowFloor('#0e160e', '#cfe86a'));
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      kit.bambooStalk(group, -sw * 0.44 + t * 0.25, backZ + 0.5 + t * (ID - 0.9), 2.6 + ((i * 7) % 3) * 0.3, 0x081206);
      kit.bambooStalk(group, sw * 0.44 - t * 0.25, backZ + 0.7 + t * (ID - 0.9), 2.6 + ((i * 5) % 3) * 0.3, 0x081206);
    }
    group.add(kit.foxStatue(-sw * 0.34, front - 0.9, 0.75, 0x090810));
    group.add(kit.foxStatue(sw * 0.34, front - 0.9, 0.75, 0x090810));
    fx.rays(0, IH, backZ + 0.6, 6, 0xeaff9a);
    fx.haze(0.8, backZ + 1.3, IW * 3, 3.2, 0xbfe36a, 0.2);
    fx.particles(36, 0xdfe88a, 0.06, 'down', 0.5);
    return { color: 0xcfe36a, intensity: 8, distance: 12 };
  },

  /** Lava Fuji: basalt pillars, braziers, rising embers and eruption flashes. */
  lava(fx) {
    const { kit, group } = fx;
    const { sw, IW, front, backZ } = fx.dims;
    floorSlab(fx, kit.lavaFloor());
    group.add(box(0.3, 1.6, 0.3, kit.silhouette, -sw * 0.42, 0.8, front - 0.8, true));
    const broken = box(0.3, 1.0, 0.3, kit.silhouette, sw * 0.42, 0.5, front - 0.9, true);
    broken.rotation.z = 0.2;
    group.add(broken);
    fx.brazier(-sw * 0.32, front - 0.6, 0.85);
    fx.brazier(sw * 0.34, backZ + 1.2, 0.8);
    fx.haze(0.8, backZ + 1.2, IW * 3, 3.2, 0xff5a1a, 0.26);
    fx.particles(70, 0xff8a3a, 0.09, 'up', 0.7);
    fx.flasher(0xff9a5a);
    return { color: 0xff6a28, intensity: 11, distance: 13 };
  },
};
