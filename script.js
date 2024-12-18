// Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Audio Setup
const audioContext = new(window.AudioContext || window.webkitAudioContext)();
let analyser, audioData;

// Load and Analyze Audio
document.getElementById('audioInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            audioContext.decodeAudioData(e.target.result, (buffer) => {
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                analyser = audioContext.createAnalyser();
                source.connect(analyser);
                analyser.connect(audioContext.destination);
                analyser.fftSize = 256;
                audioData = new Uint8Array(analyser.frequencyBinCount);
                source.start();
            });
        };
        reader.readAsArrayBuffer(file);
    }
});

// Hologram Shader Material
const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x00ffff) },
        audioStrength: { value: 0 }
    },
    vertexShader: `
        uniform float time;
        uniform float audioStrength;
        varying vec3 vPosition;
        void main() {
            vPosition = position;
            vec3 transformed = position;
            transformed.z += sin(position.x * 5.0 + time * 5.0) * audioStrength * 0.5;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        uniform float audioStrength;
        varying vec3 vPosition;
        void main() {
            float dist = length(vPosition.xy);
            float alpha = smoothstep(1.5, 0.5, dist) * (1.0 + 0.5 * audioStrength);
            gl_FragColor = vec4(color * (1.0 + audioStrength), alpha);
        }
    `,
    transparent: true
});

// Hologram Object
const geometry = new THREE.TorusKnotGeometry(2, 0.3, 100, 16);
const hologram = new THREE.Mesh(geometry, shaderMaterial);
scene.add(hologram);

// Particle System
let particleCount = 2000;
const particlesGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount * 3; i++) {
    particlePositions[i] = (Math.random() - 0.5) * 15;
}
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

const particleMaterial = new THREE.PointsMaterial({
    color: 0x00ffff,
    size: 0.05,
    transparent: true,
    opacity: 0.8
});
const particles = new THREE.Points(particlesGeometry, particleMaterial);
scene.add(particles);

// UI Interaction
const colorPicker = document.getElementById('colorPicker');
colorPicker.addEventListener('input', () => {
    shaderMaterial.uniforms.color.value.set(colorPicker.value);
    particleMaterial.color.set(colorPicker.value);
});

const particleDensitySlider = document.getElementById('particleDensity');
particleDensitySlider.addEventListener('input', () => {
    particleCount = parseInt(particleDensitySlider.value);
    const newPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
        newPositions[i] = (Math.random() - 0.5) * 15;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
});

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    // Update Shader
    shaderMaterial.uniforms.time.value += 0.01;

    // Update Audio Data
    if (analyser) {
        analyser.getByteFrequencyData(audioData);
        const audioStrength = Math.max(...audioData) / 255;
        shaderMaterial.uniforms.audioStrength.value = audioStrength;
    }

    // Rotate Hologram
    hologram.rotation.y += 0.01;

    // Rotate Particles
    particles.rotation.y += 0.002;

    renderer.render(scene, camera);
}
animate();

// Resize Event
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});