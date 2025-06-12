// Get canvas and context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Sidebar elements
const monsterBodyDisplay = document.getElementById('monster-body');
// const brainZoomPlaceholder = document.getElementById('brain-zoom-placeholder'); // This will be replaced

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
function applyBlurToText(text, blurFactor = 0.7) {
    if (!text) return "";
    return text.split('').map(char => {
        if (char === ' ') return ' '; // Preserve spaces
        return (Math.random() < blurFactor) ? '.' : char; // Replace ~70% with periods
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
    ctx.lineWidth = 4; // Base thickness for the wall

    // Store vertices to ensure consistent "chipping" and for getOctagonVertices if it needs this detail
    // However, getOctagonVertices currently uses perfect octagon for collision.
    // For visual detail, we can have separate logic.
    const visualVertices = [];
    const randomFactor = baseRadius * 0.03; // How much irregularity

    for (let i = 0; i < numSides; i++) {
        const angle = i * 2 * Math.PI / numSides;
        const randomOffsetX = (Math.random() - 0.5) * randomFactor;
        const randomOffsetY = (Math.random() - 0.5) * randomFactor;
        visualVertices.push({
            x: centerX + baseRadius * Math.cos(angle) + randomOffsetX,
            y: centerY + baseRadius * Math.sin(angle) + randomOffsetY
        });
    }

    ctx.beginPath();
    ctx.moveTo(visualVertices[0].x, visualVertices[0].y);

    for (let i = 0; i < numSides; i++) {
        const p1 = visualVertices[i];
        const p2 = visualVertices[(i + 1) % numSides]; // Next vertex, wraps around

        // Decide if this segment has a "chip"
        if (i % 3 === 0) { // Add a chip to every 3rd segment for example
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const chipDepth = baseRadius * 0.02;
            // Normal vector to the segment (approx)
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx*dx + dy*dy);
            const normX = dy / len;
            const normY = -dx / len;

            ctx.lineTo(midX - dx*0.1, midY - dy*0.1); // Point before chip
            ctx.lineTo(midX + normX * chipDepth, midY + normY * chipDepth); // Chip point inwards
            ctx.lineTo(midX + dx*0.1, midY + dy*0.1); // Point after chip
            ctx.lineTo(p2.x, p2.y);
        } else {
            ctx.lineTo(p2.x, p2.y);
        }
    }
    ctx.closePath(); // Connect back to the start
    ctx.stroke();

    // Draw the door at the top-left segment (between vertices 0 and 1)
    const doorWidth = 30;
    const doorHeight = 10;
    const v0 = visualVertices[0];
    const v1 = visualVertices[1];
    const midX = (v0.x + v1.x) / 2;
    const midY = (v0.y + v1.y) / 2;
    const dx = v1.x - v0.x;
    const dy = v1.y - v0.y;
    const length = Math.sqrt(dx*dx + dy*dy);
    const normX = -dy / length;
    const normY = dx / length;
    const doorX = midX + normX * (doorHeight / 2);
    const doorY = midY + normY * (doorHeight / 2);
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(doorX - doorWidth / 2, doorY - doorHeight / 2, doorWidth, doorHeight);
    
    // Door frame details
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(doorX - doorWidth / 2 + 5, doorY - doorHeight / 2);
    ctx.lineTo(doorX - doorWidth / 2 + 5, doorY + doorHeight / 2);
    ctx.moveTo(doorX + doorWidth / 2 - 5, doorY - doorHeight / 2);
    ctx.lineTo(doorX + doorWidth / 2 - 5, doorY + doorHeight / 2);
    ctx.stroke();

    // Optional: Add a slightly thinner inner or outer line for more depth, or vary thickness per segment
    // For example, draw another slightly smaller octagon with thinner lines
    ctx.lineWidth = 1.5; // Thinner line for detail
    ctx.strokeStyle = '#bbb'; // Slightly off-white for a subtle effect, or keep '#fff'
    ctx.beginPath();
    // Slightly offset and smaller octagon for an "inner wall" effect or just texture
    const detailRadius = baseRadius * 0.97;
    ctx.moveTo(centerX + detailRadius * Math.cos(0) + (Math.random() - 0.5) * randomFactor*0.5, 
               centerY + detailRadius * Math.sin(0) + (Math.random() - 0.5) * randomFactor*0.5);
    for (let i = 1; i <= numSides; i++) {
        const angle = i * 2 * Math.PI / numSides;
        ctx.lineTo(
            centerX + detailRadius * Math.cos(angle) + (Math.random() - 0.5) * randomFactor*0.5, // Add some jitter
            centerY + detailRadius * Math.sin(angle) + (Math.random() - 0.5) * randomFactor*0.5
        );
    }
    ctx.closePath();
    ctx.stroke();

    // Restore default line width if other functions expect it
    ctx.lineWidth = 2; // Default for monster/items
}

function drawMonster() {
    ctx.strokeStyle = monster.color;
    ctx.lineWidth = 2;
    const bodyX = monster.x;
    const bodyY = monster.y;
    const bodyWidth = monster.width; // Main body width
    const bodyHeight = monster.height * 0.5; // Abdomen height

    // Abdomen
    ctx.strokeRect(bodyX, bodyY, bodyWidth, bodyHeight);

    // Entrails
    // Curve 1
    ctx.beginPath();
    ctx.moveTo(bodyX + 16, bodyY + 45);
    ctx.bezierCurveTo(bodyX + 18, bodyY + 49, bodyX + 6,  bodyY + 51, bodyX + 24, bodyY + 56);
    ctx.stroke();

    // Curve 2
    ctx.beginPath();
    ctx.moveTo(bodyX + 4,  bodyY + 45);
    ctx.bezierCurveTo(bodyX + 2,  bodyY + 51, bodyX + 7,  bodyY + 47, bodyX + 14, bodyY + 55);
    ctx.stroke();

    // Curve 3
    ctx.beginPath();
    ctx.moveTo(bodyX + 31, bodyY + 45);
    ctx.bezierCurveTo(bodyX + 31, bodyY + 50, bodyX + 16, bodyY + 48, bodyX + 12, bodyY + 55);
    ctx.stroke();

    // Head
    if (monster.parts.head) {
        const headRadius = bodyWidth / 2.5; // Example size
        ctx.beginPath();
        // Position head centered on top of abdomen
        const headCenterX = bodyX + bodyWidth / 2;
        const headCenterY = bodyY - headRadius;
        ctx.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Hair tufts
        const hairLength = headRadius * 0.4; // Length of hair tufts

        // Central tuft (pointing upwards)
        ctx.beginPath();
        ctx.moveTo(headCenterX, headCenterY - headRadius); // Start at top of head
        ctx.lineTo(headCenterX, headCenterY - headRadius - hairLength);
        ctx.stroke();

        // Left tuft (angled upwards and to the left)
        // Start point on the upper-left part of the head's circumference
        const leftTuftAngle = Math.PI * 1.25; // Angle for the base of the left tuft (approx 225 degrees, or pointing up-left)
        const leftTuftStartX = headCenterX + headRadius * Math.cos(leftTuftAngle);
        const leftTuftStartY = headCenterY + headRadius * Math.sin(leftTuftAngle);
        ctx.beginPath();
        ctx.moveTo(leftTuftStartX, leftTuftStartY);
        ctx.lineTo(leftTuftStartX - hairLength * 0.7, leftTuftStartY - hairLength * 0.7); // Angled outwards
        ctx.stroke();
        
        // Right tuft (angled upwards and to the right)
        // Start point on the upper-right part of the head's circumference
        const rightTuftAngle = Math.PI * 1.75; // Angle for the base of the right tuft (approx 315 degrees or pointing up-right)
        const rightTuftStartX = headCenterX + headRadius * Math.cos(rightTuftAngle);
        const rightTuftStartY = headCenterY + headRadius * Math.sin(rightTuftAngle);
        ctx.beginPath();
        ctx.moveTo(rightTuftStartX, rightTuftStartY);
        ctx.lineTo(rightTuftStartX + hairLength * 0.7, rightTuftStartY - hairLength * 0.7); // Angled outwards
        ctx.stroke();

        // Facial Stitches
        // Forehead stitch
        drawStitch(
            headCenterX - headRadius * 0.4, headCenterY - headRadius * 0.7,
            headCenterX + headRadius * 0.4, headCenterY - headRadius * 0.7
        );

        // Side stitch (left side)
        drawStitch(
            headCenterX - headRadius * 0.8, headCenterY - headRadius * 0.3,
            headCenterX - headRadius * 0.8, headCenterY + headRadius * 0.3
        );
        
        // Optional: another small stitch on the other side or cheek
        drawStitch(
            headCenterX + headRadius * 0.6, headCenterY + headRadius * 0.5,
            headCenterX + headRadius * 0.8, headCenterY + headRadius * 0.4
        );

    }

    // Left Arm
    if (monster.parts.armLeft) {
        const armWidth = bodyWidth * 0.7;
        const armHeight = bodyHeight * 0.25;
        // Position arm extending from upper left of abdomen
        ctx.strokeRect(bodyX - armWidth, bodyY + bodyHeight * 0.1, armWidth, armHeight);
    }

    // Right Arm
    if (monster.parts.armRight) {
        const armWidth = bodyWidth * 0.7;
        const armHeight = bodyHeight * 0.25;
        // Position arm extending from upper right of abdomen
        ctx.strokeRect(bodyX + bodyWidth, bodyY + bodyHeight * 0.1, armWidth, armHeight);
    }

    // Leg (singular for now, as per monster.parts.legLeft)
    if (monster.parts.legLeft) {
        const legWidth = bodyWidth * 0.35;
        const legHeight = monster.height * 0.45; // Longer than abdomen section
        // Position leg centered below abdomen
        ctx.strokeRect(bodyX + (bodyWidth - legWidth) / 2, bodyY + bodyHeight, legWidth, legHeight);
    }
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
function updateSidebar() {
    monsterBodyDisplay.innerHTML = ''; // Clear current parts

    if (monster.parts.head) {
        const headDiv = document.createElement('div');
        headDiv.textContent = 'Head';
        monsterBodyDisplay.appendChild(headDiv);
    }
    if (monster.parts.abdomen) {
        const abdomenDiv = document.createElement('div');
        abdomenDiv.textContent = 'Abdomen';
        monsterBodyDisplay.appendChild(abdomenDiv);
    }
    if (monster.parts.armLeft) {
        const armLDiv = document.createElement('div');
        armLDiv.textContent = 'Left Arm';
        monsterBodyDisplay.appendChild(armLDiv);
    }
    if (monster.parts.armRight) {
        const armRDiv = document.createElement('div');
        armRDiv.textContent = 'Right Arm';
        monsterBodyDisplay.appendChild(armRDiv);
    }
    if (monster.parts.legLeft) { // Assuming one leg for now
        const legLDiv = document.createElement('div');
        legLDiv.textContent = 'Leg'; // Generic 'Leg' for now
        monsterBodyDisplay.appendChild(legLDiv);
    }
    // Add more parts as needed
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
        description: "A d.t.ch.d r.ght .rm. Lo.ks l.ke m.n.", // ~70% blurred
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
        description: "A s.ver.d l.g. M.ght b. us.f.l.", // ~70% blurred
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

function drawItems() {
    items.forEach(item => {
        // If item is collected, do not draw it, regardless of discovery state
        if (item.isCollected === true) { // Check explicitly for true
            return; // Skip drawing this item
        }

        if (item.isDiscovered) { // Only draw if discovered (and not collected)
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 1; 

            if (item.id === 'armRight') {
                // Main arm part
                ctx.strokeRect(item.x, item.y, item.width, item.height);
                const handWidth = item.height; 
                const handLength = item.width * 0.3;
                ctx.strokeRect(item.x + item.width, item.y, handLength, handWidth); 
            } else if (item.id === 'legLeft') {
                // Main leg part
                ctx.strokeRect(item.x, item.y, item.width, item.height);
                const footLength = item.width * 1.5; 
                const footThickness = item.height * 0.2;
                ctx.strokeRect(item.x - (footLength - item.width) / 2, item.y + item.height, footLength, footThickness);
            } else {
                // Default drawing for other items (e.g., furniture)
                ctx.strokeRect(item.x, item.y, item.width, item.height);
            }
        }
    });
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
