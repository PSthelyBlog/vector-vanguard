'use strict';

window.addEventListener('load', () => {
    console.log("DOM loaded, initializing game setup...");

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) { console.error("Canvas element not found!"); return; }
    console.log("Canvas element obtained:", canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) { console.error("2D context not supported!"); alert("Canvas not supported!"); return; }
    console.log("2D context obtained:", ctx);

    // --- Audio Setup (Step 14) ---
    let audioContext;
    const sfxBuffers = {}; // To store decoded sound buffers
    let audioContextResumed = false; // Flag to resume context on first interaction

    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        console.log("AudioContext created.");
    } catch (e) {
        console.error("Web Audio API is not supported in this browser", e);
        // Game can continue without audio, or display a message
    }

    // List of sound effects to load
    const sfxFiles = {
        shoot: 'sounds/shoot.ogg', // Replace with your actual file paths/formats
        enemyHit: 'sounds/enemy_hit.ogg',
        playerHit: 'sounds/player_hit.ogg'
    };

    // --- Game Configuration ---
    /* ... canvas, arena, speed, score, lives config ... */
    const canvasWidth = canvas.width; const canvasHeight = canvas.height; const arenaPadding = 10;
    const arenaX = arenaPadding; const arenaY = arenaPadding; const arenaWidth = canvasWidth - 2 * arenaPadding;
    const arenaHeight = canvasHeight - 2 * arenaPadding; const projectileSpeed = 400; const initialPlayerLives = 3;
    const scorePerEnemy = 100; const baseEnemySpeed = 100;

    // Enemy Type Config
    /* ... square & circle config ... */
    const squareEnemyConfig = { type: 'square', shape: 'rect', color: '#ff00ff', width: 30, height: 30, speed: baseEnemySpeed, health: 1 };
    const circleEnemyConfig = { type: 'circle', shape: 'circle', color: '#ffff00', radius: 15, speed: baseEnemySpeed * 1.2, health: 1 };

    // UI Config
    /* ... ui config ... */
    const uiFont = "20px 'Courier New', Courier, monospace"; const uiColor = "#ffffff"; const scoreX = 25; const scoreY = 40;
    const livesX = 670; const livesY = 40; const lifeIconSpacing = 20; const lifeIconColor = "#33ff33";
    const gameOverFontLarge = "48px 'Courier New', Courier, monospace"; const gameOverFontMedium = "24px 'Courier New', Courier, monospace";
    const gameOverColor = "#ff3333";

    // Wave Configuration
    /* ... waveConfigs ... */
    const waveConfigs = [ { wave: 1, enemies: [{ type: 'square', count: 3 }] }, { wave: 2, enemies: [{ type: 'square', count: 5 }] },
        { wave: 3, enemies: [{ type: 'square', count: 4 }, { type: 'circle', count: 2 }] }, { wave: 4, enemies: [{ type: 'square', count: 6 }, { type: 'circle', count: 3 }] },
        { wave: 5, enemies: [{ type: 'circle', count: 6 }] }, { wave: 6, enemies: [{ type: 'square', count: 10 }, { type: 'circle', count: 5 }] }, ];

    console.log(`Canvas dimensions: ${canvasWidth}x${canvasHeight}`);
    console.log(`Arena dimensions: ${arenaWidth}x${arenaHeight} at (${arenaX},${arenaY})`);

    // --- Class Definitions ---
    class Player { /* ... Player class remains the same ... */
        constructor(x, y) { this.x = x; this.y = y; this.width = 15; this.height = 15; this.shape = 'rect'; this.color = '#33ff33'; this.strokeColor = '#33ff33'; this.lineWidth = 1.5; this.speed = 200; this.lives = initialPlayerLives;}
        draw(ctx) { const tX=this.x, tY=this.y-this.height/2, lX=this.x-this.width/2, lY=this.y+this.height/2, rX=this.x+this.width/2, rY=this.y+this.height/2; ctx.beginPath(); ctx.moveTo(tX, tY); ctx.lineTo(lX, lY); ctx.lineTo(rX, rY); ctx.closePath(); ctx.fillStyle=this.color; ctx.fill(); ctx.strokeStyle=this.strokeColor; ctx.lineWidth=this.lineWidth; ctx.stroke();}
        update(deltaTime, aX, aY, aW, aH) { const mA=this.speed*deltaTime; if(keysPressed['w']||keysPressed['arrowup']){this.y-=mA;} if(keysPressed['s']||keysPressed['arrowdown']){this.y+=mA;} if(keysPressed['a']||keysPressed['arrowleft']){this.x-=mA;} if(keysPressed['d']||keysPressed['arrowright']){this.x+=mA;} const hW=this.width/2, hH=this.height/2, lB=aX+hW, rB=aX+aW-hW, tB=aY+hH, bB=aY+aH-hH; if(this.x<lB){this.x=lB;} if(this.x>rB){this.x=rB;} if(this.y<tB){this.y=tB;} if(this.y>bB){this.y=bB;} }
    }
    class Projectile { /* ... Projectile class remains the same ... */
        constructor(x, y, vX, vY) { this.x = x; this.y = y; this.velocityX = vX; this.velocityY = vY; this.radius = 3; this.color = '#33ff33'; this.shape = 'circle';}
        update(deltaTime) { this.x += this.velocityX * deltaTime; this.y += this.velocityY * deltaTime; }
        draw(ctx) { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); }
        isOffScreen(w, h) { return this.x<-this.radius || this.x>w+this.radius || this.y<-this.radius || this.y>h+this.radius; }
    }
    class Enemy { /* ... Enemy class remains the same (handles types) ... */
        constructor(x, y, type = 'square') { this.x=x; this.y=y; this.type=type; this.health=1; let config; if(type==='circle'){config=circleEnemyConfig; this.radius=config.radius; this.shape=config.shape; this.speed=config.speed; this.color=config.color; const angle=Math.PI/4+Math.random()*Math.PI/2; this.vx=Math.cos(angle)*this.speed; this.vy=Math.sin(angle)*this.speed;}else{config=squareEnemyConfig; this.width=config.width; this.height=config.height; this.shape=config.shape; this.speed=config.speed; this.color=config.color; this.vx=0; this.vy=this.speed;} this.health=config.health;}
        update(deltaTime) { this.x+=this.vx*deltaTime; this.y+=this.vy*deltaTime; const cY=this.shape==='circle'?this.y-this.radius:this.y-this.height/2; const cXL=this.shape==='circle'?this.x-this.radius:this.x-this.width/2; const cXR=this.shape==='circle'?this.x+this.radius:this.x+this.width/2; if(cY>canvasHeight){this.y=this.shape==='circle'?-this.radius:-this.height/2; this.x=Math.random()*arenaWidth+arenaX;} if(cXR<0){this.x=canvasWidth+(this.shape==='circle'?this.radius:this.width/2);}else if(cXL>canvasWidth){this.x=-(this.shape==='circle'?this.radius:this.width/2);}}
        draw(ctx) { ctx.strokeStyle=this.color; ctx.lineWidth=2; if(this.shape==='rect'){const hS=this.width/2; ctx.strokeRect(this.x-hS,this.y-hS,this.width,this.height);}else if(this.shape==='circle'){ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.stroke();} }
    }

    // --- Game State Definition ---
    const GameState = { PLAYING: 'playing', GAME_OVER: 'gameOver' };

    // --- Game State Initialization ---
    let lastTime = 0; let mousePos = { x: 0, y: 0 }; const keysPressed = {};
    let score = 0; let currentState = GameState.PLAYING; let currentWave = 1;
    const player = new Player(canvasWidth / 2, canvasHeight - 50);
    const playerProjectiles = []; const enemies = [];
    console.log("Player instance created:", player);

    // --- Helper Functions ---
    function getMousePos(canvas, event) { /* ... */ const r=canvas.getBoundingClientRect(); return {x:event.clientX-r.left, y:event.clientY-r.top}; }
    function rectRectCollision(r1, r2) { /* ... */ const r1L=r1.x-r1.width/2,r1R=r1.x+r1.width/2,r1T=r1.y-r1.height/2,r1B=r1.y+r1.height/2; const r2L=r2.x-r2.width/2,r2R=r2.x+r2.width/2,r2T=r2.y-r2.height/2,r2B=r2.y+r2.height/2; return r1L<r2R&&r1R>r2L&&r1T<r2B&&r1B>r2T;}
    function circleRectCollision(c, r) { /* ... */ const rHW=r.width/2,rHH=r.height/2,rL=r.x-rHW,rR=r.x+rHW,rT=r.y-rHH,rB=r.y+rHH; const cX=Math.max(rL,Math.min(c.x,rR)),cY=Math.max(rT,Math.min(c.y,rB)); const dX=c.x-cX,dY=c.y-cY; const dSq=(dX*dX)+(dY*dY); return dSq<(c.radius*c.radius);}
    function circleCircleCollision(c1, c2) { /* ... */ const dx=c1.x-c2.x, dy=c1.y-c2.y; const dSq=dx*dx+dy*dy; const rSumSq=(c1.radius+c2.radius)*(c1.radius+c2.radius); return dSq<rSumSq;}
    function drawUI(ctx) { /* ... remains the same ... */
        ctx.font=uiFont; ctx.fillStyle=uiColor; ctx.textBaseline='top'; ctx.textAlign='left'; ctx.fillText(`SCORE: ${score}`, scoreX, scoreY);
        ctx.textAlign='center'; ctx.fillText(`WAVE: ${currentWave}`, canvasWidth / 2, scoreY); ctx.textAlign='right'; ctx.fillText('LIVES:', livesX, livesY);
        ctx.fillStyle=lifeIconColor; ctx.strokeStyle=lifeIconColor; ctx.lineWidth=1; for(let i=0; i<player.lives; i++){const iXO=livesX+10+(i*lifeIconSpacing);
        const tX=iXO, tY=scoreY-5; const lX=iXO-5, lY=tY+10; const rX=iXO+5, rY=tY+10; ctx.beginPath(); ctx.moveTo(tX,tY); ctx.lineTo(lX,lY); ctx.lineTo(rX,rY); ctx.closePath(); ctx.fill();} ctx.textAlign='left'; }

    function startWave(waveNumber) { /* ... remains the same ... */
        console.log(`Starting Wave ${waveNumber}`); currentWave = waveNumber; const config = waveConfigs.find(w => w.wave === waveNumber);
        if (!config) { console.log("All waves completed!"); return; } config.enemies.forEach(group => { const type = group.type;
        for (let i = 0; i < group.count; i++) { const sX = Math.random() * arenaWidth + arenaX; const sY = -50; enemies.push(new Enemy(sX, sY, type)); } });
        console.log(`Spawned enemies for wave ${currentWave}. Total: ${enemies.length}`); }

    function resetGame() { /* ... remains the same ... */
        console.log("Resetting game state..."); score=0; player.lives=initialPlayerLives; player.x=canvasWidth/2; player.y=canvasHeight-50;
        playerProjectiles.length=0; enemies.length=0; currentWave=1; startWave(1); console.log("Game reset complete."); }

    // --- Audio Functions (Step 14) ---
    async function loadSound(url) {
        if (!audioContext) return null; // Skip if audio context failed
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for ${url}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            return audioBuffer;
        } catch (error) {
            console.error(`Error loading sound: ${url}`, error);
            return null; // Return null on error
        }
    }

    async function loadAllSounds() {
        if (!audioContext) return; // Skip if no audio context
        console.log("Loading sound effects...");
        const loadPromises = [];
        for (const key in sfxFiles) {
            loadPromises.push(
                loadSound(sfxFiles[key]).then(buffer => {
                    if (buffer) {
                        sfxBuffers[key] = buffer;
                        console.log(`Loaded sound: ${key}`);
                    } else {
                        console.warn(`Failed to load sound: ${key}`);
                    }
                })
            );
        }
        try {
            await Promise.all(loadPromises);
            console.log("All sound effects loaded (or failed gracefully).");
        } catch (error) {
            console.error("Error loading one or more sounds:", error);
        }
    }

    function playSound(bufferName) {
        if (!audioContext || !sfxBuffers[bufferName]) {
            // console.log(`Sound buffer not ready or audio disabled: ${bufferName}`); // Optional debug
            return; // Skip if audio context failed or buffer not loaded
        }
        // Resume context if needed (e.g., first user interaction)
        if (audioContext.state === 'suspended') {
             console.log("AudioContext suspended, attempting resume...");
             audioContext.resume().then(() => {
                 console.log("AudioContext resumed!");
                 audioContextResumed = true; // Set flag
                 // Try playing again *after* resume (might be slightly delayed)
                 playSoundInternal(bufferName);
             }).catch(e => console.error("Error resuming AudioContext:", e));
             return; // Don't play immediately if suspended
        }
        // Play sound directly if context is running
        playSoundInternal(bufferName);
    }

    function playSoundInternal(bufferName) {
         if (!audioContext || !sfxBuffers[bufferName]) return; // Double check
         try {
            const source = audioContext.createBufferSource();
            source.buffer = sfxBuffers[bufferName];
            source.connect(audioContext.destination);
            source.start(0); // Play immediately
         } catch(e) {
             console.error(`Error playing sound ${bufferName}:`, e);
         }
    }

    // --- Main Game Loop ---
    function gameLoop(timestamp) {
        const deltaTime = (timestamp - lastTime) / 1000; lastTime = timestamp;

        if (currentState === GameState.PLAYING) {
            // 1. Clear Canvas
            ctx.fillStyle = '#050010'; ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // 2. Update Logic
            player.update(deltaTime, arenaX, arenaY, arenaWidth, arenaHeight);
            enemies.forEach(enemy => enemy.update(deltaTime));
            // Update Projectiles
            for (let i = playerProjectiles.length - 1; i >= 0; i--) { /* ... projectile update ... */
                 const p = playerProjectiles[i]; p.update(deltaTime); if (p.isOffScreen(canvasWidth, canvasHeight)) { playerProjectiles.splice(i, 1); } }

            // --- Collision Detection ---
            // Projectile vs Enemy
            for (let i = playerProjectiles.length - 1; i >= 0; i--) {
                const projectile = playerProjectiles[i]; let projectileHit = false;
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j]; let collision = false;
                    if (enemy.shape === 'rect') { collision = circleRectCollision(projectile, enemy); }
                    else if (enemy.shape === 'circle') { collision = circleCircleCollision(projectile, enemy); }
                    if (collision) {
                        console.log(`Collision: Projectile hit Enemy (${enemy.type})`);
                        enemies.splice(j, 1); score += scorePerEnemy; projectileHit = true;
                        playSound('enemyHit'); // Play sound (Step 14)
                        break;
                    }
                }
                if (projectileHit) { playerProjectiles.splice(i, 1); }
            }
            // Enemy vs Player
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i]; let collision = false;
                if (enemy.shape === 'rect') { collision = rectRectCollision(player, enemy); }
                else if (enemy.shape === 'circle') { collision = circleRectCollision(enemy, player); }
                if (collision) {
                    console.log(`Collision: Enemy (${enemy.type}) hit Player!`);
                    enemies.splice(i, 1); player.lives--; console.log(`Player lives remaining: ${player.lives}`);
                    playSound('playerHit'); // Play sound (Step 14)
                    if (player.lives <= 0) { console.log("GAME OVER!"); currentState = GameState.GAME_OVER; }
                }
            }

            // Check for Wave Completion
            if (enemies.length === 0 && currentState === GameState.PLAYING) { console.log(`Wave ${currentWave} cleared!`); startWave(currentWave + 1); }

            // 3. Draw Logic
            player.draw(ctx); playerProjectiles.forEach(p => p.draw(ctx)); enemies.forEach(enemy => enemy.draw(ctx));
            ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2; ctx.strokeRect(arenaX, arenaY, arenaWidth, arenaHeight);
            drawUI(ctx);

        } else if (currentState === GameState.GAME_OVER) {
             // Draw Game Over Screen
             ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, canvasWidth, canvasHeight);
             ctx.font = gameOverFontLarge; ctx.fillStyle = gameOverColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
             ctx.fillText('GAME OVER', canvasWidth / 2, canvasHeight / 2 - 40); ctx.font = gameOverFontMedium; ctx.fillStyle = uiColor;
             ctx.fillText(`Final Score: ${score}`, canvasWidth / 2, canvasHeight / 2 + 10);
             ctx.fillText('Press ENTER to Restart', canvasWidth / 2, canvasHeight / 2 + 60);
        }

        // 4. Request Next Frame
        requestAnimationFrame(gameLoop);
    }

    // --- Event Listeners Setup ---
    console.log("Setting up event listeners...");
    // Keyboard
    window.addEventListener('keydown', (event) => { /* ... keydown ... */ const key = event.key.toLowerCase(); keysPressed[key] = true; if (currentState === GameState.GAME_OVER && key === 'enter') { console.log("Restarting game..."); resetGame(); currentState = GameState.PLAYING; } });
    window.addEventListener('keyup', (event) => { /* ... keyup ... */ keysPressed[event.key.toLowerCase()] = false; });
    // Mouse
    canvas.addEventListener('mousemove', (event) => { /* ... mousemove ... */ mousePos = getMousePos(canvas, event); });
    canvas.addEventListener('mousedown', (event) => {
        // Added Step 14: Resume Audio Context on first interaction if needed
        if (audioContext && audioContext.state === 'suspended' && !audioContextResumed) {
             audioContext.resume().then(() => {
                 console.log("AudioContext resumed on user interaction!");
                 audioContextResumed = true;
                 // Optionally try to play BGM again if it failed initially
                 const bgm = document.getElementById('bgm');
                 if (bgm && bgm.paused) {
                     bgm.play().catch(e => console.log("BGM play still failed after resume:", e));
                 }
             }).catch(e => console.error("Error resuming AudioContext on interaction:", e));
        }

        // Original shooting logic
        if (currentState === GameState.PLAYING && event.button === 0) {
            const dx = mousePos.x - player.x, dy = mousePos.y - player.y, angle = Math.atan2(dy, dx);
            const vX = Math.cos(angle) * projectileSpeed, vY = Math.sin(angle) * projectileSpeed;
            playerProjectiles.push(new Projectile(player.x, player.y, vX, vY));
            playSound('shoot'); // Play sound (Step 14)
        }
    });

    // --- Start the Game ---
    async function startGame() {
        if (audioContext) { // Only load sounds if context exists
            await loadAllSounds(); // Wait for sounds to load (or fail)
        }

        // Attempt to play BGM (assuming <audio id="bgm"> exists in HTML)
        const bgm = document.getElementById('bgm');
        if (bgm) {
            bgm.volume = 0.3; // Example: Set volume
             // Attempt to play, handle potential autoplay restrictions
             bgm.play().then(() => {
                 console.log("Background music playing.");
             }).catch(error => {
                 console.warn("Background music autoplay failed. Requires user interaction.", error);
                 // It might play later after the audio context is resumed on first click
             });
        } else {
            console.warn("BGM element with id='bgm' not found in HTML.");
        }

        console.log("Starting game logic...");
        resetGame(); // Sets initial state and starts wave 1
        lastTime = performance.now();
        requestAnimationFrame(gameLoop); // Start the main loop
    }

    startGame(); // Call the async start function

}); // End of window.onload listener

console.log("game.js script loaded.");