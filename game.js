const config = {
    type: Phaser.AUTO,
    width: 800,  // PC 解析度 800
    height: 600, // PC 解析度 600
    parent: 'gameContainer',
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
    },
    scale: {
        mode: Phaser.Scale.FIT,  // 讓遊戲適應屏幕
        autoCenter: Phaser.Scale.CENTER_BOTH,  // 置中顯示
    }
};

// 添加事件監聽器來動態調整遊戲畫布大小
window.addEventListener('resize', () => {
    game.scale.resize(800, 600); // 固定為 800x600
});

// 用於手機的設置
if (window.innerWidth <= 360) {
    game.scale.resize(480, 360); // 手機解析度
}


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
let collectible02ChanceText;
let collectible02ChanceLabel;
let collectible02Chance = 1; // 初始出現率為 1%


const game = new Phaser.Game(config);

function preload() {
    this.load.image('player', 'images/player.png');
    this.load.image('collectible', 'images/collectible.png');
    this.load.image('collectible02', 'images/collectible02.png');
    this.load.audio('eatSound', 'audio/eat.mp3');
    this.load.audio('levelUpSound', 'audio/levelup.mp3');
    this.load.audio('backgroundMusic', 'audio/background.mp3');
    this.load.audio('finishSound', 'audio/finish.mp3');
    this.load.image('star', 'images/star.png');
    this.load.image('hal01', 'images/hal01.png');
    this.load.image('hal02', 'images/hal02.png');
    this.load.image('hal03', 'images/hal03.png');

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
    player.setDepth(2);
    player.setCollideWorldBounds(true);
    player.body.setAllowGravity(false);

    collectibles = this.physics.add.group();
    collectibles.setDepth(2);
    this.physics.add.overlap(player, collectibles, collectItem, null, this);

    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#fff', fontFamily: 'Dela Gothic One' });
    levelText = this.add.text(16, 60, 'LEVEL 1', { fontSize: '48px', fill: '#fff', fontFamily: 'Dela Gothic One' });
    timeText = this.add.text(600, 16, 'Time: 20', { fontSize: '32px', fill: '#fff', fontFamily: 'Dela Gothic One' });
    // 創建 "瓜子出現率" 標籤
    collectible02ChanceLabel = this.add.text(700, 500, '瓜子發生率', { fontSize: '24px', fill: '#fff', fontFamily: 'Dela Gothic One' }).setOrigin(0.5);
    
    // 創建 collectible02 出現機率文本
    collectible02ChanceText = this.add.text(650, 550, '1%', { fontSize: '96px', fill: '#fff', fontFamily: 'Dela Gothic One' }).setOrigin(0.5);

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
    // 更新 collectible02 的出現機率顯示
    collectible02ChanceText.setText(`${Math.floor(collectible02Chance)}%`);
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

    let collectible02Chance = 1 + (level - 1); // 每升一級增加 1%

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
// 更新 collectible02Chance 的顯示
function updateCollectible02Chance() {
    let collectible02Chance = (1 + level * 1).toFixed(1); // 獲取 collectible02 出現的機率
    collectible02ChanceText.setText(`${collectible02Chance}%`);
}

function collectItem(player, collectible) {
    score += collectible.scoreValue;
    scoreText.setText('Score: ' + score);
    eatSound.play();

    collectibles.remove(collectible, true, true);

    // 產生隨機圖片
    createRandomHalImages.call(this, collectible.x, collectible.y);

    collectibles.remove(collectible, true, true);

    if (score >= nextScoreTarget) {
        gameTime += 5;
        timeText.setText('Time: ' + gameTime);
        collectibleSpeed -= 50;

        collectibles.children.iterate(function (collectible) {
            collectible.setVelocityX(collectibleSpeed);
        });

        level++;
        nextScoreTarget = 10 * Math.pow(level, 1.8);

        // 隨機增加 collectible02 機率
        let additionalChance = Phaser.Math.Between(1, 3);
        collectible02Chance += additionalChance; // 增加出現機率
        collectible02ChanceText.setText(collectible02Chance.toFixed(1) + '%'); // 更新顯示

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
    gameOverText = this.add.text(400, 200, 'Game Over', { fontSize: '64px', fill: '#fff', fontFamily: 'Dela Gothic One' }).setOrigin(0.5);
    finalScoreText = this.add.text(400, 300, 'Final Score: ' + score, { fontSize: '48px', fill: '#fff', fontFamily: 'Dela Gothic One' }).setOrigin(0.5);

    retryButton = this.add.text(400, 400, 'Retry', { fontSize: '32px', fill: '#fff', fontFamily: 'Dela Gothic One' })
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
    collectible02Chance = 1; // 重置 collectible02 的出現機率為 1%
    gameOver = false;
    gameEnded = false; // 重置遊戲結束標誌

    scoreText.setText('Score: 0');
    levelText.setText('LEVEL 1');
    timeText.setText('Time: 20');
    collectible02ChanceText.setText(collectible02Chance.toFixed(0) + '%'); // 更新 collectible02 的出現機率文本為 1%

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
// 產生隨機 hal 圖像的函數
function createRandomHalImages(x, y) {
    let halImages = ['hal01', 'hal02', 'hal03'];

    for (let i = 0; i < 2; i++) {
        // 隨機選擇圖片
        let randomImage = Phaser.Math.RND.pick(halImages);

        // 隨機設定圖片大小 0.8 ~ 1.5 倍
        let randomScale = Phaser.Math.FloatBetween(0.5, 2.5);

        // 在給定的座標位置創建圖片
        let hal = this.add.sprite(x , y -(20,-20), randomImage);

        // 設置隨機的初始縮放大小
        hal.setScale(randomScale);
        hal.setAlpha(0.8);

        // 添加彈跳效果
        this.tweens.add({
            targets: hal,
            x: x - (50,100),
            y: y - 0, // 上升一點來模擬彈跳
            scaleX: randomScale * 1.5, // 彈跳過程中放大
            scaleY: randomScale * 1.5, // 彈跳過程中放大
            duration: 100,
            ease: 'Bounce.easeOut',
            onComplete: () => {
                // 淡出效果
                this.tweens.add({
                    targets: hal,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => {
                        hal.destroy(); // 生命週期結束後銷毀
                    }
                });
            }
        });
    }
}

