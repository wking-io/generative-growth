// Ensure ThreeJS is in global scope for the 'examples/'
global.THREE = require('three');

// Include any additional ThreeJS examples below
require('three/examples/js/controls/OrbitControls');

const canvasSketch = require('canvas-sketch');

const maxParticleCount = 1000;
const particleCount = 500;
const r = 700;
const rHalf = r / 2;
const effectController = {
  showDots: true,
  showLines: true,
  minDistance: 150,
  limitConnections: false,
  maxConnections: 20,
  particleCount: 500,
};

const settings = {
  // Make the loop animated
  animate: true,
  // Get a WebGL canvas rather than 2D
  context: 'webgl',
  // Turn on MSAA
  attributes: { antialias: true },
};

const xBuffer = i => i * 3;
const yBuffer = i => i * 3 + 1;
const zBuffer = i => i * 3 + 2;
const triple = x => x * 3;

const sketch = ({ context }) => {
  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    context,
  });

  // WebGL background color
  renderer.setClearColor('#102A43', 1);

  // Setup a camera
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    4000
  );
  camera.position.z = 1750;

  // Setup camera controller
  const controls = new THREE.OrbitControls(camera, context.canvas);

  // Setup your scene
  const scene = new THREE.Scene();
  const group = new THREE.Group();
  scene.add(group);

  // Helper box
  const helper = new THREE.BoxHelper(
    new THREE.Mesh(new THREE.BoxBufferGeometry(r, r, r))
  );
  helper.material.color.setHex(0x101010);
  helper.material.blending = THREE.AdditiveBlending;
  helper.material.transparent = true;
  group.add(helper);

  const segments = maxParticleCount * maxParticleCount;
  const positions = new Float32Array(triple(segments));
  const colors = new Float32Array(triple(segments));

  const pMaterial = new THREE.PointsMaterial({
    color: 0x1e90ff,
    size: 3,
    blending: THREE.AdditiveBlending,
    transparent: true,
    sizeAttenuation: false,
  });

  const particles = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(triple(maxParticleCount));
  const particlesData = [];

  for (let i = 0; i < maxParticleCount; i++) {
    const x = Math.random() * r - rHalf;
    const y = Math.random() * r - rHalf;
    const z = Math.random() * r - rHalf;
    particlePositions[xBuffer(i)] = x;
    particlePositions[yBuffer(i)] = y;
    particlePositions[zBuffer(i)] = z;
    // add it to the geometry
    particlesData.push({
      velocity: new THREE.Vector3(
        -1 + Math.random() * 2,
        -1 + Math.random() * 2,
        -1 + Math.random() * 2
      ),
      numConnections: 0,
    });
  }

  particles.setDrawRange(0, particleCount);
  particles.addAttribute(
    'position',
    new THREE.BufferAttribute(particlePositions, 3).setDynamic(true)
  );
  // create the particle system
  const pointCloud = new THREE.Points(particles, pMaterial);
  group.add(pointCloud);

  const geometry = new THREE.BufferGeometry();

  geometry.addAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3).setDynamic(true)
  );
  geometry.addAttribute(
    'color',
    new THREE.BufferAttribute(colors, 3).setDynamic(true)
  );

  geometry.computeBoundingSphere();
  geometry.setDrawRange(0, 0);

  const material = new THREE.LineBasicMaterial({
    vertexColors: THREE.VertexColors,
    blending: THREE.AdditiveBlending,
    transparent: true,
  });

  const linesMesh = new THREE.LineSegments(geometry, material);
  group.add(linesMesh);

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.gammaInput = true;
  renderer.gammaOutput = true;

  // Specify an ambient/unlit colour
  scene.add(new THREE.AmbientLight('#59314f'));

  // Add some light
  const light = new THREE.PointLight('#45caf7', 1, 15.5);
  light.position.set(2, 2, -4).multiplyScalar(1.5);
  scene.add(light);

  function animate() {
    let vertexpos = 0;
    let colorpos = 0;
    let numConnected = 0;
    for (let i = 0; i < particleCount; i++) particlesData[i].numConnections = 0;
    for (let i = 0; i < particleCount; i++) {
      // get the particle
      const particleData = particlesData[i];
      particlePositions[xBuffer(i)] += particleData.velocity.x;
      particlePositions[yBuffer(i)] += particleData.velocity.y;
      particlePositions[zBuffer(i)] += particleData.velocity.z;
      if (
        particlePositions[yBuffer(i)] < -rHalf ||
        particlePositions[yBuffer(i)] > rHalf
      )
        particleData.velocity.y = -particleData.velocity.y;
      if (
        particlePositions[xBuffer(i)] < -rHalf ||
        particlePositions[xBuffer(i)] > rHalf
      )
        particleData.velocity.x = -particleData.velocity.x;
      if (
        particlePositions[zBuffer(i)] < -rHalf ||
        particlePositions[zBuffer(i)] > rHalf
      )
        particleData.velocity.z = -particleData.velocity.z;
      if (
        effectController.limitConnections &&
        particleData.numConnections >= effectController.maxConnections
      )
        continue;
      // Check collision
      for (let j = i + 1; j < particleCount; j++) {
        const particleDataB = particlesData[j];
        if (
          effectController.limitConnections &&
          particleDataB.numConnections >= effectController.maxConnections
        )
          continue;
        const dx = particlePositions[xBuffer(i)] - particlePositions[j * 3];
        const dy = particlePositions[yBuffer(i)] - particlePositions[j * 3 + 1];
        const dz = particlePositions[zBuffer(i)] - particlePositions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < effectController.minDistance) {
          particleData.numConnections++;
          particleDataB.numConnections++;
          const alpha = 1.0 - dist / effectController.minDistance;
          positions[vertexpos++] = particlePositions[xBuffer(i)];
          positions[vertexpos++] = particlePositions[yBuffer(i)];
          positions[vertexpos++] = particlePositions[zBuffer(i)];
          positions[vertexpos++] = particlePositions[j * 3];
          positions[vertexpos++] = particlePositions[j * 3 + 1];
          positions[vertexpos++] = particlePositions[j * 3 + 2];
          colors[colorpos++] = alpha;
          colors[colorpos++] = alpha;
          colors[colorpos++] = alpha;
          colors[colorpos++] = alpha;
          colors[colorpos++] = alpha;
          colors[colorpos++] = alpha;
          numConnected++;
        }
      }
    }
    linesMesh.geometry.setDrawRange(0, numConnected * 2);
    linesMesh.geometry.attributes.position.needsUpdate = true;
    linesMesh.geometry.attributes.color.needsUpdate = true;
    pointCloud.geometry.attributes.position.needsUpdate = true;
  }

  return {
    // Handle resize events here
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight);
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
    },
    // Update & render your scene here
    render({ time }) {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    },
    // Dispose of events & renderer for cleaner hot-reloading
    unload() {
      controls.dispose();
      renderer.dispose();
    },
  };
};

canvasSketch(sketch, settings);
