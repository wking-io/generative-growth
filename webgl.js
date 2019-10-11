// Ensure ThreeJS is in global scope for the 'examples/'
global.THREE = require('three');

// Include any additional ThreeJS examples below
require('three/examples/js/controls/OrbitControls');

const canvasSketch = require('canvas-sketch');

const particleCount = 250;
const d = 600;
const r = d / 2;
const minDistance = 150;
const maxConnections = 10;

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

const maybeReverse = (buffer, direction, radius) => ({ pos, data, i }) =>
  pos[buffer(i)] < -radius || pos[buffer(i)] > radius
    ? (data.velocity[direction] = -data.velocity[direction])
    : null;

const maybeReverseX = maybeReverse(xBuffer, 'x', r);
const maybeReverseY = maybeReverse(yBuffer, 'y', r);
const maybeReverseZ = maybeReverse(zBuffer, 'z', r);

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
    new THREE.Mesh(new THREE.BoxBufferGeometry(d, d, d))
  );
  helper.material.color.setHex(0x101010);
  helper.material.blending = THREE.AdditiveBlending;
  helper.material.transparent = true;
  group.add(helper);

  const segments = particleCount * particleCount;
  const positions = new Float32Array(triple(segments));
  const colors = new Float32Array(triple(segments));

  const pMaterial = new THREE.PointsMaterial({
    color: 0x1e90ff,
    size: 4,
    blending: THREE.AdditiveBlending,
    transparent: true,
    sizeAttenuation: false,
  });

  const particles = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(triple(particleCount));
  const particlesData = [];

  for (let i = 0; i < particleCount; i++) {
    const x = Math.random() * d - r;
    const y = Math.random() * d - r;
    const z = Math.random() * d - r;
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
    for (let i = 0; i < particleCount; i++) {
      // get the particle
      const particleData = particlesData[i];
      particleData.numConnections = 0;
      const xIndex = xBuffer(i);
      const yIndex = yBuffer(i);
      const zIndex = zBuffer(i);

      // set the particle positions by adding the velocity
      particlePositions[xIndex] += particleData.velocity.x;
      particlePositions[yIndex] += particleData.velocity.y;
      particlePositions[zIndex] += particleData.velocity.z;

      const params = { pos: particlePositions, data: particleData, i };

      // If the y value is outside of the bounds of the box then reverse the velocity
      maybeReverseX(params);
      maybeReverseY(params);
      maybeReverseZ(params);

      // Check if a particle has the max number of connections and continue if it does
      if (particleData.numConnections >= maxConnections) continue;

      // Check collision
      for (let j = i + 1; j < particleCount; j++) {
        const x2Index = xBuffer(j);
        const y2Index = yBuffer(j);
        const z2Index = zBuffer(j);
        const particleDataB = particlesData[j];
        if (particleDataB.numConnections >= maxConnections) continue;
        const dx = particlePositions[xIndex] - particlePositions[x2Index];
        const dy = particlePositions[yIndex] - particlePositions[y2Index];
        const dz = particlePositions[zIndex] - particlePositions[z2Index];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < minDistance) {
          particleData.numConnections++;
          particleDataB.numConnections++;
          const alpha = 1.0 - dist / minDistance;
          positions[vertexpos++] = particlePositions[xIndex];
          positions[vertexpos++] = particlePositions[yIndex];
          positions[vertexpos++] = particlePositions[zIndex];
          positions[vertexpos++] = particlePositions[x2Index];
          positions[vertexpos++] = particlePositions[y2Index];
          positions[vertexpos++] = particlePositions[z2Index];
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
      animate();
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
