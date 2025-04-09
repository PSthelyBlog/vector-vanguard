'use strict';

// Wait for the DOM to be fully loaded before running the script
window.addEventListener('load', () => {
    console.log("DOM loaded, initializing game setup...");

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("Fatal Error: Canvas element with ID 'gameCanvas' not found!");
        return; // Stop execution if canvas isn't found
    }
    console.log("Canvas element obtained:", canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Fatal Error: Unable to get 2D rendering context!");
        alert("Your browser does not support the HTML5 Canvas element. Please update or use a different browser.");
        return; // Stop execution if context isn't supported
    }
    console.log("2D context obtained:", ctx);

    // --- Game Configuration ---
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const arenaPadding = 10; // Padding from canvas edge for arena border
    const arenaX = arenaPadding;
    const arenaY = arenaPadding;
    const arenaWidth = canvasWidth - 2 * arenaPadding;
    const arenaHeight = canvasHeight - 2 * arenaPadding;

    console.log(`Canvas dimensions: ${canvasWidth}x${canvasHeight}`);
    console.log(`Arena dimensions: ${arenaWidth}x${arenaHeight} at (${arenaX},${arenaY})`);

    // --- Game State (placeholders) ---

    // Added in Step 5: Player Representation
    class Player {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.width = 15;     // For collision or reference, not direct drawing size
            this.height = 15;   // For collision or reference, not direct drawing size
            this.color = '#33ff33';
            this.strokeColor = '#33ff33';
            this.lineWidth = 1.5;
            this.speed = 200; // Pixels per second
            this.lives = 3;
            // Add velocity components if needed for physics-based movement later
            // this.velocityX = 0;
            // this.velocityY = 0;
        }

        // Draw the player triangle centered around this.x, this.y
        draw(ctx) {
            // Points relative to this.x, this.y (tip points up)
            const topX = this.x;
            const topY = this.y - this.height / 2;
            const leftX = this.x - this.width / 2;
            const leftY = this.y + this.height / 2;
            const rightX = this.x + this.width / 2;
            const rightY = this.y + this.height / 2;

            ctx.beginPath();
            ctx.moveTo(topX, topY);
            ctx.lineTo(leftX, leftY);
            ctx.lineTo(rightX, rightY);
            ctx.closePath();

            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.strokeStyle = this.strokeColor;
            ctx.lineWidth = this.lineWidth;
            ctx.stroke();
        }

        // Added in Step 6: Player Update Logic
        update(deltaTime, arenaX, arenaY, arenaWidth, arenaHeight) {
            const moveAmount = this.speed * deltaTime;

            // Movement based on keys pressed
            if (keysPressed['w'] || keysPressed['arrowup']) {
                this.y -= moveAmount;
            }
            if (keysPressed['s'] || keysPressed['arrowdown']) {
                this.y += moveAmount;
            }
            if (keysPressed['a'] || keysPressed['arrowleft']) {
                this.x -= moveAmount;
            }
            if (keysPressed['d'] || keysPressed['arrowright']) {
                this.x += moveAmount;
            }

            // Boundary Checks (keep player within the arena)
            // Calculate player boundaries (using center + half width/height)
            const halfWidth = this.width / 2;
            const halfHeight = this.height / 2;
            const leftBound = arenaX + halfWidth;
            const rightBound = arenaX + arenaWidth - halfWidth;
            const topBound = arenaY + halfHeight;
            const bottomBound = arenaY + arenaHeight - halfHeight;

            if (this.x < leftBound) {
                this.x = leftBound;
            }
            if (this.x > rightBound) {
                this.x = rightBound;
            }
            if (this.y < topBound) {
                this.y = topBound;
            }
            if (this.y > bottomBound) {
                this.y = bottomBound;
            }
        }
    }

    // Instantiate the player - placed after Game Config, before Game Loop
    // Position near bottom-center based on canvas size
    const player = new Player(canvasWidth / 2, canvasHeight - 50);
    const playerProjectiles = []; // Added in Step 7

    // Added in Step 7: Mouse Position Helper
    function getMousePos(canvas, event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }
    let mousePos = { x: 0, y: 0 }; // Store current mouse position relative to canvas
    const projectileSpeed = 400; // Added in Step 7

    // Added in Step 7: Projectile Representation
    class Projectile {
        constructor(x, y, velocityX, velocityY) {
            this.x = x;
            this.y = y;
            this.velocityX = velocityX;
            this.velocityY = velocityY;
            this.radius = 3;
            this.color = '#33ff33';
        }

        update(deltaTime) {
            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;
        }

        draw(ctx) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        // Helper to check if projectile is off-screen
        isOffScreen(canvasWidth, canvasHeight) {
            return this.x < 0 || this.x > canvasWidth || this.y < 0 || this.y > canvasHeight;
        }
    }
    console.log("Player instance created:", player);

    // (Variables for player, enemies, score, lives etc. will go here later)
    let lastTime = 0;

    // --- Main Game Loop ---
    function gameLoop(timestamp) {
        // Calculate delta time (time since last frame) for smooth, frame-rate independent movement
        const deltaTime = (timestamp - lastTime) / 1000; // Delta time in seconds
        lastTime = timestamp;

        // 1. Clear the Canvas
        // Clear entire canvas or fill with background color
        ctx.fillStyle = '#050010';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 2. --- Update Logic ---
        player.update(deltaTime, arenaX, arenaY, arenaWidth, arenaHeight); // Added in Step 6
        // Added in Step 7: Update Projectiles & Remove Off-screen ones
        // Iterate backwards when removing elements during iteration
        for (let i = playerProjectiles.length - 1; i >= 0; i--) {
            const p = playerProjectiles[i];
            p.update(deltaTime);

            if (p.isOffScreen(canvasWidth, canvasHeight)) {
                playerProjectiles.splice(i, 1); // Remove projectile
                // console.log(`Removed projectile: ${playerProjectiles.length} remaining`); // Optional debug log
            }
        }
        // Collision detection (projectile vs enemy) will go here later
        // (Update player position, enemy positions, check collisions, etc. based on deltaTime)
        // Placeholder for future steps

        // 3. --- Draw Logic ---
        // (Draw player, enemies, projectiles, UI elements, etc.)
        player.draw(ctx); // Added in Step 5
        // Added in Step 7: Draw Projectiles
        playerProjectiles.forEach(p => p.draw(ctx));

        // Draw the Arena Boundaries (as per Step 4 spec)
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(arenaX, arenaY, arenaWidth, arenaHeight);

        // Placeholder for future drawing

        // 4. Request the next frame
        requestAnimationFrame(gameLoop);
    }

    // --- Start the Game ---
    console.log("Starting game loop...");

    // Added in Step 6: Input Handling
    const keysPressed = {};

    window.addEventListener('keydown', (event) => {
        keysPressed[event.key.toLowerCase()] = true;
        // Optional: Prevent default browser behavior for arrow keys/space etc. if needed
        // if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(event.key.toLowerCase())) {
        //     event.preventDefault();
        // }
    });

    window.addEventListener('keyup', (event) => {

        // Added in Step 7: Mouse Input Handling (Shooting)
        canvas.addEventListener('mousemove', (event) => {
            mousePos = getMousePos(canvas, event);
            // Optional: Draw aiming reticle or line here if desired
        });

        canvas.addEventListener('mousedown', (event) => {
            if (event.button === 0) { // Check for left mouse button
                // Calculate direction vector from player center to mouse position
                const dx = mousePos.x - player.x;
                const dy = mousePos.y - player.y;
                const angle = Math.atan2(dy, dx);

                // Calculate velocity components
                const velocityX = Math.cos(angle) * projectileSpeed;
                const velocityY = Math.sin(angle) * projectileSpeed;

                // Create and add new projectile
                // Offset start position slightly to appear from ship's 'tip' or 'sides' if desired
                playerProjectiles.push(new Projectile(player.x, player.y, velocityX, velocityY));
                // console.log(`Fired projectile: ${playerProjectiles.length} total`); // Optional debug log
            }
        });
        keysPressed[event.key.toLowerCase()] = false;
    });

    // Initialize lastTime for the first frame's deltaTime calculation
    lastTime = performance.now();
    // Start the loop
    requestAnimationFrame(gameLoop);

}); // End of window.onload listener

console.log("game.js script loaded."); // Log to confirm script parsing
