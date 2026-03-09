import { CONFIG } from './Config.js';

export class UI {
    constructor() {
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.pointerEvents = 'none';
        this.container.style.fontFamily = "'Orbitron', sans-serif";
        this.container.style.color = 'white';
        document.body.appendChild(this.container);

        this.initHUD();
        this.initMobileControls();
    }

    initHUD() {
        this.container.innerHTML = `
            <!-- Character Select -->
            <div id="char-select" style="position: absolute; inset: 0; background: rgba(0,0,0,0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 100; pointer-events: auto;">
                <h1 style="font-size: 64px; margin-bottom: 40px; text-shadow: 0 0 20px #f80;">SELECT YOUR FIGHTER</h1>
                <div style="display: flex; gap: 40px;">
                    <div id="p1-select-panel" style="width: 300px; padding: 20px; border: 4px solid #fff; background: rgba(255,255,255,0.1); text-align: center;">
                        <h2 style="color: #f44;">PLAYER 1</h2>
                        <div id="p1-char-name" style="font-size: 28px; margin: 20px 0;">YOUNG ZEALOUS</div>
                        <div style="color: #aaa; font-size: 14px;">[SPACE] TO SELECT</div>
                        <div id="p1-ready" style="margin-top: 20px; font-size: 24px; color: #4f4; display: none;">READY!</div>
                    </div>
                    <div id="p2-select-panel" style="width: 300px; padding: 20px; border: 4px solid #fff; background: rgba(255,255,255,0.1); text-align: center;">
                        <h2 style="color: #44f;">PLAYER 2</h2>
                        <div id="p2-char-name" style="font-size: 28px; margin: 20px 0;">YOUNG ZEALOUS</div>
                        <div style="color: #aaa; font-size: 14px;">[ENTER] TO SELECT</div>
                        <div id="p2-ready" style="margin-top: 20px; font-size: 24px; color: #4f4; display: none;">READY!</div>
                    </div>
                </div>
                <div style="margin-top: 40px; color: #888;">USE [A/D] and [LEFT/RIGHT] to browse</div>
            </div>

            <!-- Player 1 HUD -->
            <div id="hud-p1" style="display: none; position: absolute; top: 5%; left: 3%; width: 40%;">
                <div id="hud-p1-name" style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">SHARON</div>
                <div style="width: 100%; height: 25px; background: rgba(255,255,255,0.2); border: 2px solid white;">
                    <div id="p1-health" style="width: 100%; height: 100%; background: linear-gradient(90deg, #ff0000, #ff8800); transition: width 0.3s;"></div>
                </div>
                <div style="margin-top: 5px; font-size: 12px; color: #aaa;">PLAYER 1</div>
            </div>

            <!-- Timer -->
            <div id="hud-timer" style="display: none; position: absolute; top: 4%; left: 50%; transform: translateX(-50%); text-align: center;">
                <div id="timer" style="font-size: 48px; font-weight: bold; padding: 10px 20px; background: rgba(0,0,0,0.5); border-radius: 10px; border: 2px solid #f80;">99</div>
                <div id="round-indicator" style="margin-top: 8px; font-size: 18px; letter-spacing: 1px; color: #ffd88a;">ROUND 1 / 4</div>
                <div style="width: 280px; margin: 8px auto 0 auto; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.35); height: 12px; border-radius: 6px; overflow: hidden;">
                    <div id="combo-meter-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #6b0000, #ff2727); transition: width 0.12s linear;"></div>
                </div>
                <div id="combo-meter-text" style="margin-top: 3px; font-size: 12px; color: #ffb0b0;">COMBO THREAT: 0</div>
            </div>

            <!-- Round Intro -->
            <div id="round-intro" style="display: none; position: absolute; top: 42%; left: 50%; transform: translate(-50%, -50%); font-size: 88px; font-weight: bold; text-shadow: 0 0 24px rgba(255, 120, 0, 0.8);">3</div>

            <!-- Rotation Debug -->
            <div id="rotation-debug" style="display: none; position: absolute; top: 18%; left: 50%; transform: translateX(-50%); min-width: 320px; text-align: center; background: rgba(0,0,0,0.65); border: 2px solid #ffd54a; padding: 10px 14px; border-radius: 8px; font-size: 14px; line-height: 1.6;">
                <div style="font-size: 12px; color: #ffd54a; letter-spacing: 1px;">ROTATION DEBUG</div>
                <div id="rotation-debug-p1">P1: +0.0 deg</div>
                <div id="rotation-debug-p2">P2: +0.0 deg</div>
                <div id="rotation-debug-jump" style="font-size: 11px; color: #ddd;">JUMP: loading...</div>
                <div style="font-size: 11px; color: #bbb;">R x3 toggle | P1: Q/E rotate | P2: U/O rotate</div>
            </div>

            <!-- Move Guide -->
            <div id="move-guide" style="display: none; position: absolute; left: 50%; bottom: 2%; transform: translateX(-50%); width: min(96%, 1200px); background: rgba(0,0,0,0.62); border: 1px solid rgba(255,255,255,0.35); border-radius: 8px; padding: 8px 12px; text-align: center; font-size: 12px; line-height: 1.5; color: #f2f2f2;">
                <span style="color: #ffd54a;">YOUNG ZEALOUS CONTROLS</span>
                <span> | IDLE: no input</span>
                <span> | JUMP: tap W = short jump, hold W = long jump</span>
                <span> | BLOCK: hold S</span>
                <span> | HIT: automatic when damaged</span>
                <span> | PUNCH_R: F</span>
                <span> | PUNCH_L: tap F twice quickly</span>
                <span> | UPPERCUT: W + F</span>
                <span> | SIDEKICK: R</span>
                <span> | LOWKICK: S + R</span>
                <span> | SPINKICK: A/D + R</span>
                <span> | BIG STOMACH HIT: T</span>
                <span> | FLYING: Y</span>
                <span> | CROUCH WALK: forward + S</span>
                <span> | RUN: H</span>
            </div>

            <!-- Player 2 HUD -->
            <div id="hud-p2" style="display: none; position: absolute; top: 5%; right: 3%; width: 40%; text-align: right;">
                <div id="hud-p2-name" style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">AREA</div>
                <div style="width: 100%; height: 25px; background: rgba(255,255,255,0.2); border: 2px solid white;">
                    <div id="p2-health" style="width: 100%; height: 100%; background: linear-gradient(-90deg, #0088ff, #00ffff); transition: width 0.3s;"></div>
                </div>
                <div style="margin-top: 5px; font-size: 12px; color: #aaa;">PLAYER 2</div>
            </div>

            <!-- Mobile Controls -->
            <div id="mobile-controls" style="display: none; position: absolute; bottom: 5%; left: 0; width: 100%; height: 200px; pointer-events: auto;">
                <div id="joystick-container" style="position: absolute; left: 10%; bottom: 40px; width: 150px; height: 150px; background: rgba(255,255,255,0.1); border-radius: 50%; border: 2px solid rgba(255,255,255,0.3);">
                    <div id="joystick-knob" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; background: white; border-radius: 50%; opacity: 0.5;"></div>
                </div>
                <div style="position: absolute; right: 5%; bottom: 40px; display: flex; gap: 20px;">
                    <div id="btn-punch" class="action-btn" style="background: #f44;">PUNCH</div>
                    <div id="btn-kick" class="action-btn" style="background: #44f;">KICK</div>
                </div>
            </div>

            <style>
                .action-btn {
                    width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    font-weight: bold; border: 4px solid white; user-select: none; font-size: 20px;
                }
                .action-btn:active { transform: scale(0.9); opacity: 0.8; }
            </style>

            <!-- Game Over Overlay -->
            <div id="game-over" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background: rgba(0,0,0,0.8); padding: 40px; border: 4px solid #f80; pointer-events: auto;">
                <h1 id="winner-text" style="font-size: 64px; margin: 0;">PLAYER 1 WINS</h1>
                <p id="match-score" style="font-size: 24px; color: #ccc; margin: 10px 0 22px 0;">ROUND SCORE 0 - 0</p>
                <div style="display: flex; justify-content: center; gap: 16px;">
                    <button id="btn-fight-again" style="padding: 10px 22px; border: 2px solid #fff; background: #ff6f00; color: #fff; font-size: 18px; cursor: pointer;">FIGHT AGAIN</button>
                    <button id="btn-quit" style="padding: 10px 22px; border: 2px solid #fff; background: #333; color: #fff; font-size: 18px; cursor: pointer;">QUIT</button>
                </div>
            </div>

            <!-- Damage Vignette -->
            <div id="damage-vignette" style="position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.08s linear; background: radial-gradient(circle, rgba(255,0,0,0) 40%, rgba(255,0,0,0.32) 100%);"></div>
        `;
        
        this.charSelect = document.getElementById('char-select');
        this.p1CharName = document.getElementById('p1-char-name');
        this.p2CharName = document.getElementById('p2-char-name');
        this.p1Ready = document.getElementById('p1-ready');
        this.p2Ready = document.getElementById('p2-ready');
        this.hudP1 = document.getElementById('hud-p1');
        this.hudP2 = document.getElementById('hud-p2');
        this.hudTimer = document.getElementById('hud-timer');
        this.p1HealthBar = document.getElementById('p1-health');
        this.p2HealthBar = document.getElementById('p2-health');
        this.p1Name = document.getElementById('hud-p1-name');
        this.p2Name = document.getElementById('hud-p2-name');
        this.timerText = document.getElementById('timer');
        this.roundText = document.getElementById('round-indicator');
        this.comboMeterFill = document.getElementById('combo-meter-fill');
        this.comboMeterText = document.getElementById('combo-meter-text');
        this.roundIntro = document.getElementById('round-intro');
        this.rotationDebug = document.getElementById('rotation-debug');
        this.rotationDebugP1 = document.getElementById('rotation-debug-p1');
        this.rotationDebugP2 = document.getElementById('rotation-debug-p2');
        this.rotationDebugJump = document.getElementById('rotation-debug-jump');
        this.moveGuide = document.getElementById('move-guide');
        this.gameOverScreen = document.getElementById('game-over');
        this.winnerText = document.getElementById('winner-text');
        this.matchScoreText = document.getElementById('match-score');
        this.fightAgainBtn = document.getElementById('btn-fight-again');
        this.quitBtn = document.getElementById('btn-quit');
        this.mobileControls = document.getElementById('mobile-controls');
        this.joystickKnob = document.getElementById('joystick-knob');
        this.damageVignette = document.getElementById('damage-vignette');
        this.vignetteTimeout = null;
    }

    updateSelection(p1Index, p1Ready, p2Index, p2Ready) {
        const characters = CONFIG.ASSETS.CHARACTERS;
        this.p1CharName.innerText = characters[p1Index].name;
        this.p2CharName.innerText = characters[p2Index].name;
        this.p1Ready.style.display = p1Ready ? 'block' : 'none';
        this.p2Ready.style.display = p2Ready ? 'block' : 'none';
    }

    hideSelection() {
        this.charSelect.style.display = 'none';
        this.hudP1.style.display = 'block';
        this.hudP2.style.display = 'block';
        this.hudTimer.style.display = 'block';
        this.moveGuide.style.display = 'block';
    }

    showSelection() {
        this.charSelect.style.display = 'flex';
        this.hudP1.style.display = 'none';
        this.hudP2.style.display = 'none';
        this.hudTimer.style.display = 'none';
        this.moveGuide.style.display = 'none';
        this.hideGameOver();
    }

    setPlayerNames(n1, n2) {
        this.p1Name.innerText = n1;
        this.p2Name.innerText = n2;
    }

    updateJoystick(x, y) {
        this.joystickKnob.style.transform = `translate(calc(-50% + ${x * 40}px), calc(-50% + ${y * 40}px))`;
    }

    initMobileControls() {
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouch) {
            this.mobileControls.style.display = 'block';
        }
    }

    update(p1Health, p2Health, timerValue) {
        this.p1HealthBar.style.width = `${p1Health}%`;
        this.p2HealthBar.style.width = `${p2Health}%`;
        this.timerText.innerText = Math.ceil(timerValue);
    }

    setRound(round, totalRounds) {
        this.roundText.innerText = `ROUND ${round} / ${totalRounds}`;
    }

    updateComboMeter(label, ratio, hits, nearKnockdown) {
        const pct = Math.max(0, Math.min(1, ratio)) * 100;
        this.comboMeterFill.style.width = `${pct}%`;
        this.comboMeterText.innerText = `${label}: ${hits} HIT${hits === 1 ? '' : 'S'}`;
        this.comboMeterFill.style.filter = nearKnockdown ? 'brightness(1.45)' : 'none';
    }

    showRoundIntro(text) {
        this.roundIntro.innerText = text;
        this.roundIntro.style.display = 'block';
    }

    hideRoundIntro() {
        this.roundIntro.style.display = 'none';
    }

    setRotationDebugVisible(visible) {
        this.rotationDebug.style.display = visible ? 'block' : 'none';
    }

    updateRotationDebug(p1Deg, p2Deg, jumpMeta = '') {
        const p1 = p1Deg >= 0 ? `+${p1Deg.toFixed(1)}` : p1Deg.toFixed(1);
        const p2 = p2Deg >= 0 ? `+${p2Deg.toFixed(1)}` : p2Deg.toFixed(1);
        this.rotationDebugP1.innerText = `P1: ${p1} deg`;
        this.rotationDebugP2.innerText = `P2: ${p2} deg`;
        this.rotationDebugJump.innerText = jumpMeta || 'JUMP: metadata unavailable';
    }

    showGameOver(winner, scoreText = '') {
        this.winnerText.innerText = `${winner} WINS`;
        if (scoreText) this.matchScoreText.innerText = scoreText;
        this.gameOverScreen.style.display = 'block';
    }

    hideGameOver() {
        this.gameOverScreen.style.display = 'none';
    }

    setGameOverActions(onFightAgain, onQuit) {
        this.fightAgainBtn.onclick = onFightAgain;
        this.quitBtn.onclick = onQuit;
    }

    flashDamageVignette(durationMs = 100) {
        if (!this.damageVignette) return;
        this.damageVignette.style.opacity = '1';
        if (this.vignetteTimeout) clearTimeout(this.vignetteTimeout);
        this.vignetteTimeout = setTimeout(() => {
            this.damageVignette.style.opacity = '0';
        }, durationMs);
    }
}
