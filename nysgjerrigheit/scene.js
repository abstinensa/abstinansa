import * as THREE from 'three';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const MOBILE = window.matchMedia('(max-width: 900px)').matches;

const BG = new THREE.Color('#fbfaf7');
const INK = new THREE.Color('#8b4513');

const IDEAS = [
    { ring: 0, angle: 0.35, word: 'spørsmål', line: 'Alt byrjar med eit godt spørsmål.', color: 0x8b4513, size: 0.11, rough: 0.32, metal: 0.42 },
    { ring: 0, angle: 2.45, word: 'tillit', line: 'Teknologi verkar når folk har tillit til ho.', color: 0x1c1612, size: 0.085, rough: 0.38, metal: 0.22 },
    { ring: 0, angle: 4.35, word: 'læring', line: 'Å lære er å våge å endre retning.', color: 0xe7d3bf, size: 0.095, rough: 0.24, metal: 0.06 },
    { ring: 1, angle: 1.05, word: 'idé', line: 'Ein idé er ein start, ikkje ein plan.', color: 0xc4a484, size: 0.105, rough: 0.3, metal: 0.28 },
    { ring: 1, angle: 3.35, word: 'menneske', line: 'AI skal tene menneske.', color: 0x6b3a22, size: 0.09, rough: 0.34, metal: 0.36 },
    { ring: 1, angle: 5.15, word: 'mot', line: 'Det modige er å prøve før ein veit.', color: 0x14110f, size: 0.072, rough: 0.22, metal: 0.62 },
    { ring: 2, angle: 0.85, word: 'mønster', line: 'Nysgjerrigheit er å sjå mønster i støyen.', color: 0xd9c4ae, size: 0.1, rough: 0.26, metal: 0.1 },
    { ring: 2, angle: 3.9, word: 'verdi', line: 'Verdi oppstår der teknologien møter kvardagen.', color: 0x8b4513, size: 0.078, rough: 0.3, metal: 0.48 }
];

const RINGS = [
    { radius: 1.28, tube: 0.026, rot: [Math.PI / 2, 0, 0.15], speed: 0.12, color: 0x3d2c24, metal: 0.8, rough: 0.28 },
    { radius: 1.62, tube: 0.02, rot: [0.42, 0.2, 0.15], speed: -0.08, color: 0x8b4513, metal: 0.64, rough: 0.34 },
    { radius: 1.96, tube: 0.016, rot: [1.2, 0.45, 0.55], speed: 0.055, color: 0x1a1410, metal: 0.72, rough: 0.3 }
];

const focusWord = document.getElementById('focusWord');
const caption = document.getElementById('caption');
let copyToken = 0;
let currentKey = '';

function webglAvailable() {
    try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2') || probe.getContext('webgl');
        const ok = !!gl;
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
        return ok;
    } catch {
        return false;
    }
}

function showFallback() {
    document.documentElement.classList.add('no-webgl');
    document.documentElement.dataset.scene = 'fallback';
}

function setCopy(word, line) {
    const key = word + '|' + line;
    if (key === currentKey) return;
    currentKey = key;
    const token = ++copyToken;
    focusWord.style.opacity = '0';
    caption.style.opacity = '0';
    window.setTimeout(() => {
        if (token !== copyToken) return;
        focusWord.textContent = word;
        caption.textContent = line;
        focusWord.style.opacity = '1';
        caption.style.opacity = '1';
    }, REDUCED ? 0 : 160);
}

function smoothstep(edge0, edge1, x) {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

function boot() {
    if (!webglAvailable()) {
        showFallback();
        return;
    }

    const canvas = document.getElementById('view');
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
    } catch {
        showFallback();
        return;
    }
    if (!renderer.getContext()) {
        showFallback();
        return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 1.75));

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(BG, 10, 20);

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
    const base = { x: 0, y: 0.42, z: 7.1, lookX: 0.16, lookY: 0.08 };

    scene.add(new THREE.HemisphereLight(0xfffaf5, 0xe6d8c8, 0.72));
    const key = new THREE.DirectionalLight(0xfff6ee, 1.65);
    key.position.set(-4.5, 6.2, 4.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xe7c3a4, 0.85);
    rim.position.set(4.2, 1.2, -3.6);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xf6efe6, 0.45);
    fill.position.set(1.5, -2.4, 3);
    scene.add(fill);
    const heart = new THREE.PointLight(0xc4784a, 1.1, 7, 2);
    scene.add(heart);

    const rig = new THREE.Group();
    scene.add(rig);

    const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.46, MOBILE ? 40 : 64, MOBILE ? 28 : 48),
        new THREE.MeshPhysicalMaterial({
            color: 0xf3eadf,
            roughness: 0.22,
            metalness: 0.04,
            clearcoat: 0.85,
            clearcoatRoughness: 0.18,
            sheen: 1,
            sheenColor: new THREE.Color(0xe0c2a6),
            sheenRoughness: 0.42,
            emissive: 0x8b4513,
            emissiveIntensity: 0.045
        })
    );
    rig.add(core);

    const bezelMat = new THREE.MeshPhysicalMaterial({
        color: 0x2a211c,
        metalness: 0.78,
        roughness: 0.28,
        clearcoat: 0.4,
        clearcoatRoughness: 0.35
    });
    const bezelA = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.016, 16, 96), bezelMat);
    bezelA.rotation.x = Math.PI / 2.35;
    const bezelB = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.012, 12, 80), bezelMat);
    bezelB.rotation.y = Math.PI / 2;
    rig.add(bezelA, bezelB);

    const hitGeo = new THREE.SphereGeometry(0.26, 12, 10);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const beadGeo = new THREE.SphereGeometry(1, MOBILE ? 20 : 28, MOBILE ? 16 : 22);
    const nodes = [];
    const spinners = [];

    RINGS.forEach((spec, index) => {
        const pivot = new THREE.Group();
        pivot.rotation.set(spec.rot[0], spec.rot[1], spec.rot[2]);
        const spinner = new THREE.Group();
        spinner.userData.speed = spec.speed;
        pivot.add(spinner);
        spinners.push(spinner);

        const torus = new THREE.Mesh(
            new THREE.TorusGeometry(spec.radius, spec.tube, MOBILE ? 12 : 20, MOBILE ? 96 : 160),
            new THREE.MeshPhysicalMaterial({
                color: spec.color,
                metalness: spec.metal,
                roughness: spec.rough,
                clearcoat: 0.35,
                clearcoatRoughness: 0.4
            })
        );
        spinner.add(torus);

        IDEAS.filter((idea) => idea.ring === index).forEach((idea) => {
            const hit = new THREE.Mesh(hitGeo, hitMat);
            hit.position.set(Math.cos(idea.angle) * spec.radius, Math.sin(idea.angle) * spec.radius, 0);
            const bead = new THREE.Mesh(
                beadGeo,
                new THREE.MeshPhysicalMaterial({
                    color: idea.color,
                    roughness: idea.rough,
                    metalness: idea.metal,
                    clearcoat: 0.7,
                    clearcoatRoughness: 0.22,
                    emissive: idea.color,
                    emissiveIntensity: 0.03
                })
            );
            bead.scale.setScalar(idea.size);
            hit.add(bead);
            hit.userData.idea = idea;
            hit.userData.bead = bead;
            spinner.add(hit);
            nodes.push(hit);
        });

        rig.add(pivot);
    });

    const shadeCanvas = document.createElement('canvas');
    shadeCanvas.width = shadeCanvas.height = 256;
    const shadeCtx = shadeCanvas.getContext('2d');
    const shade = shadeCtx.createRadialGradient(128, 128, 8, 128, 128, 124);
    shade.addColorStop(0, 'rgba(42, 33, 28, 0.16)');
    shade.addColorStop(1, 'rgba(42, 33, 28, 0)');
    shadeCtx.fillStyle = shade;
    shadeCtx.fillRect(0, 0, 256, 256);
    const shadeTex = new THREE.CanvasTexture(shadeCanvas);
    const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(4.6, 1.5),
        new THREE.MeshBasicMaterial({ map: shadeTex, transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);

    const dustCount = MOBILE ? 70 : 140;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
        const dir = new THREE.Vector3().randomDirection();
        const radius = 2.3 + Math.random() * 2.4;
        dir.multiplyScalar(radius);
        dustPositions[i * 3] = dir.x;
        dustPositions[i * 3 + 1] = dir.y * 0.72;
        dustPositions[i * 3 + 2] = dir.z;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(
        dustGeo,
        new THREE.PointsMaterial({
            color: 0x9a8170,
            size: MOBILE ? 0.03 : 0.022,
            transparent: true,
            opacity: 0.38,
            depthWrite: false,
            sizeAttenuation: true
        })
    );
    scene.add(dust);

    const maxPairs = (nodes.length * (nodes.length - 1)) / 2;
    const linePositions = new Float32Array(maxPairs * 2 * 3);
    const lineColors = new Float32Array(maxPairs * 2 * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    lineGeo.setDrawRange(0, 0);
    const lines = new THREE.LineSegments(
        lineGeo,
        new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false })
    );
    scene.add(lines);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const worldA = new THREE.Vector3();
    const worldB = new THREE.Vector3();
    let pointerInside = false;
    let dragging = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    let velX = 0;
    let velY = 0;
    let targetRotX = 0.2;
    let targetRotY = 0.46;
    let active = null;
    let running = true;
    let last = performance.now();
    let elapsed = 0;
    let parallaxX = 0;
    let parallaxY = 0;

    function layout() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const wide = w >= 900;
        camera.aspect = w / Math.max(h, 1);
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, wide ? 1.75 : 1.5));
        renderer.setSize(w, h, false);
        base.z = wide ? 6.85 : w < 520 ? 8.15 : 7.45;
        base.y = wide ? 0.38 : 0.62;
        base.lookX = wide ? 0.22 : 0;
        base.lookY = wide ? 0.02 : 0.22;
        rig.position.set(wide ? 0.95 : 0, wide ? 0.18 : 0.55, 0);
        shadow.position.set(rig.position.x, wide ? -1.55 : -1.28, 0.15);
        shadow.scale.set(wide ? 1 : 0.85, wide ? 1 : 0.85, 1);
        camera.position.set(base.x, base.y, base.z);
        camera.lookAt(base.lookX, base.lookY, 0);
    }

    function setActive(hit) {
        if (active === hit) return;
        if (active) {
            active.userData.bead.material.emissiveIntensity = 0.03;
        }
        active = hit;
        if (hit) {
            hit.userData.bead.material.emissiveIntensity = 0.38;
            const idea = hit.userData.idea;
            setCopy(idea.word, idea.line);
        }
        canvas.classList.toggle('is-hot', !!hit && !dragging);
    }

    function pick(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(nodes, false);
        return hits.length ? hits[0].object : null;
    }

    function onPointerDown(event) {
        if (event.button !== undefined && event.button !== 0) return;
        dragging = true;
        moved = false;
        lastX = event.clientX;
        lastY = event.clientY;
        velX = 0;
        velY = 0;
        canvas.classList.add('is-dragging');
        canvas.classList.remove('is-hot');
        canvas.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event) {
        pointerInside = true;
        if (dragging) {
            const dx = event.clientX - lastX;
            const dy = event.clientY - lastY;
            if (dx * dx + dy * dy > 9) moved = true;
            const scale = event.pointerType === 'touch' ? 0.007 : 0.005;
            targetRotY += dx * scale;
            targetRotX += dy * scale;
            targetRotX = Math.min(0.9, Math.max(-0.65, targetRotX));
            velY = dx * scale;
            velX = dy * scale;
            lastX = event.clientX;
            lastY = event.clientY;
            return;
        }
        if (FINE_POINTER) {
            const rect = canvas.getBoundingClientRect();
            parallaxX = ((event.clientX - rect.left) / rect.width - 0.5) * 0.38;
            parallaxY = ((event.clientY - rect.top) / rect.height - 0.5) * -0.22;
            setActive(pick(event.clientX, event.clientY));
        }
    }

    function onPointerUp(event) {
        if (!dragging) return;
        dragging = false;
        canvas.classList.remove('is-dragging');
        if (!moved) setActive(pick(event.clientX, event.clientY));
        else if (FINE_POINTER) setActive(pick(event.clientX, event.clientY));
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', () => {
        dragging = false;
        canvas.classList.remove('is-dragging');
    });
    canvas.addEventListener('pointerleave', () => {
        pointerInside = false;
        parallaxX = 0;
        parallaxY = 0;
        if (!dragging) canvas.classList.remove('is-hot');
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        running = false;
        showFallback();
    }, false);

    window.addEventListener('keydown', (event) => {
        const step = 0.18;
        if (event.key === 'ArrowLeft') targetRotY -= step;
        else if (event.key === 'ArrowRight') targetRotY += step;
        else if (event.key === 'ArrowUp') targetRotX -= step * 0.6;
        else if (event.key === 'ArrowDown') targetRotX += step * 0.6;
        targetRotX = Math.min(0.9, Math.max(-0.65, targetRotX));
    });

    window.addEventListener('resize', layout);
    layout();
    rig.rotation.x = targetRotX;
    rig.rotation.y = targetRotY;

    function connectNodes() {
        let vertex = 0;
        const pos = lineGeo.attributes.position.array;
        const col = lineGeo.attributes.color.array;
        for (let i = 0; i < nodes.length; i++) {
            nodes[i].getWorldPosition(worldA);
            for (let j = i + 1; j < nodes.length; j++) {
                nodes[j].getWorldPosition(worldB);
                const dist = worldA.distanceTo(worldB);
                const near = smoothstep(1.15, 0.42, dist);
                if (near < 0.08) continue;
                const color = BG.clone().lerp(INK, near);
                pos[vertex * 3] = worldA.x;
                pos[vertex * 3 + 1] = worldA.y;
                pos[vertex * 3 + 2] = worldA.z;
                col[vertex * 3] = color.r;
                col[vertex * 3 + 1] = color.g;
                col[vertex * 3 + 2] = color.b;
                vertex += 1;
                pos[vertex * 3] = worldB.x;
                pos[vertex * 3 + 1] = worldB.y;
                pos[vertex * 3 + 2] = worldB.z;
                col[vertex * 3] = color.r;
                col[vertex * 3 + 1] = color.g;
                col[vertex * 3 + 2] = color.b;
                vertex += 1;
            }
        }
        lineGeo.setDrawRange(0, vertex);
        lineGeo.attributes.position.needsUpdate = true;
        lineGeo.attributes.color.needsUpdate = true;
        lineGeo.computeBoundingSphere();
    }

    function frame(now) {
        if (!running) return;
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        elapsed += dt;

        if (!dragging) {
            const decay = Math.pow(0.04, dt);
            targetRotY += velY;
            targetRotX += velX;
            targetRotX = Math.min(0.9, Math.max(-0.65, targetRotX));
            velX *= decay;
            velY *= decay;
            if (!REDUCED && Math.hypot(velX, velY) < 0.004) targetRotY += dt * 0.14;
        }

        rig.rotation.x = targetRotX;
        rig.rotation.y = targetRotY;

        const spin = REDUCED ? 0 : 1;
        spinners.forEach((spinner) => {
            spinner.rotation.z += dt * spinner.userData.speed * spin;
        });

        const breathe = REDUCED ? 1 : 1 + Math.sin(elapsed * 0.7) * 0.018;
        core.scale.setScalar(breathe);
        heart.intensity = 0.85 + (REDUCED ? 0 : Math.sin(elapsed * 0.9) * 0.2);
        heart.position.copy(rig.position);

        if (!REDUCED) dust.rotation.y += dt * 0.03;

        nodes.forEach((hit) => {
            const goal = hit === active ? 1.38 : 1;
            const bead = hit.userData.bead;
            const next = bead.scale.x + (hit.userData.idea.size * goal - bead.scale.x) * Math.min(1, dt * 8);
            bead.scale.setScalar(next);
        });

        const follow = 1 - Math.pow(0.0015, dt);
        const aimX = pointerInside && FINE_POINTER ? parallaxX : 0;
        const aimY = pointerInside && FINE_POINTER ? parallaxY : 0;
        camera.position.x += (base.x + aimX - camera.position.x) * follow;
        camera.position.y += (base.y + aimY - camera.position.y) * follow;
        camera.position.z += (base.z - camera.position.z) * follow;
        camera.lookAt(base.lookX, base.lookY, 0);

        connectNodes();
        renderer.render(scene, camera);

        if (!document.documentElement.classList.contains('is-ready')) {
            document.documentElement.classList.add('is-ready');
            document.documentElement.dataset.scene = 'ready';
        }
        requestAnimationFrame(frame);
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            running = false;
            return;
        }
        if (!document.documentElement.classList.contains('no-webgl')) {
            running = true;
            last = performance.now();
            requestAnimationFrame(frame);
        }
    });

    requestAnimationFrame(frame);
}

boot();
