import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/OrbitControls.js';

let framesSinceStart = 0;
let scene, camera, renderer, controls;
let guitarParts = [];
let explodeAmount = 0, targetExplode = 0;
let isInitialized = false;
let grabbedPart = null;
let raycaster = new THREE.Raycaster();
let isExploded = false;
let smoothedRawHand = null;


let lastRenderTime = 0;
const RENDER_INTERVAL = 1000 / 30;

let smoothedHandNdc = null;
let hoveredPart = null;
let modelDistance = 8;

const MODEL_SCALE = 100;
let EXPLODE_DISTANCE = MODEL_SCALE * 0.5;

// === TUNE THESE TWO IF NEEDED ===
const CAMERA_ZOOM = 1.2;        // lower = bigger looking model (was 2)
const GRAB_SIZE_THRESHOLD = 0.6; // parts bigger than this % of model are NOT grabbable (was 0.4)
// =================================

export function initGuitar3D(containerId) {
    const container = document.getElementById(containerId);
    if (!container || isInitialized) return;
    isInitialized = true;

    const w = container.clientWidth;
    const h = container.clientHeight;

    scene = new THREE.Scene();
    scene.background = null;

    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 1.0);
    fillLight.position.set(-5, 0, 5);
    scene.add(fillLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
    frontLight.position.set(0, 2, 10);
    scene.add(frontLight);

    const loader = new GLTFLoader();
    loader.load('guitar.glb', (gltf) => {
        console.log('GLB loaded successfully!');

        gltf.scene.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);
        scene.add(gltf.scene);

        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        modelDistance = maxDim * 1.2;
        EXPLODE_DISTANCE = maxDim * 0.5;

        camera.position.set(center.x, center.y, center.z + maxDim * CAMERA_ZOOM);
        camera.lookAt(center);

        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                child.userData.basePos = child.position.clone();
                child.userData.explodeDir = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                ).normalize();

                const meshBox = new THREE.Box3().setFromObject(child);
                const meshSize = meshBox.getSize(new THREE.Vector3()).length();
                child.userData.meshSize = meshSize;

                console.log(`Mesh: ${child.name || '(unnamed)'}, size ratio: ${(meshSize / maxDim).toFixed(3)}`);

                if (meshSize < maxDim * GRAB_SIZE_THRESHOLD) {
                    guitarParts.push(child);
                }
            }
        });
        console.log('Total grabbable parts:', guitarParts.length, '/ total meshes checked above');
    });

    window.addEventListener('resize', () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    requestAnimationFrame(animate);
}

function animate(now) {
    requestAnimationFrame(animate);
    if (now === undefined) now = 0;
    if (now - lastRenderTime < RENDER_INTERVAL) return;
    lastRenderTime = now;

    explodeAmount += (targetExplode - explodeAmount) * 0.04;

    if (targetExplode === 0 && Math.abs(explodeAmount) < 0.002) {
        explodeAmount = 0;
    }

    guitarParts.forEach(part => {
        if (part === grabbedPart) return;
        const base = part.userData.basePos;
        const dir = part.userData.explodeDir;
        part.position.set(
            base.x + dir.x * explodeAmount * EXPLODE_DISTANCE,
            base.y + dir.y * explodeAmount * EXPLODE_DISTANCE,
            base.z + dir.z * explodeAmount * EXPLODE_DISTANCE
        );
    });

    renderer.render(scene, camera);
}

export function setExplodeAmount(amount) {
    targetExplode = amount;
    isExploded = amount > 0.5;
}

export function rotateGuitar(deltaX, deltaY) {
    if (!scene || grabbedPart) return;
    scene.rotation.y += deltaX * 0.005;
    scene.rotation.x += deltaY * 0.005;
}


export function tryGrabPart(handX, handY, isGrabbing) {
    if (!scene || !camera || !renderer) return;
    framesSinceStart++;
    if (framesSinceStart < 10) return;

    if (!smoothedRawHand) {
        smoothedRawHand = { x: handX, y: handY };
    } else {
        smoothedRawHand.x += (handX - smoothedRawHand.x) * 0.25;
        smoothedRawHand.y += (handY - smoothedRawHand.y) * 0.25;
    }
    handX = smoothedRawHand.x;
    handY = smoothedRawHand.y;

    const container = renderer.domElement.parentElement;
    const canvasAspect = container.clientWidth / container.clientHeight;
    const videoAspect = 16 / 9;

    let adjX = handX, adjY = handY;
    if (canvasAspect > videoAspect) {
        const scale = videoAspect / canvasAspect;
        adjX = 0.5 + (handX - 0.5) * scale;
    } else {
        const scale = canvasAspect / videoAspect;
        adjY = 0.5 + (handY - 0.5) * scale;
    }

    const ndcX = (adjX * 2 - 1);
    const ndcY = -(adjY * 2 - 1);

    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const intersects = raycaster.intersectObjects(guitarParts, true);

    let bestHit = null;
    if (!grabbedPart && intersects.length > 0) {
        const closestDist = intersects[0].distance;
        const nearCandidates = intersects.filter(i => i.distance - closestDist < 2.0);
        bestHit = nearCandidates.reduce((smallest, current) =>
            current.object.userData.meshSize < smallest.object.userData.meshSize ? current : smallest
        , nearCandidates[0]);
    }

    if (!grabbedPart) {
        const newHover = bestHit ? bestHit.object : null;
        if (newHover !== hoveredPart) {
            if (hoveredPart?.material?.emissive) {
                hoveredPart.material.emissive.copy(hoveredPart.userData.originalEmissive || new THREE.Color(0x000000));
            }
            if (newHover?.material?.emissive) {
                newHover.userData.originalEmissive = newHover.material.emissive.clone();
                newHover.material.emissive = new THREE.Color(0x664400);
            }
            hoveredPart = newHover;
        }
    }

    if (isGrabbing) {
        if (bestHit && !grabbedPart) {
            grabbedPart = bestHit.object;
            if (grabbedPart.material?.emissive) {
                grabbedPart.material.emissive = new THREE.Color(0x2244ff);
            }
            hoveredPart = null;
        }

        if (grabbedPart) {
            const ray = raycaster.ray;
            const dist = modelDistance;
            const targetPos = new THREE.Vector3(
                ray.origin.x + ray.direction.x * dist,
                ray.origin.y + ray.direction.y * dist,
                ray.origin.z + ray.direction.z * dist
            );
            grabbedPart.parent.worldToLocal(targetPos);
            grabbedPart.position.lerp(targetPos, 0.12);
        }
    } else {
        if (grabbedPart) {
            if (grabbedPart.material?.emissive && grabbedPart.userData.originalEmissive) {
                grabbedPart.material.emissive.copy(grabbedPart.userData.originalEmissive);
            }
            grabbedPart = null;
        }
    }
}