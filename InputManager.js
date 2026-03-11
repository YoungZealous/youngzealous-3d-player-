import { CONFIG } from './Config.js';

export class InputManager {
    constructor(game) {
        this.game = game;
        this.f1 = null;
        this.f2 = null;
        this.keys = {};
        this.rotationStepDegrees = 5;
        this.directionHistory = { p1: [], p2: [] };
        this.directionHistoryMs = 1200;
        this.aiDecisionTimer = 0;
        this.aiAttackCooldown = 0;
        this.aiJumpCooldown = 0;
        this.aiBlockTimer = 0;
        this.aiProfiles = [
            {
                decisionBase: 0.15,
                decisionRand: 0.2,
                approachDist: 2.0,
                blockCloseDist: 0.8,
                blockChance: 0.14,
                jumpDist: 3.0,
                jumpChance: 0.008,
                attackRange: 1.42,
                punchChance: 0.62,
                uppercutChance: 0.08,
                lowKickChance: 0.2,
                spinKickChance: 0.08,
                attackCdMin: 0.55,
                attackCdRand: 0.65
            },
            {
                decisionBase: 0.1,
                decisionRand: 0.16,
                approachDist: 1.7,
                blockCloseDist: 0.85,
                blockChance: 0.22,
                jumpDist: 2.8,
                jumpChance: 0.012,
                attackRange: 1.52,
                punchChance: 0.52,
                uppercutChance: 0.16,
                lowKickChance: 0.24,
                spinKickChance: 0.13,
                attackCdMin: 0.42,
                attackCdRand: 0.55
            },
            {
                decisionBase: 0.08,
                decisionRand: 0.14,
                approachDist: 1.62,
                blockCloseDist: 0.9,
                blockChance: 0.28,
                jumpDist: 2.7,
                jumpChance: 0.016,
                attackRange: 1.58,
                punchChance: 0.48,
                uppercutChance: 0.2,
                lowKickChance: 0.25,
                spinKickChance: 0.16,
                attackCdMin: 0.34,
                attackCdRand: 0.46
            },
            {
                decisionBase: 0.07,
                decisionRand: 0.12,
                approachDist: 1.55,
                blockCloseDist: 0.92,
                blockChance: 0.34,
                jumpDist: 2.6,
                jumpChance: 0.02,
                attackRange: 1.62,
                punchChance: 0.46,
                uppercutChance: 0.24,
                lowKickChance: 0.27,
                spinKickChance: 0.19,
                attackCdMin: 0.28,
                attackCdRand: 0.4
            },
            {
                decisionBase: 0.055,
                decisionRand: 0.1,
                approachDist: 1.52,
                blockCloseDist: 0.95,
                blockChance: 0.4,
                jumpDist: 2.5,
                jumpChance: 0.024,
                attackRange: 1.68,
                punchChance: 0.44,
                uppercutChance: 0.3,
                lowKickChance: 0.28,
                spinKickChance: 0.22,
                attackCdMin: 0.22,
                attackCdRand: 0.32
            }
        ];
        
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        this.initTouchListeners();
    }

    setFighters(f1, f2) {
        this.f1 = f1;
        this.f2 = f2;
    }

    getAIDifficultyProfile() {
        const idx = this.game?.aiDifficultyIndex ?? 1;
        return this.aiProfiles[Math.max(0, Math.min(this.aiProfiles.length - 1, idx))] || this.aiProfiles[1];
    }

    onAIDifficultyChanged() {
        this.aiDecisionTimer = 0;
        this.aiAttackCooldown = Math.min(this.aiAttackCooldown, 0.08);
        this.aiJumpCooldown = Math.min(this.aiJumpCooldown, 0.2);
        this.aiBlockTimer = 0;
    }

    initTouchListeners() {
        const punchBtn = document.getElementById('btn-punch');
        const kickBtn = document.getElementById('btn-kick');
        const joystick = document.getElementById('joystick-container');

        if (punchBtn) {
            punchBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.onKeyDown({ code: CONFIG.P1_CONTROLS.PUNCH }); });
        }
        if (kickBtn) {
            kickBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.onKeyDown({ code: CONFIG.P1_CONTROLS.KICK }); });
        }

        if (joystick) {
            const handleTouch = (e) => {
                e.preventDefault();
                const rect = joystick.getBoundingClientRect();
                const touch = e.touches[0];
                const x = (touch.clientX - rect.left - rect.width / 2) / (rect.width / 2);
                const y = (touch.clientY - rect.top - rect.height / 2) / (rect.height / 2);
                
                const deadzone = 0.2;
                const wasUp = !!this.keys[CONFIG.P1_CONTROLS.UP];
                this.keys[CONFIG.P1_CONTROLS.LEFT] = x < -deadzone;
                this.keys[CONFIG.P1_CONTROLS.RIGHT] = x > deadzone;
                this.keys[CONFIG.P1_CONTROLS.UP] = y < -deadzone;
                this.keys[CONFIG.P1_CONTROLS.DOWN] = y > deadzone;

                // Jump on press edge for touch controls, same as keyboard.
                if (!wasUp && this.keys[CONFIG.P1_CONTROLS.UP] && this.f1 && this.game.roundInProgress && !this.game.isPaused) {
                    this.f1.jump();
                }
                
                if (this.game.ui) this.game.ui.updateJoystick(x, y);
            };

            joystick.addEventListener('touchstart', handleTouch);
            joystick.addEventListener('touchmove', handleTouch);
            joystick.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys[CONFIG.P1_CONTROLS.LEFT] = false;
                this.keys[CONFIG.P1_CONTROLS.RIGHT] = false;
                this.keys[CONFIG.P1_CONTROLS.UP] = false;
                this.keys[CONFIG.P1_CONTROLS.DOWN] = false;
                if (this.game.ui) this.game.ui.updateJoystick(0, 0);
            });
        }
    }

    onKeyDown(e) {
        const wasDown = !!this.keys[e.code];
        this.keys[e.code] = true;

        if ((e.code === 'KeyP' || e.code === 'Digit5') && !e.repeat && !this.game.isSelecting) {
            this.game.togglePause();
            return;
        }

        if (this.game.isPaused) return;

        if (this.game.isSelecting) {
            this.handleSelection(e.code);
            return;
        }

        if (!wasDown) {
            this.recordDirectionalFromKey(e.code);
        }

        this.handleImmediateActions(e.code, wasDown);
    }

    onKeyUp(e) {
        this.keys[e.code] = false;

        if (this.game.isPaused) return;
        
        if (this.f1) {
            if (e.code === CONFIG.P1_CONTROLS.LEFT || e.code === CONFIG.P1_CONTROLS.RIGHT) this.f1.stop();
            if (e.code === CONFIG.P1_CONTROLS.DOWN) this.f1.block(false);
        }
        if (this.f2 && this.game.gameMode !== 'ai') {
            if (e.code === CONFIG.P2_CONTROLS.LEFT || e.code === CONFIG.P2_CONTROLS.RIGHT) this.f2.stop();
            if (e.code === CONFIG.P2_CONTROLS.DOWN) this.f2.block(false);
        }
    }

    applySelectionModeRules() {
        if (this.game.gameMode === 'ai') {
            this.game.aiSelectStage = this.game.p1Ready ? 'p2' : 'p1';
            this.game.p2Ready = false;
        } else {
            this.game.aiSelectStage = 'p1';
            this.game.p2Ready = false;
        }
    }

    handleSelection(code) {
        const chars = CONFIG.ASSETS.CHARACTERS;
        const isConfirm = code === CONFIG.P1_CONTROLS.SELECT || code === CONFIG.P2_CONTROLS.SELECT;

        if (code === CONFIG.P1_CONTROLS.UP) {
            this.game.ui?.playMenuNavigatePrimary?.();
            if (this.game.selectionFocus === 'fighters') {
                this.game.selectionFocus = this.game.gameMode === 'ai' ? 'difficulty' : 'mode';
            } else if (this.game.selectionFocus === 'difficulty') {
                this.game.selectionFocus = 'mode';
            } else {
                this.game.selectionFocus = 'mode';
            }
            return;
        }

        if (code === CONFIG.P1_CONTROLS.DOWN) {
            this.game.ui?.playMenuNavigatePrimary?.();
            if (this.game.selectionFocus === 'mode') {
                this.game.selectionFocus = this.game.gameMode === 'ai' ? 'difficulty' : 'fighters';
            } else {
                this.game.selectionFocus = 'fighters';
            }
        }

        if (code === 'Digit1' || code === 'Numpad1' || code === 'KeyM') {
            this.game.ui?.playMenuNavigatePrimary?.();
            this.game.gameMode = 'multiplayer';
            if (this.game.selectionFocus === 'difficulty') this.game.selectionFocus = 'mode';
            this.applySelectionModeRules();
        }
        if (code === 'Digit2' || code === 'Numpad2' || code === 'KeyN') {
            this.game.ui?.playMenuNavigatePrimary?.();
            this.game.gameMode = 'ai';
            if (this.game.selectionFocus === 'fighters') this.game.selectionFocus = 'difficulty';
            this.applySelectionModeRules();
        }

        if (this.game.selectionFocus === 'mode') {
            const wantsModeChange =
                code === CONFIG.P1_CONTROLS.LEFT
                || code === CONFIG.P1_CONTROLS.RIGHT
                || code === CONFIG.P2_CONTROLS.LEFT
                || code === CONFIG.P2_CONTROLS.RIGHT;

            if (wantsModeChange) {
                this.game.ui?.playMenuNavigatePrimary?.();
                this.game.gameMode = this.game.gameMode === 'ai' ? 'multiplayer' : 'ai';
                this.applySelectionModeRules();
                if (this.game.gameMode !== 'ai' && this.game.selectionFocus === 'difficulty') {
                    this.game.selectionFocus = 'mode';
                }
            }
            return;
        }

        if (this.game.selectionFocus === 'difficulty' && this.game.gameMode === 'ai') {
            const wantsDifficultyChange = code === CONFIG.P1_CONTROLS.LEFT || code === CONFIG.P1_CONTROLS.RIGHT;
            if (wantsDifficultyChange) {
                this.game.ui?.playMenuNavigatePrimary?.();
                const delta = code === CONFIG.P1_CONTROLS.LEFT ? -1 : 1;
                this.game.adjustAIDifficulty(delta);
            }
            return;
        }

        if (this.game.gameMode === 'ai' && isConfirm) {
            this.game.ui?.playMenuConfirm?.();
            if (this.game.aiSelectStage === 'p1') {
                this.game.p1Ready = true;
                this.game.aiSelectStage = 'p2';
                this.game.selectionFocus = 'fighters';
                this.game.ui?.playSelectFighterPrompt?.();
                return;
            }
            if (this.game.aiSelectStage === 'p2') {
                this.game.p2Ready = true;
                return;
            }
        }

        if (this.game.gameMode !== 'ai' && isConfirm) {
            this.game.p1Ready = true;
            this.game.ui?.playMenuConfirm?.();
            // In multiplayer, Enter is still also allowed to confirm P2 below.
            if (code === CONFIG.P1_CONTROLS.SELECT) return;
        }

        // P1 Browse
        if (this.game.gameMode === 'ai' && this.game.aiSelectStage === 'p2') {
            if (code === CONFIG.P1_CONTROLS.LEFT || code === CONFIG.P2_CONTROLS.LEFT) {
                this.game.ui?.playMenuNavigatePrimary?.();
                this.game.p2Index = (this.game.p2Index - 1 + chars.length) % chars.length;
            }
            if (code === CONFIG.P1_CONTROLS.RIGHT || code === CONFIG.P2_CONTROLS.RIGHT) {
                this.game.ui?.playMenuNavigatePrimary?.();
                this.game.p2Index = (this.game.p2Index + 1) % chars.length;
            }
            return;
        }

        if (code === CONFIG.P1_CONTROLS.LEFT) {
            this.game.ui?.playMenuNavigatePrimary?.();
            this.game.p1Index = (this.game.p1Index - 1 + chars.length) % chars.length;
        }
        if (code === CONFIG.P1_CONTROLS.RIGHT) {
            this.game.ui?.playMenuNavigatePrimary?.();
            this.game.p1Index = (this.game.p1Index + 1) % chars.length;
        }

        // P2 Browse and ready only in multiplayer mode.
        if (this.game.gameMode !== 'ai') {
            if (code === CONFIG.P2_CONTROLS.LEFT) {
                this.game.ui?.playMenuNavigatePrimary?.();
                this.game.p2Index = (this.game.p2Index - 1 + chars.length) % chars.length;
            }
            if (code === CONFIG.P2_CONTROLS.RIGHT) {
                this.game.ui?.playMenuNavigatePrimary?.();
                this.game.p2Index = (this.game.p2Index + 1) % chars.length;
            }
            if (code === CONFIG.P2_CONTROLS.SELECT) {
                this.game.ui?.playMenuConfirm?.();
                this.game.p2Ready = true;
            }
        }
    }

    handleImmediateActions(code, wasDown = false) {
        if (!this.f1 || !this.f2) return;
        if (!this.game.roundInProgress) return;

        if (this.game.rotationDebugEnabled) {
            if (code === 'KeyQ') this.game.rotatePlayer(1, -this.rotationStepDegrees);
            if (code === 'KeyE') this.game.rotatePlayer(1, this.rotationStepDegrees);
            if (code === 'KeyU') this.game.rotatePlayer(2, -this.rotationStepDegrees);
            if (code === 'KeyO') this.game.rotatePlayer(2, this.rotationStepDegrees);
        }

        if (this.f1.config.id === 'young_zealous') {
            if (code === 'KeyT') this.f1.triggerDance();
            if (code === 'KeyG') this.f1.triggerGrabSlam(this.f2);
            if (code === 'KeyY') this.f1.triggerYoungZealousMove('FLYING', 680);
            if (code === 'KeyH') this.f1.triggerYoungZealousMove('RUN', 650);
        }
        
        // Player 1
        if (code === CONFIG.P1_CONTROLS.UP && !wasDown) {
            this.f1.jump();
        }
        if (code === CONFIG.P1_CONTROLS.PUNCH) {
            this.f1.punch(this.keys[CONFIG.P1_CONTROLS.UP]);
        }
        if (code === CONFIG.P1_CONTROLS.KICK) {
            const p1Forward = this.isForwardHeld(this.f1, CONFIG.P1_CONTROLS.LEFT, CONFIG.P1_CONTROLS.RIGHT);
            if (this.f1.config.id === 'young_zealous' && this.keys[CONFIG.P1_CONTROLS.DOWN] && p1Forward) {
                this.f1.triggerRollKickFrontFlip(this.f2);
                return;
            }
            if (this.f1.config.id === 'young_zealous' && this.keys[CONFIG.P1_CONTROLS.UP] && p1Forward) {
                this.f1.triggerFunClumbKick(this.f2);
                return;
            }
            let type = 'SIDEKICK';
            if (this.keys[CONFIG.P1_CONTROLS.DOWN]) type = 'LOWKICK';
            else if (this.keys[CONFIG.P1_CONTROLS.LEFT] || this.keys[CONFIG.P1_CONTROLS.RIGHT]) type = 'SPINKICK';
            this.f1.kick(type);
        }

        // Player 2 (multiplayer only)
        if (this.game.gameMode !== 'ai') {
            if (code === CONFIG.P2_CONTROLS.UP && !wasDown) {
                this.f2.jump();
            }
            if (code === CONFIG.P2_CONTROLS.PUNCH) {
                this.f2.punch(this.keys[CONFIG.P2_CONTROLS.UP]);
            }
            if (code === CONFIG.P2_CONTROLS.KICK) {
                const p2Forward = this.isForwardHeld(this.f2, CONFIG.P2_CONTROLS.LEFT, CONFIG.P2_CONTROLS.RIGHT);
                if (this.f2.config.id === 'young_zealous' && this.keys[CONFIG.P2_CONTROLS.DOWN] && p2Forward) {
                    this.f2.triggerRollKickFrontFlip(this.f1);
                    return;
                }
                if (this.f2.config.id === 'young_zealous' && this.keys[CONFIG.P2_CONTROLS.UP] && p2Forward) {
                    this.f2.triggerFunClumbKick(this.f1);
                    return;
                }
                let type = 'SIDEKICK';
                if (this.keys[CONFIG.P2_CONTROLS.DOWN]) type = 'LOWKICK';
                else if (this.keys[CONFIG.P2_CONTROLS.LEFT] || this.keys[CONFIG.P2_CONTROLS.RIGHT]) type = 'SPINKICK';
                this.f2.kick(type);
            }
        }
    }

    updateAI(dt) {
        if (!this.f1 || !this.f2) return;
        const profile = this.getAIDifficultyProfile();

        this.aiDecisionTimer = Math.max(0, this.aiDecisionTimer - dt);
        this.aiAttackCooldown = Math.max(0, this.aiAttackCooldown - dt);
        this.aiJumpCooldown = Math.max(0, this.aiJumpCooldown - dt);
        this.aiBlockTimer = Math.max(0, this.aiBlockTimer - dt);

        const dx = this.f1.position.x - this.f2.position.x;
        const dist = Math.abs(dx);
        const toward = dx >= 0 ? 1 : -1;

        if (this.aiDecisionTimer <= 0) {
            this.aiDecisionTimer = profile.decisionBase + Math.random() * profile.decisionRand;

            if (dist > profile.approachDist) {
                this.f2.block(false);
                this.f2.move(toward);
            } else if (dist < profile.blockCloseDist && Math.random() < profile.blockChance) {
                this.aiBlockTimer = 0.18 + Math.random() * 0.22;
            }
        }

        if (this.aiBlockTimer > 0) this.f2.block(true);
        else this.f2.block(false);

        if (dist > profile.jumpDist && this.aiJumpCooldown <= 0 && Math.random() < profile.jumpChance) {
            this.f2.jump();
            this.aiJumpCooldown = 1.5 + Math.random() * 1.2;
        }

        if (dist <= profile.attackRange && this.aiAttackCooldown <= 0) {
            const roll = Math.random();
            if (roll < profile.punchChance) {
                this.f2.punch(Math.random() < profile.uppercutChance);
            } else {
                const kickRoll = Math.random();
                const kickType = kickRoll < profile.lowKickChance
                    ? 'LOWKICK'
                    : (kickRoll < profile.lowKickChance + profile.spinKickChance ? 'SPINKICK' : 'SIDEKICK');
                this.f2.kick(kickType);
            }
            this.aiAttackCooldown = profile.attackCdMin + Math.random() * profile.attackCdRand;
        }
    }

    isForwardHeld(fighter, leftKey, rightKey) {
        return fighter.facingDirection === 1 ? !!this.keys[rightKey] : !!this.keys[leftKey];
    }

    recordDirectionalFromKey(code) {
        if (!this.f1 || !this.f2 || !this.game.roundInProgress) return;
        this.recordForPlayer(code, this.f1, this.f2, 'p1', CONFIG.P1_CONTROLS);
        this.recordForPlayer(code, this.f2, this.f1, 'p2', CONFIG.P2_CONTROLS);
    }

    recordForPlayer(code, fighter, opponent, key, controls) {
        if (fighter.config.id !== 'young_zealous') return;
        let token = null;

        if (code === controls.UP) token = 'U';
        else if (code === controls.DOWN) token = 'D';
        else if (code === controls.LEFT || code === controls.RIGHT) {
            const dir = code === controls.LEFT ? -1 : 1;
            token = dir === fighter.facingDirection ? 'F' : 'B';
        }

        if (!token) return;
        const now = Date.now();
        const history = this.directionHistory[key];
        history.push({ token, time: now });
        this.directionHistory[key] = history.filter((step) => now - step.time <= this.directionHistoryMs).slice(-8);

        const tokens = this.directionHistory[key].map((s) => s.token);
        if (this.endsWith(tokens, ['U', 'U', 'D', 'D'])) {
            fighter.triggerStompWave(opponent);
            this.directionHistory[key] = [];
            return;
        }

        if (this.endsWith(tokens, ['B', 'B', 'F'])) {
            fighter.castFireball(opponent);
            this.directionHistory[key] = [];
        }
    }

    endsWith(tokens, pattern) {
        if (tokens.length < pattern.length) return false;
        const start = tokens.length - pattern.length;
        for (let i = 0; i < pattern.length; i++) {
            if (tokens[start + i] !== pattern[i]) return false;
        }
        return true;
    }

    update(dt = 1 / 60) {
        if (!this.f1 || !this.f2) return;
        if (this.game.isPaused) return;
        if (!this.game.roundInProgress) return;

        const p1Left = this.keys[CONFIG.P1_CONTROLS.LEFT];
        const p1Right = this.keys[CONFIG.P1_CONTROLS.RIGHT];
        const p1Down = this.keys[CONFIG.P1_CONTROLS.DOWN];
        const p2Left = this.keys[CONFIG.P2_CONTROLS.LEFT];
        const p2Right = this.keys[CONFIG.P2_CONTROLS.RIGHT];
        const p2Down = this.keys[CONFIG.P2_CONTROLS.DOWN];
        const aiMode = this.game.gameMode === 'ai';

        const p1Forward = this.f1.facingDirection === 1 ? p1Right : p1Left;
        const p2Forward = this.f2.facingDirection === 1 ? p2Right : p2Left;
        
        // Continuous movement
        if (this.f1.config.id === 'young_zealous' && p1Down && p1Forward) {
            this.f1.move(this.f1.facingDirection, true);
        } else {
            if (p1Left) this.f1.move(-1);
            if (p1Right) this.f1.move(1);
            if (p1Down) this.f1.block(true);
        }

        if (aiMode) {
            this.updateAI(dt);
        } else if (this.f2.config.id === 'young_zealous' && p2Down && p2Forward) {
            this.f2.move(this.f2.facingDirection, true);
        } else {
            if (p2Left) this.f2.move(-1);
            if (p2Right) this.f2.move(1);
            if (p2Down) this.f2.block(true);
        }
    }
}
