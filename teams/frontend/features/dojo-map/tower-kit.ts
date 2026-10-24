/**
 * Building blocks for the EduDOJO tower scene (ported from the Frontend-design repo's
 * "EduDOJO Tower" three.js prototype): canvas textures, silhouette props and the
 * per-room atmosphere (haze, particles, lightning flashes, braziers).
 */
import * as THREE from 'three';

export type Draw = (g: CanvasRenderingContext2D, width: number, height: number) => void;

/** Seeded mulberry32 so every visit builds the same tower. */
export function rng(seed: number) {
  // `>>> 0` keeps the state a wrapping 32-bit integer (Math.trunc would not wrap).
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasTexture(
  width: number,
  height: number,
  draw: Draw,
  repeat?: [number, number],
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas is unavailable');
  draw(context, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  return texture;
}

export function standard(
  color: THREE.ColorRepresentation,
  options: THREE.MeshStandardMaterialParameters = {},
) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...options });
}

export function box(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  cast = false,
  receive = true,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

export function plane(
  width: number,
  height: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z);
  return mesh;
}

export function leafShape(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  fill: string,
) {
  g.save();
  g.translate(x, y);
  g.rotate(rotation);
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const angle = (k / 10) * Math.PI * 2 - Math.PI / 2;
    const radius = k % 2 ? size * 0.46 : size;
    g.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = 1.6;
  g.strokeStyle = 'rgba(70,10,24,.55)';
  g.stroke();
  g.restore();
}

/** Shared textures and prop builders. One kit per scene. */
export class TowerKit {
  readonly glowTexture = canvasTexture(128, 128, (g, w, h) => {
    const gradient = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, 'rgba(255,214,150,1)');
    gradient.addColorStop(0.35, 'rgba(255,150,70,.45)');
    gradient.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, h);
  });
  readonly leafTexture = canvasTexture(64, 64, (g) => leafShape(g, 32, 32, 26, 0, '#ffffff'));
  readonly silhouette = standard(0x06060d, { roughness: 0.5, metalness: 0.2 });

  blobTexture(colors: string[], seed: number) {
    return canvasTexture(256, 256, (g, w, h) => {
      const random = rng(seed);
      for (let k = 0; k < 90; k++) {
        const angle = random() * Math.PI * 2;
        const distance = Math.sqrt(random()) * 92;
        leafShape(
          g,
          128 + Math.cos(angle) * distance,
          128 + Math.sin(angle) * distance,
          8 + random() * 9,
          random() * 6.28,
          colors[Math.floor(random() * colors.length)],
        );
      }
      g.globalCompositeOperation = 'source-atop';
      const shade = g.createLinearGradient(0, 0, w, h);
      shade.addColorStop(0, 'rgba(255,236,170,.3)');
      shade.addColorStop(1, 'rgba(30,0,20,.5)');
      g.fillStyle = shade;
      g.fillRect(0, 0, w, h);
    });
  }

  glow(
    x: number,
    y: number,
    z: number,
    size: number,
    opacity: number,
    color?: THREE.ColorRepresentation,
  ) {
    const material = new THREE.SpriteMaterial({
      map: this.glowTexture,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    if (color !== undefined) material.color.set(color);
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, z);
    sprite.scale.set(size, size, 1);
    return sprite;
  }

  lantern(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    size: number,
    color: number,
    emissive: number,
  ) {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(size * 0.5, size * 0.5, size, 12, 1),
      standard(color, { emissive, emissiveIntensity: 1.4, roughness: 0.6 }),
    );
    body.scale.y = 1.12;
    body.position.set(x, y, z);
    group.add(body);
    group.add(
      box(
        size * 0.24,
        size * 0.1,
        size * 0.24,
        standard(0x241208),
        x,
        y + size * 0.66,
        z,
        false,
        false,
      ),
    );
    group.add(this.glow(x, y, z, size * 3.2, 0.7, emissive));
  }

  torii(x: number, z: number, scale: number, color: number) {
    const group = new THREE.Group();
    const material = standard(color, { roughness: 0.6 });
    const height = 2.2 * scale;
    const radius = 0.12 * scale;
    const span = 1.6 * scale;
    for (const px of [-span, span]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.85, radius, height, 10),
        material,
      );
      post.position.set(x + px, height / 2, z);
      post.castShadow = true;
      group.add(post);
    }
    group.add(
      box(span * 2 + 0.7 * scale, 0.24 * scale, 0.34 * scale, material, x, height, z, true, false),
    );
    group.add(
      box(
        span * 2 + 1.05 * scale,
        0.15 * scale,
        0.18 * scale,
        material,
        x,
        height + 0.2 * scale,
        z,
      ),
    );
    group.add(
      box(
        span * 2 - 0.25 * scale,
        0.16 * scale,
        0.26 * scale,
        material,
        x,
        height - 0.5 * scale,
        z,
      ),
    );
    return group;
  }

  foxStatue(x: number, z: number, scale: number, color = 0x9a93a2) {
    const group = new THREE.Group();
    const stone = standard(color, { roughness: 0.9 });
    group.add(box(0.5 * scale, 0.2 * scale, 0.6 * scale, stone, x, 0.1 * scale, z, true));
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15 * scale, 0.22 * scale, 0.75 * scale, 8),
      stone,
    );
    body.position.set(x, 0.57 * scale, z);
    body.castShadow = true;
    group.add(body);
    group.add(
      box(0.22 * scale, 0.24 * scale, 0.26 * scale, stone, x, 0.98 * scale, z + 0.03 * scale, true),
    );
    for (const ex of [-0.08, 0.08]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05 * scale, 0.17 * scale, 4), stone);
      ear.position.set(x + ex, 1.16 * scale, z);
      group.add(ear);
    }
    group.add(
      box(
        0.1 * scale,
        0.1 * scale,
        0.16 * scale,
        stone,
        x,
        0.95 * scale,
        z + 0.2 * scale,
        false,
        false,
      ),
    );
    const tail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03 * scale, 0.14 * scale, 0.62 * scale, 6),
      stone,
    );
    tail.position.set(x, 0.62 * scale, z - 0.3 * scale);
    tail.rotation.x = 0.7;
    group.add(tail);
    return group;
  }

  bambooStalk(group: THREE.Group, x: number, z: number, height: number, color = 0x6f9a3a) {
    const material = standard(color, { roughness: 0.7 });
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, height, 8), material);
    stalk.position.set(x, height / 2, z);
    stalk.castShadow = true;
    group.add(stalk);
    for (let k = 1; k < height / 0.55; k++) {
      const node = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.016, 6, 10), material);
      node.rotation.x = Math.PI / 2;
      node.position.set(x, k * 0.55, z);
      group.add(node);
    }
  }

  stoneLantern(group: THREE.Group, x: number, z: number, scale: number, light = 0xff9a3a) {
    const sil = this.silhouette;
    group.add(box(0.44 * scale, 0.12 * scale, 0.44 * scale, sil, x, 0.06 * scale, z, true));
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 0.6 * scale, 8),
      sil,
    );
    post.position.set(x, 0.4 * scale, z);
    post.castShadow = true;
    group.add(post);
    group.add(box(0.4 * scale, 0.08 * scale, 0.4 * scale, sil, x, 0.74 * scale, z, true));
    const lamp = standard(0xffd9a0, { emissive: light, emissiveIntensity: 1.3, roughness: 0.6 });
    group.add(box(0.3 * scale, 0.26 * scale, 0.3 * scale, lamp, x, 0.92 * scale, z));
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34 * scale, 0.24 * scale, 4), sil);
    cap.rotation.y = Math.PI / 4;
    cap.position.set(x, 1.17 * scale, z);
    cap.castShadow = true;
    group.add(cap);
    group.add(this.glow(x, 0.92 * scale, z, 2.2 * scale, 0.7, light));
  }

  rock(group: THREE.Group, x: number, z: number, size: number) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), this.silhouette);
    rock.position.set(x, size * 0.42, z);
    rock.scale.y = 0.7;
    rock.rotation.y = size;
    rock.castShadow = true;
    group.add(rock);
  }

  /** Dark polished floor that glows from the back wall forward. */
  glowFloor(tint: string, glowHex: string) {
    const map = canvasTexture(
      256,
      256,
      (g, w, h) => {
        g.fillStyle = tint;
        g.fillRect(0, 0, w, h);
        const random = rng(3);
        for (let i = 0; i < 500; i++) {
          g.fillStyle = `rgba(0,0,0,${random() * 0.5})`;
          g.fillRect(random() * w, random() * h, 3, 3);
        }
      },
      [2, 2],
    );
    const emissiveMap = canvasTexture(
      256,
      256,
      (g, w, h) => {
        const gradient = g.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, glowHex);
        gradient.addColorStop(0.55, '#000');
        gradient.addColorStop(1, '#000');
        g.fillStyle = gradient;
        g.fillRect(0, 0, w, h);
      },
      [2, 2],
    );
    return standard(0xffffff, {
      map,
      emissive: 0xffffff,
      emissiveMap,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.35,
    });
  }

  /** Cracked basalt with glowing lava seams. */
  lavaFloor() {
    const map = canvasTexture(
      256,
      256,
      (g, w, h) => {
        g.fillStyle = '#120d16';
        g.fillRect(0, 0, w, h);
        const random = rng(3);
        for (let i = 0; i < 300; i++) {
          g.fillStyle = `rgba(6,4,8,${random() * 0.5})`;
          g.fillRect(random() * w, random() * h, 3, 3);
        }
      },
      [2, 2],
    );
    const emissiveMap = canvasTexture(
      256,
      256,
      (g, w, h) => {
        g.fillStyle = '#000';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = '#ff6a1a';
        g.lineWidth = 4;
        const random = rng(4);
        for (let i = 0; i < 6; i++) {
          g.beginPath();
          let x = random() * w;
          let y = 0;
          g.moveTo(x, y);
          while (y < h) {
            x += (random() - 0.5) * 40;
            y += 20 + random() * 20;
            g.lineTo(x, y);
          }
          g.stroke();
        }
        g.strokeStyle = '#ffd24a';
        g.lineWidth = 1.5;
        g.stroke();
      },
      [2, 2],
    );
    return standard(0xffffff, {
      map,
      emissive: 0xffffff,
      emissiveMap,
      emissiveIntensity: 2.6,
      roughness: 0.8,
    });
  }
}

/** Interior size of one tower room, in the room group's local space. */
export interface RoomDims {
  /** Opening (screen) width. */
  sw: number;
  /** Half interior width, interior height and depth. */
  IW: number;
  IH: number;
  ID: number;
  front: number;
  backZ: number;
}

interface ParticleField {
  geometry: THREE.BufferGeometry;
  positions: Float32Array;
  speeds: number[];
  mode: 'up' | 'down';
  material: THREE.PointsMaterial;
}

/** Animated atmosphere of one room; `dim` fades it out while the floor is sealed. */
export class RoomFx {
  private readonly hazes: { material: THREE.MeshBasicMaterial; opacity: number }[] = [];
  private readonly fields: ParticleField[] = [];
  private readonly flashers: { material: THREE.MeshBasicMaterial; timer: number; flash: number }[] =
    [];
  private readonly fires: THREE.Mesh[] = [];
  dim = 1;

  constructor(
    readonly kit: TowerKit,
    readonly group: THREE.Group,
    readonly dims: RoomDims,
  ) {}

  haze(y: number, z: number, width: number, height: number, color: number, opacity: number) {
    const material = new THREE.MeshBasicMaterial({
      map: this.kit.glowTexture,
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.group.add(plane(width, height, material, 0, y, z));
    this.hazes.push({ material, opacity });
  }

  rays(x: number, yTop: number, z: number, count: number, color: number) {
    for (let i = 0; i < count; i++) {
      const ray = new THREE.Mesh(
        new THREE.PlaneGeometry(0.25 + ((i * 37) % 10) * 0.045, 5.2),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.09,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      ray.position.set(x + (i - count / 2) * 0.55, yTop - 1.6, z);
      ray.rotation.z = 0.16 * (i - count / 2);
      this.group.add(ray);
    }
  }

  particles(count: number, color: number, size: number, mode: 'up' | 'down', speed: number) {
    const { IW, IH, ID, backZ } = this.dims;
    const positions = new Float32Array(count * 3);
    const speeds: number[] = [];
    const random = rng(count * 7 + 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (random() - 0.5) * IW * 2;
      positions[i * 3 + 1] = random() * IH;
      positions[i * 3 + 2] = backZ + random() * ID;
      speeds.push(speed * (0.6 + random() * 0.8));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: mode === 'up' ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    this.group.add(points);
    this.fields.push({ geometry, positions, speeds, mode, material });
  }

  /** Lightning / eruption flash washing over the back wall. */
  flasher(color: number) {
    const { IW, IH, backZ } = this.dims;
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.group.add(plane(IW * 2, IH, material, 0, IH / 2, backZ + 0.06));
    this.flashers.push({ material, timer: 1 + Math.random() * 4, flash: 0 });
  }

  brazier(x: number, z: number, scale: number) {
    const group = new THREE.Group();
    const iron = standard(0x1a1618, { metalness: 0.6, roughness: 0.5 });
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4 * scale, 0.22 * scale, 0.3 * scale, 12),
      iron,
    );
    bowl.position.set(x, 0.95 * scale, z);
    bowl.castShadow = true;
    group.add(bowl);
    for (const [lx, lz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03 * scale, 0.03 * scale, 0.95 * scale, 6),
        iron,
      );
      leg.position.set(x + lx * 0.2 * scale, 0.48 * scale, z + lz * 0.2 * scale);
      leg.rotation.x = lz * 0.12;
      leg.rotation.z = -lx * 0.12;
      group.add(leg);
    }
    const fire = new THREE.Mesh(
      new THREE.ConeGeometry(0.3 * scale, 0.62 * scale, 10),
      standard(0xff7a1a, { emissive: 0xff5a10, emissiveIntensity: 1.8, roughness: 0.5 }),
    );
    fire.position.set(x, 1.3 * scale, z);
    group.add(fire);
    group.add(this.kit.glow(x, 1.25 * scale, z, 2.8 * scale, 0.9, 0xff6a20));
    this.group.add(group);
    this.fires.push(fire);
  }

  update(dt: number, t: number, speed: number) {
    const { IW, IH } = this.dims;
    this.hazes.forEach((haze, i) => {
      haze.material.opacity = haze.opacity * this.dim * (0.8 + Math.sin(t * 0.8 + i) * 0.2);
    });
    for (const field of this.fields) {
      field.material.opacity = 0.85 * this.dim;
      const p = field.positions;
      for (let i = 0; i < field.speeds.length; i++) {
        if (field.mode === 'up') {
          p[i * 3 + 1] += field.speeds[i] * dt * speed;
          p[i * 3] += Math.sin(t * 2 + i) * dt * 0.3;
          if (p[i * 3 + 1] > IH) {
            p[i * 3 + 1] = 0.1;
            p[i * 3] = (Math.random() - 0.5) * IW * 2;
          }
        } else {
          p[i * 3 + 1] -= field.speeds[i] * dt * speed;
          if (p[i * 3 + 1] < 0.1) {
            p[i * 3 + 1] = IH;
            p[i * 3] = (Math.random() - 0.5) * IW * 2;
          }
        }
      }
      field.geometry.attributes.position.needsUpdate = true;
    }
    this.fires.forEach((fire, i) => {
      const flicker = 1 + Math.sin(t * (8 + i * 3)) * 0.14;
      fire.scale.set(flicker, 1 + Math.sin(t * 11 + i) * 0.2, flicker);
    });
    for (const flasher of this.flashers) {
      flasher.timer -= dt;
      if (flasher.timer <= 0) {
        flasher.timer = 2 + Math.random() * 5;
        flasher.flash = this.dim > 0.5 ? 0.9 : 0;
      }
      if (flasher.flash > 0) flasher.flash = Math.max(0, flasher.flash - dt * 4);
      flasher.material.opacity = flasher.flash * 0.5;
    }
  }
}
