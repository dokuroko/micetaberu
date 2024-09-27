const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let player;
let collectibles;
let score = 0;
let scoreText;
let gameOver = false;
let maxCollectibles = 15;
let collectibleSpawnTimer = 0;
let collectibleSpawnInterval = 300;
let gameTime = 20;
let timeText;
let collectibleSpeed = -200;
let nextScoreTarget = 10;
let retryButton;
let eatSound;
let levelUpSound;
let finishSound;
let levelText;
let level = 1;
let stars;
let backgroundMusic;
let gameOverText;
let finalScoreText;
let gameEnded = false; // 新增標誌以避免重複觸發

const game = new Phaser.Game(config);

function preload() {
    this.load.image('player', 'images/player.png');
    this.load.image('collectible', 'images/collectible.png');
    this.load.image('collectible02', 'images/collectible02.png');
    this.load.audio('eatSound', 'audio/eat.mp3');
    this.load.audio('levelUpSound', 'audio/LEVELUP.MP3');
    this.load.audio('backgroundMusic', 'audio/background.mp3');
    this.load.audio('finishSound', 'audio/finish.mp3');
    this.load.image('star', 'images/star.png');
}

function create() {
    eatSound = this.sound.add('eatSound');
    eatSound.setVolume(0.5);
    levelUpSound = this.sound.add('levelUpSound');
    levelUpSound.setVolume(0.5);
    finishSound = this.sound.add('finishSound');
    finishSound.setVolume(0.5);

    // 背景音樂設定
    backgroundMusic = this.sound.add('backgroundMusic');
    backgroundMusic.setVolume(0.5);
    backgroundMusic.play({ loop: true });

    this.cameras.main.setBackgroundColor('#3d4464');

    player = this.physics.add.sprite(300, 300, 'player');
    player.setCollideWorldBounds(true);
    player.body.setAllowGravity(false);

    collectibles = this.physics.add.group();
    this.physics.add.overlap(player, collectibles, collectItem, null, this);

    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#fff', fontFamily: 'Rubik Bubbles' });
    levelText = this.add.text(16, 60, 'LEVEL 1', { fontSize: '48px', fill: '#fff', fontFamily: 'Rubik Bubbles' });
    timeText = this.add.text(650, 16, 'Time: 20', { fontSize: '32px', fill: '#fff', fontFamily: 'Rubik Bubbles' });

    stars = this.add.group();
    createStars(this);

    this.input.on('pointerdown', () => {
        movePlayerUp.call(this);
        if (this.sound.context.state === 'suspended') {
            this.sound.context.resume();
        }
    });

    this.time.addEvent({
        delay: 1000,
        callback: updateTime,
        callbackScope: this,
        loop: true
    });
}

function createStars(scene) {
    for (let i = 0; i < 50; i++) {
        let x = Phaser.Math.Between(0, scene.sys.game.config.width);
        let y = Phaser.Math.Between(0, scene.sys.game.config.height);
        let star = scene.add.image(x, y, 'star');
        star.setScale(1);
        stars.add(star);
    }
}

function update(time, delta) {
    if (gameOver) {
        return;
    }

    collectibleSpawnTimer += delta;
    if (collectibleSpawnTimer > collectibleSpawnInterval && collectibles.getChildren().length < maxCollectibles) {
        collectibleSpawnTimer = 0;
        createCollectible(this);
    }

    collectibles.children.iterate(function (collectible) {
        if (collectible && collectible.x < -collectible.displayWidth) {
            collectibles.remove(collectible, true, true);
        }
    });

    player.setVelocityY(player.body.velocity.y + 5);

    stars.children.iterate(function (star) {
        star.x -= 1;
        if (star.x < 0) {
            star.x = this.sys.game.config.width;
            star.y = Phaser.Math.Between(0, this.sys.game.config.height);
        }
    }, this);
}

function updateTime() {
    if (gameTime > 0) {
        gameTime--;
        timeText.setText('Time: ' + gameTime);
    } else {
        endGame.call(this);
    }
}

function createCollectible(scene) {
    let randomYPosition = Phaser.Math.Between(100, 500);
    let collectible;

    let collectible02Chance = level < 3 ? 1 : (level >= 4 ? 5 : 50);

    if (Phaser.Math.Between(1, 100) <= collectible02Chance) {
        collectible = collectibles.create(800, randomYPosition, 'collectible02');
        collectible.setScale(1);
    } else {
        collectible = collectibles.create(800, randomYPosition, 'collectible');
        let randomScale = Phaser.Math.FloatBetween(0.5, 1);
        collectible.setScale(randomScale);
    }

    collectible.scoreValue = Math.floor(1 + (collectible.scale * 9));
    collectible.setVelocityX(collectibleSpeed);
    collectible.setCollideWorldBounds(false);
    collectible.setOrigin(0, 0);
}

function collectItem(player, collectible) {
    score += collectible.scoreValue;
    scoreText.setText('Score: ' + score);
    eatSound.play();

    collectibles.remove(collectible, true, true);

    if (score >= nextScoreTarget) {
        gameTime += 5;
        timeText.setText('Time: ' + gameTime);
        collectibleSpeed -= 50;

        collectibles.children.iterate(function (collectible) {
            collectible.setVelocityX(collectibleSpeed);
        });

        level++;
        nextScoreTarget = 10 * Math.pow(level, 2);

        levelText.setText('LEVEL ' + level);
        bounceLevelText(this);
        levelUpSound.play();
    }
}

function movePlayerUp() {
    player.setVelocityY(-300);
}

function endGame() {
    if (gameEnded) return; // 確保結束遊戲功能只執行一次

    gameEnded = true; // 設置標誌以避免重複觸發

    gameOver = true;
    this.physics.pause();
    backgroundMusic.stop();
    finishSound.play(); // 播放結束音效

    // 創建 Game Over 文本
    gameOverText = this.add.text(400, 200, 'Game Over', { fontSize: '64px', fill: '#fff', fontFamily: 'Rubik Bubbles' }).setOrigin(0.5);
    finalScoreText = this.add.text(400, 300, 'Final Score: ' + score, { fontSize: '48px', fill: '#fff', fontFamily: 'Rubik Bubbles' }).setOrigin(0.5);

    retryButton = this.add.text(400, 400, 'Retry', { fontSize: '32px', fill: '#fff', fontFamily: 'Rubik Bubbles' })
        .setInteractive()
        .on('pointerdown', () => {
            restartGame.call(this);
        });
}


function restartGame() {
    score = 0;
    level = 1;
    gameTime = 20;
    nextScoreTarget = 10;
    collectibleSpeed = -200;
    gameOver = false;
    gameEnded = false; // 重置遊戲結束標誌

    scoreText.setText('Score: 0');
    levelText.setText('LEVEL 1');
    timeText.setText('Time: 20');

    collectibles.clear(true, true);
    this.physics.resume();
    backgroundMusic.play();
    finishSound.stop(); // 播放結束音效

    // 移除之前的結束文本和按鈕
    if (gameOverText) {
        gameOverText.destroy();
        gameOverText = null;
    }
    if (finalScoreText) {
        finalScoreText.destroy();
        finalScoreText = null;
    }
    if (retryButton) {
        retryButton.destroy();
        retryButton = null;
    }
}

function bounceLevelText(scene) {
    scene.tweens.add({
        targets: levelText,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 300,
        ease: 'Bounce.easeOut',
        onComplete: function () {
            levelText.setScale(1);
        }
    });
}
