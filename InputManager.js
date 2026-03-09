import { CONFIG } from './Config.js';

export class InputManager {
    constructor(game) {
        this.game = game;
        this.f1 = null;
        this.f2 = null;
        this.keys = {};
        this.rPressCount = 0;
        this.rotationStepDegrees = 5;
        this.jumpPressStart = { p1: 0, p2: 0 };
        this.longJumpHoldMs = 180;
        
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        this.initTouchListeners();
    }

    setFighters(f1, f2) {
        this.f1 = f1;
        this.f2 = f2;
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
                this.keys[CONFIG.P1_CONTROLS.LEFT] = x < -deadzone;
                this.keys[CONFIG.P1_CONTROLS.RIGHT] = x > deadzone;
                this.keys[CONFIG.P1_CONTROLS.UP] = y < -deadzone;
                this.keys[CONFIG.P1_CONTROLS.DOWN] = y > deadzone;
                
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
        this.keys[e.code] = true;

        if (!this.game.isSelecting && e.code === CONFIG.P1_CONTROLS.KICK && !e.repeat) {
            this.rPressCount += 1;
            if (this.rPressCount >= 3) {
                this.rPressCount = 0;
                this.game.toggleRotationDebug();
            }
        }
        
        if (this.game.isSelecting) {
            this.handleSelection(e.code);
            return;
        }
        this.handleImmediateActions(e.code);
    }

    onKeyUp(e) {
        this.keys[e.code] = false;

        if (this.f1 && e.code === CONFIG.P1_CONTROLS.UP && this.f1.config.id === 'young_zealous') {
            const held = Date.now() - this.jumpPressStart.p1;
            this.jumpPressStart.p1 = 0;
            this.f1.jump(held >= this.longJumpHoldMs);
        }
        if (this.f2 && e.code === CONFIG.P2_CONTROLS.UP && this.f2.config.id === 'young_zealous') {
            const held = Date.now() - this.jumpPressStart.p2;
            this.jumpPressStart.p2 = 0;
            this.f2.jump(held >= this.longJumpHoldMs);
        }
        
        if (this.f1) {
            if (e.code === CONFIG.P1_CONTROLS.LEFT || e.code === CONFIG.P1_CONTROLS.RIGHT) this.f1.stop();
            if (e.code === CONFIG.P1_CONTROLS.DOWN) this.f1.block(false);
        }
        if (this.f2) {
            if (e.code === CONFIG.P2_CONTROLS.LEFT || e.code === CONFIG.P2_CONTROLS.RIGHT) this.f2.stop();
            if (e.code === CONFIG.P2_CONTROLS.DOWN) this.f2.block(false);
        }
    }

    handleSelection(code) {
        const chars = CONFIG.ASSETS.CHARACTERS;
        // P1 Browse
        if (code === CONFIG.P1_CONTROLS.LEFT) this.game.p1Index = (this.game.p1Index - 1 + chars.length) % chars.length;
        if (code === CONFIG.P1_CONTROLS.RIGHT) this.game.p1Index = (this.game.p1Index + 1) % chars.length;
        if (code === CONFIG.P1_CONTROLS.SELECT) this.game.p1Ready = true;

        // P2 Browse
        if (code === CONFIG.P2_CONTROLS.LEFT) this.game.p2Index = (this.game.p2Index - 1 + chars.length) % chars.length;
        if (code === CONFIG.P2_CONTROLS.RIGHT) this.game.p2Index = (this.game.p2Index + 1) % chars.length;
        if (code === CONFIG.P2_CONTROLS.SELECT) this.game.p2Ready = true;
    }

    handleImmediateActions(code) {
        if (!this.f1 || !this.f2) return;
        if (!this.game.roundInProgress) return;

        if (this.game.rotationDebugEnabled) {
            if (code === 'KeyQ') this.game.rotatePlayer(1, -this.rotationStepDegrees);
            if (code === 'KeyE') this.game.rotatePlayer(1, this.rotationStepDegrees);
            if (code === 'KeyU') this.game.rotatePlayer(2, -this.rotationStepDegrees);
            if (code === 'KeyO') this.game.rotatePlayer(2, this.rotationStepDegrees);
        }

        if (this.f1.config.id === 'young_zealous') {
            if (code === 'KeyT') this.f1.triggerYoungZealousMove('BIG_STOMACH_HIT', 700);
            if (code === 'KeyY') this.f1.triggerYoungZealousMove('FLYING', 680);
            if (code === 'KeyH') this.f1.triggerYoungZealousMove('RUN', 650);
        }
        
        // Player 1
        if (code === CONFIG.P1_CONTROLS.UP) {
            if (this.f1.config.id === 'young_zealous') {
                if (!this.jumpPressStart.p1) this.jumpPressStart.p1 = Date.now();
            } else {
                this.f1.jump();
            }
        }
        if (code === CONFIG.P1_CONTROLS.PUNCH) {
            this.f1.punch(this.keys[CONFIG.P1_CONTROLS.UP]);
        }
        if (code === CONFIG.P1_CONTROLS.KICK) {
            let type = 'SIDEKICK';
            if (this.keys[CONFIG.P1_CONTROLS.DOWN]) type = 'LOWKICK';
            else if (this.keys[CONFIG.P1_CONTROLS.LEFT] || this.keys[CONFIG.P1_CONTROLS.RIGHT]) type = 'SPINKICK';
            this.f1.kick(type);
        }

        // Player 2
        if (code === CONFIG.P2_CONTROLS.UP) {
            if (this.f2.config.id === 'young_zealous') {
                if (!this.jumpPressStart.p2) this.jumpPressStart.p2 = Date.now();
            } else {
                this.f2.jump();
            }
        }
        if (code === CONFIG.P2_CONTROLS.PUNCH) {
            this.f2.punch(this.keys[CONFIG.P2_CONTROLS.UP]);
        }
        if (code === CONFIG.P2_CONTROLS.KICK) {
            let type = 'SIDEKICK';
            if (this.keys[CONFIG.P2_CONTROLS.DOWN]) type = 'LOWKICK';
            else if (this.keys[CONFIG.P2_CONTROLS.LEFT] || this.keys[CONFIG.P2_CONTROLS.RIGHT]) type = 'SPINKICK';
            this.f2.kick(type);
        }
    }

    update() {
        if (!this.f1 || !this.f2) return;
        if (!this.game.roundInProgress) return;

        const p1Left = this.keys[CONFIG.P1_CONTROLS.LEFT];
        const p1Right = this.keys[CONFIG.P1_CONTROLS.RIGHT];
        const p1Down = this.keys[CONFIG.P1_CONTROLS.DOWN];
        const p2Left = this.keys[CONFIG.P2_CONTROLS.LEFT];
        const p2Right = this.keys[CONFIG.P2_CONTROLS.RIGHT];
        const p2Down = this.keys[CONFIG.P2_CONTROLS.DOWN];

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

        if (this.f2.config.id === 'young_zealous' && p2Down && p2Forward) {
            this.f2.move(this.f2.facingDirection, true);
        } else {
            if (p2Left) this.f2.move(-1);
            if (p2Right) this.f2.move(1);
            if (p2Down) this.f2.block(true);
        }
    }
}
