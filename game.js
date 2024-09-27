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
let levelText;
let skill01Active = false;
let skill01Object;
let skill01Duration = 5000; // 技能持續時間5秒
let skill01SpawnChance = 3; // 出現機率3%
let level = 1;
let stars; // 新增變數來管理背景星星

const game = new Phaser.Game(config);

function preload() {
    this.load.image('player', 'images/player.png');
    this.load.image('collectible', 'images/collectible.png');
    this.load.image('collectible02', 'images/collectible02.png');
    this.load.image('skill01', 'images/skill01.png'); // SKILL01物件
    this.load.audio('eatSound', 'audio/eat.mp3');
    this.load.audio('levelUpSound', 'audio/LEVELUP.MP3'); // 升級音效
    this.load.image('star', 'images/star.png'); // 假設你有一張星星的圖片
}

function create() {
    eatSound = this.sound.add('eatSound');
    levelUpSound = this.sound.add('levelUpSound');

    // 設定背景顏色
    this.cameras.main.setBackgroundColor('#3d4464'); // 更改為#3d4464

    player = this.physics.add.sprite(100, 300, 'player');
    player.setCollideWorldBounds(true);
    player.body.setAllowGravity(false);

    collectibles = this.physics.add.group();
    this.physics.add.overlap(player, collectibles, collectItem, null, this);

    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#fff', fontFamily: 'Rubik Bubbles' });
    levelText = this.add.text(16, 60, 'LEVEL 1', { fontSize: '48px', fill: '#fff', fontFamily: 'Rubik Bubbles' });
    timeText = this.add.text(650, 16, 'Time: 20', { fontSize: '32px', fill: '#fff', fontFamily: 'Rubik Bubbles' });

    // 添加星星作為背景
    stars = this.add.group();
    createStars(this);

    // 點擊事件來控制角色移動
    this.input.on('pointerdown', () => {
        movePlayerUp.call(this); // 移動角色向上
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
    for (let i = 0; i < 50; i++) { // 隨機產生 50 顆星星
        let x = Phaser.Math.Between(0, scene.sys.game.config.width);
        let y = Phaser.Math.Between(0, scene.sys.game.config.height);
        let star = scene.add.image(x, y, 'star'); // 使用星星圖片
        star.setScale(1); // 調整大小
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

    // 每幀更新角色的速度，減少重力影響
    player.setVelocityY(player.body.velocity.y + 5);

    // 更新星星位置
    stars.children.iterate(function (star) {
        star.x -= 1; // 每幀左移0.5像素
        if (star.x < 0) {
            star.x = this.sys.game.config.width; // 重新從右側出現
            star.y = Phaser.Math.Between(0, this.sys.game.config.height); // 隨機高度
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

    // collectible02 出現機率的定義
    let collectible02Chance = level < 3 ? 1 : (level >= 4 ? 5 : 10); // LEVEL 3之前 1%， LEVEL 4之後 5%，LEVEL 8之後 10%

    if (Phaser.Math.Between(1, 100) <= collectible02Chance) {
        collectible = collectibles.create(800, randomYPosition, 'collectible02');
        collectible.setScale(1);
    } else {
        collectible = collectibles.create(800, randomYPosition, 'collectible');
        let randomScale = Phaser.Math.FloatBetween(0.5, 1); // 確保在使用前定義
        collectible.setScale(randomScale);
    }

    // 分數範圍設定為1到10分
    collectible.scoreValue = Math.floor(1 + (collectible.scale * 9)); // 根據大小設定分數

    collectible.setVelocityX(collectibleSpeed);
    collectible.setCollideWorldBounds(false);
    collectible.setOrigin(0, 0);
}

function collectItem(player, collectible) {
    if (collectible.texture.key === 'skill01') {
        // 吃到SKILL01物件，啟動技能
        activateSkill01();
    } else {
        score += collectible.scoreValue; // 根據可吃物件的分數更新
        scoreText.setText('Score: ' + score);
        eatSound.play();

        collectibles.remove(collectible, true, true);

        if (score >= nextScoreTarget) {
            gameTime += 10;
            timeText.setText('Time: ' + gameTime);
            collectibleSpeed -= 50;

            collectibles.children.iterate(function (collectible) {
                collectible.setVelocityX(collectibleSpeed);
            });

            nextScoreTarget *= 3; // 使用混合增長公式

            level++;
            levelText.setText('LEVEL ' + level);
            bounceLevelText(this);

            // 播放升級音效
    levelUpSound.play();

            
        }
    }
}

// 啟動SKILL01技能
function activateSkill01() {
    skill01Active = true;

    skill01Object = player.scene.physics.add.image(player.x, player.y, 'skill01');
    skill01Object.setOrigin(0.5, 0.5);
    skill01Object.setDepth(1); // 確保在玩家上面顯示

    // 設置SKILL01的位置在玩家的上下
    skill01Object.setPosition(player.x, player.y - 50); // 在玩家上方
    skill01Object.setCollideWorldBounds(false);

    // 擴張可吃物件判定範圍
    player.setCircle(30 + 50, player.y, player.x); // 增加判定範圍

    player.scene.time.delayedCall(skill01Duration, () => {
        skill01Object.destroy();
        skill01Active = false;
        player.setCircle(30, player.y, player.x); // 恢復判定範圍
    });
}

// 控制玩家向上移動
function movePlayerUp() {
    player.setVelocityY(-300);
}

// 遊戲結束
function endGame() {
    gameOver = true;

    this.physics.pause();
    this.add.text(400, 200, 'Game Over', { fontSize: '64px', fill: '#fff', fontFamily: 'Rubik Bubbles' }).setOrigin(0.5);
    this.add.text(400, 300, 'Final Score: ' + score, { fontSize: '48px', fill: '#fff', fontFamily: 'Rubik Bubbles' }).setOrigin(0.5);

    retryButton = this.add.text(400, 400, 'Retry', { fontSize: '32px', fill: '#fff', fontFamily: 'Rubik Bubbles' })
        .setInteractive()
        .on('pointerdown', () => {
            restartGame.call(this);
        });
}

// 跳轉到重新開始遊戲
function restartGame() {
    score = 0;
    gameTime = 20;
    level = 1;
    collectibleSpeed = -200;
    nextScoreTarget = 10;
    gameOver = false;
    collectibles.clear(true, true);
    levelText.setText('LEVEL 1');
    scoreText.setText('Score: 0');
    timeText.setText('Time: 20');

    retryButton.destroy();
    this.scene.restart();
}

// 字體抖動效果
function bounceLevelText(scene) {
    levelText.setScale(1.5); // 放大
    scene.tweens.add({
        targets: levelText,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: 'Bounce.easeOut',
    });
}
