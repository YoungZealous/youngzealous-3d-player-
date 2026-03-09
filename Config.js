export const CONFIG = {
    SCREEN: {
        WIDTH: window.innerWidth,
        HEIGHT: window.innerHeight
    },
    FIGHTER: {
        WALK_SPEED: 0.15,
        JUMP_FORCE: 0.28,
        GRAVITY: 0.009,
        HEALTH: 100,
        RADIUS: 0.5,
        HEIGHT: 2.0,
        BOUNDS: 8.0 // Limits on X axis
    },
    ASSETS: {
        BACKGROUND: 'https://rosebud.ai/assets/japanese-courtyard-bg.webp?Svz1',
        ANIMATIONS: {
            IDLE: 'https://rosebud.ai/assets/BouncingFightIdle.fbx?Oohk',
            JUMP: 'https://rosebud.ai/assets/Jumping.fbx?yvVq',
            BLOCK: 'https://rosebud.ai/assets/CenterBlock.fbx?yxa4',
            HIT: 'https://rosebud.ai/assets/light)HeadHit(1).fbx?eAIR',
            PUNCH_R: 'https://rosebud.ai/assets/Punching(1).fbx?BePO',
            PUNCH_L: 'https://rosebud.ai/assets/leftpunchyz.fbx?EmAb',
            UPPERCUT: 'https://rosebud.ai/assets/Uppercut.fbx?DBUr',
            SIDEKICK: 'https://rosebud.ai/assets/sidekickMmaKick(1).fbx?qeKJ',
            LOWKICK: 'https://rosebud.ai/assets/kicklowMmaKick(1).fbx?blhQ',
            SPINKICK: 'https://rosebud.ai/assets/spinkickmmakick.fbx?Aa4Z'
        },
        YOUNG_ZEALOUS_ANIMATIONS: {
            IDLE: 'https://raw.githubusercontent.com/YoungZealous/youngzealous-3d-player-/main/Bouncing%20Fight%20Idle.fbx',
            JUMP: 'https://raw.githubusercontent.com/YoungZealous/youngzealous-3d-player-/main/Jumping.fbx',
            SHORT_JUMP: 'https://raw.githubusercontent.com/YoungZealous/youngzealous-3d-player-/main/yz%20shortJump%20(1).fbx',
            LONG_JUMP: 'https://raw.githubusercontent.com/YoungZealous/youngzealous-3d-player-/main/yz%20little%20longer%20jumps',
            KO_LAUNCH: 'https://raw.githubusercontent.com/YoungZealous/youngzealous-3d-player-/main/yz%20knocked%20out%20Male%20Laying%20Pose.fbx',
            KO_DOWN: 'https://raw.githubusercontent.com/YoungZealous/youngzealous-3d-player-/main/yz%20Knocked%20back%20Down.fbx',
            PUNCH_R: 'https://raw.githubusercontent.com/YoungZealous/youngzealous-3d-player-/main/Punching%20(1).fbx',
            PUNCH_L: 'https://raw.githubusercontent.com/YoungZealous/youngzealous-3d-player-/main/Punching%20(2).fbx',
            SIDEKICK: 'https://raw.githubusercontent.com/YoungZealous/youngzealous-3d-player-/main/side%20kick%20Mma%20Kick%20(1).fbx',
            BIG_STOMACH_HIT: 'https://raw.githubusercontent.com/YoungZealous/youngzealous-3d-player-/main/Big%20Stomach%20Hit.fbx',
            CROUCH_WALK: 'https://raw.githubusercontent.com/YoungZealous/youngzealous-3d-player-/main/Crouched%20Walking.fbx',
            FLYING: 'https://raw.githubusercontent.com/YoungZealous/youngzealous-3d-player-/main/Flying.fbx',
            RUN: 'https://raw.githubusercontent.com/YoungZealous/youngzealous-3d-player-/main/Standard%20Run.fbx'
        },
        YOUNG_ZEALOUS_HURT_SOUNDS: [
            './yz hurtRecord (online-voice-recorder.com) (5).mp3',
            './yz hurtRecord (online-voice-recorder.com) (4).mp3',
            './yz hurtRecord (online-voice-recorder.com) (3).mp3',
            './yz hurtRecord (online-voice-recorder.com) (2).mp3'
        ],
        CHARACTERS: [
            { id: 'young_zealous', name: 'YOUNG ZEALOUS', color: 0xffffff },
            { id: 'red_fighter', name: 'RED FIGHTER', color: 0xff4444 },
            { id: 'blue_fighter', name: 'BLUE FIGHTER', color: 0x4444ff }
        ]
    },
    P1_CONTROLS: {
        UP: 'KeyW',
        DOWN: 'KeyS',
        LEFT: 'KeyA',
        RIGHT: 'KeyD',
        PUNCH: 'KeyF',
        KICK: 'KeyR',
        SELECT: 'Space'
    },
    P2_CONTROLS: {
        UP: 'ArrowUp',
        DOWN: 'ArrowDown',
        LEFT: 'ArrowLeft',
        RIGHT: 'ArrowRight',
        PUNCH: 'KeyK',
        KICK: 'KeyL',
        SELECT: 'Enter'
    }
};
