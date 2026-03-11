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
        this.lastSelectionFocus = null;
        this.chooseModeAudio = new Audio('./Choose your mode.mp3');
        this.chooseModeAudio.preload = 'auto';
        this.chooseModeAudio.volume = 0.95;
        this.selectFighterAudio = new Audio('./select your fighter.mp3');
        this.selectFighterAudio.preload = 'auto';
        this.selectFighterAudio.volume = 0.95;
        this.menuNavigateAudio = [
            new Audio('./mortal_kombat_menu_n_#1-1773196234265.mp3'),
            new Audio('./mortal_kombat_menu_n_#3-1773196245158.mp3')
        ];
        for (const audio of this.menuNavigateAudio) {
            audio.preload = 'auto';
            audio.volume = 0.85;
        }
        this.menuNavigateAudioIndex = 0;
        this.menuConfirmAudio = new Audio('./confirm_boom_ground__#1-1773197742689.mp3');
        this.menuConfirmAudio.preload = 'auto';
        this.menuConfirmAudio.volume = 0.92;

        this.initHUD();
        this.initMobileControls();
    }

    initHUD() {
        this.container.innerHTML = `
            <!-- Character Select -->
            <div id="char-select" style="position: absolute; inset: 0; background: rgba(0,0,0,0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 100; pointer-events: auto;">
                <h1 style="font-size: 64px; margin-bottom: 40px; text-shadow: 0 0 20px #f80;">SELECT YOUR FIGHTER</h1>
                <button id="selection-mode" style="margin: -14px 0 22px 0; font-size: 24px; color: #ffd88a; letter-spacing: 1px; background: rgba(255, 216, 138, 0.12); border: 2px solid #ffd88a; border-radius: 10px; padding: 10px 18px; cursor: pointer; font-family: 'Orbitron', sans-serif;">MODE: MULTIPLAYER</button>
                <div id="selection-ai-difficulty" style="display: none; margin: -6px 0 16px 0; align-items: center; gap: 10px; background: rgba(120, 180, 255, 0.12); border: 2px solid rgba(120, 180, 255, 0.6); border-radius: 10px; padding: 10px 14px;">
                    <span style="font-size: 14px; color: #b8d8ff;">A.I. DIFFICULTY</span>
                    <button id="selection-ai-prev" style="padding: 4px 10px;">&lt;</button>
                    <span id="selection-ai-value" style="min-width: 110px; text-align: center; color: #e6f2ff;">NORMAL</span>
                    <button id="selection-ai-next" style="padding: 4px 10px;">&gt;</button>
                </div>
                <div id="selection-ai-scale" style="display: none; margin: -6px 0 14px 0; gap: 8px;"></div>
                <div style="display: flex; gap: 40px;">
                    <div id="p1-select-panel" style="width: 300px; padding: 20px; border: 4px solid #fff; background: rgba(255,255,255,0.1); text-align: center;">
                        <h2 style="color: #f44;">PLAYER 1</h2>
                        <div id="p1-card-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0;"></div>
                        <div id="p1-char-name" style="font-size: 22px; margin: 10px 0 6px 0;">YOUNG ZEALOUS</div>
                        <div style="color: #aaa; font-size: 14px;">[SPACE] TO SELECT</div>
                        <div id="p1-ready" style="margin-top: 20px; font-size: 24px; color: #4f4; display: none;">READY!</div>
                    </div>
                    <div id="p2-select-panel" style="width: 300px; padding: 20px; border: 4px solid #fff; background: rgba(255,255,255,0.1); text-align: center;">
                        <h2 id="p2-select-title" style="color: #44f;">PLAYER 2</h2>
                        <div id="p2-card-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0;"></div>
                        <div id="p2-char-name" style="font-size: 22px; margin: 10px 0 6px 0;">YOUNG ZEALOUS</div>
                        <div id="p2-select-hint" style="color: #aaa; font-size: 14px;">[ENTER] TO SELECT</div>
                        <div id="p2-ready" style="margin-top: 20px; font-size: 24px; color: #4f4; display: none;">READY!</div>
                    </div>
                </div>
                <div id="selection-mode-hint" style="margin-top: 22px; color: #ffd88a; font-size: 15px;">MODE: [1] MULTIPLAYER  [2] FIGHT A.i.</div>
                <div style="margin-top: 16px; color: #888;">P1: [W/S] FOCUS MODE OR FIGHTER, [A/D] CHANGE, [SPACE/ENTER] SELECT | P2: [LEFT/RIGHT] CHANGE</div>
            </div>

            <!-- Player 1 HUD -->
            <div id="hud-p1" style="display: none; position: absolute; top: 5%; left: 3%; width: 40%;">
                <div id="hud-p1-name" style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">SHARON</div>
                <div style="width: 100%; height: 25px; background: rgba(255,255,255,0.2); border: 2px solid white;">
                    <div id="p1-health" style="width: 100%; height: 100%; background: linear-gradient(90deg, #ff0000, #ff8800); transition: width 0.3s;"></div>
                </div>
                <div style="width: 100%; margin-top: 6px; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.35); height: 10px; border-radius: 5px; overflow: hidden;">
                    <div id="p1-pressure-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #8f1200, #ff4a35); transition: width 0.12s linear;"></div>
                </div>
                <div id="p1-pressure-text" style="margin-top: 2px; font-size: 11px; color: #ffb3a8;">UNDER PRESSURE: 0 HITS</div>
                <div style="margin-top: 5px; font-size: 12px; color: #aaa;">PLAYER 1</div>
            </div>

            <!-- Timer -->
            <div id="hud-timer" style="display: none; position: absolute; top: 4%; left: 50%; transform: translateX(-50%); text-align: center;">
                <div id="timer" style="font-size: 48px; font-weight: bold; padding: 10px 20px; background: rgba(0,0,0,0.5); border-radius: 10px; border: 2px solid #f80;">99</div>
                <div id="round-indicator" style="margin-top: 8px; font-size: 18px; letter-spacing: 1px; color: #ffd88a;">ROUND 1 / 4</div>
                <div id="ai-difficulty-badge" style="display: none; margin-top: 6px; font-size: 13px; letter-spacing: 0.6px; color: #b8d8ff;">A.I. DIFFICULTY: NORMAL</div>
            </div>

            <!-- Round Intro -->
            <div id="round-intro" style="display: none; position: absolute; top: 42%; left: 50%; transform: translate(-50%, -50%); font-size: 88px; font-weight: bold; text-shadow: 0 0 24px rgba(255, 120, 0, 0.8);">3</div>

            <!-- Pause Menu -->
            <div id="pause-overlay" style="display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.72); z-index: 180; pointer-events: auto;">
                <div id="pause-main" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); min-width: 360px; background: rgba(20,20,20,0.92); border: 2px solid #fff; padding: 20px; text-align: center;">
                    <h2 style="margin: 0 0 14px 0; font-size: 34px;">PAUSED</h2>
                    <div style="display: grid; gap: 10px;">
                        <button id="pause-resume">RESUME</button>
                        <button id="pause-moves">MOVES CONTROLS</button>
                        <button id="pause-sound">SOUND SETTINGS</button>
                        <button id="pause-ai-btn" style="display: none;">A.I. DIFFICULTY</button>
                        <button id="pause-restart">RESTART</button>
                        <button id="pause-quit">QUIT</button>
                    </div>
                </div>

                <div id="pause-confirm" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); min-width: 360px; background: rgba(20,20,20,0.92); border: 2px solid #fff; padding: 20px; text-align: center;">
                    <h3 id="pause-confirm-text" style="margin: 0 0 16px 0; font-size: 24px;">ARE YOU SURE?</h3>
                    <div style="display: flex; justify-content: center; gap: 12px;">
                        <button id="pause-confirm-yes">YES</button>
                        <button id="pause-confirm-no">NO</button>
                    </div>
                </div>

                <div id="pause-moves-panel" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(92%, 760px); background: rgba(20,20,20,0.92); border: 2px solid #fff; padding: 20px;">
                    <h3 style="margin-top: 0;">MOVES CONTROLS</h3>
                    <div style="font-size: 14px; line-height: 1.6; color: #ddd;">
                        <div>P1: W jump, S block, F punch, R kick, W+F uppercut, A/D+R spin kick.</div>
                        <div>P2: ArrowUp jump, ArrowDown block, K punch, L kick.</div>
                        <div>Specials (YZ): G Grab Slam, T Dance, Y Flying, Forward+S Crouch Walk.</div>
                        <div>YZ Sequences: Down+Forward+Kick = Roll Kick Front Flip, Up+Forward+Kick = Fun Clumb Kick.</div>
                        <div>YZ Sequences: Up Up Down Down = Stomp Energy Wave, Back Back Forward = Fireball.</div>
                        <div>Grapples: Not mapped yet in this build.</div>
                    </div>
                    <div style="margin-top: 14px;"><button id="pause-moves-back">BACK</button></div>
                </div>

                <div id="pause-sound-panel" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(92%, 520px); background: rgba(20,20,20,0.92); border: 2px solid #fff; padding: 20px;">
                    <h3 style="margin-top: 0;">SOUND SETTINGS</h3>
                    <label style="display: block; text-align: left;">Music Volume
                        <input id="music-volume" type="range" min="0" max="1" step="0.01" value="1" style="width: 100%;" />
                    </label>
                    <label style="display: block; margin-top: 10px; text-align: left;">Gameplay SFX
                        <input id="sfx-volume" type="range" min="0" max="1" step="0.01" value="1" style="width: 100%;" />
                    </label>
                    <div style="margin-top: 14px;"><button id="pause-sound-back">BACK</button></div>
                </div>

                <div id="pause-ai-panel" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(92%, 520px); background: rgba(20,20,20,0.92); border: 2px solid #fff; padding: 20px;">
                    <h3 style="margin-top: 0;">A.I. DIFFICULTY</h3>
                    <div style="display: flex; justify-content: center; align-items: center; gap: 12px;">
                        <button id="pause-ai-prev">&lt;</button>
                        <div id="pause-ai-value" style="min-width: 130px; text-align: center; color: #e6f2ff; font-size: 18px;">NORMAL</div>
                        <button id="pause-ai-next">&gt;</button>
                    </div>
                    <div id="pause-ai-scale" style="margin-top: 12px; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;"></div>
                    <div style="margin-top: 14px;"><button id="pause-ai-back">BACK</button></div>
                </div>

                <style>
                    #pause-overlay button {
                        padding: 10px 14px;
                        border: 2px solid #fff;
                        background: #2a2a2a;
                        color: #fff;
                        cursor: pointer;
                        font-family: 'Orbitron', sans-serif;
                    }
                </style>
            </div>

            <!-- Rotation Debug -->
            <div id="rotation-debug" style="display: none; position: absolute; top: 18%; left: 50%; transform: translateX(-50%); min-width: 320px; text-align: center; background: rgba(0,0,0,0.65); border: 2px solid #ffd54a; padding: 10px 14px; border-radius: 8px; font-size: 14px; line-height: 1.6;">
                <div style="font-size: 12px; color: #ffd54a; letter-spacing: 1px;">ROTATION DEBUG</div>
                <div id="rotation-debug-p1">P1: +0.0 deg</div>
                <div id="rotation-debug-p2">P2: +0.0 deg</div>
                <div id="rotation-debug-jump" style="font-size: 11px; color: #ddd;">JUMP: loading...</div>
                <div style="font-size: 11px; color: #bbb;">P1: Q/E rotate | P2: U/O rotate</div>
            </div>

            <!-- Move Guide -->
            <div id="move-guide" style="display: none; position: absolute; left: 50%; bottom: 2%; transform: translateX(-50%); width: min(96%, 1200px); background: rgba(0,0,0,0.62); border: 1px solid rgba(255,255,255,0.35); border-radius: 8px; padding: 8px 12px; text-align: center; font-size: 12px; line-height: 1.5; color: #f2f2f2;">
                <span style="color: #ffd54a;">YOUNG ZEALOUS CONTROLS</span>
                <span> | IDLE: no input</span>
                <span> | JUMP: W</span>
                <span> | BLOCK: hold S</span>
                <span> | HIT: automatic when damaged</span>
                <span> | PUNCH_R: F</span>
                <span> | PUNCH_L: tap F twice quickly</span>
                <span> | UPPERCUT: W + F</span>
                <span> | SIDEKICK: R</span>
                <span> | LOWKICK: S + R</span>
                <span> | SPINKICK: A/D + R</span>
                <span> | GRAB SLAM: G</span>
                <span> | DANCE: T (tap)</span>
                <span> | FLYING: Y</span>
                <span> | ROLL KICK FRONT FLIP: down + forward + R</span>
                <span> | FUN CLUMB KICK: up + forward + R</span>
                <span> | STOMP WAVE: up, up, down, down</span>
                <span> | FIREBALL: back, back, forward</span>
                <span> | CROUCH WALK: forward + S</span>
                <span> | DWARF WALK: forward move</span>
            </div>

            <!-- Player 2 HUD -->
            <div id="hud-p2" style="display: none; position: absolute; top: 5%; right: 3%; width: 40%; text-align: right;">
                <div id="hud-p2-name" style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">AREA</div>
                <div style="width: 100%; height: 25px; background: rgba(255,255,255,0.2); border: 2px solid white;">
                    <div id="p2-health" style="width: 100%; height: 100%; background: linear-gradient(-90deg, #0088ff, #00ffff); transition: width 0.3s;"></div>
                </div>
                <div style="width: 100%; margin-top: 6px; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.35); height: 10px; border-radius: 5px; overflow: hidden;">
                    <div id="p2-pressure-fill" style="width: 0%; height: 100%; background: linear-gradient(-90deg, #003f8f, #3ea6ff); transition: width 0.12s linear;"></div>
                </div>
                <div id="p2-pressure-text" style="margin-top: 2px; font-size: 11px; color: #a6d8ff;">UNDER PRESSURE: 0 HITS</div>
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

                .fighter-card {
                    border: 2px solid rgba(255,255,255,0.45);
                    border-radius: 8px;
                    background: rgba(255,255,255,0.07);
                    padding: 6px;
                    cursor: pointer;
                    user-select: none;
                    transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
                }

                .fighter-card:hover {
                    transform: translateY(-2px);
                    border-color: #ffd88a;
                }

                .fighter-card.active-p1 {
                    border-color: #ff5d5d;
                    box-shadow: 0 0 14px rgba(255, 93, 93, 0.45);
                }

                .fighter-card.active-p2 {
                    border-color: #68a4ff;
                    box-shadow: 0 0 14px rgba(104, 164, 255, 0.45);
                }

                .fighter-card.ready {
                    outline: 2px solid #4f4;
                }

                .fighter-portrait {
                    width: 100%;
                    aspect-ratio: 1 / 1;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    font-weight: bold;
                    color: #fff;
                    text-shadow: 0 2px 8px rgba(0,0,0,0.65);
                }

                .fighter-label {
                    margin-top: 4px;
                    font-size: 10px;
                    color: #ddd;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .ai-difficulty-pill {
                    border: 1px solid rgba(184, 216, 255, 0.7);
                    background: rgba(184, 216, 255, 0.12);
                    color: #dceeff;
                    border-radius: 999px;
                    padding: 5px 10px;
                    font-size: 11px;
                    cursor: pointer;
                    user-select: none;
                }

                .ai-difficulty-pill.active {
                    background: rgba(110, 170, 255, 0.35);
                    border-color: #8fc2ff;
                    box-shadow: 0 0 10px rgba(130, 190, 255, 0.4);
                }
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
        this.selectionMode = document.getElementById('selection-mode');
        this.selectionModeHint = document.getElementById('selection-mode-hint');
        this.selectionAIDifficulty = document.getElementById('selection-ai-difficulty');
        this.selectionAIPrev = document.getElementById('selection-ai-prev');
        this.selectionAINext = document.getElementById('selection-ai-next');
        this.selectionAIValue = document.getElementById('selection-ai-value');
        this.selectionAIScale = document.getElementById('selection-ai-scale');
        this.p1CardGrid = document.getElementById('p1-card-grid');
        this.p2CardGrid = document.getElementById('p2-card-grid');
        this.p2SelectTitle = document.getElementById('p2-select-title');
        this.p2SelectHint = document.getElementById('p2-select-hint');
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
        this.aiDifficultyBadge = document.getElementById('ai-difficulty-badge');
        this.p1PressureFill = document.getElementById('p1-pressure-fill');
        this.p1PressureText = document.getElementById('p1-pressure-text');
        this.p2PressureFill = document.getElementById('p2-pressure-fill');
        this.p2PressureText = document.getElementById('p2-pressure-text');
        this.roundIntro = document.getElementById('round-intro');
        this.pauseOverlay = document.getElementById('pause-overlay');
        this.pauseMain = document.getElementById('pause-main');
        this.pauseConfirm = document.getElementById('pause-confirm');
        this.pauseMovesPanel = document.getElementById('pause-moves-panel');
        this.pauseSoundPanel = document.getElementById('pause-sound-panel');
        this.pauseConfirmText = document.getElementById('pause-confirm-text');
        this.pauseResumeBtn = document.getElementById('pause-resume');
        this.pauseMovesBtn = document.getElementById('pause-moves');
        this.pauseSoundBtn = document.getElementById('pause-sound');
        this.pauseAIBtn = document.getElementById('pause-ai-btn');
        this.pauseRestartBtn = document.getElementById('pause-restart');
        this.pauseQuitBtn = document.getElementById('pause-quit');
        this.pauseConfirmYesBtn = document.getElementById('pause-confirm-yes');
        this.pauseConfirmNoBtn = document.getElementById('pause-confirm-no');
        this.pauseMovesBackBtn = document.getElementById('pause-moves-back');
        this.pauseSoundBackBtn = document.getElementById('pause-sound-back');
        this.pauseAIPanel = document.getElementById('pause-ai-panel');
        this.pauseAIBackBtn = document.getElementById('pause-ai-back');
        this.pauseAIPrevBtn = document.getElementById('pause-ai-prev');
        this.pauseAINextBtn = document.getElementById('pause-ai-next');
        this.pauseAIValue = document.getElementById('pause-ai-value');
        this.pauseAIScale = document.getElementById('pause-ai-scale');
        this.musicVolumeSlider = document.getElementById('music-volume');
        this.sfxVolumeSlider = document.getElementById('sfx-volume');
        this.pendingPauseAction = null;
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

        this.renderSelectionCards();
    }

    renderSelectionCards() {
        const characters = CONFIG.ASSETS.CHARACTERS;
        const colorFor = (char) => `#${char.color.toString(16).padStart(6, '0')}`;
        const initialsFor = (name) => name.split(' ').map((s) => s[0]).join('').slice(0, 3);

        const build = (player) => characters.map((char, index) => `
            <button class="fighter-card" data-player="${player}" data-index="${index}" style="font-family: 'Orbitron', sans-serif; color: white;">
                <div class="fighter-portrait" style="background: linear-gradient(145deg, ${colorFor(char)}, #1a1a1a);">${initialsFor(char.name)}</div>
                <div class="fighter-label">${char.name}</div>
            </button>
        `).join('');

        this.p1CardGrid.innerHTML = build('p1');
        this.p2CardGrid.innerHTML = build('p2');
    }

    playMenuNavigate() {
        if (!this.menuNavigateAudio || this.menuNavigateAudio.length === 0) return;
        const idx = this.menuNavigateAudioIndex % this.menuNavigateAudio.length;
        this.menuNavigateAudioIndex += 1;
        const audio = this.menuNavigateAudio[idx];
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }

    playMenuNavigatePrimary() {
        if (!this.menuNavigateAudio || this.menuNavigateAudio.length === 0) return;
        const audio = this.menuNavigateAudio[0];
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }

    playMenuConfirm() {
        if (!this.menuConfirmAudio) return;
        this.menuConfirmAudio.pause();
        this.menuConfirmAudio.currentTime = 0;
        this.menuConfirmAudio.play().catch(() => {});
    }

    playSelectFighterPrompt() {
        if (!this.selectFighterAudio) return;
        this.selectFighterAudio.pause();
        this.selectFighterAudio.currentTime = 0;
        this.selectFighterAudio.play().catch(() => {});
    }

    setSelectionActions(actions) {
        if (this.selectionMode) {
            this.selectionMode.onclick = () => {
                this.playMenuNavigate();
                actions.onToggleMode?.();
            };
        }
        if (this.selectionAIPrev) this.selectionAIPrev.onclick = () => {
            this.playMenuNavigate();
            actions.onAdjustAIDifficulty?.(-1);
        };
        if (this.selectionAINext) this.selectionAINext.onclick = () => {
            this.playMenuNavigate();
            actions.onAdjustAIDifficulty?.(1);
        };

        const onCardClick = (e) => {
            const card = e.target.closest('.fighter-card');
            if (!card) return;
            const player = card.dataset.player;
            const index = parseInt(card.dataset.index, 10);
            if (!Number.isFinite(index)) return;
            this.playMenuNavigate();
            actions.onPickCharacter?.(player, index);
        };

        this.p1CardGrid?.addEventListener('click', onCardClick);
        this.p2CardGrid?.addEventListener('click', onCardClick);
    }

    renderAIDifficultyScale(container, levels, activeIndex, onPick) {
        if (!container) return;
        container.innerHTML = levels.map((label, idx) => `
            <button class="ai-difficulty-pill ${idx === activeIndex ? 'active' : ''}" data-ai-diff-index="${idx}">${label}</button>
        `).join('');

        container.querySelectorAll('[data-ai-diff-index]').forEach((node) => {
            node.onclick = () => {
                const idx = parseInt(node.dataset.aiDiffIndex, 10);
                if (Number.isFinite(idx)) {
                    this.playMenuNavigate();
                    onPick?.(idx);
                }
            };
        });
    }

    setAIDifficultyUI(levels = [], activeIndex = 0, aiMode = false, selectionFocus = 'fighters') {
        const current = levels[activeIndex] || levels[0] || 'NORMAL';
        const showAi = !!aiMode;
        if (this.selectionAIDifficulty) this.selectionAIDifficulty.style.display = showAi ? 'flex' : 'none';
        if (this.selectionAIScale) this.selectionAIScale.style.display = showAi ? 'flex' : 'none';
        if (this.selectionAIValue) this.selectionAIValue.innerText = current;
        if (this.pauseAIValue) this.pauseAIValue.innerText = current;

        if (this.selectionAIDifficulty) {
            this.selectionAIDifficulty.style.boxShadow = selectionFocus === 'difficulty'
                ? '0 0 18px rgba(125, 185, 255, 0.5)'
                : 'none';
        }

        this.renderAIDifficultyScale(this.selectionAIScale, levels, activeIndex, this.selectionDiffPickAction);
        this.renderAIDifficultyScale(this.pauseAIScale, levels, activeIndex, this.pauseDiffPickAction);

        if (this.pauseAIBtn) this.pauseAIBtn.style.display = showAi ? 'block' : 'none';
        if (this.pauseAIBtn) this.pauseAIBtn.innerText = `A.I. DIFFICULTY: ${current}`;
        if (this.aiDifficultyBadge) {
            this.aiDifficultyBadge.style.display = showAi ? 'block' : 'none';
            this.aiDifficultyBadge.innerText = `A.I. DIFFICULTY: ${current}`;
        }
        if (!showAi && this.pauseAIPanel) this.pauseAIPanel.style.display = 'none';
    }

    updateSelection(p1Index, p1Ready, p2Index, p2Ready, gameMode = 'multiplayer', selectionFocus = 'fighters', aiDifficulty = { levels: [], index: 0 }, aiSelectStage = 'p1') {
        if (selectionFocus === 'mode' && this.lastSelectionFocus !== 'mode' && this.chooseModeAudio) {
            this.chooseModeAudio.pause();
            this.chooseModeAudio.currentTime = 0;
            this.chooseModeAudio.play().catch(() => {});
        }
        if (selectionFocus === 'fighters' && this.lastSelectionFocus !== 'fighters') {
            this.playSelectFighterPrompt();
        }
        this.lastSelectionFocus = selectionFocus;

        const characters = CONFIG.ASSETS.CHARACTERS;
        const aiMode = gameMode === 'ai';
        const aiPickP2 = aiMode && aiSelectStage === 'p2';
        this.p1CharName.innerText = characters[p1Index].name;
        this.p2CharName.innerText = characters[p2Index].name;
        this.selectionMode.innerText = `MODE: ${aiMode ? 'Fight A.i.' : 'MULTIPLAYER'}`;
        this.selectionModeHint.innerText = selectionFocus === 'mode'
            ? 'MODE FOCUS: PRESS [A/D] OR [LEFT/RIGHT] TO CHANGE MODE'
            : (selectionFocus === 'difficulty'
                ? 'DIFFICULTY FOCUS: PRESS [A/D] TO CHANGE A.I. LEVEL'
                : 'MODE: [W] FOCUS MODE, [S] BACK TO FIGHTERS');
        this.selectionMode.style.boxShadow = selectionFocus === 'mode' ? '0 0 18px rgba(255, 216, 138, 0.55)' : 'none';
        this.setAIDifficultyUI(aiDifficulty.levels || [], aiDifficulty.index || 0, aiMode, selectionFocus);
        this.p2SelectTitle.innerText = aiMode ? 'Fight A.i.' : 'PLAYER 2';
        this.p2SelectHint.innerText = aiMode
            ? (aiPickP2 ? '[SPACE/ENTER] CONFIRM A.I. FIGHTER' : 'LOCK PLAYER 1 FIRST')
            : '[ENTER] TO SELECT';
        this.p1Ready.style.display = p1Ready ? 'block' : 'none';
        this.p2Ready.style.display = p2Ready ? 'block' : 'none';

        this.p1CardGrid.querySelectorAll('.fighter-card').forEach((card, idx) => {
            card.classList.toggle('active-p1', idx === p1Index);
            card.classList.toggle('ready', p1Ready && idx === p1Index);
        });

        this.p2CardGrid.querySelectorAll('.fighter-card').forEach((card, idx) => {
            card.classList.toggle('active-p2', idx === p2Index);
            card.classList.toggle('ready', p2Ready && idx === p2Index);
            card.disabled = aiMode && !aiPickP2;
            card.style.opacity = aiMode && !aiPickP2 ? '0.72' : '1';
        });

        this.p1CardGrid.style.boxShadow = aiMode && !aiPickP2 ? '0 0 16px rgba(255, 93, 93, 0.45)' : 'none';
        this.p2CardGrid.style.boxShadow = aiPickP2 ? '0 0 16px rgba(104, 164, 255, 0.5)' : 'none';
    }

    hideSelection() {
        this.charSelect.style.display = 'none';
        this.hudP1.style.display = 'block';
        this.hudP2.style.display = 'block';
        this.hudTimer.style.display = 'block';
        this.moveGuide.style.display = 'block';
        this.hidePauseMenu();
    }

    showSelection() {
        this.charSelect.style.display = 'flex';
        this.hudP1.style.display = 'none';
        this.hudP2.style.display = 'none';
        this.hudTimer.style.display = 'none';
        this.moveGuide.style.display = 'none';
        this.hideGameOver();
        this.hidePauseMenu();
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

    updatePressureMeters(p1Combo, p2Combo) {
        const p1Pct = Math.max(0, Math.min(1, p1Combo.ratio || 0)) * 100;
        const p2Pct = Math.max(0, Math.min(1, p2Combo.ratio || 0)) * 100;

        this.p1PressureFill.style.width = `${p1Pct}%`;
        this.p2PressureFill.style.width = `${p2Pct}%`;

        const p1Hits = p1Combo.hits || 0;
        const p2Hits = p2Combo.hits || 0;
        this.p1PressureText.innerText = `UNDER PRESSURE: ${p1Hits} HIT${p1Hits === 1 ? '' : 'S'}`;
        this.p2PressureText.innerText = `UNDER PRESSURE: ${p2Hits} HIT${p2Hits === 1 ? '' : 'S'}`;

        this.p1PressureFill.style.filter = p1Combo.nearKnockdown ? 'brightness(1.35)' : 'none';
        this.p2PressureFill.style.filter = p2Combo.nearKnockdown ? 'brightness(1.35)' : 'none';
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

    setPauseActions(actions) {
        this.pauseResumeBtn.onclick = actions.onResume;
        this.pauseMovesBtn.onclick = () => {
            this.playMenuNavigate();
            this.showPauseMoves();
        };
        this.pauseSoundBtn.onclick = () => {
            this.playMenuNavigate();
            this.showPauseSound();
        };
        this.pauseAIBtn.onclick = () => {
            this.playMenuNavigate();
            this.showPauseAI();
        };
        this.pauseRestartBtn.onclick = () => {
            this.playMenuNavigate();
            this.showPauseConfirm('restart');
        };
        this.pauseQuitBtn.onclick = () => {
            this.playMenuNavigate();
            this.showPauseConfirm('quit');
        };
        this.pauseConfirmYesBtn.onclick = () => {
            if (this.pendingPauseAction === 'restart') actions.onRestart();
            if (this.pendingPauseAction === 'quit') actions.onQuit();
            this.pendingPauseAction = null;
            this.showPauseMain();
        };
        this.pauseConfirmNoBtn.onclick = () => {
            this.pendingPauseAction = null;
            this.showPauseMain();
        };
        this.pauseMovesBackBtn.onclick = () => {
            this.playMenuNavigate();
            this.showPauseMain();
        };
        this.pauseSoundBackBtn.onclick = () => {
            this.playMenuNavigate();
            this.showPauseMain();
        };
        this.pauseAIBackBtn.onclick = () => {
            this.playMenuNavigate();
            this.showPauseMain();
        };
        this.pauseAIPrevBtn.onclick = () => {
            this.playMenuNavigate();
            actions.onAdjustAIDifficulty?.(-1);
        };
        this.pauseAINextBtn.onclick = () => {
            this.playMenuNavigate();
            actions.onAdjustAIDifficulty?.(1);
        };
        this.musicVolumeSlider.oninput = (e) => actions.onMusic?.(parseFloat(e.target.value));
        this.sfxVolumeSlider.oninput = (e) => actions.onSfx?.(parseFloat(e.target.value));
        this.selectionDiffPickAction = (idx) => actions.onSetAIDifficulty?.(idx);
        this.pauseDiffPickAction = (idx) => actions.onSetAIDifficulty?.(idx);
    }

    setPauseSliders(music, sfx) {
        this.musicVolumeSlider.value = String(music);
        this.sfxVolumeSlider.value = String(sfx);
    }

    showPauseMenu() {
        this.pauseOverlay.style.display = 'block';
        this.showPauseMain();
    }

    hidePauseMenu() {
        this.pauseOverlay.style.display = 'none';
    }

    showPauseMain() {
        this.pauseMain.style.display = 'block';
        this.pauseConfirm.style.display = 'none';
        this.pauseMovesPanel.style.display = 'none';
        this.pauseSoundPanel.style.display = 'none';
        this.pauseAIPanel.style.display = 'none';
    }

    showPauseConfirm(action) {
        this.pendingPauseAction = action;
        this.pauseConfirmText.innerText = `ARE YOU SURE YOU WANT TO ${action.toUpperCase()}?`;
        this.pauseMain.style.display = 'none';
        this.pauseConfirm.style.display = 'block';
        this.pauseMovesPanel.style.display = 'none';
        this.pauseSoundPanel.style.display = 'none';
        this.pauseAIPanel.style.display = 'none';
    }

    showPauseMoves() {
        this.pauseMain.style.display = 'none';
        this.pauseConfirm.style.display = 'none';
        this.pauseMovesPanel.style.display = 'block';
        this.pauseSoundPanel.style.display = 'none';
        this.pauseAIPanel.style.display = 'none';
    }

    showPauseSound() {
        this.pauseMain.style.display = 'none';
        this.pauseConfirm.style.display = 'none';
        this.pauseMovesPanel.style.display = 'none';
        this.pauseSoundPanel.style.display = 'block';
        this.pauseAIPanel.style.display = 'none';
    }

    showPauseAI() {
        this.pauseMain.style.display = 'none';
        this.pauseConfirm.style.display = 'none';
        this.pauseMovesPanel.style.display = 'none';
        this.pauseSoundPanel.style.display = 'none';
        this.pauseAIPanel.style.display = 'block';
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
