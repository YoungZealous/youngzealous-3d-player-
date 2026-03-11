import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { CONFIG } from './Config.js';
import { Fighter, FighterState } from './Fighter.js';
import { InputManager } from './InputManager.js';
import { UI } from './UI.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87ceeb, 10, 50);
        
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 2, 8);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        document.body.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this.timer = 99;
        this.isGameOver = false;
        this.roundInProgress = false;
        this.totalRounds = 4;
        this.currentRound = 1;
        this.roundWins = { p1: 0, p2: 0 };
        this.roundTransitionActive = false;
        this.roundEndPlaybackMs = 1300;
        this.rotationDebugEnabled = false;
        this.isPaused = false;
        this.musicVolume = 1;
        this.sfxVolume = 1;
        this.bgAudio = null;
        this.bgAudioUnlocked = false;
        this.cinematicAttack = null;
        this.shakeTimer = 0;
        this.shakeIntensity = 0.18;
        this.impactParticles = [];
        this.shockwaves = [];
        this.fireballs = [];
        this.previousFighterDeltaX = null;
        this.jumpOverDelayCooldown = 0;
        this.sideSwapGraceTimer = 0;
        this.aiDifficultyLevels = ['EASY', 'NORMAL', 'HARD', 'EXPERT', 'VETERAN'];
        this.aiDifficultyIndex = 1;
        this.hitAudio = {
            thud: new Audio('assets/thud.mp3'),
            crunch: new Audio('assets/bone-crunch.mp3'),
            kickA: new Audio('./punch to gut impactRecord (online-voice-recorder.com) (2).mp3'),
            kickB: new Audio('./punch to gut impactRecord (online-voice-recorder.com) (3).mp3')
        };
        this.hitAudio.thud.volume = 0.65;
        this.hitAudio.crunch.volume = 0.6;
        this.hitAudio.kickA.volume = 0.85;
        this.hitAudio.kickB.volume = 0.85;
        this.initBackgroundAudio();
        
        // Character Selection State
        this.isSelecting = true;
        this.gameMode = 'multiplayer';
        this.selectionFocus = 'mode';
        this.aiSelectStage = 'p1';
        this.p1Index = 0;
        this.p2Index = 0;
        this.p1Ready = false;
        this.p2Ready = false;

        this.initLights();
        this.initEnvironment();
        
        this.ui = new UI();
        this.ui.setSelectionActions({
            onToggleMode: () => {
                if (!this.isSelecting) return;
                this.gameMode = this.gameMode === 'ai' ? 'multiplayer' : 'ai';
                this.aiSelectStage = 'p1';
                this.selectionFocus = 'mode';
                this.input.applySelectionModeRules();
            },
            onAdjustAIDifficulty: (delta) => {
                if (!this.isSelecting || this.gameMode !== 'ai') return;
                this.adjustAIDifficulty(delta);
                this.selectionFocus = 'difficulty';
            },
            onSetAIDifficulty: (index) => {
                if (!this.isSelecting || this.gameMode !== 'ai') return;
                this.setAIDifficulty(index);
                this.selectionFocus = 'difficulty';
            },
            onPickCharacter: (player, index) => {
                if (!this.isSelecting) return;
                if (this.gameMode === 'ai') {
                    if (this.aiSelectStage === 'p1') {
                        if (player !== 'p1') return;
                        this.p1Index = index;
                        this.p1Ready = false;
                        return;
                    }

                    if (this.aiSelectStage === 'p2') {
                        if (player !== 'p2') return;
                        this.p2Index = index;
                        this.p2Ready = false;
                        return;
                    }
                }

                if (player === 'p1') {
                    this.p1Index = index;
                    this.p1Ready = false;
                    if (this.gameMode === 'ai' && this.p2Index === this.p1Index) {
                        this.p2Index = (this.p1Index + 1) % CONFIG.ASSETS.CHARACTERS.length;
                    }
                    return;
                }

                if (this.gameMode === 'ai') return;
                this.p2Index = index;
                this.p2Ready = false;
            }
        });
        this.ui.setGameOverActions(() => this.resetMatch(), () => this.quitToSelection());
        this.ui.setPauseActions({
            onResume: () => this.togglePause(false),
            onRestart: () => {
                this.togglePause(false);
                this.resetMatch();
            },
            onQuit: () => {
                this.togglePause(false);
                this.quitToSelection();
            },
            onMusic: (v) => this.setMusicVolume(v),
            onSfx: (v) => this.setSfxVolume(v),
            onAdjustAIDifficulty: (delta) => {
                if (this.gameMode !== 'ai') return;
                this.adjustAIDifficulty(delta);
            },
            onSetAIDifficulty: (index) => {
                if (this.gameMode !== 'ai') return;
                this.setAIDifficulty(index);
            }
        });
        this.ui.setPauseSliders(this.musicVolume, this.sfxVolume);
        this.input = new InputManager(this);

        window.addEventListener('resize', () => this.onResize());
        this.animate();
    }

    initBackgroundAudio() {
        const src = CONFIG.ASSETS.MAP_BG_SOUND;
        if (!src) return;

        this.bgAudio = new Audio(src);
        this.bgAudio.preload = 'auto';
        this.bgAudio.loop = true;
        this.bgAudio.volume = this.musicVolume;

        const unlock = () => {
            this.bgAudioUnlocked = true;
            this.tryPlayBackgroundAudio();
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('touchstart', unlock);
        };

        window.addEventListener('keydown', unlock, { once: true });
        window.addEventListener('pointerdown', unlock, { once: true });
        window.addEventListener('touchstart', unlock, { once: true });
    }

    tryPlayBackgroundAudio() {
        if (!this.bgAudio || !this.bgAudioUnlocked) return;
        if (this.bgAudio.paused) {
            this.bgAudio.play().catch(() => {});
        }
    }

    initLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffffff, 1.2);
        sun.position.set(5, 10, 5);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;
        this.scene.add(sun);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
        backLight.position.set(-5, 5, -5);
        this.scene.add(backLight);

        // Add tone mapping for better color handling
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
    }

    initEnvironment() {
        const bgLoader = new THREE.TextureLoader();
        bgLoader.load(CONFIG.ASSETS.BACKGROUND, (texture) => {
            const bgGeo = new THREE.PlaneGeometry(32, 18);
            const bgMat = new THREE.MeshBasicMaterial({ map: texture });
            const bg = new THREE.Mesh(bgGeo, bgMat);
            bg.position.z = -5;
            bg.position.y = 5;
            this.legacyBackground = bg;
            this.scene.add(bg);
        });

        const floorGeo = new THREE.PlaneGeometry(50, 20);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x443322 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.legacyFloor = floor;
        this.scene.add(floor);

        this.tryLoadArenaMap();
    }

    getArenaCandidates() {
        const base = CONFIG.ASSETS.ARENA_MAP;
        if (!base) return [];
        return [
            base,
            `${base}.glb`,
            `${base}.gltf`,
            `${base}.fbx`
        ];
    }

    finalizeArenaMap(root) {
        if (!root) return;
        const box = new THREE.Box3().setFromObject(root);
        if (!Number.isFinite(box.min.x) || !Number.isFinite(box.max.x)) return;

        const center = box.getCenter(new THREE.Vector3());
        root.position.x -= center.x;
        root.position.z -= center.z;
        root.position.y -= box.min.y;

        const size = box.getSize(new THREE.Vector3());
        if (size.x > 0) {
            const targetWidth = 24;
            const s = THREE.MathUtils.clamp(targetWidth / size.x, 0.03, 5);
            root.scale.setScalar(s);
            const post = new THREE.Box3().setFromObject(root);
            root.position.y -= post.min.y;
        }

        root.traverse((child) => {
            if (!child.isMesh) return;
            child.castShadow = true;
            child.receiveShadow = true;
        });

        this.scene.add(root);
        this.arenaMap = root;

        if (this.legacyBackground) this.legacyBackground.visible = false;
        if (this.legacyFloor) this.legacyFloor.visible = false;
    }

    tryLoadArenaMap() {
        const candidates = this.getArenaCandidates();
        if (candidates.length === 0) return;

        const gltfLoader = new GLTFLoader();
        const fbxLoader = new FBXLoader();

        const tryIndex = (i) => {
            if (i >= candidates.length) return;
            const src = candidates[i];
            const lower = src.toLowerCase();

            if (lower.endsWith('.fbx')) {
                fbxLoader.load(
                    src,
                    (fbx) => this.finalizeArenaMap(fbx),
                    undefined,
                    () => tryIndex(i + 1)
                );
                return;
            }

            gltfLoader.load(
                src,
                (gltf) => this.finalizeArenaMap(gltf.scene || gltf.scenes?.[0]),
                undefined,
                () => {
                    if (!lower.endsWith('.glb') && !lower.endsWith('.gltf')) {
                        fbxLoader.load(
                            src,
                            (fbx) => this.finalizeArenaMap(fbx),
                            undefined,
                            () => tryIndex(i + 1)
                        );
                    } else {
                        tryIndex(i + 1);
                    }
                }
            );
        };

        tryIndex(0);
    }

    startMatch() {
        this.isSelecting = false;
        this.ui.hideSelection();
        this.ui.hideGameOver();
        this.tryPlayBackgroundAudio();
        
        const chars = CONFIG.ASSETS.CHARACTERS;
        if (this.p1) this.scene.remove(this.p1);
        if (this.p2) this.scene.remove(this.p2);

        this.p1 = new Fighter(1, chars[this.p1Index]);
        this.p1.position.x = -3;
        this.p1.game = this;
        this.scene.add(this.p1);

        this.p2 = new Fighter(2, chars[this.p2Index]);
        this.p2.position.x = 3;
        this.p2.game = this;
        this.scene.add(this.p2);

        this.input.setFighters(this.p1, this.p2);
        this.p1.setSfxVolume(this.sfxVolume);
        this.p2.setSfxVolume(this.sfxVolume);
        this.ui.setAIDifficultyUI(this.aiDifficultyLevels, this.aiDifficultyIndex, this.gameMode === 'ai', this.selectionFocus);
        this.ui.setPlayerNames(chars[this.p1Index].name, chars[this.p2Index].name);
        this.applyRotationDebugState();

        this.currentRound = 1;
        this.roundWins = { p1: 0, p2: 0 };
        this.timer = 99;
        this.resetFightersForRound();
        this.ui.setRound(this.currentRound, this.totalRounds);
        this.startRoundIntro();
    }

    resetFightersForRound() {
        if (!this.p1 || !this.p2) return;
        this.p1.health = CONFIG.FIGHTER.HEALTH;
        this.p2.health = CONFIG.FIGHTER.HEALTH;
        this.p1.state = FighterState.IDLE;
        this.p2.state = FighterState.IDLE;
        this.p1.hitboxActive = false;
        this.p2.hitboxActive = false;
        this.p1.velocity.set(0, 0, 0);
        this.p2.velocity.set(0, 0, 0);
        this.p1.isGrounded = true;
        this.p2.isGrounded = true;
        this.p1.position.set(-3, 0, 0);
        this.p2.position.set(3, 0, 0);
        this.previousFighterDeltaX = this.p2.position.x - this.p1.position.x;
        this.jumpOverDelayCooldown = 0;
        this.sideSwapGraceTimer = 0;
        if (this.p1.mixer) this.p1.playAnimation('IDLE');
        if (this.p2.mixer) this.p2.playAnimation('IDLE');
    }

    updateJumpOverDelay(dt) {
        if (!this.p1 || !this.p2) return;
        this.jumpOverDelayCooldown = Math.max(0, this.jumpOverDelayCooldown - dt);
        this.sideSwapGraceTimer = Math.max(0, this.sideSwapGraceTimer - dt);

        const deltaX = this.p2.position.x - this.p1.position.x;
        if (this.previousFighterDeltaX === null) {
            this.previousFighterDeltaX = deltaX;
            return;
        }

        const prevSign = Math.sign(this.previousFighterDeltaX);
        const newSign = Math.sign(deltaX);

        if (prevSign !== 0 && newSign !== 0 && prevSign !== newSign && this.jumpOverDelayCooldown <= 0) {
            this.sideSwapGraceTimer = Math.max(this.sideSwapGraceTimer, 0.14);
            const p1Airborne = !this.p1.isGrounded;
            const p2Airborne = !this.p2.isGrounded;
            if (p1Airborne !== p2Airborne) {
                const jumper = p1Airborne ? this.p1 : this.p2;
                const jumpedOver = p1Airborne ? this.p2 : this.p1;
                const verticalGap = jumper.position.y - jumpedOver.position.y;
                if (verticalGap > 0.35 && typeof jumpedOver.applyJumpOverDelay === 'function') {
                    jumpedOver.applyJumpOverDelay(0.16);
                    this.jumpOverDelayCooldown = 0.26;
                }
            }
        }

        this.previousFighterDeltaX = deltaX;
    }

    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async startRoundIntro() {
        while ((this.p1 && !this.p1.isReady) || (this.p2 && !this.p2.isReady)) {
            await this.delay(40);
        }

        this.roundInProgress = false;
        this.timer = 99;
        this.ui.update(this.p1.health, this.p2.health, this.timer);
        for (const beat of ['3', '2', '1', 'FIGHT']) {
            this.ui.showRoundIntro(beat);
            await this.delay(beat === 'FIGHT' ? 500 : 420);
        }
        this.ui.hideRoundIntro();
        this.roundInProgress = true;
    }

    toggleRotationDebug() {
        this.rotationDebugEnabled = !this.rotationDebugEnabled;
        this.applyRotationDebugState();
    }

    togglePause(forceState = null) {
        if (this.isSelecting || this.isGameOver || this.roundTransitionActive) return;
        this.isPaused = forceState === null ? !this.isPaused : !!forceState;
        if (this.isPaused) {
            this.ui.setAIDifficultyUI(this.aiDifficultyLevels, this.aiDifficultyIndex, this.gameMode === 'ai', this.selectionFocus);
            this.ui.showPauseMenu();
        }
        else this.ui.hidePauseMenu();
    }

    setMusicVolume(volume) {
        this.musicVolume = THREE.MathUtils.clamp(volume, 0, 1);
        if (this.bgAudio) this.bgAudio.volume = this.musicVolume;
    }

    setSfxVolume(volume) {
        this.sfxVolume = THREE.MathUtils.clamp(volume, 0, 1);
        if (this.p1) this.p1.setSfxVolume(this.sfxVolume);
        if (this.p2) this.p2.setSfxVolume(this.sfxVolume);
    }

    setAIDifficulty(index) {
        const max = this.aiDifficultyLevels.length - 1;
        this.aiDifficultyIndex = THREE.MathUtils.clamp(index, 0, max);
        this.ui.setAIDifficultyUI(this.aiDifficultyLevels, this.aiDifficultyIndex, this.gameMode === 'ai', this.selectionFocus);
        if (this.input && typeof this.input.onAIDifficultyChanged === 'function') {
            this.input.onAIDifficultyChanged();
        }
    }

    adjustAIDifficulty(delta) {
        const len = this.aiDifficultyLevels.length;
        const next = (this.aiDifficultyIndex + delta + len) % len;
        this.setAIDifficulty(next);
    }

    applyRotationDebugState() {
        this.ui.setRotationDebugVisible(this.rotationDebugEnabled);
        if (!this.p1 || !this.p2) return;
        this.p1.setRotationGizmoVisible(this.rotationDebugEnabled);
        this.p2.setRotationGizmoVisible(this.rotationDebugEnabled);
    }

    rotatePlayer(playerNum, deltaDegrees) {
        if (!this.rotationDebugEnabled) return;
        if (playerNum === 1 && this.p1) this.p1.rotateOffsetByDegrees(deltaDegrees);
        if (playerNum === 2 && this.p2) this.p2.rotateOffsetByDegrees(deltaDegrees);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    playHitAudio(attackMeta = null) {
        const isKickImpact = attackMeta && ['SIDEKICK', 'LOWKICK', 'SPINKICK'].includes(attackMeta.move);
        const soundKeys = isKickImpact ? ['kickA', 'kickB'] : ['thud', 'crunch'];

        for (const key of soundKeys) {
            const src = this.hitAudio[key];
            if (!src) continue;
            const sfx = src.cloneNode();
            sfx.volume = src.volume * this.sfxVolume;
            sfx.play().catch(() => {});
        }
    }

    onHitImpact(point, attackMeta = null, attacker = null, victim = null) {
        this.spawnImpactParticles(point);
        this.spawnShockwave(point);
        this.shakeTimer = 0.3;
        this.playHitAudio(attackMeta);
        this.ui.flashDamageVignette(100);

        const heavy = attackMeta && attackMeta.heavy;
        const comboFinisher = victim && victim.comboHits >= 6;
        if (heavy && comboFinisher && attacker && victim) {
            this.cinematicAttack = {
                timer: 0.45,
                attacker,
                victim
            };
        }
    }

    onBlockImpact(point, attackMeta = null, defender = null) {
        this.spawnBlockParticles(point);
        this.shakeTimer = Math.max(this.shakeTimer, 0.12);
        this.ui.flashDamageVignette(60);
    }

    onFighterKnockedOut(fighter) {
        if (!this.roundInProgress) return;
        const winner = fighter === this.p1 ? 'PLAYER 2' : 'PLAYER 1';
        this.finishRound(winner);
    }

    spawnImpactParticles(point) {
        const mkParticle = (color, speed, life) => {
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.03, 6, 6),
                new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
            );
            mesh.position.copy(point);
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * speed,
                (Math.random() * 0.7 + 0.2) * speed,
                (Math.random() - 0.5) * speed
            );
            this.scene.add(mesh);
            this.impactParticles.push({ mesh, vel, life, maxLife: life });
        };

        for (let i = 0; i < 12; i++) mkParticle(0xaa0000, 2.4, 0.35);
        for (let i = 0; i < 10; i++) mkParticle(0xffb347, 3.2, 0.25);
    }

    spawnShockwave(point) {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.08, 0.14, 32),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
        );
        ring.position.copy(point);
        ring.position.y = Math.max(0.05, point.y * 0.45);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        this.shockwaves.push({ mesh: ring, life: 0.35, maxLife: 0.35 });
    }

    spawnBlockParticles(point) {
        const mkParticle = (color, speed, life) => {
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.024, 6, 6),
                new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
            );
            mesh.position.copy(point);
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * speed,
                (Math.random() * 0.7 + 0.2) * speed,
                (Math.random() - 0.5) * speed
            );
            this.scene.add(mesh);
            this.impactParticles.push({ mesh, vel, life, maxLife: life });
        };

        for (let i = 0; i < 8; i++) mkParticle(0xd6d0c8, 1.9, 0.28); // dust
        for (let i = 0; i < 6; i++) mkParticle(0x99d7ff, 2.3, 0.2);  // guard sparks

        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.05, 0.09, 28),
            new THREE.MeshBasicMaterial({ color: 0xaee8ff, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
        );
        ring.position.copy(point);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        this.shockwaves.push({ mesh: ring, life: 0.2, maxLife: 0.2 });
    }

    performStompWave(caster, opponent) {
        const center = new THREE.Vector3(caster.position.x, 0.08, 0);
        const wave = new THREE.Mesh(
            new THREE.RingGeometry(0.2, 0.34, 40),
            new THREE.MeshBasicMaterial({ color: 0x74d6ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
        );
        wave.position.copy(center);
        wave.rotation.x = -Math.PI / 2;
        this.scene.add(wave);
        this.shockwaves.push({ mesh: wave, life: 0.45, maxLife: 0.45 });

        this.spawnImpactParticles(new THREE.Vector3(caster.position.x, 0.25, 0));
        this.shakeTimer = Math.max(this.shakeTimer, 0.25);

        if (!opponent || opponent.state === FighterState.DEAD) return;
        const inRange = Math.abs(opponent.position.x - caster.position.x) <= 3.3;
        if (!inRange) return;

        const meta = { move: 'STOMP_WAVE', heavy: true };
        opponent.takeDamage(12, meta);
        this.onHitImpact(new THREE.Vector3((caster.position.x + opponent.position.x) * 0.5, 0.65, 0), meta, caster, opponent);
    }

    spawnFireball(caster, target) {
        if (!caster) return;
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 16, 16),
            new THREE.MeshStandardMaterial({
                color: 0xff5a00,
                emissive: 0xff3a00,
                emissiveIntensity: 1.8,
                roughness: 0.25,
                metalness: 0.05
            })
        );
        mesh.position.set(caster.position.x + caster.facingDirection * 0.65, 1.1, 0);
        this.scene.add(mesh);

        const light = new THREE.PointLight(0xff7a2a, 1.2, 3.2, 2.0);
        light.position.copy(mesh.position);
        this.scene.add(light);

        this.fireballs.push({
            mesh,
            light,
            owner: caster,
            target,
            dir: caster.facingDirection,
            speed: 9.6,
            life: 1.25,
            trail: 0
        });
    }

    clearFireballs() {
        for (const f of this.fireballs) {
            this.scene.remove(f.mesh);
            this.scene.remove(f.light);
        }
        this.fireballs = [];
    }

    updateFireballs(dt) {
        this.fireballs = this.fireballs.filter((f) => {
            f.life -= dt;
            f.trail -= dt;
            f.mesh.position.x += f.dir * f.speed * dt;
            f.mesh.position.y = 1.1 + Math.sin((1.25 - f.life) * 14) * 0.03;
            f.light.position.copy(f.mesh.position);

            if (f.trail <= 0) {
                f.trail = 0.04;
                const spark = new THREE.Mesh(
                    new THREE.SphereGeometry(0.03, 6, 6),
                    new THREE.MeshBasicMaterial({ color: 0xffa347, transparent: true, opacity: 0.9 })
                );
                spark.position.copy(f.mesh.position);
                const vel = new THREE.Vector3(-f.dir * 1.2, 0.2 + Math.random() * 0.8, (Math.random() - 0.5) * 0.6);
                this.scene.add(spark);
                this.impactParticles.push({ mesh: spark, vel, life: 0.16, maxLife: 0.16 });
            }

            const outOfBounds = Math.abs(f.mesh.position.x) > CONFIG.FIGHTER.BOUNDS + 3;
            if (outOfBounds || f.life <= 0) {
                this.scene.remove(f.mesh);
                this.scene.remove(f.light);
                return false;
            }

            const target = f.target;
            if (target && target.state !== FighterState.DEAD) {
                const hitX = Math.abs(f.mesh.position.x - target.position.x) < 0.75;
                const hitY = Math.abs(f.mesh.position.y - (target.position.y + 0.95)) < 1.15;
                if (hitX && hitY) {
                    const meta = { move: 'FIREBALL', heavy: true };
                    target.takeDamage(13, meta);
                    this.onHitImpact(f.mesh.position.clone(), meta, f.owner, target);
                    this.scene.remove(f.mesh);
                    this.scene.remove(f.light);
                    return false;
                }
            }

            return true;
        });
    }

    updateImpactEffects(dt) {
        this.impactParticles = this.impactParticles.filter((p) => {
            p.life -= dt;
            p.vel.y -= 6 * dt;
            p.mesh.position.addScaledVector(p.vel, dt);
            p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                return false;
            }
            return true;
        });

        this.shockwaves = this.shockwaves.filter((w) => {
            w.life -= dt;
            const t = 1 - w.life / w.maxLife;
            const s = 1 + t * 8;
            w.mesh.scale.setScalar(s);
            w.mesh.material.opacity = Math.max(0, 0.8 * (1 - t));
            if (w.life <= 0) {
                this.scene.remove(w.mesh);
                return false;
            }
            return true;
        });
    }

    update() {
        const rawDt = this.clock.getDelta();
        const dt = rawDt;
        this.updateImpactEffects(rawDt);
        this.updateFireballs(rawDt);

        if (this.isSelecting) {
            this.ui.updateSelection(
                this.p1Index,
                this.p1Ready,
                this.p2Index,
                this.p2Ready,
                this.gameMode,
                this.selectionFocus,
                { levels: this.aiDifficultyLevels, index: this.aiDifficultyIndex },
                this.aiSelectStage
            );
            if (this.p1Ready && this.p2Ready) {
                this.startMatch();
            }
            return;
        }

        if (this.isPaused) return;
        if (this.isGameOver || (!this.roundInProgress && !this.roundTransitionActive)) return;
        
        if (this.roundInProgress) this.input.update(dt);
        if (this.p1 && this.p2) {
            this.p1.update(dt, this.p2);
            this.p2.update(dt, this.p1);

            if (this.roundInProgress) {
                // Keep grounded fighters from passing through each other.
                // Side swaps are allowed only when one fighter jumps over.
                const minGap = this.sideSwapGraceTimer > 0 ? 0.18 : 0.85;
                if (this.p1.isGrounded && this.p2.isGrounded) {
                    const distX = Math.abs(this.p1.position.x - this.p2.position.x);
                    if (distX < minGap) {
                        const mid = (this.p1.position.x + this.p2.position.x) * 0.5;
                        if (this.p1.position.x <= this.p2.position.x) {
                            this.p1.position.x = mid - minGap * 0.5;
                            this.p2.position.x = mid + minGap * 0.5;
                        } else {
                            this.p1.position.x = mid + minGap * 0.5;
                            this.p2.position.x = mid - minGap * 0.5;
                        }
                    }
                }

                this.updateJumpOverDelay(dt);

                this.timer -= dt;
                if (this.timer <= 0) {
                    this.timer = 0;
                    this.finishRound();
                    return;
                }

                if (this.p1.health <= 0) {
                    if (!this.p1.isKOSequenceActive) this.finishRound('PLAYER 2');
                    return;
                }
                if (this.p2.health <= 0) {
                    if (!this.p2.isKOSequenceActive) this.finishRound('PLAYER 1');
                    return;
                }

                this.ui.update(this.p1.health, this.p2.health, this.timer);
                const p1Combo = this.p1.getComboMeter();
                const p2Combo = this.p2.getComboMeter();
                this.ui.updatePressureMeters(p1Combo, p2Combo);
            }

            if (this.rotationDebugEnabled) {
                const jumpInfo = this.p1.getJumpClipInfo();
                let jumpMeta = 'JUMP: metadata unavailable';
                if (jumpInfo) {
                    jumpMeta = `JUMP: ${jumpInfo.duration.toFixed(2)}s | start frame ${jumpInfo.startFrame} | end frame ${jumpInfo.endFrame} @${jumpInfo.fps.toFixed(1)}fps`;
                }
                this.ui.updateRotationDebug(this.p1.getSignedRotationDegrees(), this.p2.getSignedRotationDegrees(), jumpMeta);
            }

            const midX = (this.p1.position.x + this.p2.position.x) / 2;
            const dist = Math.abs(this.p1.position.x - this.p2.position.x);
            if (this.cinematicAttack && this.cinematicAttack.timer > 0) {
                this.cinematicAttack.timer -= rawDt;
                const atk = this.cinematicAttack.attacker;
                const vic = this.cinematicAttack.victim;
                const focusX = (atk.position.x + vic.position.x) * 0.5;
                const targetX = focusX + atk.facingDirection * 1.1;
                this.camera.position.x += (targetX - this.camera.position.x) * 0.2;
                this.camera.position.y += (2.2 - this.camera.position.y) * 0.2;
                this.camera.position.z += (4.3 - this.camera.position.z) * 0.2;
                this.camera.lookAt(focusX, 1.25, 0);
                if (this.cinematicAttack.timer <= 0) this.cinematicAttack = null;
            } else {
                this.camera.position.x += (midX - this.camera.position.x) * 0.1;
                this.camera.position.z = 6.3 + dist * 0.22;
                if (this.shakeTimer > 0) {
                    this.shakeTimer -= rawDt;
                    this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
                    this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.5;
                }
                this.camera.lookAt(midX, 1.5, 0);
            }
        }
    }

    async playRoundReturnToStart() {
        if (!this.p1 || !this.p2) return;
        const durationMs = 850;
        const startP1 = this.p1.position.x;
        const startP2 = this.p2.position.x;
        const targetP1 = -3;
        const targetP2 = 3;

        const p1Move = this.p1.config.id === 'young_zealous' && this.p1.animations.BACK_WALK ? 'BACK_WALK' : 'IDLE';
        const p2Move = this.p2.config.id === 'young_zealous' && this.p2.animations.BACK_WALK ? 'BACK_WALK' : 'IDLE';
        if (this.p1.mixer && this.p1.animations[p1Move]) this.p1.playAnimation(p1Move, 0.08, true, 0.78);
        if (this.p2.mixer && this.p2.animations[p2Move]) this.p2.playAnimation(p2Move, 0.08, true, 0.78);

        const begin = performance.now();
        await new Promise((resolve) => {
            const step = (now) => {
                const t = Math.min(1, (now - begin) / durationMs);
                this.p1.position.x = THREE.MathUtils.lerp(startP1, targetP1, t);
                this.p2.position.x = THREE.MathUtils.lerp(startP2, targetP2, t);
                this.p1.position.y = 0;
                this.p2.position.y = 0;
                if (t < 1) requestAnimationFrame(step);
                else resolve();
            };
            requestAnimationFrame(step);
        });

        if (this.p1.mixer) this.p1.playAnimation('IDLE', 0.1, true);
        if (this.p2.mixer) this.p2.playAnimation('IDLE', 0.1, true);
    }

    async finishRound(winner) {
        if (!this.roundInProgress || this.roundTransitionActive) return;
        this.roundInProgress = false;
        this.roundTransitionActive = true;

        if (!winner) winner = this.p1.health >= this.p2.health ? 'PLAYER 1' : 'PLAYER 2';
        if (winner === 'PLAYER 1') this.roundWins.p1 += 1;
        else this.roundWins.p2 += 1;

        // Let KO / victory reaction animations play before repositioning fighters.
        await this.delay(this.roundEndPlaybackMs);

        await this.playRoundReturnToStart();

        if (this.currentRound >= this.totalRounds) {
            await this.finishMatch();
            this.roundTransitionActive = false;
            return;
        }

        this.currentRound += 1;
        this.ui.setRound(this.currentRound, this.totalRounds);
        this.resetFightersForRound();
        await this.startRoundIntro();
        this.roundTransitionActive = false;
    }

    async playWinnerBackflipReturn(winnerLabel) {
        const winnerFighter = winnerLabel === 'PLAYER 1' ? this.p1 : (winnerLabel === 'PLAYER 2' ? this.p2 : null);
        if (!winnerFighter || winnerFighter.config.id !== 'young_zealous' || !winnerFighter.animations.WIN_BACKFLIP) return;

        const targetX = winnerFighter === this.p1 ? -3 : 3;
        const startX = winnerFighter.position.x;
        const clipDuration = winnerFighter.animations.WIN_BACKFLIP.duration || 0.8;
        const totalMs = clipDuration * 1000;
        const peakY = 1.15;

        winnerFighter.playAnimation('WIN_BACKFLIP', 0.06, false, 1);

        const start = performance.now();
        await new Promise((resolve) => {
            const step = (now) => {
                const t = Math.min(1, (now - start) / totalMs);
                winnerFighter.position.x = THREE.MathUtils.lerp(startX, targetX, t);
                winnerFighter.position.y = 4 * peakY * t * (1 - t);
                if (t < 1) requestAnimationFrame(step);
                else {
                    winnerFighter.position.x = targetX;
                    winnerFighter.position.y = 0;
                    resolve();
                }
            };
            requestAnimationFrame(step);
        });

        if (winnerFighter.mixer) winnerFighter.playAnimation('IDLE', 0.08, true);
    }

    async finishMatch() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        let winner = 'DRAW';
        if (this.roundWins.p1 > this.roundWins.p2) winner = 'PLAYER 1';
        if (this.roundWins.p2 > this.roundWins.p1) winner = 'PLAYER 2';

        await this.playWinnerBackflipReturn(winner);
        this.ui.showGameOver(winner, `ROUND SCORE ${this.roundWins.p1} - ${this.roundWins.p2}`);
    }

    resetMatch() {
        this.isGameOver = false;
        this.currentRound = 1;
        this.roundWins = { p1: 0, p2: 0 };
        this.clearFireballs();
        this.ui.setRound(this.currentRound, this.totalRounds);
        this.ui.hideGameOver();
        this.resetFightersForRound();
        this.startRoundIntro();
    }

    quitToSelection() {
        this.isGameOver = false;
        this.roundInProgress = false;
        this.roundTransitionActive = false;
        this.isPaused = false;
        this.isSelecting = true;
        this.gameMode = 'multiplayer';
        this.selectionFocus = 'mode';
        this.aiSelectStage = 'p1';
        this.p1Ready = false;
        this.p2Ready = false;
        if (this.p1) this.scene.remove(this.p1);
        if (this.p2) this.scene.remove(this.p2);
        this.clearFireballs();
        this.p1 = null;
        this.p2 = null;
        this.previousFighterDeltaX = null;
        this.jumpOverDelayCooldown = 0;
        this.sideSwapGraceTimer = 0;
        this.ui.setAIDifficultyUI(this.aiDifficultyLevels, this.aiDifficultyIndex, false, this.selectionFocus);
        this.input.setFighters(null, null);
        this.ui.showSelection();
        this.ui.hidePauseMenu();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }
}

new Game();
