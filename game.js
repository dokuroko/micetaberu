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
let background;
let level = 1; // 初始等級
let levelText; // 等級顯示文本
let levelBounceTween; // 等級跳動效果的補間

const game = new Phaser.Game(config);

function preload() {
    this.load.image('player', 'images/player.png'); // 角色圖片
    this.load.image('collectible', 'images/collectible.png'); // 普通可吃物件圖片
    this.load.image('collectible02', 'images/collectible02.png'); // 特殊可吃物件圖片
    this.load.audio('eatSound', 'audio/eat.mp3'); // 吃到物件的音效
}

function create() {
    // 加载吃到物件的音效
    eatSound = this.sound.add('eatSound');

    // 创建角色
    player = this.physics.add.sprite(100, 300, 'player');
    player.setCollideWorldBounds(true);
    player.body.setAllowGravity(false);
    player.setVelocityY(100);

    // 创建可吃物件组
    collectibles = this.physics.add.group();
    this.physics.add.overlap(player, collectibles, collectItem, null, this);

    // 创建计分版
    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#fff', fontFamily: 'CuteBoldFont' });

    // 创建等级显示
    levelText = this.add.text(16, 60, 'LEVEL 1', { fontSize: '48px', fill: '#fff', fontFamily: 'CuteBoldFont' });

    // 创建时间显示
    timeText = this.add.text(650, 16, 'Time: 20', { fontSize: '32px', fill: '#fff' });

    // 设置鼠标左键点击让角色向上移动
    this.input.on('pointerdown', function () {
        player.setVelocityY(-200);
        if (this.sound.context.state === 'suspended') {
            this.sound.context.resume(); // 恢复音频上下文
        }
    }, this);

    // 启动计时器
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

    // 每隔固定时间生成可吃物件，且限制画面最多出现 15 个
    collectibleSpawnTimer += delta;
    if (collectibleSpawnTimer > collectibleSpawnInterval && collectibles.getChildren().length < maxCollectibles) {
        collectibleSpawnTimer = 0;
        createCollectible(this);
    }

    // 检查可吃物件并删除超出画面的可吃物件
    collectibles.children.iterate(function (collectible) {
        if (collectible && collectible.x < -collectible.displayWidth) {
            collectibles.remove(collectible, true, true); // 从组中移除并销毁可吃物件
        }
    });

    // 角色自然下坠
    player.setVelocityY(player.body.velocity.y + 5);
}

// 更新游戏时间的函数
function updateTime() {
    if (gameTime > 0) {
        gameTime--;
        timeText.setText('Time: ' + gameTime);
    } else {
        endGame.call(this);
    }
}

// 创建可吃物件的函数
function createCollectible(scene) {
    let randomYPosition = Phaser.Math.Between(100, 500); // 随机 Y 轴生成位置
    let collectible;

    // 計算出現機率
    let collectible02Chance = level < 4 ? 50 : 10; // LEVEL 3之前，出現機率減半

    // 隨機決定是否生成特殊可吃物件
    if (Phaser.Math.Between(1, collectible02Chance) === 1) { // 若level小於3，出現機率為1/2
        collectible = collectibles.create(800, randomYPosition, 'collectible02'); // 生成特殊可吃物件
        collectible.scoreValue = 30; // 特殊可吃物件的分數
        collectible.setScale(1); // 设置特殊可吃物件大小
    } else {
        collectible = collectibles.create(800, randomYPosition, 'collectible'); // 生成普通可吃物件
        let randomScale = Phaser.Math.FloatBetween(0.5, 1); // 随机大小（0.5到1倍）
        collectible.setScale(randomScale);
        collectible.scoreValue = Math.floor(5 - (randomScale * 4)); // 随机得分 (1~5分)
    }

    collectible.setVelocityX(collectibleSpeed); // 让可吃物件向左边移动
    collectible.setCollideWorldBounds(false); // 可吃物件不会停留在边界
    collectible.setOrigin(0, 0); // 设置原点为左上角
}


// 当角色碰到可吃物件时，更新分数
function collectItem(player, collectible) {
    score += collectible.scoreValue; // 更新分数
    scoreText.setText('Score: ' + score); // 更新计分版

    // 播放吃到物件的音效
    eatSound.play();

    // 检查分数，若达到目标则增加时间和加快速度
    if (score >= nextScoreTarget) {
        gameTime += 10; // 增加10秒
        timeText.setText('Time: ' + gameTime); // 更新时间显示
        collectibleSpeed -= 50; // 增加可吃物件的移动速度
        collectibles.children.iterate(function (collectible) {
            collectible.setVelocityX(collectibleSpeed); // 更新所有可吃物件的速度
        });

        // 更新下一个目标分数
        nextScoreTarget *= 2; // 公比为2，下一目标是目前目标的2倍

        // 增加等级
        level++;
        levelText.setText('LEVEL ' + level);
        bounceLevelText(this); // 确保this正确引用场景
    }

    collectibles.remove(collectible, true, true); // 从组中移除并销毁可吃物件
}

// 等级跳动效果
function bounceLevelText(scene) {
    if (levelBounceTween) {
        levelBounceTween.stop(); // 停止之前的跳动效果
    }

    levelBounceTween = scene.tweens.add({
        targets: levelText,
        y: levelText.y - 10,
        duration: 300,
        yoyo: true,
        repeat: 1
    });
}

// 游戏结束的函数
function endGame() {
    gameOver = true; // 停止游戏
    this.physics.pause(); // 暂停所有物理

    // 创建半透明背景
    background = this.add.graphics();
    background.fillStyle(0xaaaaaa, 1); // 灰色，50%透明度
    background.fillRoundedRect(200, 150, 400, 300, 20); // 圆角矩形

    // 显示结束 UI
    this.add.text(400, 200, 'Game Over!', { fontSize: '64px', fill: '#ff0000' }).setOrigin(0.5);
    this.add.text(400, 300, 'Final Score: ' + score, { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

    // 创建重试按钮背景
    let retryButtonBackground = this.add.graphics();
    retryButtonBackground.fillStyle(0xaaaaaa, 1); // 背景灰色，50%透明度
    retryButtonBackground.fillRoundedRect(350, 400, 100, 50, 10); // 圆角矩形

    // 创建重试按钮
    retryButton = this.add.text(400, 425, 'Retry', { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
    retryButton.setInteractive();

    // 重试按钮 hover 效果
    retryButton.on('pointerover', function () {
        retryButtonBackground.fillRoundedRect(350, 400, 100, 50, 10); // 重新绘制背景
    });

    // 重试按钮点击事件
    retryButton.on('pointerdown', function () {
        location.reload(); // 重新加载游戏
    });
}
