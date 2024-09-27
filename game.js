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
let level = 1; // 初始等級
let levelText; // 等級顯示文本
let skillObjectActive = false; // 技能物件是否啟動
let skillObject; // 環繞角色的技能物件
let skillTimer;
let levelBounceTween; // 等級跳動效果的補間

const game = new Phaser.Game(config);

function preload() {
    this.load.image('player', 'images/player.png'); // 角色圖片
    this.load.image('collectible', 'images/collectible.png'); // 普通可吃物件圖片
    this.load.image('collectible02', 'images/collectible02.png'); // 特殊可吃物件圖片
    this.load.image('skill01', 'images/skill01.png'); // 技能物件圖片
    this.load.audio('eatSound', 'audio/eat.mp3'); // 吃到物件的音效
    this.load.audio('levelUpSound', 'audio/LEVELUP.MP3'); // 升級音效
}

function create() {
    // 加載吃到物件的音效
    eatSound = this.sound.add('eatSound');
    levelUpSound = this.sound.add('levelUpSound');

    // 創建角色
    player = this.physics.add.sprite(100, 300, 'player');
    player.setCollideWorldBounds(true);
    player.body.setAllowGravity(false);
    player.setVelocityY(100);

    // 創建可吃物件組
    collectibles = this.physics.add.group();
    this.physics.add.overlap(player, collectibles, collectItem, null, this);

    // 創建計分版
    scoreText = this.add.text(550, 16, 'Score: 0', { fontSize: '32px', fill: '#fff', fontFamily: 'Rubik Bubbles' });

    // 創建等級顯示
    levelText = this.add.text(550, 60, 'LEVEL 1', { fontSize: '48px', fill: '#fff', fontFamily: 'Rubik Bubbles' });

    // 創建時間顯示，置中上方
    timeText = this.add.text(400, 16, 'Time: 20', { fontSize: '32px', fill: '#fff', fontFamily: 'Rubik Bubbles' }).setOrigin(0.5, 0);

    // 設置點擊讓角色向上移動
    this.input.on('pointerdown', function () {
        player.setVelocityY(-200);
        if (this.sound.context.state === 'suspended') {
            this.sound.context.resume(); // 恢復音頻上下文
        }
    }, this);

    // 啟動計時器
    this.time.addEvent({
        delay: 1000,
        callback: updateTime,
        callbackScope: this,
        loop: true
    });
}

function update(time, delta) {
    if (gameOver) {
        return;
    }

    // 每隔固定時間生成可吃物件，且限制畫面最多出現 15 個
    collectibleSpawnTimer += delta;
    if (collectibleSpawnTimer > collectibleSpawnInterval && collectibles.getChildren().length < maxCollectibles) {
        collectibleSpawnTimer = 0;
        createCollectible(this);
    }

    // 檢查可吃物件並刪除超出畫面的可吃物件
    collectibles.children.iterate(function (collectible) {
        if (collectible && collectible.x < -collectible.displayWidth) {
            collectibles.remove(collectible, true, true); // 從組中移除並銷毀可吃物件
        }
    });

    // 角色自然下墜
    player.setVelocityY(player.body.velocity.y + 5);

    // 技能物件持續環繞角色
    if (skillObjectActive && skillObject) {
        skillObject.x = player.x + 50 * Math.cos(time / 200); // 環繞效果
        skillObject.y = player.y + 50 * Math.sin(time / 200);
    }
}

// 更新遊戲時間的函數
function updateTime() {
    if (gameTime > 0) {
        gameTime--;
        timeText.setText('Time: ' + gameTime);
    } else {
        endGame.call(this);
    }
}

// 創建可吃物件的函數
function createCollectible(scene) {
    let randomYPosition = Phaser.Math.Between(100, 500); // 隨機 Y 軸生成位置
    let collectible;

    // 計算出現機率
    let collectible02Chance = level < 3 ? 50 : 10; // LEVEL 3之前，出現機率為2%

    // 隨機決定是否生成特殊可吃物件
    if (Phaser.Math.Between(1, collectible02Chance) === 1) {
        collectible = collectibles.create(800, randomYPosition, 'collectible02'); // 生成特殊可吃物件
        collectible.scoreValue = 30; // 特殊可吃物件的分數
        collectible.setScale(1);
    } else {
        collectible = collectibles.create(800, randomYPosition, 'collectible'); // 生成普通可吃物件
        let randomScale = Phaser.Math.FloatBetween(0.5, 1); // 隨機大小
        collectible.setScale(randomScale);
        collectible.scoreValue = Math.floor(5 - (randomScale * 4)); // 隨機得分
    }

    collectible.setVelocityX(collectibleSpeed);
    collectible.setCollideWorldBounds(false);
    collectible.setOrigin(0, 0);
}

// 當角色碰到可吃物件時，更新分數
function collectItem(player, collectible) {
    score += collectible.scoreValue;
    scoreText.setText('Score: ' + score);

    // 播放吃到物件的音效
    eatSound.play();

    // 檢查分數，若達到目標則增加時間和加快速度
    if (score >= nextScoreTarget) {
        gameTime += 10;
        timeText.setText('Time: ' + gameTime);
        collectibleSpeed -= 50;
        collectibles.children.iterate(function (collectible) {
            collectible.setVelocityX(collectibleSpeed);
        });

        nextScoreTarget *= 2; // 公比為2，下一目標是目前目標的2倍

        // 增加等級
        level++;
        levelText.setText('LEVEL ' + level);
        bounceLevelText(this); // 顯示跳動效果
        levelUpSound.play(); // 播放升級音效
        showLevelUpEffect(this); // 顯示等級放大淡出效果
    }

    collectibles.remove(collectible, true, true);

    // 若吃到的物件為特殊物件，則啟動技能效果
    if (collectible.texture.key === 'collectible02') {
        activateSkill(this);
    }
}

// 等級跳動效果
function bounceLevelText(scene) {
    if (levelBounceTween) {
        levelBounceTween.stop(); // 停止之前的跳動效果
    }

    levelBounceTween = scene.tweens.add({
        targets: levelText,
        y: levelText.y - 10,
        duration: 300,
        yoyo: true,
        repeat: 1
    });
}

// 顯示等級放大淡出效果
function showLevelUpEffect(scene) {
    let levelUpText = scene.add.text(400, 300, 'LEVEL ' + level, { fontSize: '64px', fill: '#fff', fontFamily: 'Rubik Bubbles' }).setOrigin(0.5);
    scene.tweens.add({
        targets: levelUpText,
        scale: 2,
        alpha: 0,
        duration: 1000,
        onComplete: () => {
            levelUpText.destroy();
        }
    });
}

// 啟動技能的函數
function activateSkill(scene) {
    skillObjectActive = true;
    skillObject = scene.physics.add.sprite(player.x, player.y, 'skill01');
    scene.physics.add.overlap(skillObject, collectibles, collectItem, null, scene);

    // 設定每幀的旋轉效果
    scene.tweens.add({
        targets: skillObject,
        rotation: 2 * Math.PI, // 完成一圈旋轉
        duration: 5000, // 在5秒內完成一圈
        repeat: -1, // 持續重複旋轉
        ease: 'Linear' // 緩慢且均勻旋轉
    });

    skillTimer = scene.time.addEvent({
        delay: 5000, // 環繞物件持續5秒
        callback: () => {
            skillObjectActive = false;
            skillObject.destroy();
        },
        callbackScope: scene
    });
}

function endGame() {
    gameOver = true;
    retryButton = this.add.text(400, 300, 'Game Over\nClick to Retry', { fontSize: '64px', fill: '#fff', fontFamily: 'Rubik Bubbles' }).setOrigin(0.5);
    retryButton.setInteractive();

    retryButton.on('pointerdown', function () {
        score = 0;
        gameTime = 20;
        collectibleSpeed = -200;
        nextScoreTarget = 10;
        level = 1;
        collectibles.clear(true, true);
        retryButton.destroy();
        scoreText.setText('Score: 0');
        levelText.setText('LEVEL 1');
        timeText.setText('Time: 20');
        gameOver = false;
    });
}
