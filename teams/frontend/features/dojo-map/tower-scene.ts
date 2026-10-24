/**
 * EduDOJO tower: a five-storey pagoda at dusk where every storey is an open fight room.
 * Ported from the Frontend-design repo's three.js prototype (r128) to three 0.160.
 * Each room shows its floor's battle map on the back wall and its guardian standing
 * inside; locked floors are sealed and dark, cleared floors show the guardian beaten.
 *
 * Plain three.js, no React: TowerMap.tsx owns the canvas and the HUD around it.
 */
import * as THREE from 'three';
import {
  box,
  canvasTexture,
  plane,
  rng,
  RoomFx,
  standard,
  TowerKit,
  type RoomDims,
} from './tower-kit';
import { RING, ROOMS, type RoomTheme } from './tower-rooms';

export type FloorState = 'locked' | 'current' | 'cleared';

/** A horizontal sprite strip (the fighters' idle clip). */
export interface TowerSprite {
  sheet: string;
  frames: number;
  fps: number;
  scale: number;
  feetY: number;
}

export interface TowerFloorSpec {
  theme: RoomTheme;
  map: string;
  villain: TowerSprite;
}

export interface TowerSceneOptions {
  /** Bottom floor first. */
  floors: TowerFloorSpec[];
  hero: TowerSprite;
  reducedMotion: boolean;
  /** Pointer over a floor (-1 when over nothing), with the pointer's client position. */
  onHover: (index: number, clientX: number, clientY: number) => void;
  /** Click or tap on a floor's opening. */
  onPick: (index: number) => void;
}

export interface TowerScene {
  setStates: (states: FloorState[]) => void;
  /** Fly the camera to a floor, or back to the whole tower with null. */
  focus: (index: number | null) => void;
  /** Pixels at the bottom of the canvas covered by HUD; the tower is framed above them. */
  setInsetBottom: (pixels: number) => void;
  dispose: () => void;
}

const W0 = 6.6;
const H0 = 4.4;
const ROOF_H = 0.62;
const STEP = H0 - 0.2 + 0.74;
const FIGHTER_SIZE = 2.5;
const FIGHTER_X = 1.1;
const FIGHTER_Z = 0.3;
/** three ≥0.155 uses physical light units; the prototype's values were tuned for r128. */
const LIGHT = Math.PI;

interface Fighter {
  pivot: THREE.Group;
  material: THREE.MeshBasicMaterial;
  texture: THREE.Texture;
  sprite: TowerSprite;
  flip: boolean;
}

interface FloorRuntime {
  room: THREE.Group;
  fx: RoomFx;
  light: THREE.PointLight;
  baseIntensity: number;
  trim: THREE.MeshStandardMaterial;
  panel: THREE.MeshBasicMaterial;
  seal: THREE.Group;
  villain: Fighter;
  state: FloorState;
  /** Camera target: centre of the opening. */
  cy: number;
  cz: number;
  sw: number;
  sh: number;
}

export function createTowerScene(
  canvas: HTMLCanvasElement,
  options: TowerSceneOptions,
): TowerScene {
  // The prototype's palette was authored for three r128, which did no colour management.
  const colorManagement = THREE.ColorManagement.enabled;
  THREE.ColorManagement.enabled = false;
  try {
    return buildTower(canvas, options, () => {
      THREE.ColorManagement.enabled = colorManagement;
    });
  } catch (error) {
    THREE.ColorManagement.enabled = colorManagement;
    throw error;
  }
}

function buildTower(
  canvas: HTMLCanvasElement,
  options: TowerSceneOptions,
  restore: () => void,
): TowerScene {
  const { floors, hero: heroSprite, reducedMotion } = options;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(0.7);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x4a2550, 90, 230);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 900);
  const kit = new TowerKit();
  const loader = new THREE.TextureLoader();

  buildBackdrop(scene, kit);
  buildGrounds(scene, kit);

  /* building materials */
  const plaster = standard(0xc7bca6, {
    roughness: 0.95,
    map: canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#d8ccb4';
      g.fillRect(0, 0, w, h);
      const random = rng(9);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = `rgba(${random() < 0.5 ? '90,70,50' : '255,255,255'},${0.03 + random() * 0.05})`;
        g.fillRect(random() * w, random() * h, 2 + random() * 5, 1 + random() * 2);
      }
    }),
  });
  const soffit = standard(0x1c1420, { roughness: 1 });
  const lacquer = standard(0x8f231e, { roughness: 0.45 });
  const beam = standard(0x5c1714, { roughness: 0.5 });
  const wood = standard(0x2e2026, { roughness: 0.9 });
  const darkWood = standard(0x241a22, { roughness: 0.9 });
  const gold = standard(0xd9a441, {
    roughness: 0.35,
    metalness: 0.5,
    emissive: 0x5a3a08,
    emissiveIntensity: 0.35,
  });
  const roof = standard(0xffffff, {
    roughness: 0.65,
    metalness: 0.05,
    map: canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#3a4370';
      g.fillRect(0, 0, w, h);
      const random = rng(7);
      for (let y = 0; y < h; y += 32)
        for (let x = 0; x < w; x += 32) {
          g.fillStyle = `hsl(228,${24 + random() * 8}%,${28 + random() * 9}%)`;
          g.fillRect(x + 1, y + 1, 30, 30);
          g.fillStyle = 'rgba(255,255,255,.1)';
          g.fillRect(x + 1, y + 1, 30, 4);
        }
      g.strokeStyle = '#12152c';
      g.lineWidth = 3;
      g.beginPath();
      for (let i = 0; i <= w; i += 32) {
        g.moveTo(i, 0);
        g.lineTo(i, h);
        g.moveTo(0, i);
        g.lineTo(w, i);
      }
      g.stroke();
    }),
  });
  const fascia = standard(0x6a1b17, { roughness: 0.6, side: THREE.DoubleSide });
  const shoji = standard(0xffe0a6, {
    emissive: 0xff9a4a,
    emissiveIntensity: 0.85,
    roughness: 0.9,
    map: canvasTexture(128, 128, (g, w, h) => {
      g.fillStyle = '#fff0d0';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#6a3b1e';
      g.lineWidth = 7;
      for (let i = 1; i < 4; i++) {
        g.beginPath();
        g.moveTo((w * i) / 4, 0);
        g.lineTo((w * i) / 4, h);
        g.stroke();
      }
      for (let j = 1; j < 5; j++) {
        g.beginPath();
        g.moveTo(0, (h * j) / 5);
        g.lineTo(w, (h * j) / 5);
        g.stroke();
      }
    }),
  });
  const sealTexture = canvasTexture(512, 72, (g, w, h) => {
    g.fillStyle = '#efe2c2';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#a3241c';
    g.lineWidth = 4;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#a3241c';
    g.font = 'bold 40px "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('封  印  ·  封  印  ·  封  印', w / 2, h / 2 + 2);
  });
  const sealMaterial = standard(0xffffff, {
    map: sealTexture,
    emissive: 0x3a2a1a,
    emissiveIntensity: 0.6,
    roughness: 0.9,
  });

  const topY = 0.7 + (floors.length - 1) * STEP + H0 - 0.2 + ROOF_H + 2.4;
  const tower = new THREE.Group();
  scene.add(tower);
  tower.add(box(W0 + 1.8, 0.6, W0 + 1.8, kit.silhouette, 0, 0.3, 0, true));
  const stone = standard(0x5e5670, { roughness: 0.95 });
  for (const [height, z] of [
    [0.45, 5.0],
    [0.3, 5.6],
    [0.15, 6.2],
  ]) {
    tower.add(box(4.8, height, 0.6, stone, 0, height / 2, z, true));
  }

  function fighter(sprite: TowerSprite, flip: boolean): Fighter {
    const texture = loader.load(sprite.sheet);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.repeat.set((flip ? -1 : 1) / sprite.frames, 1);
    texture.offset.x = flip ? 1 / sprite.frames : 0;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
    });
    const size = FIGHTER_SIZE * sprite.scale;
    const body = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
    body.position.y = size / 2 - (1 - sprite.feetY) * size;
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(size * 0.55, size * 0.18),
      new THREE.MeshBasicMaterial({
        map: kit.glowTexture,
        color: 0x000000,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.005;
    const pivot = new THREE.Group();
    pivot.add(shadow, body);
    return { pivot, material, texture, sprite, flip };
  }

  const runtimes: FloorRuntime[] = floors.map((spec, i) => {
    const w = W0;
    const h = H0;
    const sw = w - 1.3;
    const R = w / 2 + 1.05;
    const y0 = 0.7 + i * STEP;
    const eave = y0 + h - 0.2;
    const front = w / 2 - RING - 0.06;
    const ID = w * 0.52;
    const backZ = -ID;
    const IW = w / 2 - 0.1;
    const botBar = 0.34;
    const topBar = 0.6;
    const sh = h - topBar - botBar;
    const cyO = botBar + sh / 2;

    const shell = new THREE.Group();
    shell.position.y = y0;
    tower.add(shell);
    // Balcony band hides the roof peak of the floor below and ties the tiers together.
    shell.add(box(w + 0.8, 0.24, w + 0.8, darkWood, 0, -0.07, 0, true));
    shell.add(box(w + 0.95, 0.08, w + 0.95, beam, 0, -0.2, 0, true));
    shell.add(box(w + 0.5, 0.12, w + 0.5, wood, 0, 0.02, 0, true));
    shell.add(box(w, h, 0.25, plaster, 0, h / 2, backZ - 0.12, true));
    for (const side of [-1, 1]) {
      shell.add(
        box(0.2, h, ID + RING, plaster, side * (w / 2 - 0.08), h / 2, (front + backZ) / 2, true),
      );
      shell.add(
        box(
          0.05,
          h * 0.5,
          ID * 0.7,
          shoji,
          side * (w / 2 - 0.02),
          h * 0.5,
          (front + backZ) / 2,
          false,
          false,
        ),
      );
      shell.add(box(0.34, h, 0.34, lacquer, side * (w / 2 - 0.04), h / 2, front, true));
    }
    shell.add(box(w, 0.18, ID + RING, soffit, 0, h - 0.09, (front + backZ) / 2, true));
    const sideBar = (w - sw) / 2;
    const fz = front - RING / 2 + 0.06;
    shell.add(box(w, topBar, RING, plaster, 0, h - topBar / 2, fz, true));
    shell.add(box(w, botBar, RING, plaster, 0, botBar / 2, fz, true));
    for (const side of [-1, 1])
      shell.add(box(sideBar, sh, RING, plaster, side * (sw / 2 + sideBar / 2), cyO, fz, true));
    shell.add(box(w + 0.2, 0.2, w + 0.2, beam, 0, h - 0.12, 0, true));
    const trim = gold.clone();
    const tz = front + 0.04;
    shell.add(box(sw + 0.24, 0.11, 0.07, trim, 0, cyO + sh / 2 + 0.05, tz, false, false));
    shell.add(box(sw + 0.24, 0.11, 0.07, trim, 0, cyO - sh / 2 - 0.05, tz, false, false));
    for (const side of [-1, 1])
      shell.add(box(0.11, sh, 0.07, trim, side * (sw / 2 + 0.05), cyO, tz, false, false));

    /* room interior */
    const room = new THREE.Group();
    room.position.y = y0;
    tower.add(room);
    const dims: RoomDims = { sw, IW, IH: h, ID, front, backZ };
    const fx = new RoomFx(kit, room, dims);
    const lightSpec = ROOMS[spec.theme](fx);
    const light = new THREE.PointLight(
      lightSpec.color,
      lightSpec.intensity * LIGHT,
      lightSpec.distance,
      2,
    );
    light.position.set(0, y0 + h * 0.34, backZ + 0.6);
    scene.add(light);

    // The floor's battle map on the back wall, cropped to the wall's proportions.
    const panelW = IW * 2 - 0.2;
    const panelH = h - 0.2;
    const panel = new THREE.MeshBasicMaterial({ color: 0xffffff });
    room.add(plane(panelW, panelH, panel, 0, h / 2, backZ + 0.04));
    loader.load(spec.map, (texture) => {
      const image = texture.image as { width: number; height: number };
      const repeatX = Math.min(1, panelW / panelH / (image.width / image.height));
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.repeat.set(repeatX, 1);
      texture.offset.x = (1 - repeatX) / 2;
      panel.map = texture;
      panel.needsUpdate = true;
    });

    // Paper seal strips crossed over the opening while the floor is locked.
    const seal = new THREE.Group();
    seal.position.set(0, cyO, front + 0.1);
    for (const angle of [0.36, -0.36]) {
      const strip = plane(sw * 1.02, 0.42, sealMaterial, 0, 0, angle > 0 ? 0 : 0.01);
      strip.rotation.z = angle;
      seal.add(strip);
    }
    room.add(seal);

    const villain = fighter(spec.villain, true);
    villain.pivot.position.set(FIGHTER_X, 0.1, FIGHTER_Z);
    room.add(villain.pivot);

    /* roof */
    const roofGroup = new THREE.Group();
    roofGroup.position.y = eave;
    const curl = 0.95;
    const roofTop = new THREE.Mesh(roofGeometry(R, ROOF_H, curl, 0, false), roof);
    roofTop.castShadow = true;
    roofTop.receiveShadow = true;
    roofGroup.add(roofTop);
    roofGroup.add(new THREE.Mesh(roofGeometry(R, ROOF_H, curl, -0.24, true), soffit));
    const skirt = new THREE.Mesh(skirtGeometry(R, curl, 0.24), fascia);
    skirt.castShadow = true;
    roofGroup.add(skirt);
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      roofGroup.add(bell(kit, gold, sx * R, curl + 0.05, sz * R));
    }
    roofGroup.add(box(R * 0.5, 0.12, 0.16, beam, 0, ROOF_H + 0.02, 0, true));
    for (const end of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 6), gold);
      horn.position.set(end * R * 0.25, ROOF_H + 0.18, 0);
      horn.rotation.z = -end * 0.5;
      roofGroup.add(horn);
    }
    tower.add(roofGroup);
    const eaveLanterns = new THREE.Group();
    eaveLanterns.position.y = y0;
    for (let q = -1; q <= 1; q++)
      kit.lantern(eaveLanterns, q * w * 0.3, h + 0.05, front + 0.1, 0.2, 0xff6a4a, 0xff4a2a);
    tower.add(eaveLanterns);
    if (i === floors.length - 1) tower.add(finial(kit, gold, eave + ROOF_H));

    return {
      room,
      fx,
      light,
      baseIntensity: lightSpec.intensity * LIGHT,
      trim,
      panel,
      seal,
      villain,
      state: 'locked' as FloorState,
      cy: y0 + cyO,
      cz: front + 0.08,
      sw,
      sh,
    };
  });

  // Invisible planes over each opening for picking.
  const picks = runtimes.map((floor, i) => {
    const pick = new THREE.Mesh(
      new THREE.PlaneGeometry(floor.sw, floor.sh),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    pick.position.set(0, floor.cy, floor.cz);
    pick.userData.floor = i;
    scene.add(pick);
    return pick;
  });

  const hero = fighter(heroSprite, false);
  hero.pivot.position.set(-FIGHTER_X, 0.1, FIGHTER_Z);

  for (const [x, z, s, seed, flip] of [
    [-14, -3, 1.1, 1, 1],
    [14.5, -4, 1.15, 2, -1],
    [-24, 16, 1.3, 5, 1],
    [25, 18, 1.35, 6, -1],
    [-22, -22, 1.6, 3, 1],
    [22, -20, 1.55, 4, -1],
    [-40, -40, 2.0, 7, 1],
    [39, -42, 2.0, 8, -1],
  ]) {
    scene.add(mapleTree(kit, x, z, s, seed, flip));
  }
  const leaves = fallingLeaves(kit, reducedMotion ? 60 : 120);
  scene.add(leaves.points);

  /* lights */
  scene.add(new THREE.HemisphereLight(0xb89cff, 0x241730, 0.5 * LIGHT));
  const sun = new THREE.DirectionalLight(0xffb078, 1.05 * LIGHT);
  sun.position.set(-18, 30, 30);
  sun.target.position.set(0, 10, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -22,
    right: 22,
    top: 34,
    bottom: -8,
    near: 1,
    far: 120,
  });
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0x7a5cff, 0.4 * LIGHT);
  rim.position.set(18, 12, -16);
  scene.add(rim);

  /* camera */
  const view = { yaw: 0, pitch: 0.08, dist: 70, ty: topY * 0.46 };
  const goal = { ...view };
  let focused = -1;
  let hovered = -1;
  let pointerX = 0;
  let pointerY = 0;
  let viewWidth = 1;
  let viewHeight = 1;
  let insetBottom = 0;

  const tanHalf = () => Math.tan((camera.fov * Math.PI) / 360);
  /** Distance at which a width × height box fits the part of the canvas above the inset. */
  function fitDistance(width: number, height: number) {
    const freeShare = (viewHeight - insetBottom) / viewHeight;
    return Math.max(width / 2 / (tanHalf() * camera.aspect), height / 2 / (tanHalf() * freeShare));
  }
  function applyView() {
    camera.aspect = viewWidth / viewHeight;
    // Shift the projection so the scene's centre lands in the middle of the free area.
    if (insetBottom > 0)
      camera.setViewOffset(viewWidth, viewHeight, 0, insetBottom / 2, viewWidth, viewHeight);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  function setGoal() {
    if (focused < 0) {
      goal.dist = fitDistance(W0 + 8, topY + 4);
      goal.ty = topY * 0.46;
    } else {
      const floor = runtimes[focused];
      goal.dist = floor.cz + fitDistance(floor.sw / 0.72, floor.sh / 0.5);
      goal.ty = floor.cy - 0.15;
    }
  }
  function resize() {
    viewWidth = Math.max(1, canvas.clientWidth);
    viewHeight = Math.max(1, canvas.clientHeight);
    renderer.setSize(viewWidth, viewHeight, false);
    applyView();
    setGoal();
  }
  resize();
  view.dist = goal.dist;
  view.ty = goal.ty;
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  /* input */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function floorAt(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    );
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(picks, false)[0];
    return hit ? (hit.object.userData.floor as number) : -1;
  }
  let down: { x: number; y: number; pointerX: number } | null = null;
  let dragging = false;
  const onPointerDown = (event: PointerEvent) => {
    down = { x: event.clientX, y: event.clientY, pointerX };
    dragging = false;
    canvas.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (down) {
      if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) dragging = true;
      if (dragging)
        pointerX = Math.max(
          -1,
          Math.min(1, down.pointerX + ((event.clientX - down.x) / rect.width) * 2.6),
        );
      return;
    }
    if (event.pointerType !== 'mouse') return;
    pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    hovered = floorAt(event);
    canvas.style.cursor = hovered >= 0 ? 'pointer' : 'grab';
    options.onHover(hovered, event.clientX, event.clientY);
  };
  const onPointerUp = (event: PointerEvent) => {
    if (down && !dragging) {
      const floor = floorAt(event);
      if (floor >= 0) options.onPick(floor);
    }
    down = null;
  };
  const onPointerLeave = () => {
    hovered = -1;
    options.onHover(-1, 0, 0);
  };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);

  /* loop */
  const clock = new THREE.Clock();
  let t = 0;
  let frameRequest = 0;
  function animateFighter(fighter: Fighter, frozen: boolean) {
    const { frames, fps } = fighter.sprite;
    const frame = frozen ? 0 : Math.floor(t * fps) % frames;
    fighter.texture.offset.x = (fighter.flip ? frame + 1 : frame) / frames;
  }
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    const sway = reducedMotion ? 0 : Math.sin(t * 0.35) * 0.03;
    goal.yaw = (focused < 0 ? pointerX * 0.42 : pointerX * 0.16) + sway;
    goal.pitch = focused < 0 ? 0.08 - pointerY * 0.04 : 0.18 - pointerY * 0.03;
    const k = 1 - Math.exp(-dt * 5);
    view.yaw += (goal.yaw - view.yaw) * k;
    view.pitch += (goal.pitch - view.pitch) * k;
    view.dist += (goal.dist - view.dist) * k;
    view.ty += (goal.ty - view.ty) * k;
    const cosPitch = Math.cos(view.pitch);
    camera.position.set(
      Math.sin(view.yaw) * cosPitch * view.dist,
      view.ty + Math.sin(view.pitch) * view.dist,
      Math.cos(view.yaw) * cosPitch * view.dist,
    );
    camera.lookAt(0, view.ty, 0);

    const speed = reducedMotion ? 0.3 : 1;
    const pulse = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.4);
    runtimes.forEach((floor, i) => {
      const highlighted = i === hovered || i === focused;
      const lit =
        floor.state === 'locked' ? 0.18 : floor.state === 'current' ? 1 + 0.18 * pulse : 1;
      const lightTarget = floor.baseIntensity * lit * (highlighted ? 1.5 : 1);
      floor.light.intensity += (lightTarget - floor.light.intensity) * 0.15;
      const trimTarget = highlighted
        ? 1.1
        : floor.state === 'current'
          ? 0.45 + 0.6 * pulse
          : floor.state === 'cleared'
            ? 0.7
            : 0.2;
      floor.trim.emissiveIntensity += (trimTarget - floor.trim.emissiveIntensity) * 0.15;
      floor.fx.update(dt, t, speed);
      animateFighter(floor.villain, floor.state === 'cleared' || reducedMotion);
    });
    animateFighter(hero, reducedMotion);
    leaves.update(dt, t, speed);
    renderer.render(scene, camera);
    frameRequest = requestAnimationFrame(frame);
  }
  frameRequest = requestAnimationFrame(frame);

  return {
    setStates(states) {
      runtimes.forEach((floor, i) => {
        const state = states[i] ?? 'locked';
        const locked = state === 'locked';
        const cleared = state === 'cleared';
        floor.state = state;
        floor.seal.visible = locked;
        floor.fx.dim = locked ? 0.2 : 1;
        floor.panel.color.setHex(locked ? 0x2b2833 : 0xffffff);
        floor.villain.material.color.setHex(locked ? 0x000000 : cleared ? 0x8c8c8c : 0xffffff);
        // A beaten guardian lies on the floor, toppled away from the hero.
        floor.villain.pivot.rotation.z = cleared ? -1.38 : 0;
        floor.villain.pivot.position.x = cleared ? 0.15 : FIGHTER_X;
      });
      const current = states.indexOf('current');
      runtimes[current >= 0 ? current : runtimes.length - 1].room.add(hero.pivot);
    },
    focus(index) {
      focused = index ?? -1;
      setGoal();
    },
    setInsetBottom(pixels) {
      insetBottom = Math.max(0, Math.min(pixels, viewHeight * 0.7));
      applyView();
      setGoal();
    },
    dispose() {
      cancelAnimationFrame(frameRequest);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      disposeScene(scene);
      renderer.dispose();
      restore();
    },
  };
}

function disposeScene(scene: THREE.Scene) {
  const textures = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    for (const item of Array.isArray(material) ? material : material ? [material] : [])
      materials.add(item);
  });
  for (const material of materials) {
    for (const value of Object.values(material))
      if (value instanceof THREE.Texture) textures.add(value);
    material.dispose();
  }
  for (const texture of textures) texture.dispose();
}

function buildBackdrop(scene: THREE.Scene, kit: TowerKit) {
  const sky = canvasTexture(16, 1024, (g, w, h) => {
    const gradient = g.createLinearGradient(0, 0, 0, h);
    for (const [stop, color] of [
      [0, '#0d0726'],
      [0.4, '#2a1256'],
      [0.62, '#5a2375'],
      [0.76, '#a3406e'],
      [0.86, '#e25a4a'],
      [0.93, '#ff9a44'],
      [1, '#5a2340'],
    ] as const) {
      gradient.addColorStop(stop, color);
    }
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, h);
  });
  scene.add(plane(760, 180, new THREE.MeshBasicMaterial({ map: sky, fog: false }), 0, 74, -210));
  const stars = canvasTexture(2048, 360, (g, w, h) => {
    const random = rng(21);
    for (let i = 0; i < 520; i++) {
      const y = Math.pow(random(), 1.7) * h;
      g.fillStyle = `rgba(255,244,230,${(0.25 + 0.75 * (1 - y / h) * random()).toFixed(2)})`;
      const size = random() < 0.1 ? 2.4 : 1.3;
      g.fillRect(random() * w, y, size, size);
    }
  });
  const starPlane = plane(
    760,
    120,
    new THREE.MeshBasicMaterial({ map: stars, transparent: true, depthWrite: false, fog: false }),
    0,
    110,
    -205,
  );
  starPlane.renderOrder = -9;
  scene.add(starPlane);
  const sun = kit.glow(10, 14, -190, 200, 0.9);
  sun.material.fog = false;
  sun.renderOrder = -8;
  scene.add(sun);

  function range(seed: number, amplitude: number, top: string, bottom: string) {
    return canvasTexture(2048, 256, (g, w, h) => {
      const random = rng(seed);
      const phase = [random() * 6, random() * 6, random() * 6, random() * 6];
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) {
        const u = (x / w) * Math.PI * 2;
        const noise =
          Math.sin(u * 3 + phase[0]) * 0.45 +
          Math.sin(u * 7 + phase[1]) * 0.3 +
          Math.sin(u * 17 + phase[2]) * 0.15 +
          Math.sin(u * 41 + phase[3]) * 0.06;
        g.lineTo(x, h * 0.65 - noise * amplitude);
      }
      g.lineTo(w, h);
      g.closePath();
      const gradient = g.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, top);
      gradient.addColorStop(1, bottom);
      g.fillStyle = gradient;
      g.fill();
    });
  }
  for (const [texture, width, height, z, order] of [
    [range(3, 52, '#8a4a84', '#d1655a'), 620, 78, -168, -7],
    [range(11, 64, '#5a3080', '#9a4a74'), 500, 60, -120, -5],
    [range(17, 58, '#321e5a', '#64386e'), 400, 46, -86, -4],
  ] as const) {
    const layer = plane(
      width,
      height,
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
      0,
      -2 + height / 2,
      z,
    );
    layer.renderOrder = order;
    scene.add(layer);
  }
}

function buildGrounds(scene: THREE.Scene, kit: TowerKit) {
  const groundTexture = canvasTexture(
    512,
    512,
    (g, w, h) => {
      g.fillStyle = '#1c1228';
      g.fillRect(0, 0, w, h);
      const random = rng(5);
      const colors = ['#271838', '#150d22', '#2e2042', '#2a1a26', '#331f28'];
      for (let i = 0; i < 3200; i++) {
        g.fillStyle = colors[i % colors.length];
        const size = 1 + random() * 3;
        g.fillRect(random() * w, random() * h, size * 1.7, size);
      }
    },
    [80, 80],
  );
  const ground = plane(900, 900, standard(0xffffff, { map: groundTexture, roughness: 1 }), 0, 0, 0);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const pathTexture = canvasTexture(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = '#332b42';
      g.fillRect(0, 0, w, h);
      const random = rng(31);
      for (let y = 0; y < h; y += 64)
        for (let x = 0; x < w; x += 64) {
          g.fillStyle = `hsl(270,${7 + random() * 8}%,${38 + random() * 12}%)`;
          g.fillRect(x + 4, y + 4, 56, 56);
        }
    },
    [1, 16],
  );
  const path = plane(
    4.4,
    70,
    standard(0xffffff, { map: pathTexture, roughness: 0.95 }),
    0,
    0.012,
    42,
  );
  path.rotation.x = -Math.PI / 2;
  path.receiveShadow = true;
  scene.add(path);

  const stone = standard(0x5e5670, { roughness: 0.95 });
  const lamp = standard(0xffd9a0, { emissive: 0xff9a3a, emissiveIntensity: 1.3, roughness: 0.6 });
  for (const [x, z] of [
    [-2.9, 9],
    [2.9, 9],
    [-2.9, 15],
    [2.9, 15],
  ]) {
    const toro = new THREE.Group();
    toro.position.set(x, 0, z);
    toro.add(box(0.7, 0.18, 0.7, stone, 0, 0.09, 0, true));
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.9, 8), stone);
    post.position.y = 0.63;
    post.castShadow = true;
    toro.add(post);
    toro.add(box(0.62, 0.12, 0.62, stone, 0, 1.14, 0, true));
    toro.add(box(0.46, 0.4, 0.46, lamp, 0, 1.4, 0));
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.36, 4), stone);
    cap.rotation.y = Math.PI / 4;
    cap.position.y = 1.78;
    cap.castShadow = true;
    toro.add(cap);
    toro.add(kit.glow(0, 1.4, 0, 3.2, 0.8, 0xff9a3a));
    scene.add(toro);
  }
}

/** Curved pagoda roof: a square sheet with drooping middle and upturned corners. */
function roofGeometry(R: number, H: number, curl: number, offset: number, flip: boolean) {
  const N = 30;
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  for (let j = 0; j <= N; j++)
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const v = j / N;
      const x = (u * 2 - 1) * R;
      const z = (v * 2 - 1) * R;
      const xn = Math.abs(x) / R;
      const zn = Math.abs(z) / R;
      const d = Math.max(xn, zn);
      positions.push(x, H * Math.pow(1 - d, 1.4) + curl * Math.pow(xn * zn, 1.7) + offset, z);
      uvs.push(u * 12, v * 12);
    }
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const a = j * (N + 1) + i;
      const b = a + 1;
      const c = a + N + 1;
      const e = c + 1;
      if (flip) index.push(a, b, c, b, e, c);
      else index.push(a, c, b, b, c, e);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

function skirtGeometry(R: number, curl: number, height: number) {
  const N = 24;
  const loop: [number, number][] = [];
  for (let k = 0; k < N; k++) loop.push([-R + (2 * R * k) / N, -R]);
  for (let k = 0; k < N; k++) loop.push([R, -R + (2 * R * k) / N]);
  for (let k = 0; k < N; k++) loop.push([R - (2 * R * k) / N, R]);
  for (let k = 0; k < N; k++) loop.push([-R, R - (2 * R * k) / N]);
  const positions: number[] = [];
  const index: number[] = [];
  for (const [x, z] of loop) {
    const y = curl * Math.pow(((Math.abs(x) / R) * Math.abs(z)) / R, 2.5);
    positions.push(x, y, z, x, y - height, z);
  }
  for (let k = 0; k < loop.length; k++) {
    const a = k * 2;
    const b = ((k + 1) % loop.length) * 2;
    index.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

function bell(kit: TowerKit, gold: THREE.Material, x: number, y: number, z: number) {
  const group = new THREE.Group();
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.26, 5), gold);
  chain.position.set(x, y - 0.13, z);
  group.add(chain);
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 10),
    standard(0xff8a3d, { emissive: 0xff6a1a, emissiveIntensity: 1.3, roughness: 0.4 }),
  );
  body.position.set(x, y - 0.36, z);
  group.add(body);
  group.add(kit.glow(x, y - 0.36, z, 1.0, 0.7, 0xff8a3d));
  return group;
}

/** Golden spire with rings on top of the last roof. */
function finial(kit: TowerKit, gold: THREE.Material, y: number) {
  const group = new THREE.Group();
  group.position.y = y;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.4, 8), gold);
  pole.position.y = 1.1;
  group.add(pole);
  for (let k = 0; k < 6; k++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4 - 0.045 * k, 0.05, 8, 20), gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.45 + 0.26 * k;
    group.add(ring);
  }
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12), gold);
  orb.position.y = 0.12;
  orb.scale.y = 0.8;
  group.add(orb);
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.15, 0.6, 10),
    standard(0xffd45a, {
      emissive: 0xff9a2a,
      emissiveIntensity: 0.9,
      metalness: 0.4,
      roughness: 0.3,
    }),
  );
  tip.position.y = 2.6;
  group.add(tip);
  group.add(kit.glow(0, 2.6, 0, 2.2, 0.8, 0xffd45a));
  return group;
}

const trunkMaterial = () => standard(0x2e1a28, { roughness: 1 });

function mapleTree(kit: TowerKit, x: number, z: number, scale: number, seed: number, flip: number) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  const random = rng(seed);
  const bark = trunkMaterial();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 7.4, 8), bark);
  trunk.position.y = 3.7;
  trunk.rotation.z = -0.07 * flip;
  group.add(trunk);
  for (const [bx, by, bz] of [
    [0.9 * flip, 6.6, -0.9],
    [-0.8 * flip, 7.1, 0.7],
    [0.2 * flip, 7.6, -0.2],
  ]) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, 2.9, 6), bark);
    branch.position.set(bx, by, 0);
    branch.rotation.z = bz * flip;
    group.add(branch);
  }
  const foliage = [
    ['#ff8a2b', '#f26a1f', '#ffb347', '#e5472a'],
    ['#d9302a', '#b3222a', '#f0502f', '#e5472a'],
    ['#ff9bb5', '#ff7a9c', '#ffc1d3', '#f06a8a'],
  ].map(
    (colors, k) =>
      new THREE.SpriteMaterial({ map: kit.blobTexture(colors, 41 + k), transparent: true }),
  );
  for (let i = 0; i < 34; i++) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random());
    const leafBlob = new THREE.Sprite(foliage[Math.floor(random() * 3)]);
    leafBlob.position.set(
      Math.cos(angle) * distance * 4.6,
      8.4 + Math.sin(angle) * distance * 2.9 + random() * 0.6,
      (random() - 0.5) * 4.2,
    );
    const size = 2.8 + random() * 2;
    leafBlob.scale.set(size, size, 1);
    group.add(leafBlob);
  }
  return group;
}

function fallingLeaves(kit: TowerKit, count: number) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const motion: [number, number, number][] = [];
  const random = rng(99);
  const palette = [
    [1, 0.54, 0.17],
    [0.85, 0.19, 0.16],
    [1, 0.7, 0.28],
    [1, 0.6, 0.72],
  ];
  for (let i = 0; i < count; i++) {
    positions.set([(random() - 0.5) * 80, random() * 48, -18 + random() * 46], i * 3);
    colors.set(palette[i % 4], i * 3);
    motion.push([0.5 + random() * 0.9, random() * 6.28, 0.4 + random() * 0.7]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      map: kit.leafTexture,
      size: 0.32,
      vertexColors: true,
      transparent: true,
      alphaTest: 0.08,
      depthWrite: false,
    }),
  );
  points.frustumCulled = false;
  return {
    points,
    update(dt: number, t: number, speed: number) {
      motion.forEach(([fall, phase, wobble], i) => {
        positions[i * 3 + 1] -= fall * dt * speed;
        positions[i * 3] += Math.sin(t * wobble + phase) * dt * 0.9 * speed;
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 46 + Math.random() * 4;
          positions[i * 3] = (Math.random() - 0.5) * 80;
        }
      });
      geometry.attributes.position.needsUpdate = true;
    },
  };
}
