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
        // (Update player position, enemy positions, check collisions, etc. based on deltaTime)
        // Placeholder for future steps

        // 3. --- Draw Logic ---
        // (Draw player, enemies, projectiles, UI elements, etc.)

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
    // Initialize lastTime for the first frame's deltaTime calculation
    lastTime = performance.now();
    // Start the loop
    requestAnimationFrame(gameLoop);

}); // End of window.onload listener

console.log("game.js script loaded."); // Log to confirm script parsing
