import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { CONFIG } from './Config.js';

export const FighterState = {
    IDLE: 'idle',
    WALK: 'walk',
    JUMPING: 'jumping',
    BLOCKING: 'blocking',
    PUNCHING: 'punching',
    KICKING: 'kicking',
    HIT: 'hit',
    DEAD: 'dead'
};

export class Fighter extends THREE.Group {
    constructor(playerNum, config) {
        super();
        this.playerNum = playerNum;
        this.config = config; // { id, name, color }
        this.health = CONFIG.FIGHTER.HEALTH;
        this.state = FighterState.IDLE;
        
        this.velocity = new THREE.Vector3();
        this.isGrounded = true;
        this.facingDirection = playerNum === 1 ? 1 : -1;
        this.playerRotationOffset = 0;
        this.isReady = false;
        this.lastMoveDir = 0;
        
        this.animations = {};
        this.mixer = null;
        this.currentAction = null;
        this.currentActionTrimEnd = null;
        this.jumpClipInfo = null;
        
        this.comboCount = 0;
        this.lastPunchTime = 0;
        this.rotationGizmo = null;
        this.yzHurtSounds = [];
        this.yzBlockSounds = [];
        this.yzJumpSounds = [];
        this.yzHurtSoundIndex = 0;
        this.yzBlockSoundIndex = 0;
        this.lastYzJumpSoundIndex = -1;
        this.yzStepSound = null;
        this.sfxVolume = 1;
        this.comboHits = 0;
        this.comboWindow = 0;
        this.lastAttackMeta = { heavy: false, move: '' };
        this.isKOSequenceActive = false;
        this.koEndsRound = false;
        this.controlLockTimer = 0;
        
        this.initMesh();
        this.initCollision();
        this.initYoungZealousAudio();
        this.readyPromise = this.loadAnimations();
    }

    initYoungZealousAudio() {
        const sources = CONFIG.ASSETS.YOUNG_ZEALOUS_HURT_SOUNDS || [];
        this.yzHurtSounds = sources.map((src) => {
            const audio = new Audio(src);
            audio.preload = 'auto';
            audio.volume = 0.85 * this.sfxVolume;
            return audio;
        });

        const blockSources = CONFIG.ASSETS.YOUNG_ZEALOUS_BLOCK_SOUNDS || [];
        this.yzBlockSounds = blockSources.map((src) => {
            const audio = new Audio(src);
            audio.preload = 'auto';
            audio.volume = 0.72 * this.sfxVolume;
            return audio;
        });

        const jumpSources = CONFIG.ASSETS.YOUNG_ZEALOUS_JUMP_SOUNDS || [];
        this.yzJumpSounds = jumpSources.map((src) => {
            const audio = new Audio(src);
            audio.preload = 'auto';
            audio.volume = 0.9 * this.sfxVolume;
            return audio;
        });

        const stepSrc = CONFIG.ASSETS.YOUNG_ZEALOUS_STEP_SOUND;
        if (stepSrc) {
            this.yzStepSound = new Audio(stepSrc);
            this.yzStepSound.preload = 'auto';
            this.yzStepSound.loop = true;
            this.yzStepSound.volume = 0.28 * this.sfxVolume;
            this.yzStepSound.playbackRate = 1;
        }
    }

    setSfxVolume(volume) {
        this.sfxVolume = THREE.MathUtils.clamp(volume, 0, 1);
        for (const audio of this.yzHurtSounds) {
            audio.volume = 0.85 * this.sfxVolume;
        }
        for (const audio of this.yzBlockSounds) {
            audio.volume = 0.72 * this.sfxVolume;
        }
        for (const audio of this.yzJumpSounds) {
            audio.volume = 0.9 * this.sfxVolume;
        }
        if (this.yzStepSound) {
            this.yzStepSound.volume = 0.28 * this.sfxVolume;
        }
    }

    setYzStepPlaybackRate(rate = 1) {
        if (!this.yzStepSound || this.config.id !== 'young_zealous') return;
        this.yzStepSound.playbackRate = THREE.MathUtils.clamp(rate, 0.55, 1.3);
    }

    playRandomYoungZealousJumpSound() {
        if (this.config.id !== 'young_zealous' || this.yzJumpSounds.length === 0) return;

        let idx = Math.floor(Math.random() * this.yzJumpSounds.length);
        if (this.yzJumpSounds.length > 1 && idx === this.lastYzJumpSoundIndex) {
            idx = (idx + 1 + Math.floor(Math.random() * (this.yzJumpSounds.length - 1))) % this.yzJumpSounds.length;
        }

        this.lastYzJumpSoundIndex = idx;
        const audio = this.yzJumpSounds[idx];
        if (!audio) return;

        audio.pause();
        audio.currentTime = 0;
        const playAttempt = audio.play();
        if (playAttempt && typeof playAttempt.catch === 'function') {
            playAttempt.catch(() => {});
        }
    }

    setYzStepSoundPlaying(shouldPlay) {
        if (!this.yzStepSound || this.config.id !== 'young_zealous') return;
        if (shouldPlay) {
            if (this.yzStepSound.paused) {
                this.yzStepSound.play().catch(() => {});
            }
            return;
        }

        if (!this.yzStepSound.paused) {
            this.yzStepSound.pause();
            this.yzStepSound.currentTime = 0;
        }
    }

    applyJumpOverDelay(duration = 0.15) {
        this.controlLockTimer = Math.max(this.controlLockTimer, duration);
        this.setYzStepSoundPlaying(false);
    }

    freezeYoungZealousBlockAtLastFrame() {
        if (this.config.id !== 'young_zealous' || !this.mixer || !this.animations.BLOCK) return;
        const clip = this.animations.BLOCK;
        const action = this.mixer.clipAction(clip);

        if (this.currentAction && this.currentAction !== action) {
            this.currentAction.fadeOut(0.04);
        }

        action.enabled = true;
        action.reset();
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
        action.time = Math.max(0, clip.duration - 1 / 30);
        action.paused = true;

        this.currentAction = action;
        this.currentActionTrimEnd = null;
    }

    playYoungZealousBlockHitReact() {
        if (this.config.id !== 'young_zealous' || !this.mixer || !this.animations.BLOCK) return;
        this.playAnimation('BLOCK', 0.04, false, 1, 0, 1);
    }

    playNextYoungZealousHurtSound() {
        if (this.yzHurtSounds.length === 0) return;
        const maxTries = this.yzHurtSounds.length;
        let tries = 0;

        while (tries < maxTries) {
            const audio = this.yzHurtSounds[this.yzHurtSoundIndex];
            this.yzHurtSoundIndex = (this.yzHurtSoundIndex + 1) % this.yzHurtSounds.length;
            tries += 1;
            if (!audio) continue;

            audio.pause();
            audio.currentTime = 0;
            const playAttempt = audio.play();
            if (playAttempt && typeof playAttempt.catch === 'function') {
                playAttempt.catch(() => {
                    // Missing or blocked source; next hit will continue sequence.
                });
            }
            break;
        }
    }

    playNextYoungZealousBlockSound() {
        if (this.yzBlockSounds.length === 0) return;
        const maxTries = this.yzBlockSounds.length;
        let tries = 0;

        while (tries < maxTries) {
            const audio = this.yzBlockSounds[this.yzBlockSoundIndex];
            this.yzBlockSoundIndex = (this.yzBlockSoundIndex + 1) % this.yzBlockSounds.length;
            tries += 1;
            if (!audio) continue;

            audio.pause();
            audio.currentTime = 0;
            const playAttempt = audio.play();
            if (playAttempt && typeof playAttempt.catch === 'function') {
                playAttempt.catch(() => {
                    // Missing or blocked source; next block will continue sequence.
                });
            }
            break;
        }
    }

    initMesh() {
        this.modelGroup = new THREE.Group();
        if (this.config.id === 'young_zealous') {
            this.modelGroup.visible = false;
        }
        this.add(this.modelGroup);

        if (this.config.id === 'young_zealous') {
            const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
            const geo = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
            this.placeholder = new THREE.Mesh(geo, material);
            this.placeholder.position.y = 1;
            this.modelGroup.add(this.placeholder);
        } else {
            // Original Procedural Character
            const material = new THREE.MeshStandardMaterial({ 
                color: this.config.color,
                roughness: 0.5,
                metalness: 0.1
            });
            
            this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.4), material);
            this.torso.position.y = 1;
            this.torso.castShadow = true;
            this.modelGroup.add(this.torso);

            this.head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), material);
            this.head.position.y = 1.7;
            this.head.castShadow = true;
            this.modelGroup.add(this.head);

            this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), material);
            this.leftArm.position.set(-0.4, 1.2, 0);
            this.leftArm.castShadow = true;
            this.modelGroup.add(this.leftArm);

            this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), material);
            this.rightArm.position.set(0.4, 1.2, 0);
            this.rightArm.castShadow = true;
            this.modelGroup.add(this.rightArm);

            this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), material);
            this.leftLeg.position.set(-0.2, 0.4, 0);
            this.leftLeg.castShadow = true;
            this.modelGroup.add(this.leftLeg);

            this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), material);
            this.rightLeg.position.set(0.2, 0.4, 0);
            this.rightLeg.castShadow = true;
            this.modelGroup.add(this.rightLeg);
        }
        
        const baseFacingRotation = this.facingDirection === 1 ? Math.PI / 2 : -Math.PI / 2;
        this.modelGroup.rotation.y = baseFacingRotation + this.playerRotationOffset;
    }

    createRotationGizmo() {
        const gizmo = new THREE.Group();
        gizmo.position.y = 1.1;

        const ringGeometry = new THREE.TorusGeometry(0.85, 0.022, 10, 64);
        const makeRing = (color) => new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.9,
            depthTest: false
        });

        const ringX = new THREE.Mesh(ringGeometry, makeRing(0xff4d4d));
        ringX.rotation.y = Math.PI / 2;
        gizmo.add(ringX);

        const ringY = new THREE.Mesh(ringGeometry, makeRing(0x5d7dff));
        ringY.rotation.x = Math.PI / 2;
        gizmo.add(ringY);

        const ringZ = new THREE.Mesh(ringGeometry, makeRing(0x55cc55));
        gizmo.add(ringZ);

        const center = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false })
        );
        gizmo.add(center);

        return gizmo;
    }

    setRotationGizmoVisible(visible) {
        if (visible) {
            if (!this.rotationGizmo) {
                this.rotationGizmo = this.createRotationGizmo();
            }
            if (this.rotationGizmo.parent !== this.modelGroup) {
                this.modelGroup.add(this.rotationGizmo);
            }
        } else if (this.rotationGizmo && this.rotationGizmo.parent) {
            this.rotationGizmo.parent.remove(this.rotationGizmo);
        }
    }

    rotateOffsetByDegrees(deltaDegrees) {
        const next = this.playerRotationOffset + THREE.MathUtils.degToRad(deltaDegrees);
        this.playerRotationOffset = THREE.MathUtils.euclideanModulo(next + Math.PI, Math.PI * 2) - Math.PI;
    }

    getSignedRotationDegrees() {
        return THREE.MathUtils.radToDeg(this.modelGroup.rotation.y);
    }

    extractClipInfo(clip) {
        let minTime = Infinity;
        let maxTime = 0;
        let sampleStep = null;

        for (const track of clip.tracks) {
            if (!track.times || track.times.length === 0) continue;
            const first = track.times[0];
            const last = track.times[track.times.length - 1];
            if (first < minTime) minTime = first;
            if (last > maxTime) maxTime = last;

            if (sampleStep === null && track.times.length > 1) {
                const step = track.times[1] - track.times[0];
                if (step > 0) sampleStep = step;
            }
        }

        if (!Number.isFinite(minTime)) minTime = 0;
        const fps = sampleStep ? 1 / sampleStep : 30;

        return {
            duration: clip.duration,
            startTime: minTime,
            endTime: maxTime || clip.duration,
            fps,
            startFrame: Math.round(minTime * fps),
            endFrame: Math.round((maxTime || clip.duration) * fps)
        };
    }

    getJumpClipInfo() {
        return this.jumpClipInfo;
    }

    scheduleHitboxWindow(startMs, activeMs = 120) {
        this.hitboxActive = false;

        setTimeout(() => {
            if (this.state === FighterState.PUNCHING || this.state === FighterState.KICKING) {
                this.hitboxActive = true;
            }
        }, Math.max(0, startMs));

        setTimeout(() => {
            this.hitboxActive = false;
        }, Math.max(0, startMs + activeMs));
    }

    async loadAnimations() {
        const loader = new FBXLoader();
        const animPromises = [];
        const animationSet = this.config.id === 'young_zealous'
            ? { ...CONFIG.ASSETS.ANIMATIONS, ...CONFIG.ASSETS.YOUNG_ZEALOUS_ANIMATIONS }
            : CONFIG.ASSETS.ANIMATIONS;
        
        for (const [key, url] of Object.entries(animationSet)) {
            animPromises.push(new Promise((resolve) => {
                loader.load(url, (fbx) => {
                    // Strip lights from FBX
                    fbx.traverse(child => {
                        if (child.isLight) child.visible = false;
                    });

                    if (fbx.animations && fbx.animations.length > 0) {
                        const clip = fbx.animations[0];
                        clip.name = key;
                        this.animations[key] = clip;

                        if (key === 'JUMP') {
                            this.jumpClipInfo = this.extractClipInfo(clip);
                        }
                        
                        if (this.config.id === 'young_zealous' && !this.model && fbx.children.find(c => c.isMesh || c.isSkinnedMesh)) {
                             if (this.placeholder) this.modelGroup.remove(this.placeholder);
                             this.model = fbx;
                             this.model.scale.setScalar(0.01);
                             this.model.traverse(child => {
                                 if (child.isMesh) {
                                     child.castShadow = true;
                                     child.receiveShadow = true;
                                     
                                     // If the mesh has a material with a map, preserve it but enable skinning
                                     if (child.material) {
                                         if (Array.isArray(child.material)) {
                                             child.material.forEach(m => {
                                                 m.skinning = true;
                                                 if (!m.map) m.color.set(this.config.color);
                                             });
                                         } else {
                                             child.material.skinning = true;
                                             if (!child.material.map) child.material.color.set(this.config.color);
                                         }
                                     } else {
                                         child.material = new THREE.MeshStandardMaterial({ 
                                             color: this.config.color,
                                             skinning: true,
                                             roughness: 0.6,
                                             metalness: 0.1
                                         });
                                     }
                                 }
                             });
                             this.modelGroup.add(this.model);
                             this.mixer = new THREE.AnimationMixer(this.model);
                        }
                    }
                    resolve();
                }, undefined, () => {
                    // Fail-safe: do not block fighter spawn if a single clip URL is invalid.
                    resolve();
                });
            }));
        }

        await Promise.all(animPromises);
        if (this.config.id === 'young_zealous') {
            this.playAnimation('IDLE', 0.12, true, 1);
            this.modelGroup.visible = true;
        }
        this.isReady = true;
    }

    triggerYoungZealousMove(name, duration = 600) {
        if (this.config.id !== 'young_zealous') return;
        if (!this.mixer || !this.animations[name]) return;
        if ([FighterState.DEAD, FighterState.HIT].includes(this.state)) return;

        const attackMoves = ['BIG_STOMACH_HIT', 'FLYING'];
        const isAttack = attackMoves.includes(name);
        this.state = isAttack ? FighterState.PUNCHING : FighterState.WALK;
        this.hitboxDamage = name === 'BIG_STOMACH_HIT' ? 16 : (name === 'FLYING' ? 14 : 0);
        this.lastAttackMeta = {
            move: name,
            heavy: ['BIG_STOMACH_HIT', 'FLYING'].includes(name)
        };

        this.playAnimation(name, 0.08, false, 1);

        if (isAttack) {
            const hitStart = name === 'FLYING' ? 200 : 170;
            this.scheduleHitboxWindow(hitStart, 130);
        }

        setTimeout(() => {
            if (this.state !== FighterState.DEAD && this.state !== FighterState.HIT) {
                this.hitboxActive = false;
                this.state = FighterState.IDLE;
                this.playAnimation('IDLE');
            }
        }, duration);
    }

    canUseYzSpecial() {
        return this.config.id === 'young_zealous'
            && this.mixer
            && ![FighterState.DEAD, FighterState.HIT].includes(this.state)
            && this.controlLockTimer <= 0
            && !this.isKOSequenceActive;
    }

    selectFirstAvailableAnimation(candidates, fallback = 'IDLE') {
        for (const name of candidates) {
            if (this.animations[name]) return name;
        }
        return fallback;
    }

    triggerGrabSlam(opponent) {
        if (!this.canUseYzSpecial()) return;
        const anim = this.selectFirstAvailableAnimation(['GRAB_SLAM', 'BIG_STOMACH_HIT'], 'IDLE');
        this.state = FighterState.PUNCHING;
        this.hitboxActive = false;
        this.lastAttackMeta = { move: 'GRAB_SLAM', heavy: true };
        this.playAnimation(anim, 0.06, false, 1.0);

        setTimeout(() => {
            if (!opponent || opponent.state === FighterState.DEAD) return;
            const closeEnough = Math.abs(opponent.position.x - this.position.x) <= 1.9;
            if (!closeEnough) return;

            opponent.takeDamage(14, this.lastAttackMeta);
            const slamX = THREE.MathUtils.clamp(
                this.position.x - this.facingDirection * 1.35,
                -CONFIG.FIGHTER.BOUNDS,
                CONFIG.FIGHTER.BOUNDS
            );
            opponent.position.x = slamX;
            opponent.position.y = 0.2;
            opponent.velocity.y = 0.06;
            opponent.isGrounded = false;

            const hitAnim = opponent.config.id === 'young_zealous' && opponent.animations.HIT_REACT ? 'HIT_REACT' : 'HIT';
            if (opponent.mixer && opponent.animations[hitAnim]) opponent.playAnimation(hitAnim, 0.05, false, 1);

            if (this.game && typeof this.game.onHitImpact === 'function') {
                const p = new THREE.Vector3((this.position.x + opponent.position.x) * 0.5, 0.95, 0);
                this.game.onHitImpact(p, this.lastAttackMeta, this, opponent);
            }
        }, 220);

        setTimeout(() => {
            if (this.state === FighterState.PUNCHING) {
                this.state = FighterState.IDLE;
                this.playAnimation('IDLE', 0.08, true);
            }
        }, 760);
    }

    triggerDance() {
        if (!this.canUseYzSpecial()) return;
        const anim = this.selectFirstAvailableAnimation(['DANCE', 'IDLE'], 'IDLE');
        this.state = FighterState.WALK;
        this.hitboxActive = false;
        this.lastAttackMeta = { move: 'DANCE', heavy: false };
        this.playAnimation(anim, 0.08, false, 1.0);
        setTimeout(() => {
            if (this.state === FighterState.WALK) {
                this.state = FighterState.IDLE;
                this.playAnimation('IDLE', 0.08, true);
            }
        }, 1200);
    }

    triggerRollKickFrontFlip(opponent) {
        if (!this.canUseYzSpecial()) return;
        this.triggerAdvancedKick('ROLL_KICK_FRONT_FLIP', opponent, 14, 760, 170, 1.0);
    }

    triggerFunClumbKick(opponent) {
        if (!this.canUseYzSpecial()) return;
        this.triggerAdvancedKick('FUN_CLUMB_KICK', opponent, 16, 820, 190, 1.25);
    }

    triggerAdvancedKick(moveName, opponent, damage, duration, hitboxStart, travelForward = 0) {
        this.state = FighterState.KICKING;
        this.hitboxDamage = damage;
        this.lastAttackMeta = { move: moveName, heavy: true };
        const anim = this.selectFirstAvailableAnimation([moveName, 'SPINKICK', 'SIDEKICK'], 'IDLE');
        this.playAnimation(anim, 0.05, false, 1.18);

        if (travelForward > 0) {
            setTimeout(() => {
                this.position.x = THREE.MathUtils.clamp(
                    this.position.x + this.facingDirection * travelForward,
                    -CONFIG.FIGHTER.BOUNDS,
                    CONFIG.FIGHTER.BOUNDS
                );
            }, Math.round(duration * 0.55));
        }

        this.scheduleHitboxWindow(hitboxStart, 150);
        setTimeout(() => {
            this.hitboxActive = false;
            if (this.state === FighterState.KICKING) {
                this.state = FighterState.IDLE;
                this.playAnimation('IDLE', 0.08, true);
            }
        }, duration);

        if (opponent && this.game && typeof this.game.onHitImpact === 'function') {
            setTimeout(() => {
                const p = new THREE.Vector3((this.position.x + opponent.position.x) * 0.5, 0.9, 0);
                this.game.onHitImpact(p, this.lastAttackMeta, this, opponent);
            }, Math.max(120, hitboxStart - 10));
        }
    }

    triggerStompWave(opponent) {
        if (!this.canUseYzSpecial()) return;
        const hasStompClip = !!this.animations.STOMP_WAVE;
        const anim = hasStompClip
            ? 'STOMP_WAVE'
            : this.selectFirstAvailableAnimation(['BIG_STOMACH_HIT'], 'IDLE');
        const animMs = hasStompClip
            ? Math.max(900, Math.round((this.animations.STOMP_WAVE.duration || 0.9) * 1000))
            : 900;
        const waveTriggerMs = Math.round(animMs * 0.72);

        this.state = FighterState.KICKING;
        this.hitboxActive = false;
        this.lastAttackMeta = { move: 'STOMP_WAVE', heavy: true };
        this.playAnimation(anim, 0.06, false, 1.0);

        setTimeout(() => {
            if (this.game && typeof this.game.performStompWave === 'function') {
                this.game.performStompWave(this, opponent);
            }
        }, waveTriggerMs);

        setTimeout(() => {
            if (this.state === FighterState.KICKING) {
                this.state = FighterState.IDLE;
                this.playAnimation('IDLE', 0.08, true);
            }
        }, animMs + 120);
    }

    castFireball(opponent) {
        if (!this.canUseYzSpecial()) return;
        const anim = this.selectFirstAvailableAnimation(['FIREBALL_CAST', 'PUNCH_R'], 'IDLE');
        this.state = FighterState.PUNCHING;
        this.hitboxActive = false;
        this.lastAttackMeta = { move: 'FIREBALL', heavy: true };
        this.playAnimation(anim, 0.06, false, 1.0);

        setTimeout(() => {
            if (this.game && typeof this.game.spawnFireball === 'function') {
                this.game.spawnFireball(this, opponent);
            }
        }, 220);

        setTimeout(() => {
            if (this.state === FighterState.PUNCHING) {
                this.state = FighterState.IDLE;
                this.playAnimation('IDLE', 0.08, true);
            }
        }, 760);
    }

    playAnimation(name, duration = 0.2, loop = true, timeScale = 1, trimStartRatio = 0, trimEndRatio = 1) {
        if (!this.mixer || !this.animations[name]) return;
        
        const newAction = this.mixer.clipAction(this.animations[name]);
        if (this.currentAction === newAction && loop) return;

        if (this.currentAction) {
            this.currentAction.fadeOut(duration);
        }

        newAction.reset();
        newAction.setEffectiveTimeScale(timeScale);
        newAction.setEffectiveWeight(1);
        newAction.fadeIn(duration);

        const clipDuration = this.animations[name].duration;
        const startTime = THREE.MathUtils.clamp(clipDuration * trimStartRatio, 0, clipDuration);
        const endTime = THREE.MathUtils.clamp(clipDuration * trimEndRatio, 0, clipDuration);
        newAction.time = startTime;
        this.currentActionTrimEnd = trimEndRatio < 1 && endTime > startTime ? endTime : null;

        newAction.play();
        
        if (!loop) {
            newAction.setLoop(THREE.LoopOnce);
            newAction.clampWhenFinished = true;
        }

        this.currentAction = newAction;
    }

    initCollision() {
        this.hurtbox = new THREE.Box3();
        this.hitbox = new THREE.Box3();
        this.hitboxActive = false;
        this.hitboxDamage = 0;
    }

    animateSimple(dt) {
        if (this.config.id === 'young_zealous' || !this.torso) return;
        const time = Date.now() * 0.005;
        
        // Reset parts before applying simple animation
        this.leftArm.rotation.set(0,0,0);
        this.rightArm.rotation.set(0,0,0);
        this.rightArm.position.set(0.4, 1.2, 0);
        this.leftLeg.rotation.set(0,0,0);
        this.rightLeg.rotation.set(0,0,0);
        this.rightLeg.position.set(0.2, 0.4, 0);

        switch (this.state) {
            case FighterState.IDLE:
                const bounce = Math.sin(time * 4) * 0.05;
                this.torso.position.y = 1 + bounce;
                this.head.position.y = 1.7 + bounce;
                this.leftArm.rotation.x = Math.sin(time * 2) * 0.2;
                this.rightArm.rotation.x = -Math.sin(time * 2) * 0.2;
                break;
            case FighterState.WALK:
                const walkCycle = Math.sin(time * 6);
                this.leftLeg.rotation.x = walkCycle * 0.5;
                this.rightLeg.rotation.x = -walkCycle * 0.5;
                break;
            case FighterState.BLOCKING:
                this.leftArm.rotation.x = -Math.PI / 2;
                this.rightArm.rotation.x = -Math.PI / 2;
                this.leftArm.position.z = 0.3;
                this.rightArm.position.z = 0.3;
                break;
            case FighterState.PUNCHING:
                this.rightArm.rotation.x = -Math.PI / 2;
                this.rightArm.position.z = 0.6;
                break;
            case FighterState.KICKING:
                this.rightLeg.rotation.z = Math.PI / 2;
                this.rightLeg.position.x = 0.6;
                break;
        }
    }

    update(dt, opponent) {
        if (this.controlLockTimer > 0) {
            this.controlLockTimer = Math.max(0, this.controlLockTimer - dt);
        }

        if (this.state === FighterState.DEAD) {
            this.setYzStepSoundPlaying(false);
            return;
        }

        if (this.comboWindow > 0) {
            this.comboWindow -= dt;
            if (this.comboWindow <= 0) this.comboHits = 0;
        }

        if (this.mixer) {
            this.mixer.update(dt);

            // While holding block, keep final guard frame after hit-react playback completes.
            if (this.state === FighterState.BLOCKING && this.config.id === 'young_zealous' && this.currentAction) {
                const clip = this.currentAction.getClip ? this.currentAction.getClip() : null;
                if (clip && clip.name === 'BLOCK' && !this.currentAction.paused) {
                    const endTime = Math.max(0, clip.duration - 1 / 30);
                    if (this.currentAction.time >= endTime) {
                        this.currentAction.time = endTime;
                        this.currentAction.paused = true;
                    }
                }
            }

            // Optional trim: stop action early to remove unwanted tail frames.
            if (this.currentAction && this.currentActionTrimEnd !== null && this.currentAction.time >= this.currentActionTrimEnd) {
                this.currentAction.stop();
                this.currentActionTrimEnd = null;
                this.currentAction = null;
            }
        }
        else this.animateSimple(dt);

        // Apply Gravity
        if (!this.isGrounded) {
            this.velocity.y -= CONFIG.FIGHTER.GRAVITY;
        }
        
        this.position.add(this.velocity);

        // Ground check (snap near floor and restore normal playback speed).
        if (this.position.y <= 0.1) {
            this.position.y = 0;
            this.velocity.y = 0;
            if (!this.isGrounded) {
                this.isGrounded = true;
                if (this.mixer) this.mixer.timeScale = 1;
                if (this.state === FighterState.JUMPING) {
                    this.state = FighterState.IDLE;
                    if (this.mixer) this.playAnimation('IDLE', 0.22, true);
                }
            }
        }

        this.position.x = THREE.MathUtils.clamp(this.position.x, -CONFIG.FIGHTER.BOUNDS, CONFIG.FIGHTER.BOUNDS);

        if (this.model) {
            this.hurtbox.setFromObject(this.model);
        } else {
            this.hurtbox.setFromObject(this);
        }

        if (this.hitboxActive) {
            this.updateHitbox();
            this.checkHit(opponent);
        }

        // Always face opponent
        if (this.state !== FighterState.DEAD) {
            const dir = opponent.position.x - this.position.x;
            this.facingDirection = dir > 0 ? 1 : -1;
            // Align model with X-axis (Right: +X, Left: -X)
            // Assuming model default forward is +Z
            const baseFacingRotation = this.facingDirection === 1 ? Math.PI / 2 : -Math.PI / 2;
            this.modelGroup.rotation.y = baseFacingRotation + this.playerRotationOffset;
        }
    }

    updateHitbox() {
        let baseOffset = 0.8;
        let hitboxSize = new THREE.Vector3(0.8, 0.8, 0.8);
        if (this.state === FighterState.PUNCHING && this.config.id === 'young_zealous') {
            // Pull punch hitbox slightly inward to better match visible arm length.
            baseOffset = 0.58;
            hitboxSize = new THREE.Vector3(0.78, 0.76, 0.78);
        } else if (this.state === FighterState.PUNCHING && this.config.id === 'blue_fighter') {
            // Procedural blue punch needs a bit more forward reach to match visual arm extension.
            baseOffset = 0.96;
            hitboxSize = new THREE.Vector3(0.98, 0.84, 0.88);
        } else if (this.state === FighterState.PUNCHING) {
            baseOffset = 0.9;
            hitboxSize = new THREE.Vector3(0.92, 0.82, 0.84);
        }
        const offset = baseOffset * this.facingDirection;
        const yOffset = this.state === FighterState.KICKING ? 0.5 : 1.2;
        this.hitbox.setFromCenterAndSize(
            new THREE.Vector3(this.position.x + offset, this.position.y + yOffset, this.position.z),
            hitboxSize
        );
    }

    checkHit(opponent) {
        if (this.hitbox.intersectsBox(opponent.hurtbox)) {
            opponent.takeDamage(this.hitboxDamage, this.lastAttackMeta);

            if (this.game && typeof this.game.onHitImpact === 'function') {
                const hitCenter = new THREE.Vector3();
                const hurtCenter = new THREE.Vector3();
                this.hitbox.getCenter(hitCenter);
                opponent.hurtbox.getCenter(hurtCenter);
                const impactPoint = hitCenter.lerp(hurtCenter, 0.5);
                this.game.onHitImpact(impactPoint, this.lastAttackMeta, this, opponent);
            }
            this.hitboxActive = false;
        }
    }

    getComboMeter() {
        return {
            hits: this.comboHits,
            ratio: THREE.MathUtils.clamp(this.comboHits / 8, 0, 1),
            nearKnockdown: this.comboHits >= 6
        };
    }

    jump() {
        if (this.controlLockTimer > 0) return;
        if (this.isGrounded && this.state !== FighterState.HIT) {
            this.setYzStepSoundPlaying(false);
            this.setYzStepPlaybackRate(1);
            this.playRandomYoungZealousJumpSound();
            if (this.config.id === 'young_zealous') {
                this.velocity.y = CONFIG.FIGHTER.JUMP_FORCE;
            } else {
                this.velocity.y = CONFIG.FIGHTER.JUMP_FORCE;
            }
            this.isGrounded = false;
            this.state = FighterState.JUMPING;
            if (this.mixer) {
                const jumpClip = this.config.id === 'young_zealous'
                    ? (this.animations.JUMP ? 'JUMP' : (this.animations.LONG_JUMP ? 'LONG_JUMP' : (this.animations.SHORT_JUMP ? 'SHORT_JUMP' : 'IDLE')))
                    : 'JUMP';
                this.playPhysicsSyncedJumpAnimation(jumpClip);
            }
        }
    }

    playPhysicsSyncedJumpAnimation(jumpClipName) {
        if (!this.mixer || !this.animations[jumpClipName]) return;

        const jumpClip = this.animations[jumpClipName];
        const clipDuration = jumpClip.duration;
        const gravity = 9.81;
        const jumpHeight = 1.8;
        const fallTime = Math.sqrt((2 * jumpHeight) / gravity);
        const syncSpeed = clipDuration / fallTime;
        const newSpeed = THREE.MathUtils.clamp(syncSpeed * 0.5, 0.35, 0.6);

        // Sync the clip length to physical airtime, then hold final pose until landing.
        this.mixer.timeScale = newSpeed;
        this.playAnimation(jumpClipName, 0.08, false, 1, 0, 1);
        if (this.currentAction) {
            this.currentAction.setLoop(THREE.LoopOnce, 1);
            this.currentAction.clampWhenFinished = true;
        }
    }

    playKOSequence(endsRound = false) {
        if (this.isKOSequenceActive) return;
        this.isKOSequenceActive = true;
        this.koEndsRound = endsRound;
        this.hitboxActive = false;
        this.velocity.set(0, 0, 0);
        this.setYzStepSoundPlaying(false);

        const launchMs = Math.max(600, (this.animations.KO_LAUNCH?.duration || 0.6) * 1000);
        const getupMs = (this.animations.GETUP?.duration || 0.8) * 1000;

        if (this.mixer && this.animations.KO_LAUNCH) {
            this.playAnimation('KO_LAUNCH', 0.05, false, 1);
        }

        setTimeout(() => {
            this.position.y = 0;
            if (this.mixer && this.animations.KO_DOWN) {
                this.playAnimation('KO_DOWN', 0.05, false, 1, 0, 1);
            }
            if (this.game && typeof this.game.playHitAudio === 'function') {
                this.game.playHitAudio();
            }
        }, launchMs);

        if (!this.koEndsRound && this.mixer && this.animations.GETUP) {
            setTimeout(() => {
                this.playAnimation('GETUP', 0.08, false, 1);
            }, launchMs + 420);

            setTimeout(() => {
                this.state = FighterState.IDLE;
                this.isKOSequenceActive = false;
                if (this.mixer) this.playAnimation('IDLE', 0.08, true);
            }, launchMs + 420 + getupMs);
        } else {
            setTimeout(() => {
                this.state = FighterState.DEAD;
                this.isKOSequenceActive = false;
                if (this.game && typeof this.game.onFighterKnockedOut === 'function') {
                    this.game.onFighterKnockedOut(this);
                }
            }, launchMs + 420);
        }
    }

    move(dir, forceCrouchWalk = false) {
        if (this.controlLockTimer > 0) return;
        if ([FighterState.IDLE, FighterState.WALK, FighterState.JUMPING].includes(this.state)) {
            this.lastMoveDir = dir;
            const speedScale = this.config.id === 'young_zealous' && dir !== this.facingDirection ? 0.72 : 1;
            this.position.x += dir * CONFIG.FIGHTER.WALK_SPEED * speedScale;
            if (this.isGrounded) {
                const isBackward = this.config.id === 'young_zealous' && dir !== this.facingDirection;
                this.setYzStepPlaybackRate(isBackward ? 0.74 : 1);
                this.setYzStepSoundPlaying(true);
                const wasWalking = this.state === FighterState.WALK;
                this.state = FighterState.WALK;
                if (this.mixer && this.config.id === 'young_zealous') {
                    const isForward = dir === this.facingDirection;
                    const moveAnim = forceCrouchWalk
                        ? 'CROUCH_WALK'
                        : (isForward
                            ? (this.animations.DWARF_WALK ? 'DWARF_WALK' : 'RUN')
                            : (this.animations.BACK_WALK ? 'BACK_WALK' : 'RUN'));
                    const activeName = this.currentAction ? this.currentAction.getClip().name : '';
                    if (activeName !== moveAnim && this.animations[moveAnim]) {
                        const moveSpeed = moveAnim === 'BACK_WALK' ? 0.72 : 1;
                        this.playAnimation(moveAnim, 0.08, true, moveSpeed);
                    }
                } else if (this.mixer && !wasWalking) {
                    this.playAnimation('IDLE');
                }
            }
        }
    }

    stop() {
        this.lastMoveDir = 0;
        this.setYzStepPlaybackRate(1);
        this.setYzStepSoundPlaying(false);
        if (this.state === FighterState.WALK) {
            this.state = FighterState.IDLE;
            if (this.mixer) this.playAnimation('IDLE');
        }
    }

    block(isBlocking) {
        if (this.controlLockTimer > 0) return;
        if (this.state === FighterState.DEAD || this.state === FighterState.HIT) return;
        
        if (isBlocking && this.isGrounded) {
            this.setYzStepSoundPlaying(false);
            if (this.state !== FighterState.BLOCKING) {
                this.state = FighterState.BLOCKING;
                if (this.mixer) {
                    if (this.config.id === 'young_zealous') this.freezeYoungZealousBlockAtLastFrame();
                    else this.playAnimation('BLOCK');
                }
            }
        } else if (this.state === FighterState.BLOCKING) {
            this.state = FighterState.IDLE;
            if (this.mixer) this.playAnimation('IDLE');
        }
    }

    punch(isUppercut = false) {
        if (this.controlLockTimer > 0) return;
        if (this.state === FighterState.PUNCHING || this.state === FighterState.KICKING || this.state === FighterState.HIT) return;
        this.setYzStepSoundPlaying(false);
        
        const now = Date.now();
        let anim = 'PUNCH_R';
        let damage = 5;
        let duration = 400;
        let hitboxStart = 140;
        let hitboxActiveMs = 110;
        let punchAnimSpeed = 1;

        if (isUppercut) {
            anim = 'UPPERCUT';
            damage = 5;
            duration = 600;
            hitboxStart = 210;
            hitboxActiveMs = 140;
        } else if (now - this.lastPunchTime < 400) {
            anim = 'PUNCH_L';
            damage = 5;
            this.lastPunchTime = 0;
        } else {
            this.lastPunchTime = now;
        }

        if (this.config.id === 'young_zealous') {
            punchAnimSpeed = isUppercut ? 1.3 : 1.55;
            duration = Math.round(duration * 0.72);
            hitboxStart = Math.round(hitboxStart * 0.88);
            hitboxActiveMs = Math.round(hitboxActiveMs * 0.9);
        } else if (this.config.id === 'blue_fighter') {
            hitboxStart = Math.round(hitboxStart * 0.84);
            hitboxActiveMs = Math.round(hitboxActiveMs * 1.2);
        }

        this.state = FighterState.PUNCHING;
        this.hitboxDamage = damage;
        this.lastAttackMeta = {
            move: anim,
            heavy: isUppercut
        };
        if (this.mixer) this.playAnimation(anim, 0.05, false, punchAnimSpeed);

        this.scheduleHitboxWindow(hitboxStart, hitboxActiveMs);
        setTimeout(() => {
            if (this.state === FighterState.PUNCHING) {
                this.state = FighterState.IDLE;
                if (this.mixer) this.playAnimation('IDLE');
                this.hitboxActive = false;
            }
        }, duration);
    }

    kick(type = 'SIDEKICK') {
        if (this.controlLockTimer > 0) return;
        if (this.state === FighterState.PUNCHING || this.state === FighterState.KICKING || this.state === FighterState.HIT) return;
        this.setYzStepSoundPlaying(false);
        
        this.state = FighterState.KICKING;
        this.hitboxDamage = type === 'SPINKICK' ? 20 : (type === 'LOWKICK' ? 8 : 12);
        this.lastAttackMeta = {
            move: type,
            heavy: ['SPINKICK', 'LOWKICK'].includes(type)
        };
        let kickAnimSpeed = 1;
        let duration = type === 'SPINKICK' ? 800 : 500;
        let hitboxStart = type === 'SPINKICK' ? 260 : (type === 'LOWKICK' ? 170 : 190);
        let hitboxActiveMs = type === 'SPINKICK' ? 170 : 130;

        if (this.config.id === 'young_zealous') {
            kickAnimSpeed = type === 'SPINKICK' ? 1.25 : 1.4;
            duration = Math.round(duration * 0.74);
            hitboxStart = Math.round(hitboxStart * 0.88);
            hitboxActiveMs = Math.round(hitboxActiveMs * 0.9);
        }

        if (this.mixer) this.playAnimation(type, 0.05, false, kickAnimSpeed);

        this.scheduleHitboxWindow(hitboxStart, hitboxActiveMs);
        setTimeout(() => {
            if (this.state === FighterState.KICKING) {
                this.state = FighterState.IDLE;
                if (this.mixer) this.playAnimation('IDLE');
                this.hitboxActive = false;
            }
        }, duration);
    }

    takeDamage(amount, attackMeta = { heavy: false, move: '' }) {
        this.setYzStepSoundPlaying(false);
        if (this.state === FighterState.BLOCKING) {
            amount *= 0.1;
            this.playNextYoungZealousBlockSound();
            this.playYoungZealousBlockHitReact();
            if (this.game && typeof this.game.onBlockImpact === 'function') {
                const blockPoint = new THREE.Vector3(this.position.x + this.facingDirection * 0.35, this.position.y + 1.0, this.position.z);
                this.game.onBlockImpact(blockPoint, attackMeta, this);
            }
        } else {
            this.comboHits += 1;
            this.comboWindow = 0.9;

            const projectedHealth = this.health - amount;
            const comboKnockdown = this.comboHits >= 8 && projectedHealth < 40;
            const heavyKnockdown = !!attackMeta.heavy;
            const shouldKnockdown = heavyKnockdown || comboKnockdown;
            const fatalKO = projectedHealth <= 0;

            this.state = FighterState.HIT;
            this.playNextYoungZealousHurtSound();

            if (shouldKnockdown && this.config.id === 'young_zealous' && this.animations.KO_LAUNCH && this.animations.KO_DOWN) {
                this.comboHits = 0;
                this.comboWindow = 0;
                this.playKOSequence(fatalKO);
            } else {
                const hitAnim = this.config.id === 'young_zealous' && this.animations.HIT_REACT ? 'HIT_REACT' : 'HIT';
                if (this.mixer) this.playAnimation(hitAnim, 0.05, false);
                setTimeout(() => {
                    if (this.state === FighterState.HIT) {
                        this.state = FighterState.IDLE;
                        if (this.mixer) this.playAnimation('IDLE');
                    }
                }, 400);
            }
        }

        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            if (!this.isKOSequenceActive) this.state = FighterState.DEAD;
        }
    }
}
