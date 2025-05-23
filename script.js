// Get canvas and context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Sidebar elements
// const monsterBodyDisplay = document.getElementById('monster-body'); // Replaced by monsterBodyList
const sidebarCanvas = document.getElementById('sidebar-monster-canvas');
const sidebarCtx = sidebarCanvas ? sidebarCanvas.getContext('2d') : null; // Ensure canvas exists

// Game state variables
let gameObjects = []; // To store monster, items, room elements
let activeSpeechBubbles = [];
let monster = {
    x: 100, // Initial position
    y: 100,
    width: 30,
    height: 50,
    color: '#fff', // Monster will be a white outline
    parts: {
        head: true,
        abdomen: true,
        armLeft: true, // Has one arm initially
        armRight: false,
        legLeft: false,
        legRight: false // Assuming one leg is needed for hopping
    },
    speed: 2, // Crawling speed
    canHop: false
};

// --- Initial Setup Functions ---

function resizeCanvas() {
    const gameContainer = document.getElementById('game-container');
    canvas.width = gameContainer.clientWidth * 0.9; // Use 90% of container
    canvas.height = gameContainer.clientHeight * 0.9;
    // Ensure drawing is scaled if needed, or objects are redrawn according to new size
    drawGame(); // Redraw game on resize
}

// --- Helper Functions ---
function applyBlurToText(text, blurFactor = 0.4) { // Default blurFactor changed to 0.4
    if (!text) return "";
    return text.split('').map(char => {
        if (char === ' ') return ' '; 
        // Only replace if random number is less than blurFactor and char is not a period already
        if (char !== '.' && Math.random() < blurFactor) { 
            return '.';
        }
        return char;
    }).join('');
}

// --- Drawing Functions ---

function getOctagonVertices() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const numSides = 8;
    const radius = Math.min(canvas.width, canvas.height) * 0.4; // Same as room radius
    const vertices = [];

    for (let i = 0; i < numSides; i++) { // Iterate 0 to numSides-1
        vertices.push({
            x: centerX + radius * Math.cos(i * 2 * Math.PI / numSides),
            y: centerY + radius * Math.sin(i * 2 * Math.PI / numSides)
        });
    }
    return vertices;
}

function isPointInOctagon(pointX, pointY, octagonVertices) {
    let intersections = 0;
    const numVertices = octagonVertices.length;

    for (let i = 0; i < numVertices; i++) {
        const p1 = octagonVertices[i];
        const p2 = octagonVertices[(i + 1) % numVertices]; // Next vertex, wraps around

        // Check if the ray from the point (pointX, pointY) intersects with the edge (p1, p2)
        // Ray goes from (pointX, pointY) to the right (infinity)
        if (((p1.y <= pointY && pointY < p2.y) || (p2.y <= pointY && pointY < p1.y)) &&
            (pointX < (p2.x - p1.x) * (pointY - p1.y) / (p2.y - p1.y) + p1.x)) {
            intersections++;
        }
    }
    return (intersections % 2) === 1; // Odd number of intersections means point is inside
}

function drawOctagonRoom() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const numSides = 8;
    const baseRadius = Math.min(canvas.width, canvas.height) * 0.4;
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3; // Main wall thickness

    const mainVertices = [];
    for (let i = 0; i < numSides; i++) {
        const angle = i * 2 * Math.PI / numSides;
        mainVertices.push({
            x: centerX + baseRadius * Math.cos(angle),
            y: centerY + baseRadius * Math.sin(angle)
        });
    }

    ctx.beginPath();
    ctx.moveTo(mainVertices[0].x, mainVertices[0].y);

    for (let i = 0; i < numSides; i++) {
        const p1 = mainVertices[i];
        const p2 = mainVertices[(i + 1) % numSides]; // Next main vertex

        const segmentDx = p2.x - p1.x;
        const segmentDy = p2.y - p1.y;
        const segmentLength = Math.sqrt(segmentDx*segmentDx + segmentDy*segmentDy);
        const numJaggedSegments = Math.max(5, Math.floor(segmentLength / 15)); // More segments for longer walls

        let currentX = p1.x;
        let currentY = p1.y;

        for (let j = 0; j < numJaggedSegments; j++) {
            if (j === numJaggedSegments - 1) { // Last jagged segment should go to p2
                currentX = p2.x;
                currentY = p2.y;
            } else {
                // Move part of the way along the main segment vector
                const progress = (j + 1) / numJaggedSegments;
                let nextBaseX = p1.x + segmentDx * progress;
                let nextBaseY = p1.y + segmentDy * progress;

                // Add random perpendicular offset for jaggedness
                const perpendicularFactor = (Math.random() - 0.5) * 10; // Jaggedness amount
                currentX = nextBaseX + (segmentDy / segmentLength) * perpendicularFactor;
                currentY = nextBaseY - (segmentDx / segmentLength) * perpendicularFactor;
            }
            ctx.lineTo(currentX, currentY);
        }
    }
    ctx.closePath();
    ctx.stroke();

    // Optional: Add subtle interior texture lines or cracks if desired,
    // but the main focus is the jagged outer wall.
    // The previous inner jittered line can be added back if it looks good.
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#aaa'; // For subtle cracks/texture
    for(let k=0; k<numSides * 2; k++) { // Add a few random cracks
        const v1 = mainVertices[Math.floor(Math.random() * numSides)];
        const v2 = mainVertices[Math.floor(Math.random() * numSides)];
        if (Math.random() > 0.6) { // Only draw some
            ctx.beginPath();
            ctx.moveTo(v1.x + (Math.random()-0.5)*20, v1.y + (Math.random()-0.5)*20);
            ctx.lineTo( (v1.x+v2.x)/2 + (Math.random()-0.5)*30 , (v1.y+v2.y)/2 + (Math.random()-0.5)*30 );
            ctx.stroke();
        }
    }

    ctx.lineWidth = 2; // Reset for other drawings
}

function drawMonster() {
    ctx.strokeStyle = monster.color; // '#fff'
    ctx.lineWidth = 2; // Base outline thickness

    const bodyX = monster.x;
    const bodyY = monster.y;
    const bodyWidth = monster.width;
    const abdomenHeight = monster.height * 0.5;

    // 1. Abdomen (can be similar to previous 'organic' version, or more detailed)
    ctx.beginPath();
    ctx.moveTo(bodyX + bodyWidth * 0.05, bodyY); 
    ctx.quadraticCurveTo(bodyX + bodyWidth / 2, bodyY - abdomenHeight * 0.05, bodyX + bodyWidth * 0.95, bodyY); 
    ctx.lineTo(bodyX + bodyWidth * 0.9, bodyY + abdomenHeight); 
    ctx.quadraticCurveTo(bodyX + bodyWidth / 2, bodyY + abdomenHeight + abdomenHeight * 0.05, bodyX + bodyWidth * 0.1, bodyY + abdomenHeight); 
    ctx.closePath();
    ctx.stroke();
    // Add more stitches as desired.
    drawStitch(bodyX + bodyWidth * 0.5, bodyY + abdomenHeight * 0.2, bodyX + bodyWidth * 0.5, bodyY + abdomenHeight * 0.8);


    // 2. Head (with brow and hair)
    if (monster.parts.head) {
        const headRadiusX = bodyWidth / 2.3;
        const headRadiusY = bodyWidth / 2.6;
        const headCenterX = bodyX + bodyWidth / 2;
        const headCenterY = bodyY - headRadiusY * 1.1;

        ctx.beginPath(); // Main head shape
        // More irregular ellipse using quadratic curves
        ctx.moveTo(headCenterX - headRadiusX, headCenterY); // Left point
        ctx.quadraticCurveTo(headCenterX - headRadiusX * 0.8, headCenterY - headRadiusY * 1.2, // Control top-left
                             headCenterX, headCenterY - headRadiusY); // Top-mid
        ctx.quadraticCurveTo(headCenterX + headRadiusX * 0.8, headCenterY - headRadiusY * 1.2, // Control top-right
                             headCenterX + headRadiusX, headCenterY); // Right point
        ctx.quadraticCurveTo(headCenterX + headRadiusX * 0.9, headCenterY + headRadiusY * 1.1, // Control bottom-right
                             headCenterX, headCenterY + headRadiusY * 0.95); // Bottom-mid
        ctx.quadraticCurveTo(headCenterX - headRadiusX * 0.9, headCenterY + headRadiusY * 1.1, // Control bottom-left
                             headCenterX - headRadiusX, headCenterY); // Back to Left point
        ctx.closePath();
        ctx.stroke();

        // Heavy Brow
        const oldLineWidth = ctx.lineWidth;
        ctx.lineWidth = 3.5; // Thicker brow
        ctx.beginPath();
        ctx.moveTo(headCenterX - headRadiusX * 0.65, headCenterY - headRadiusY * 0.35);
        ctx.bezierCurveTo(headCenterX - headRadiusX * 0.3, headCenterY - headRadiusY * 0.7, // Control 1
                          headCenterX + headRadiusX * 0.3, headCenterY - headRadiusY * 0.7, // Control 2
                          headCenterX + headRadiusX * 0.65, headCenterY - headRadiusY * 0.35); // End point
        ctx.stroke();
        ctx.lineWidth = oldLineWidth; // Reset

        // Tufts of Hair
        ctx.beginPath();
        // Tuft 1 (left side)
        ctx.moveTo(headCenterX - headRadiusX * 0.4, headCenterY - headRadiusY * 0.95);
        ctx.lineTo(headCenterX - headRadiusX * 0.55, headCenterY - headRadiusY * 1.3);
        ctx.lineTo(headCenterX - headRadiusX * 0.2, headCenterY - headRadiusY * 1.15);
        // Tuft 2 (top-ish)
        ctx.moveTo(headCenterX, headCenterY - headRadiusY * 1.05);
        ctx.lineTo(headCenterX + headRadiusX * 0.1, headCenterY - headRadiusY * 1.4);
        ctx.lineTo(headCenterX + headRadiusX * 0.25, headCenterY - headRadiusY * 1.1);
        // Tuft 3 (right side)
        ctx.moveTo(headCenterX + headRadiusX * 0.5, headCenterY - headRadiusY * 0.9);
        ctx.lineTo(headCenterX + headRadiusX * 0.6, headCenterY - headRadiusY * 1.25);
        ctx.lineTo(headCenterX + headRadiusX * 0.35, headCenterY - headRadiusY * 1.05);
        ctx.stroke();
        drawStitch(headCenterX, headCenterY - headRadiusY, headCenterX, headCenterY - headRadiusY * 0.7); // Stitch on forehead
    }

    // 3. Arms / Stumps
    const armBaseY = bodyY + abdomenHeight * 0.25; // Base Y for arm connection
    const armLength = bodyWidth * 0.7;
    const armThickness = abdomenHeight * 0.22;

    // Left Arm or Stump
    const leftArmStumpX = bodyX + bodyWidth * 0.1; // Attachment point for left
    if (monster.parts.armLeft) {
        const armStartX = leftArmStumpX;
        const armStartY = armBaseY;
        ctx.beginPath();
        ctx.moveTo(armStartX, armStartY);
        ctx.quadraticCurveTo(armStartX - armLength * 0.6, armStartY + armThickness * 0.1, armStartX - armLength * 0.5, armStartY + armThickness * 0.7);
        ctx.lineTo(armStartX - armLength, armStartY + armThickness * 0.5); 
        ctx.lineTo(armStartX - armLength * 0.95, armStartY + armThickness * 1.2); 
        ctx.quadraticCurveTo(armStartX - armLength * 0.4, armStartY + armThickness * 1.5, armStartX, armStartY + armThickness * 0.9);
        ctx.closePath();
        ctx.stroke();
        drawStitch(armStartX, armStartY, armStartX - armLength * 0.1, armStartY + armThickness * 0.1); // Shoulder stitch
    } else { // Draw Stump
        ctx.beginPath();
        ctx.moveTo(leftArmStumpX, armBaseY - armThickness * 0.3); // Top of stump connection
        ctx.lineTo(leftArmStumpX - armLength * 0.05, armBaseY + armThickness * 0.4); // Jagged edge 1
        ctx.lineTo(leftArmStumpX - armLength * 0.15, armBaseY - armThickness * 0.2); // Jagged edge 2
        ctx.lineTo(leftArmStumpX - armLength * 0.08, armBaseY + armThickness * 0.5); // Jagged edge 3
        ctx.lineTo(leftArmStumpX - armLength * 0.2, armBaseY);                      // Jagged edge 4
        ctx.lineTo(leftArmStumpX - armLength * 0.1, armBaseY + armThickness * 0.6); // Bottom of stump connection
        ctx.closePath(); // Optional, makes it look more like a sealed stump
        ctx.stroke();
        // Tiny dangling pieces
        drawStitch(leftArmStumpX - armLength * 0.15, armBaseY + armThickness * 0.55, leftArmStumpX - armLength * 0.17, armBaseY + armThickness * 0.65);
    }

    // Right Arm or Stump
    const rightArmStumpX = bodyX + bodyWidth * 0.9; // Attachment point for right
    if (monster.parts.armRight) {
        const armStartX = rightArmStumpX;
        const armStartY = armBaseY;
        ctx.beginPath();
        ctx.moveTo(armStartX, armStartY);
        ctx.quadraticCurveTo(armStartX + armLength * 0.6, armStartY + armThickness * 0.1, armStartX + armLength * 0.5, armStartY + armThickness * 0.7);
        ctx.lineTo(armStartX + armLength, armStartY + armThickness * 0.5); 
        ctx.lineTo(armStartX + armLength * 0.95, armStartY + armThickness * 1.2); 
        ctx.quadraticCurveTo(armStartX + armLength * 0.4, armStartY + armThickness * 1.5, armStartX, armStartY + armThickness * 0.9); 
        ctx.closePath();
        ctx.stroke();
        drawStitch(armStartX, armStartY, armStartX + armLength * 0.1, armStartY + armThickness * 0.1); // Shoulder stitch
    } else { // Draw Stump
        ctx.beginPath();
        ctx.moveTo(rightArmStumpX, armBaseY - armThickness * 0.3); // Top of stump connection
        ctx.lineTo(rightArmStumpX + armLength * 0.05, armBaseY + armThickness * 0.4); // Jagged edge 1
        ctx.lineTo(rightArmStumpX + armLength * 0.15, armBaseY - armThickness * 0.2); // Jagged edge 2
        ctx.lineTo(rightArmStumpX + armLength * 0.08, armBaseY + armThickness * 0.5); // Jagged edge 3
        ctx.lineTo(rightArmStumpX + armLength * 0.2, armBaseY);                      // Jagged edge 4
        ctx.lineTo(rightArmStumpX + armLength * 0.1, armBaseY + armThickness * 0.6); // Bottom of stump connection
        ctx.closePath();
        ctx.stroke();
        drawStitch(rightArmStumpX + armLength * 0.15, armBaseY + armThickness * 0.55, rightArmStumpX + armLength * 0.17, armBaseY + armThickness * 0.65);
    }

    // 4. Leg (can use previous detailed leg logic)
    if (monster.parts.legLeft) {
        const legInitialX = bodyX + bodyWidth * 0.5; 
        const legInitialY = bodyY + abdomenHeight;
        const legLength = monster.height * 0.55; 
        const upperLegWidth = bodyWidth * 0.33;
        const lowerLegWidth = bodyWidth * 0.25; 
        const footLength = bodyWidth * 0.3;
        const footHeight = abdomenHeight * 0.15;
        ctx.beginPath();
        ctx.moveTo(legInitialX - upperLegWidth / 2, legInitialY); 
        ctx.quadraticCurveTo(legInitialX - upperLegWidth / 1.5, legInitialY + legLength * 0.5, legInitialX - lowerLegWidth / 2, legInitialY + legLength * 0.9); 
        ctx.lineTo(legInitialX - lowerLegWidth / 2 - footLength * 0.2, legInitialY + legLength + footHeight * 0.8); 
        ctx.quadraticCurveTo(legInitialX, legInitialY + legLength + footHeight * 1.2, legInitialX + lowerLegWidth / 2 + footLength * 0.7, legInitialY + legLength + footHeight * 0.5); 
        ctx.lineTo(legInitialX + lowerLegWidth / 2, legInitialY + legLength * 0.9); 
        ctx.quadraticCurveTo(legInitialX + upperLegWidth / 1.2, legInitialY + legLength * 0.5, legInitialX + upperLegWidth / 2, legInitialY); 
        ctx.closePath();
        ctx.stroke();
        drawStitch(legInitialX, legInitialY, legInitialX, legInitialY + legLength * 0.2); // Hip stitch
    }

    // 5. Entrails
    ctx.beginPath();
    const entrailStartX = bodyX + bodyWidth * 0.65; // Start slightly to the right
    const entrailStartY = bodyY + abdomenHeight * 0.85; // Near bottom of abdomen
    ctx.moveTo(entrailStartX, entrailStartY);
    ctx.bezierCurveTo(entrailStartX - bodyWidth * 0.2, entrailStartY + 40, // Control 1 (looping down and left)
                      entrailStartX + bodyWidth * 0.1, entrailStartY + 50, // Control 2 (further down and slightly right)
                      entrailStartX - bodyWidth * 0.1, entrailStartY + 25); // End point of first loop, dragging
    ctx.quadraticCurveTo(entrailStartX - bodyWidth * 0.3, entrailStartY + 10, // Control for second smaller loop
                         entrailStartX - bodyWidth * 0.15, entrailStartY - 5); // Tucking back towards body slightly
    ctx.stroke();
    
    ctx.beginPath();
    const entrail2StartX = bodyX + bodyWidth * 0.35; // Start slightly to the left
    const entrail2StartY = bodyY + abdomenHeight * 0.9;
    ctx.moveTo(entrail2StartX, entrail2StartY);
    ctx.quadraticCurveTo(entrail2StartX + bodyWidth * 0.1, entrail2StartY + 35, // Looping down and right
                         entrail2StartX - bodyWidth * 0.05, entrail2StartY + 15); // End point, dragging
    ctx.stroke();
}

// Helper function for drawing stitches (add this to script.js if not already present)
function drawStitch(x1, y1, x2, y2) {
    const prevLineWidth = ctx.lineWidth;
    ctx.lineWidth = 1; // Stitches are thinner
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    
    // Optional: Add tiny cross-marks for a more "stitched" look
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len > 0) {
        const crossArmLength = 3; // Length of the cross stitch arms
        const crossX = (dy / len) * crossArmLength; // Perpendicular vector component
        const crossY = (-dx / len) * crossArmLength;
        
        // Stitch mark at first point
        ctx.moveTo(x1 - crossX, y1 - crossY);
        ctx.lineTo(x1 + crossX, y1 + crossY);
        // Stitch mark at second point (if the main stitch line is long enough)
        if (len > crossArmLength * 2) { // Avoid clutter on very short stitches
             ctx.moveTo(x2 - crossX, y2 - crossY);
             ctx.lineTo(x2 + crossX, y2 + crossY);
        }
    }
    ctx.stroke();
    ctx.lineWidth = prevLineWidth; // Restore original line width for main parts
}

function getMonsterBoundingBox(monsterObject) {
    // Start with the abdomen as the base
    const bodyX = monsterObject.x;
    const bodyY = monsterObject.y;
    const bodyWidth = monsterObject.width;
    const bodyHeight = monsterObject.height * 0.5; // Abdomen height, as in drawMonster

    let minX = bodyX;
    let maxX = bodyX + bodyWidth;
    let minY = bodyY;
    let maxY = bodyY + bodyHeight;

    // Head
    if (monsterObject.parts.head) {
        const headRadius = bodyWidth / 2.5;
        const headCenterX = bodyX + bodyWidth / 2;
        const headCenterY = bodyY - headRadius;
        minX = Math.min(minX, headCenterX - headRadius);
        maxX = Math.max(maxX, headCenterX + headRadius);
        minY = Math.min(minY, headCenterY - headRadius);
        // maxY is likely already covered by abdomen or head top
    }

    // Left Arm
    if (monsterObject.parts.armLeft) {
        const armWidth = bodyWidth * 0.7;
        // const armHeight = bodyHeight * 0.25; // Not needed for bounding box calc here
        const armX = bodyX - armWidth;
        minX = Math.min(minX, armX);
        // maxX is likely covered by abdomen
        // minY and maxY of arm are within abdomen's Y range or close enough for this approx.
    }

    // Right Arm
    if (monsterObject.parts.armRight) {
        const armWidth = bodyWidth * 0.7;
        const armActualX = bodyX + bodyWidth; // Start of right arm
        maxX = Math.max(maxX, armActualX + armWidth);
        // minX is likely covered by abdomen
    }

    // Leg (singular)
    if (monsterObject.parts.legLeft) {
        const legWidth = bodyWidth * 0.35;
        const legHeight = monsterObject.height * 0.45;
        const legX = bodyX + (bodyWidth - legWidth) / 2;
        const legY = bodyY + bodyHeight;
        minX = Math.min(minX, legX); // Though likely within abdomen's x range
        maxX = Math.max(maxX, legX + legWidth); // Though likely within abdomen's x range
        maxY = Math.max(maxY, legY + legHeight);
    }
    
    return { 
        minX: minX, 
        minY: minY, 
        maxX: maxX, 
        maxY: maxY,
        width: maxX - minX,
        height: maxY - minY
    };
}

// --- Sidebar Update Functions ---
const monsterBodyList = document.getElementById('monster-body-list');

function drawSidebarMonster() {
    if (!sidebarCtx || !sidebarCanvas) return;

    sidebarCtx.fillStyle = '#000';
    sidebarCtx.fillRect(0, 0, sidebarCanvas.width, sidebarCanvas.height);
    
    // Global monster object modification for drawMonster call
    let tempMonsterState = {
        ...monster, // current parts
        width: monster.width * 0.4, 
        height: monster.height * 0.4,
    };

    const originalCtx = window.ctx; 
    const originalMonster = {...window.monster}; 

    window.ctx = sidebarCtx;
    window.monster = tempMonsterState; 

    sidebarCtx.save();
    const scaleFactor = 0.35; 
    sidebarCtx.scale(scaleFactor, scaleFactor);
    
    const scaledWidth = tempMonsterState.width; 
    const scaledHeight = tempMonsterState.height;

    window.monster.x = (sidebarCanvas.width / scaleFactor - scaledWidth) / 2;
    window.monster.y = (sidebarCanvas.height / scaleFactor - scaledHeight) / 3; 

    drawMonster(); 

    sidebarCtx.restore();

    window.ctx = originalCtx;
    window.monster = originalMonster;
}

function updateSidebar() {
    if (monsterBodyList) { 
       monsterBodyList.innerHTML = ''; 
       if (monster.parts.head) {
           const headDiv = document.createElement('div');
           headDiv.textContent = 'Head';
           monsterBodyList.appendChild(headDiv);
       }
       if (monster.parts.abdomen) { 
           const abdDiv = document.createElement('div');
           abdDiv.textContent = 'Abdomen';
           monsterBodyList.appendChild(abdDiv);
       }
       if (monster.parts.armLeft) {
           const armLDiv = document.createElement('div');
           armLDiv.textContent = 'Left Arm';
           monsterBodyList.appendChild(armLDiv);
       }
       if (monster.parts.armRight) {
           const armRDiv = document.createElement('div');
           armRDiv.textContent = 'Right Arm';
           monsterBodyList.appendChild(armRDiv);
       }
       if (monster.parts.legLeft) {
           const legLDiv = document.createElement('div');
           legLDiv.textContent = 'Leg';
           monsterBodyList.appendChild(legLDiv);
       }
    }
    drawSidebarMonster(); 
}

// --- Item Definitions ---
const items = [
    {
        id: 'armRight',
        x: 0, // Placeholder, set in positionItemsInRoom
        y: 0, // Placeholder
        width: 25, 
        height: 15,
        color: '#fff',
        isDiscovered: false,
        name: 'Right Arm',
        description: "A d.t.ch.d r.ght .rm. L..ks l.ke m.n.", // ~70% blurred
        isCollected: false // New property
    },
    {
        id: 'legLeft', 
        x: 0, // Placeholder
        y: 0, // Placeholder
        width: 20,
        height: 30,
        color: '#fff',
        isDiscovered: false,
        name: 'A Leg',
        description: "A s.v.r.d l.g. M.ght b. us.f.l.", // ~70% blurred
        isCollected: false // New property
    },
    // Surgeon's Chair (center of room)
    {
        id: 'surgeonsChair',
        x: 0, // Placeholder, will be set in positionItemsInRoom
        y: 0, // Placeholder
        width: 40, 
        height: 60,
        color: '#fff', // White outline
        isDiscovered: false,
        name: "Surgeon's Chair",
        description: "An old surgeon's ch..r. It l..ks unc.mf.rt.ble." 
    },
    // Rickety Table
    {
        id: 'ricketyTable',
        x: 0, // Placeholder
        y: 0, // Placeholder
        width: 70,
        height: 50,
        color: '#fff',
        isDiscovered: false,
        name: "Rickety Table",
        description: "A r.ck.ty t.bl.. St.nds ..stead.ly." 
    },
    // Tray with Tools (on the table)
    {
        id: 'toolsTray',
        x: 0, // Placeholder (will be relative to table)
        y: 0, // Placeholder (will be relative to table)
        width: 30,
        height: 10, // Tray is flat
        color: '#fff',
        isDiscovered: false, 
        name: "Tray of Tools",
        description: "R.sty s.rg.c.l t..ls. Th.y gl.nt ..ntly."
    }
];

// Adjust item positions to be within the octagon after canvas is sized.
function positionItemsInRoom() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.4; // Room radius

    // Monster starting position (can be adjusted, e.g., on a surgical couch placeholder)
    monster.x = centerX + radius * 0.1; // Slightly offset from pure center
    monster.y = centerY + radius * 0.1;

    // Position existing items (arm and leg)
    const arm = items.find(item => item.id === 'armRight');
    if (arm) {
        arm.x = centerX + radius * 0.6;
        arm.y = centerY - radius * 0.5;
    }

    const leg = items.find(item => item.id === 'legLeft');
    if (leg) {
        leg.x = centerX - radius * 0.7;
        leg.y = centerY + radius * 0.6;
    }

    // Position new furniture
    const chair = items.find(item => item.id === 'surgeonsChair');
    if (chair) {
        chair.x = centerX - chair.width / 2; // Centered horizontally
        chair.y = centerY - chair.height / 2 - radius * 0.1; // Slightly towards top-center
    }

    const table = items.find(item => item.id === 'ricketyTable');
    if (table && chair) { // Ensure chair exists for relative positioning
        // Position table next to chair, e.g., to the right
        table.x = chair.x + chair.width + 20; // 20px space from chair
        table.y = centerY - table.height / 2; // Align mid-points vertically roughly
    } else if (table) { // Fallback if chair is not found
        table.x = centerX + 50; // Default position if chair is missing
        table.y = centerY - table.height / 2;
    }
    
    const tray = items.find(item => item.id === 'toolsTray');
    if (tray && table) { // Ensure table exists to position tray on it
        tray.x = table.x + (table.width - tray.width) / 2; // Centered on table
        tray.y = table.y - tray.height - 2; // On top of table, with small gap
    }
}


// --- Drawing Functions (Additions) ---

// --- Add Helper functions for drawing detailed furniture ---

function drawDetailedChair(item) {
    ctx.beginPath();
    // Backrest
    ctx.moveTo(item.x + item.width * 0.1, item.y); // Top-left of backrest
    ctx.lineTo(item.x + item.width * 0.9, item.y + item.height * 0.05); // Top-right (rickety)
    ctx.lineTo(item.x + item.width * 0.85, item.y + item.height * 0.4); // Bottom-right of backrest
    ctx.lineTo(item.x + item.width * 0.15, item.y + item.height * 0.38); // Bottom-left of backrest
    ctx.closePath();
    // Seat
    ctx.moveTo(item.x, item.y + item.height * 0.39); // Front-left of seat
    ctx.lineTo(item.x + item.width, item.y + item.height * 0.41); // Front-right of seat
    ctx.lineTo(item.x + item.width * 0.85, item.y + item.height * 0.55); // Back-right of seat
    ctx.lineTo(item.x + item.width * 0.15, item.y + item.height * 0.53); // Back-left of seat
    ctx.closePath();
    // Legs (example: one rickety leg)
    ctx.moveTo(item.x, item.y + item.height * 0.39); // Connect to seat
    ctx.lineTo(item.x - item.width * 0.05, item.y + item.height); // Outer bottom of leg
    ctx.lineTo(item.x + item.width * 0.1, item.y + item.height * 0.98); // Inner bottom of leg
    // Add other legs similarly, make them uneven
    ctx.moveTo(item.x + item.width, item.y + item.height * 0.41);
    ctx.lineTo(item.x + item.width + item.width * 0.05, item.y + item.height * 0.95);
    ctx.lineTo(item.x + item.width - item.width * 0.1, item.y + item.height);
    ctx.stroke();

    // Splinter details (short, sharp lines on edges)
    drawSplinter(item.x + item.width * 0.5, item.y, 5);
    drawSplinter(item.x, item.y + item.height * 0.7, 6);
}

function drawDetailedTable(item) {
    ctx.beginPath();
    // Tabletop (slightly warped)
    ctx.moveTo(item.x, item.y + item.height * 0.05);
    ctx.quadraticCurveTo(item.x + item.width/2, item.y - item.height*0.02, item.x + item.width, item.y + item.height*0.1);
    ctx.lineTo(item.x + item.width * 0.95, item.y + item.height * 0.3);
    ctx.quadraticCurveTo(item.x + item.width/2, item.y + item.height*0.35, item.x + item.width*0.05, item.y + item.height*0.25);
    ctx.closePath();
    // Legs (uneven and rickety)
    ctx.moveTo(item.x + item.width*0.1, item.y + item.height*0.25); // Front-left leg top
    ctx.lineTo(item.x + item.width*0.05, item.y + item.height); // Bottom
    ctx.lineTo(item.x + item.width*0.15, item.y + item.height*0.95);
    // Another leg
    ctx.moveTo(item.x + item.width*0.85, item.y + item.height*0.3); // Front-right leg top
    ctx.lineTo(item.x + item.width*0.9, item.y + item.height);
    ctx.lineTo(item.x + item.width*0.8, item.y + item.height*0.9);
    ctx.stroke();
    drawSplinter(item.x + item.width, item.y + item.height*0.15, 7);
}

function drawDetailedTrayWithTools(item) {
    // Tray (irregular rectangle)
    ctx.beginPath();
    ctx.moveTo(item.x, item.y + item.height*0.1);
    ctx.lineTo(item.x + item.width, item.y);
    ctx.lineTo(item.x + item.width*0.95, item.y + item.height);
    ctx.lineTo(item.x + item.width*0.05, item.y + item.height*0.9);
    ctx.closePath();
    ctx.stroke();

    // Tools (outlines on the tray) - keep lineWidth thin for tools
    const prevLineWidth = ctx.lineWidth;
    ctx.lineWidth = 1; 
    // Scalpel shape
    ctx.beginPath();
    ctx.moveTo(item.x + item.width*0.2, item.y + item.height*0.3);
    ctx.lineTo(item.x + item.width*0.5, item.y + item.height*0.25); // Blade point
    ctx.lineTo(item.x + item.width*0.45, item.y + item.height*0.4); // Blade base
    ctx.closePath();
    ctx.stroke();
    // Forceps shape (two curved lines)
    ctx.beginPath();
    ctx.moveTo(item.x + item.width*0.6, item.y + item.height*0.2);
    ctx.quadraticCurveTo(item.x + item.width*0.75, item.y + item.height*0.5, item.x + item.width*0.65, item.y + item.height*0.8);
    ctx.moveTo(item.x + item.width*0.65, item.y + item.height*0.2); // second arm
    ctx.quadraticCurveTo(item.x + item.width*0.80, item.y + item.height*0.5, item.x + item.width*0.70, item.y + item.height*0.8);
    ctx.stroke();
    ctx.lineWidth = prevLineWidth; // Restore line width
}

function drawSplinter(x, y, length) { // Helper for splinters
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x + (Math.random()-0.5)*length*0.5, y + (Math.random()-0.5)*length*1.5);
    ctx.stroke();
}


// Modify drawItems to call these helpers:
function drawItems() {
    items.forEach(item => {
        if (item.isCollected === true) {
            return; 
        }
        if (item.isDiscovered) {
            ctx.strokeStyle = item.color;
            // ctx.lineWidth = 1.5; // Slightly thicker for furniture outlines (original instruction)
            // Let each drawing function set its preferred lineWidth

            if (item.id === 'armRight') {
                ctx.lineWidth = 1; // As per original detailed arm/leg
                // Main arm part
                ctx.strokeRect(item.x, item.y, item.width, item.height);
                const handWidth = item.height; 
                const handLength = item.width * 0.3;
                ctx.strokeRect(item.x + item.width, item.y, handLength, handWidth); 
            } else if (item.id === 'legLeft') {
                ctx.lineWidth = 1; // As per original detailed arm/leg
                // Main leg part
                ctx.strokeRect(item.x, item.y, item.width, item.height);
                const footLength = item.width * 1.5; 
                const footThickness = item.height * 0.2;
                ctx.strokeRect(item.x - (footLength - item.width) / 2, item.y + item.height, footLength, footThickness);
            } else if (item.id === 'surgeonsChair') {
                ctx.lineWidth = 1.5; // Furniture outline thickness
                drawDetailedChair(item);
            } else if (item.id === 'ricketyTable') {
                ctx.lineWidth = 1.5; // Furniture outline thickness
                drawDetailedTable(item);
            } else if (item.id === 'toolsTray') {
                ctx.lineWidth = 1.5; // Tray outline thickness
                drawDetailedTrayWithTools(item);
            } else { // Fallback for any other items
                ctx.lineWidth = 1;
                ctx.strokeRect(item.x, item.y, item.width, item.height);
            }
        }
    });
    ctx.lineWidth = 2; // Reset default for monster/other game elements
}

// Modify drawGame to include items
function drawGame() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawOctagonRoom();
    drawItems(); 
    drawMonster();
    drawSpeechBubbles(); // Draw speech bubbles on top
}

// --- Speech Bubble Logic ---
function showSpeechBubble(item) {
    // Avoid duplicate bubbles for the same item if somehow triggered multiple times
    if (activeSpeechBubbles.some(bubble => bubble.itemId === item.id)) {
        return;
    }

    const bubbleText = applyBlurToText(item.description);
    activeSpeechBubbles.push({
        text: bubbleText,
        x: item.x + (item.width / 2), // Position bubble near the center of the item
        y: item.y - 10,              // Slightly above the item
        life: 180, // Lifetime in frames (e.g., 3 seconds at 60fps)
        itemId: item.id // To prevent duplicates and for reference
    });
}

function drawSpeechBubbles() {
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    const bubblePadding = 8;
    const bubbleHeight = 20 + (bubblePadding * 2); // Approx height for one line

    for (let i = activeSpeechBubbles.length - 1; i >= 0; i--) {
        const bubble = activeSpeechBubbles[i];
        bubble.life--;

        if (bubble.life <= 0) {
            activeSpeechBubbles.splice(i, 1); // Remove expired bubble
            continue;
        }

        // Basic speech bubble shape (rectangle with a pointer)
        const textWidth = ctx.measureText(bubble.text).width;
        const bubbleWidth = textWidth + (bubblePadding * 2);
        const bubbleX = bubble.x - bubbleWidth / 2; // Center bubble above item's center
        const bubbleY = bubble.y - bubbleHeight - 5; // Position above item, -5 for pointer space

        // Bubble rectangle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'; // Semi-transparent white
        ctx.fillRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
        
        // Pointer (simple triangle)
        ctx.beginPath();
        ctx.moveTo(bubble.x - 5, bubbleY + bubbleHeight); // Left point of triangle base
        ctx.lineTo(bubble.x + 5, bubbleY + bubbleHeight); // Right point of triangle base
        ctx.lineTo(bubble.x, bubbleY + bubbleHeight + 7); // Tip of triangle pointing down
        ctx.closePath();
        ctx.fill();

        // Text
        ctx.fillStyle = '#000'; // Black text
        ctx.fillText(bubble.text, bubble.x, bubble.y - bubblePadding - 2); // Adjust Y for text baseline
    }
}

// --- Movement and Collision ---
const keysPressed = {};

document.addEventListener('keydown', (event) => {
    keysPressed[event.key] = true;
});

document.addEventListener('keyup', (event) => {
    keysPressed[event.key] = false;
});

function handleMovement() {
    let dx = 0;
    let dy = 0;
    const currentSpeed = monster.canHop ? monster.speed * 2 : monster.speed; 

    if (keysPressed['ArrowUp'] || keysPressed['w']) {
        dy -= currentSpeed;
    }
    if (keysPressed['ArrowDown'] || keysPressed['s']) {
        dy += currentSpeed;
    }
    if (keysPressed['ArrowLeft'] || keysPressed['a']) {
        dx -= currentSpeed;
    }
    if (keysPressed['ArrowRight'] || keysPressed['d']) {
        dx += currentSpeed;
    }

    if (dx === 0 && dy === 0) {
        return; 
    }

    const nextX = monster.x + dx;
    const nextY = monster.y + dy;
    
    const monsterBoundingBox = [
        { x: nextX, y: nextY },                                       
        { x: nextX + monster.width, y: nextY },                       
        { x: nextX + monster.width, y: nextY + monster.height },      
        { x: nextX, y: nextY + monster.height }                       
    ];

    const octagonVertices = getOctagonVertices();
    let canMove = true;

    for (const corner of monsterBoundingBox) {
        if (!isPointInOctagon(corner.x, corner.y, octagonVertices)) {
            canMove = false;
            break;
        }
    }

    if (canMove) {
        monster.x = nextX;
        monster.y = nextY;
    }
}

function checkCollisions() {
    const monsterActualBounds = getMonsterBoundingBox(monster); // Use precise bounds

    items.forEach(item => {
        // Check for collision between monster's precise bounding box and item's bounding box
        if (monsterActualBounds.maxX > item.x &&
            monsterActualBounds.minX < item.x + item.width &&
            monsterActualBounds.maxY > item.y &&
            monsterActualBounds.minY < item.y + item.height) {
            
            // If collision detected:
            if (!item.isDiscovered) {
                item.isDiscovered = true;
                console.log(`Discovered ${item.name}!`);
                showSpeechBubble(item); // Call the new function here

                // Specific logic for body parts
                if (item.id === 'armRight') {
                    monster.parts.armRight = true;
                    if (item.hasOwnProperty('isCollected')) item.isCollected = true; // Set as collected
                    updateSidebar();
                } else if (item.id === 'legLeft') {
                    monster.parts.legLeft = true;
                    monster.canHop = true;
                    if (item.hasOwnProperty('isCollected')) item.isCollected = true; // Set as collected
                    updateSidebar();
                    console.log("Monster can now hop!");
                }
                // For other items (furniture), they just become discovered.
            }
        }
    });
}

// --- Game Loop (Modification) ---
function gameLoop() {
    handleMovement();
    checkCollisions();
    drawGame();
    requestAnimationFrame(gameLoop);
}

// --- Brain Modal Logic ---
const brainModal = document.getElementById('brain-modal');
const brainZoomButton = document.getElementById('brain-zoom-button');
const closeButton = document.querySelector('.modal .close-button');

if (brainZoomButton) {
    brainZoomButton.onclick = function() {
        if (brainModal) brainModal.style.display = 'flex'; // Use flex for centering
    }
}

if (closeButton) {
    closeButton.onclick = function() {
        if (brainModal) brainModal.style.display = 'none';
    }
}

window.onclick = function(event) {
    if (event.target == brainModal) {
        if (brainModal) brainModal.style.display = 'none';
    }
}

// --- Init Game (Modification) ---
function initGame() {
    if (sidebarCanvas) { // Ensure canvas element exists before setting width/height
        sidebarCanvas.width = 150; 
        sidebarCanvas.height = 200;
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        positionItemsInRoom(); 
    });
    resizeCanvas(); 
    positionItemsInRoom(); 
    updateSidebar(); 
    
    requestAnimationFrame(gameLoop);
}

// The existing initGame() call at the end of the file should remain
initGame();
