import * as THREE from 'three';
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
        this.rotationDebugEnabled = false;
        this.shakeTimer = 0;
        this.shakeIntensity = 0.18;
        this.impactParticles = [];
        this.shockwaves = [];
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
        
        // Character Selection State
        this.isSelecting = true;
        this.p1Index = 0;
        this.p2Index = 0;
        this.p1Ready = false;
        this.p2Ready = false;

        this.initLights();
        this.initEnvironment();
        
        this.ui = new UI();
        this.ui.setGameOverActions(() => this.resetMatch(), () => this.quitToSelection());
        this.input = new InputManager(this);

        window.addEventListener('resize', () => this.onResize());
        this.animate();
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
            this.scene.add(bg);
        });

        const floorGeo = new THREE.PlaneGeometry(50, 20);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x443322 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    startMatch() {
        this.isSelecting = false;
        this.ui.hideSelection();
        this.ui.hideGameOver();
        
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
        if (this.p1.mixer) this.p1.playAnimation('IDLE');
        if (this.p2.mixer) this.p2.playAnimation('IDLE');
    }

    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async startRoundIntro() {
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
            sfx.volume = src.volume;
            sfx.play().catch(() => {});
        }
    }

    onHitImpact(point, attackMeta = null) {
        this.spawnImpactParticles(point);
        this.spawnShockwave(point);
        this.shakeTimer = 0.3;
        this.playHitAudio(attackMeta);
        this.ui.flashDamageVignette(100);
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

        if (this.isSelecting) {
            this.ui.updateSelection(this.p1Index, this.p1Ready, this.p2Index, this.p2Ready);
            if (this.p1Ready && this.p2Ready) {
                this.startMatch();
            }
            return;
        }

        if (this.isGameOver || !this.roundInProgress) return;
        
        this.input.update();
        if (this.p1 && this.p2) {
            this.p1.update(dt, this.p2);
            this.p2.update(dt, this.p1);

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
            const active = p1Combo.hits >= p2Combo.hits
                ? { label: 'P1 UNDER PRESSURE', ...p1Combo }
                : { label: 'P2 UNDER PRESSURE', ...p2Combo };
            this.ui.updateComboMeter(active.label, active.ratio, active.hits, active.nearKnockdown);

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

    finishRound(winner) {
        if (!this.roundInProgress) return;
        this.roundInProgress = false;

        if (!winner) winner = this.p1.health >= this.p2.health ? 'PLAYER 1' : 'PLAYER 2';
        if (winner === 'PLAYER 1') this.roundWins.p1 += 1;
        else this.roundWins.p2 += 1;

        if (this.currentRound >= this.totalRounds) {
            this.finishMatch();
            return;
        }

        this.currentRound += 1;
        this.ui.setRound(this.currentRound, this.totalRounds);
        this.resetFightersForRound();
        this.startRoundIntro();
    }

    finishMatch() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        let winner = 'DRAW';
        if (this.roundWins.p1 > this.roundWins.p2) winner = 'PLAYER 1';
        if (this.roundWins.p2 > this.roundWins.p1) winner = 'PLAYER 2';
        this.ui.showGameOver(winner, `ROUND SCORE ${this.roundWins.p1} - ${this.roundWins.p2}`);
    }

    resetMatch() {
        this.isGameOver = false;
        this.currentRound = 1;
        this.roundWins = { p1: 0, p2: 0 };
        this.ui.setRound(this.currentRound, this.totalRounds);
        this.ui.hideGameOver();
        this.resetFightersForRound();
        this.startRoundIntro();
    }

    quitToSelection() {
        this.isGameOver = false;
        this.roundInProgress = false;
        this.isSelecting = true;
        this.p1Ready = false;
        this.p2Ready = false;
        if (this.p1) this.scene.remove(this.p1);
        if (this.p2) this.scene.remove(this.p2);
        this.p1 = null;
        this.p2 = null;
        this.input.setFighters(null, null);
        this.ui.showSelection();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }
}

new Game();
