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
        
        this.animations = {};
        this.mixer = null;
        this.currentAction = null;
        this.currentActionTrimEnd = null;
        this.jumpClipInfo = null;
        
        this.comboCount = 0;
        this.lastPunchTime = 0;
        this.rotationGizmo = null;
        this.yzHurtSounds = [];
        this.yzHurtSoundIndex = 0;
        this.comboHits = 0;
        this.comboWindow = 0;
        this.lastAttackMeta = { heavy: false, move: '' };
        this.isKOSequenceActive = false;
        this.koEndsRound = false;
        
        this.initMesh();
        this.initCollision();
        this.initYoungZealousAudio();
        this.loadAnimations();
    }

    initYoungZealousAudio() {
        if (this.config.id !== 'young_zealous') return;
        const sources = CONFIG.ASSETS.YOUNG_ZEALOUS_HURT_SOUNDS || [];
        this.yzHurtSounds = sources.map((src) => {
            const audio = new Audio(src);
            audio.preload = 'auto';
            audio.volume = 0.85;
            return audio;
        });
    }

    playNextYoungZealousHurtSound() {
        if (this.config.id !== 'young_zealous' || this.yzHurtSounds.length === 0) return;
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

    initMesh() {
        this.modelGroup = new THREE.Group();
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
                });
            }));
        }

        await Promise.all(animPromises);
        if (this.config.id === 'young_zealous') this.playAnimation('IDLE');
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
            this.hitboxActive = false;
            setTimeout(() => this.hitboxActive = true, 120);
        }

        setTimeout(() => {
            if (this.state !== FighterState.DEAD && this.state !== FighterState.HIT) {
                this.hitboxActive = false;
                this.state = FighterState.IDLE;
                this.playAnimation('IDLE');
            }
        }, duration);
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
        this.currentActionTrimEnd = endTime > startTime ? endTime : null;

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
        if (this.state === FighterState.DEAD) return;

        if (this.comboWindow > 0) {
            this.comboWindow -= dt;
            if (this.comboWindow <= 0) this.comboHits = 0;
        }

        if (this.mixer) {
            this.mixer.update(dt);

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

        // Ground check
        if (this.position.y <= 0) {
            this.position.y = 0;
            this.velocity.y = 0;
            if (!this.isGrounded) {
                this.isGrounded = true;
                if (this.state === FighterState.JUMPING) {
                    this.state = FighterState.IDLE;
                    if (this.mixer) this.playAnimation('IDLE');
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
        if (this.state === FighterState.PUNCHING && this.config.id === 'young_zealous') {
            // Pull punch hitbox slightly inward to better match visible arm length.
            baseOffset = 0.58;
        }
        const offset = baseOffset * this.facingDirection;
        const yOffset = this.state === FighterState.KICKING ? 0.5 : 1.2;
        this.hitbox.setFromCenterAndSize(
            new THREE.Vector3(this.position.x + offset, this.position.y + yOffset, this.position.z),
            new THREE.Vector3(0.8, 0.8, 0.8)
        );
    }

    checkHit(opponent) {
        if (this.hitbox.intersectsBox(opponent.hurtbox)) {
            if (this.game && typeof this.game.onHitImpact === 'function') {
                const hitCenter = new THREE.Vector3();
                const hurtCenter = new THREE.Vector3();
                this.hitbox.getCenter(hitCenter);
                opponent.hurtbox.getCenter(hurtCenter);
                const impactPoint = hitCenter.lerp(hurtCenter, 0.5);
                this.game.onHitImpact(impactPoint, this.lastAttackMeta);
            }
            opponent.takeDamage(this.hitboxDamage, this.lastAttackMeta);
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

    jump(useLongJump = false) {
        if (this.isGrounded && this.state !== FighterState.HIT) {
            if (this.config.id === 'young_zealous') {
                this.velocity.y = useLongJump ? CONFIG.FIGHTER.JUMP_FORCE * 1.1 : CONFIG.FIGHTER.JUMP_FORCE * 0.92;
            } else {
                this.velocity.y = CONFIG.FIGHTER.JUMP_FORCE;
            }
            this.isGrounded = false;
            this.state = FighterState.JUMPING;
            if (this.mixer) {
                const jumpAnimSpeed = this.config.id === 'young_zealous' ? 1.08 : 1;
                const jumpTrimStart = this.config.id === 'young_zealous' ? 0.08 : 0;
                const jumpTrimEnd = this.config.id === 'young_zealous' ? 0.82 : 1;
                const jumpClip = this.config.id === 'young_zealous'
                    ? (useLongJump && this.animations.LONG_JUMP ? 'LONG_JUMP' : (this.animations.SHORT_JUMP ? 'SHORT_JUMP' : 'JUMP'))
                    : 'JUMP';
                this.playAnimation(jumpClip, 0.1, false, jumpAnimSpeed, jumpTrimStart, jumpTrimEnd);
            }
        }
    }

    playKOSequence(endsRound = false) {
        if (this.isKOSequenceActive) return;
        this.isKOSequenceActive = true;
        this.koEndsRound = endsRound;
        this.hitboxActive = false;
        this.velocity.set(0, 0, 0);

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
        }, 600);

        setTimeout(() => {
            if (this.koEndsRound) {
                this.state = FighterState.DEAD;
            } else {
                this.state = FighterState.IDLE;
                if (this.mixer) this.playAnimation('IDLE', 0.08, true);
            }
            this.isKOSequenceActive = false;
            if (this.koEndsRound && this.game && typeof this.game.onFighterKnockedOut === 'function') {
                this.game.onFighterKnockedOut(this);
            }
        }, 1000);
    }

    move(dir, forceCrouchWalk = false) {
        if ([FighterState.IDLE, FighterState.WALK, FighterState.JUMPING].includes(this.state)) {
            this.position.x += dir * CONFIG.FIGHTER.WALK_SPEED;
            if (this.isGrounded) {
                const wasWalking = this.state === FighterState.WALK;
                this.state = FighterState.WALK;
                if (this.mixer && this.config.id === 'young_zealous') {
                    const moveAnim = forceCrouchWalk ? 'CROUCH_WALK' : 'RUN';
                    const activeName = this.currentAction ? this.currentAction.getClip().name : '';
                    if (activeName !== moveAnim && this.animations[moveAnim]) {
                        this.playAnimation(moveAnim, 0.08, true);
                    }
                } else if (this.mixer && !wasWalking) {
                    this.playAnimation('IDLE');
                }
            }
        }
    }

    stop() {
        if (this.state === FighterState.WALK) {
            this.state = FighterState.IDLE;
            if (this.mixer) this.playAnimation('IDLE');
        }
    }

    block(isBlocking) {
        if (this.state === FighterState.DEAD || this.state === FighterState.HIT) return;
        
        if (isBlocking && this.isGrounded) {
            if (this.state !== FighterState.BLOCKING) {
                this.state = FighterState.BLOCKING;
                if (this.mixer) this.playAnimation('BLOCK');
            }
        } else if (this.state === FighterState.BLOCKING) {
            this.state = FighterState.IDLE;
            if (this.mixer) this.playAnimation('IDLE');
        }
    }

    punch(isUppercut = false) {
        if (this.state === FighterState.PUNCHING || this.state === FighterState.KICKING || this.state === FighterState.HIT) return;
        
        const now = Date.now();
        let anim = 'PUNCH_R';
        let damage = 10;
        let duration = 400;
        let hitboxStart = 100;
        let punchAnimSpeed = 1;

        if (isUppercut) {
            anim = 'UPPERCUT';
            damage = 15;
            duration = 600;
            hitboxStart = 140;
        } else if (now - this.lastPunchTime < 400) {
            anim = 'PUNCH_L';
            damage = 12;
            this.lastPunchTime = 0;
        } else {
            this.lastPunchTime = now;
        }

        if (this.config.id === 'young_zealous') {
            punchAnimSpeed = isUppercut ? 1.3 : 1.55;
            duration = Math.round(duration * 0.72);
            hitboxStart = Math.round(hitboxStart * 0.7);
        }

        this.state = FighterState.PUNCHING;
        this.hitboxDamage = damage;
        this.lastAttackMeta = {
            move: anim,
            heavy: isUppercut
        };
        if (this.mixer) this.playAnimation(anim, 0.05, false, punchAnimSpeed);
        
        setTimeout(() => this.hitboxActive = true, hitboxStart);
        setTimeout(() => {
            if (this.state === FighterState.PUNCHING) {
                this.state = FighterState.IDLE;
                if (this.mixer) this.playAnimation('IDLE');
                this.hitboxActive = false;
            }
        }, duration);
    }

    kick(type = 'SIDEKICK') {
        if (this.state === FighterState.PUNCHING || this.state === FighterState.KICKING || this.state === FighterState.HIT) return;
        
        this.state = FighterState.KICKING;
        this.hitboxDamage = type === 'SPINKICK' ? 20 : (type === 'LOWKICK' ? 8 : 12);
        this.lastAttackMeta = {
            move: type,
            heavy: ['SPINKICK', 'LOWKICK'].includes(type)
        };
        let kickAnimSpeed = 1;
        let duration = type === 'SPINKICK' ? 800 : 500;
        let hitboxStart = 150;

        if (this.config.id === 'young_zealous') {
            kickAnimSpeed = type === 'SPINKICK' ? 1.25 : 1.4;
            duration = Math.round(duration * 0.74);
            hitboxStart = Math.round(hitboxStart * 0.75);
        }

        if (this.mixer) this.playAnimation(type, 0.05, false, kickAnimSpeed);
        
        setTimeout(() => this.hitboxActive = true, hitboxStart);
        setTimeout(() => {
            if (this.state === FighterState.KICKING) {
                this.state = FighterState.IDLE;
                if (this.mixer) this.playAnimation('IDLE');
                this.hitboxActive = false;
            }
        }, duration);
    }

    takeDamage(amount, attackMeta = { heavy: false, move: '' }) {
        if (this.state === FighterState.BLOCKING) {
            amount *= 0.1;
        } else {
            this.comboHits += 1;
            this.comboWindow = 1.6;

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
                if (this.mixer) this.playAnimation('HIT', 0.05, false);
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
