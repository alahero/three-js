import './styles.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const mount = document.querySelector('#scene');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07030b);
scene.fog = new THREE.Fog(0x07030b, 8, 22);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
mount.appendChild(renderer.domElement);

const fallbackCamera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
fallbackCamera.position.set(0, 2.4, 7);
fallbackCamera.lookAt(0, 0.6, 0);

let activeCamera = fallbackCamera;
let mixer;
let roulette;
let usesEmbeddedCamera = false;
const clock = new THREE.Clock();
const pointer = new THREE.Vector2();
const targetTilt = new THREE.Vector2();

const ambient = new THREE.AmbientLight(0xffebd1, 0.8);
scene.add(ambient);

const keyLight = new THREE.SpotLight(0xffd7a0, 7, 22, Math.PI * 0.2, 0.55, 1.2);
keyLight.position.set(-4.5, 6, 6);
keyLight.castShadow = true;
scene.add(keyLight);

const rimLight = new THREE.PointLight(0xff244d, 16, 12);
rimLight.position.set(4, 2.2, -3);
scene.add(rimLight);

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
loader.setDRACOLoader(dracoLoader);

loader.load(
  '/untitled.glb',
  (gltf) => {
    roulette = gltf.scene;
    const embeddedCamera = gltf.cameras?.find((camera) => camera.isCamera);

    roulette.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    if (embeddedCamera) {
      usesEmbeddedCamera = true;
      activeCamera = embeddedCamera;
    } else {
      centerModel(roulette);
    }

    scene.add(roulette);

    // Si el GLB no trae luces, estas luces de apoyo conservan el look del hero.
    if (hasEmbeddedLights(roulette)) {
      ambient.intensity = 0.18;
      keyLight.intensity = 2.2;
      rimLight.intensity = 5;
    }

    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(roulette);
      gltf.animations.forEach((clip) => {
        mixer.clipAction(clip).play();
      });
    }

    document.body.classList.add('is-loaded');
  },
  undefined,
  (error) => {
    console.error('The roulette GLB could not be loaded.', error);
    document.body.classList.add('is-loaded', 'has-error');
  },
);

window.addEventListener('pointermove', (event) => {
  pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
  pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
});

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  if (!usesEmbeddedCamera) {
    activeCamera.aspect = width / height;
    activeCamera.updateProjectionMatrix();
  }
});

function centerModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const largestAxis = Math.max(size.x, size.y, size.z);
  const scale = largestAxis > 0 ? 4.2 / largestAxis : 1;

  model.position.sub(center);
  model.scale.setScalar(scale);
  model.rotation.set(-0.08, -0.28, 0);
}

function hasEmbeddedLights(model) {
  let foundLight = false;
  model.traverse((object) => {
    if (object.isLight) {
      foundLight = true;
    }
  });
  return foundLight;
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  mixer?.update(delta);

  targetTilt.x += (pointer.x * 0.12 - targetTilt.x) * 0.035;
  targetTilt.y += (pointer.y * 0.08 - targetTilt.y) * 0.035;

  if (roulette && !usesEmbeddedCamera) {
    roulette.rotation.y += delta * 0.16;
    roulette.rotation.x = -0.08 + targetTilt.y;
    roulette.rotation.z = targetTilt.x;
    roulette.position.y = Math.sin(elapsed * 0.75) * 0.04;
  }

  rimLight.intensity = 13 + Math.sin(elapsed * 1.8) * 3;
  renderer.render(scene, activeCamera);
}

animate();
