'use strict';

window.addEventListener('load', () => {
    console.log("DOM loaded, initializing game setup...");

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) { console.error("Canvas element not found!"); return; }
    console.log("Canvas element obtained:", canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) { console.error("2D context not supported!"); alert("Canvas not supported!"); return; }
    console.log("2D context obtained:", ctx);

    // --- Audio Setup ---
    let audioContext; const sfxBuffers = {}; let audioContextResumed = false;
    try { window.AudioContext = window.AudioContext || window.webkitAudioContext; audioContext = new AudioContext(); console.log("AudioContext created."); }
    catch (e) { console.error("Web Audio API is not supported", e); }
    const sfxFiles = { shoot: 'sounds/shoot.ogg', enemyHit: 'sounds/enemy_hit.ogg', playerHit: 'sounds/player_hit.ogg' };

    // --- Game Configuration ---
    const canvasWidth = canvas.width; const canvasHeight = canvas.height; const arenaPadding = 10;
    const arenaX = arenaPadding; const arenaY = arenaPadding; const arenaWidth = canvasWidth - 2 * arenaPadding; const arenaHeight = canvasHeight - 2 * arenaPadding;
    const projectileSpeed = 400; const initialPlayerLives = 3; const scorePerEnemy = 100; const baseEnemySpeed = 100; // Base speed for wave 1 squares

    // Enemy Type Config
    const squareEnemyConfig = { type: 'square', shape: 'rect', color: '#ff00ff', width: 30, height: 30, speed: baseEnemySpeed, health: 1 };
    const circleEnemyConfig = { type: 'circle', shape: 'circle', color: '#ffff00', radius: 15, speed: baseEnemySpeed * 1.2, health: 1 }; // Circles are inherently faster

    // UI Config
    const uiFont = "20px 'Courier New', Courier, monospace"; const uiColor = "#ffffff"; const scoreX = 25; const scoreY = 40;
    const highScoreY = scoreY + 25; const livesX = 670; const livesY = 40; const lifeIconSpacing = 20; const lifeIconColor = "#33ff33";
    const gameOverFontLarge = "48px 'Courier New', Courier, monospace"; const gameOverFontMedium = "24px 'Courier New', Courier, monospace"; const gameOverColor = "#ff3333";
    const menuTitleFont = "52px 'Courier New', Courier, monospace"; const menuTextFont = "22px 'Courier New', Courier, monospace"; const menuPromptFont = "26px 'Courier New', Courier, monospace";

    // High Score Storage Key
    const HIGH_SCORE_KEY = 'vectorVanguardHighScore';

    // Wave generator function used instead of static array
    console.log(`Canvas dimensions: ${canvasWidth}x${canvasHeight}`); console.log(`Arena dimensions: ${arenaWidth}x${arenaHeight} at (${arenaX},${arenaY})`);

    // --- Class Definitions ---
    class Player { /* ... Player class remains the same ... */
        constructor(x,y){this.x=x;this.y=y;this.width=15;this.height=15;this.shape='rect';this.color='#33ff33';this.strokeColor='#33ff33';this.lineWidth=1.5;this.speed=200;this.lives=initialPlayerLives;}
        draw(ctx){const tX=this.x,tY=this.y-this.height/2,lX=this.x-this.width/2,lY=this.y+this.height/2,rX=this.x+this.width/2,rY=this.y+this.height/2;ctx.beginPath();ctx.moveTo(tX,tY);ctx.lineTo(lX,lY);ctx.lineTo(rX,rY);ctx.closePath();ctx.fillStyle=this.color;ctx.fill();ctx.strokeStyle=this.strokeColor;ctx.lineWidth=this.lineWidth;ctx.stroke();}
        update(deltaTime,aX,aY,aW,aH){const mA=this.speed*deltaTime;if(keysPressed['w']||keysPressed['arrowup']){this.y-=mA;}if(keysPressed['s']||keysPressed['arrowdown']){this.y+=mA;}if(keysPressed['a']||keysPressed['arrowleft']){this.x-=mA;}if(keysPressed['d']||keysPressed['arrowright']){this.x+=mA;}const hW=this.width/2,hH=this.height/2,lB=aX+hW,rB=aX+aW-hW,tB=aY+hH,bB=aY+aH-hH;if(this.x<lB){this.x=lB;}if(this.x>rB){this.x=rB;}if(this.y<tB){this.y=tB;}if(this.y>bB){this.y=bB;}}
    }
    class Projectile { /* ... Projectile class remains the same ... */
        constructor(x,y,vX,vY){this.x=x;this.y=y;this.velocityX=vX;this.velocityY=vY;this.radius=3;this.color='#33ff33';this.shape='circle';}
        update(deltaTime){this.x+=this.velocityX*deltaTime;this.y+=this.velocityY*deltaTime;}
        draw(ctx){ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fillStyle=this.color;ctx.fill();}
        isOffScreen(w,h){return this.x<-this.radius||this.x>w+this.radius||this.y<-this.radius||this.y>h+this.radius;}
    }

    // Updated Enemy Class with Speed Scaling
    class Enemy {
        constructor(x, y, type = 'square') {
            this.x = x;
            this.y = y;
            this.type = type;
            this.health = 1;

            // --- Speed scaling based on wave ---
            const waveSpeedMultiplier = 1 + (currentWave - 1) * 0.03; // 3% increase per wave

            let config;
            let baseSpeed;

            if (type === 'circle') {
                config = circleEnemyConfig;
                this.radius = config.radius;
                this.shape = config.shape;
                baseSpeed = config.speed;
                this.color = config.color;
                this.speed = baseSpeed * waveSpeedMultiplier;
                const angle = Math.PI / 4 + Math.random() * Math.PI / 2;
                this.vx = Math.cos(angle) * this.speed;
                this.vy = Math.sin(angle) * this.speed;
            } else { // Default to square
                config = squareEnemyConfig;
                this.width = config.width;
                this.height = config.height;
                this.shape = config.shape;
                baseSpeed = config.speed;
                this.color = config.color;
                this.speed = baseSpeed * waveSpeedMultiplier;
                this.vx = 0;
                this.vy = this.speed;
            }
            this.health = config.health;
            // console.log(`Spawned ${type} W${currentWave}, Speed: ${this.speed.toFixed(2)} (Mult: ${waveSpeedMultiplier.toFixed(2)})`);
        }

        update(deltaTime) {
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
            const cY=this.shape==='circle'?this.y-this.radius:this.y-this.height/2;
            const cXL=this.shape==='circle'?this.x-this.radius:this.x-this.width/2;
            const cXR=this.shape==='circle'?this.x+this.radius:this.x+this.width/2;
            if(cY>canvasHeight){this.y=this.shape==='circle'?-this.radius:-this.height/2; this.x=Math.random()*arenaWidth+arenaX;}
            if(cXR<0){this.x=canvasWidth+(this.shape==='circle'?this.radius:this.width/2);}else if(cXL>canvasWidth){this.x=-(this.shape==='circle'?this.radius:this.width/2);}
        }

        draw(ctx) {
            ctx.strokeStyle=this.color; ctx.lineWidth=2;
            if(this.shape==='rect'){const hS=this.width/2; ctx.strokeRect(this.x-hS,this.y-hS,this.width,this.height);}
            else if(this.shape==='circle'){ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.stroke();}
        }
    }

    class Particle { /* ... Particle class remains the same ... */
        constructor(x,y,vx,vy,life,color,size){this.x=x;this.y=y;this.vx=vx;this.vy=vy;this.life=life;this.initialLife=life;this.color=color;this.size=size;}
        update(deltaTime){this.x+=this.vx*deltaTime;this.y+=this.vy*deltaTime;this.life-=deltaTime;}
        draw(ctx){if(this.life<=0)return;const alpha=Math.max(0,this.life/this.initialLife);ctx.globalAlpha=alpha;ctx.fillStyle=this.color;ctx.fillRect(this.x-this.size/2,this.y-this.size/2,this.size,this.size);ctx.globalAlpha=1.0;}
    }

    // --- Game State Definition ---
    const GameState = { MENU: 'menu', PLAYING: 'playing', GAME_OVER: 'gameOver' };

    // --- Game State Initialization ---
    let lastTime = 0; let mousePos = { x: 0, y: 0 }; const keysPressed = {};
    let score = 0; let highScore = 0; let currentWave = 1; // currentWave IS used by Enemy constructor
    let currentState = GameState.MENU;
    const player = new Player(canvasWidth / 2, canvasHeight - 50);
    const playerProjectiles = []; const enemies = []; const particles = [];
    let shakeDuration = 0; let shakeIntensity = 0;
    console.log("Player instance created (initially inactive):", player);

    // --- Helper Functions ---
    function getMousePos(canvas, event) { /* ... */ const r=canvas.getBoundingClientRect(); return {x:event.clientX-r.left, y:event.clientY-r.top}; }
    function rectRectCollision(r1, r2) { /* ... */ const r1L=r1.x-r1.width/2,r1R=r1.x+r1.width/2,r1T=r1.y-r1.height/2,r1B=r1.y+r1.height/2; const r2L=r2.x-r2.width/2,r2R=r2.x+r2.width/2,r2T=r2.y-r2.height/2,r2B=r2.y+r2.height/2; return r1L<r2R&&r1R>r2L&&r1T<r2B&&r1B>r2T;}
    function circleRectCollision(c, r) { /* ... */ const rHW=r.width/2,rHH=r.height/2,rL=r.x-rHW,rR=r.x+rHW,rT=r.y-rHH,rB=r.y+rHH; const cX=Math.max(rL,Math.min(c.x,rR)),cY=Math.max(rT,Math.min(c.y,rB)); const dX=c.x-cX,dY=c.y-cY; const dSq=(dX*dX)+(dY*dY); return dSq<(c.radius*c.radius);}
    function circleCircleCollision(c1, c2) { /* ... */ const dx=c1.x-c2.x,dy=c1.y-c2.y; const dSq=dx*dx+dy*dy; const rSumSq=(c1.radius+c2.radius)*(c1.radius+c2.radius); return dSq<rSumSq;}
    function drawUI(ctx) { /* ... remains the same ... */
        ctx.font=uiFont;ctx.fillStyle=uiColor;ctx.textBaseline='top';ctx.textAlign='left';ctx.fillText(`SCORE: ${score}`,scoreX,scoreY);
        ctx.fillText(`HI: ${highScore}`,scoreX,highScoreY);ctx.textAlign='center';ctx.fillText(`WAVE: ${currentWave}`,canvasWidth/2,scoreY);
        ctx.textAlign='right';ctx.fillText('LIVES:',livesX,livesY);ctx.fillStyle=lifeIconColor;ctx.strokeStyle=lifeIconColor;ctx.lineWidth=1;
        for(let i=0;i<player.lives;i++){const iXO=livesX+10+(i*lifeIconSpacing);const tX=iXO,tY=scoreY-5;const lX=iXO-5,lY=tY+10;const rX=iXO+5,rY=tY+10;ctx.beginPath();ctx.moveTo(tX,tY);ctx.lineTo(lX,lY);ctx.lineTo(rX,rY);ctx.closePath();ctx.fill();}ctx.textAlign='left';}
    function loadHighScore() { /* ... remains the same ... */ try{const sS=localStorage.getItem(HIGH_SCORE_KEY);if(sS!==null){highScore=parseInt(sS,10)||0;console.log(`Loaded high score: ${highScore}`);}else{console.log("No high score found.");highScore=0;}}catch(e){console.error("LS load fail:",e);highScore=0;}}
    function checkAndSaveHighScore() { /* ... remains the same ... */ if(score>highScore){highScore=score;console.log(`New high score! Saving ${highScore}.`);try{localStorage.setItem(HIGH_SCORE_KEY,highScore.toString());}catch(e){console.error("LS save fail:",e);}}}
    function createParticles(x,y,count,color,speedRange,lifeRange) { /* ... remains the same ... */ for(let i=0;i<count;i++){const angle=Math.random()*Math.PI*2;const speed=Math.random()*speedRange+50;const vx=Math.cos(angle)*speed;const vy=Math.sin(angle)*speed;const life=Math.random()*lifeRange+0.2;const size=Math.random()*3+1;particles.push(new Particle(x,y,vx,vy,life,color,size));}}
    function triggerScreenShake(duration,intensity) { /* ... remains the same ... */ shakeDuration=Math.max(shakeDuration,duration);shakeIntensity=Math.max(shakeIntensity,intensity);console.log(`Screen shake: duration=${duration}, intensity=${intensity}`);}

    // Generate Wave Config Function
    function generateWaveConfig(waveNumber) {
        const enemiesArray = []; const baseCount = 3; const linearIncrease = Math.floor(waveNumber/2);
        const stepIncrease = Math.floor(waveNumber/5)*2; const totalEnemies = baseCount+linearIncrease+stepIncrease;
        let numSquares=0; let numCircles=0;
        if(waveNumber<3){numSquares=totalEnemies;}else{const circleProp=Math.min(0.60,0.10+(waveNumber-3)*0.05);numCircles=Math.round(totalEnemies*circleProp);numSquares=totalEnemies-numCircles;if(numCircles>0&&numSquares<=0){numSquares=1;numCircles=Math.max(0,totalEnemies-1);}}
        if(numSquares>0){enemiesArray.push({type:'square',count:numSquares});} if(numCircles>0){enemiesArray.push({type:'circle',count:numCircles});}
        return {wave:waveNumber,enemies:enemiesArray};
    }

    // Start Wave uses generator
    function startWave(waveNumber) {
        console.log(`Starting Wave ${waveNumber}`);
        currentWave = waveNumber; // Set wave FIRST, so Enemy constructor uses correct value
        const config = generateWaveConfig(waveNumber);
        if (!config || !config.enemies || config.enemies.length === 0) { console.error(`Failed config gen wave ${waveNumber}`); return; }
        config.enemies.forEach(group => { const type = group.type;
            for (let i = 0; i < group.count; i++) {
                const spawnX = Math.random() * arenaWidth + arenaX; const spawnY = -50;
                enemies.push(new Enemy(spawnX, spawnY, type)); // Enemy constructor now uses global currentWave
            } });
        console.log(`Spawned enemies for wave ${currentWave}. Total: ${enemies.length}`);
    }

    function resetGame() {
        console.log("Resetting game variables for new game...");
        score=0; player.lives=initialPlayerLives; player.x=canvasWidth/2; player.y=canvasHeight-50;
        playerProjectiles.length=0; enemies.length=0; particles.length=0;
        shakeDuration=0; shakeIntensity=0;
        currentWave=1; // Reset wave number FIRST
        startWave(1); // Then spawn wave 1 enemies (uses the now reset currentWave)
        console.log("Game variables reset.");
    }

    // --- Audio Functions ---
    async function loadSound(url) { /* ... */ if(!audioContext)return null;try{const r=await fetch(url);if(!r.ok){throw new Error(`HTTP err ${r.status} ${url}`);}const aB=await r.arrayBuffer();const buffer=await audioContext.decodeAudioData(aB);return buffer;}catch(e){console.error(`Load sound fail: ${url}`,e);return null;} }
    async function loadAllSounds() { /* ... */ if(!audioContext)return;console.log("Loading sfx...");const promises=[];for(const key in sfxFiles){promises.push(loadSound(sfxFiles[key]).then(b=>{if(b){sfxBuffers[key]=b;console.log(`Loaded: ${key}`);}else{console.warn(`Failed: ${key}`);}}));}try{await Promise.all(promises);console.log("SFX loading done.");}catch(e){console.error("Err loading sounds:",e);} }
    function playSound(bufferName) { /* ... */ if(!audioContext||!sfxBuffers[bufferName]){return;}if(audioContext.state==='suspended'){console.log("Audio suspended...");audioContext.resume().then(()=>{console.log("Audio resumed!");audioContextResumed=true;playSoundInternal(bufferName);}).catch(e=>console.error("Resume fail:",e));return;}playSoundInternal(bufferName);}
    function playSoundInternal(bufferName) { /* ... */ if(!audioContext||!sfxBuffers[bufferName])return;try{const source=audioContext.createBufferSource();source.buffer=sfxBuffers[bufferName];source.connect(audioContext.destination);source.start(0);}catch(e){console.error(`Play err ${bufferName}:`,e);}}

    // --- Main Game Loop ---
    function gameLoop(timestamp) {
        const deltaTime = (timestamp - lastTime) / 1000; lastTime = timestamp;

        if (currentState === GameState.PLAYING) {
            // --- UPDATE (PLAYING) ---
            player.update(deltaTime, arenaX, arenaY, arenaWidth, arenaHeight);
            enemies.forEach(enemy => enemy.update(deltaTime));
            for(let i=particles.length-1; i>=0; i--){particles[i].update(deltaTime);if(particles[i].life<=0){particles.splice(i,1);}}
            if(shakeDuration>0){shakeDuration-=deltaTime;if(shakeDuration<=0){shakeIntensity=0;shakeDuration=0;}}
            for(let i=playerProjectiles.length-1; i>=0; i--){const p=playerProjectiles[i];p.update(deltaTime);if(p.isOffScreen(canvasWidth,canvasHeight)){playerProjectiles.splice(i,1);}}

            // --- COLLISIONS (PLAYING) ---
            for(let i=playerProjectiles.length-1; i>=0; i--){/* ... Projectile vs Enemy ... */ const projectile=playerProjectiles[i];let projectileHit=false;for(let j=enemies.length-1;j>=0;j--){const enemy=enemies[j];let collision=false;if(enemy.shape==='rect'){collision=circleRectCollision(projectile,enemy);}else if(enemy.shape==='circle'){collision=circleCircleCollision(projectile,enemy);}if(collision){createParticles(enemy.x,enemy.y,15,enemy.color,180,0.6);enemies.splice(j,1);score+=scorePerEnemy;projectileHit=true;playSound('enemyHit');break;}}if(projectileHit){playerProjectiles.splice(i,1);}}
            for(let i=enemies.length-1; i>=0; i--){/* ... Enemy vs Player ... */ const enemy=enemies[i];let collision=false;if(enemy.shape==='rect'){collision=rectRectCollision(player,enemy);}else if(enemy.shape==='circle'){collision=circleRectCollision(enemy,player);}if(collision){createParticles(player.x,player.y,10,player.color,100,0.4);triggerScreenShake(0.25,6);enemies.splice(i,1);player.lives--;console.log(`Lives: ${player.lives}`);playSound('playerHit');if(player.lives<=0){console.log("GAME OVER!");checkAndSaveHighScore();currentState=GameState.GAME_OVER;}}}

            // --- WAVE CHECK (PLAYING) ---
            if (enemies.length === 0 && currentState === GameState.PLAYING) { console.log(`Wave ${currentWave} cleared!`); startWave(currentWave + 1); }

            // --- DRAW (PLAYING) ---
            ctx.save(); if(shakeDuration>0){const oX=(Math.random()-0.5)*2*shakeIntensity; const oY=(Math.random()-0.5)*2*shakeIntensity; ctx.translate(oX, oY);}
            ctx.fillStyle='#050010'; ctx.fillRect(0,0,canvasWidth,canvasHeight); // Clear
            particles.forEach(p=>p.draw(ctx)); player.draw(ctx); playerProjectiles.forEach(p=>p.draw(ctx)); enemies.forEach(enemy=>enemy.draw(ctx));
            ctx.strokeStyle='#00ffff'; ctx.lineWidth=2; ctx.strokeRect(arenaX,arenaY,arenaWidth,arenaHeight); // Arena
            drawUI(ctx); if(shakeDuration>0){ctx.restore();} // Restore from shake

        } else if (currentState === GameState.GAME_OVER) { /* ... Draw Game Over Screen ... */
            ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,canvasWidth,canvasHeight);ctx.font=gameOverFontLarge;ctx.fillStyle=gameOverColor;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('GAME OVER',canvasWidth/2,canvasHeight/2-60);ctx.font=gameOverFontMedium;ctx.fillStyle=uiColor;ctx.fillText(`Final Score: ${score}`,canvasWidth/2,canvasHeight/2+0);ctx.fillText(`High Score: ${highScore}`,canvasWidth/2,canvasHeight/2+35);ctx.fillText('Press ENTER to Restart',canvasWidth/2,canvasHeight/2+80);
        } else if (currentState === GameState.MENU) { /* ... Draw Menu Screen ... */
            ctx.fillStyle='#050010';ctx.fillRect(0,0,canvasWidth,canvasHeight);ctx.font=menuTitleFont;ctx.fillStyle='#00ffff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('VECTOR VANGUARD',canvasWidth/2,canvasHeight*0.25);
            ctx.font=menuTextFont;ctx.fillStyle=uiColor;ctx.fillText('Use WASD or Arrow Keys to Move',canvasWidth/2,canvasHeight*0.45);ctx.fillText('Use Mouse to Aim and Left Click to Shoot',canvasWidth/2,canvasHeight*0.50);
            ctx.fillText(`High Score: ${highScore}`,canvasWidth/2,canvasHeight*0.65);ctx.font=menuPromptFont;ctx.fillStyle='#33ff33';ctx.fillText('Click or Press ENTER to Start',canvasWidth/2,canvasHeight*0.80);
        }

        // Request Next Frame
        requestAnimationFrame(gameLoop);
    }

    // --- Event Listeners Setup ---
    console.log("Setting up event listeners...");
    window.addEventListener('keydown', (event) => { /* ... */ const key=event.key.toLowerCase();keysPressed[key]=true;if(currentState===GameState.GAME_OVER&&key==='enter'){console.log("Restarting(GO)...");resetGame();currentState=GameState.PLAYING;}else if(currentState===GameState.MENU&&key==='enter'){console.log("Starting(Menu)...");resetGame();currentState=GameState.PLAYING;}});
    window.addEventListener('keyup', (event) => { /* ... */ keysPressed[event.key.toLowerCase()]=false; });
    canvas.addEventListener('mousemove', (event) => { /* ... */ mousePos=getMousePos(canvas,event); });
    canvas.addEventListener('mousedown', (event) => { /* ... */ if(audioContext&&audioContext.state==='suspended'&&!audioContextResumed){audioContext.resume().then(()=>{console.log("Audio resumed!");audioContextResumed=true;const b=document.getElementById('bgm');if(b&&b.paused){b.play().catch(e=>console.log("BGM fail:",e));}}).catch(e=>console.error("Resume fail:",e));}if(currentState===GameState.MENU){console.log("Starting(Menu)...");resetGame();currentState=GameState.PLAYING;}else if(currentState===GameState.PLAYING&&event.button===0){const dx=mousePos.x-player.x,dy=mousePos.y-player.y,angle=Math.atan2(dy,dx);const vX=Math.cos(angle)*projectileSpeed,vY=Math.sin(angle)*projectileSpeed;playerProjectiles.push(new Projectile(player.x,player.y,vX,vY));playSound('shoot');}});

    // --- Start the Game ---
    async function startGame() {
        loadHighScore(); // Load high score once
        if (audioContext) { await loadAllSounds(); }
        const bgm = document.getElementById('bgm');
        if (bgm) { bgm.volume = 0.3; } else { console.warn("BGM element not found."); }
        console.log("Game ready. Starting loop in MENU state.");
        lastTime = performance.now();
        currentState = GameState.MENU;
        requestAnimationFrame(gameLoop); // Start the main loop
    }

    startGame();

}); // End of window.onload listener

console.log("game.js script loaded.");
