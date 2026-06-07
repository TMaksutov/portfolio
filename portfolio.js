// portfolio.js

// Portfolio view elements
const portfolioView = document.getElementById('portfolio-view');
const portfolioBgWrapper = document.getElementById('portfolio-bg-wrapper');

// Preload logic for portfolio image
let portfolioImageLoaded = false;
let isPreloadingPortfolio = false;
const portfolioImages = [
    'assets/images/table.png',
    'assets/3d/1.png',
    'assets/3d/2.png',
    'assets/3d/3.png',
    'assets/3d/4.png',
    'assets/3d/5.png',
    'assets/3d/6.png',
    'assets/3d/7.png',
    'assets/3d/8.png',
    'assets/3d/9.png'
];

function preloadPortfolioImages(callback) {
    if (portfolioImageLoaded) {
        if (callback) callback();
        return;
    }
    if (isPreloadingPortfolio) {
        if (callback) {
            window.addEventListener('portfolioImagesLoaded', callback, { once: true });
        }
        return;
    }
    isPreloadingPortfolio = true;

    let loadedCount = 0;
    const total = portfolioImages.length;

    portfolioImages.forEach(src => {
        const img = new Image();
        img.onload = img.onerror = () => {
            loadedCount++;
            if (loadedCount === total) {
                portfolioImageLoaded = true;
                isPreloadingPortfolio = false;
                window.dispatchEvent(new Event('portfolioImagesLoaded'));
                if (callback) callback();
            }
        };
        img.src = src;
    });
}

const precalculatedBasements = {
    "1.png": [{ "x": -742.2, "y": 470.3 }, { "x": -467.8, "y": 637.2 }, { "x": 708.4, "y": 490.0 }, { "x": 247.7, "y": 274.1 }],
    "2.png": [{ "x": -851.1, "y": 10.1 }, { "x": 59.9, "y": 739.1 }, { "x": 893.9, "y": 150.3 }, { "x": -52.2, "y": -466.5 }],
    "3.png": [{ "x": -1368.8, "y": -142.5 }, { "x": -677.5, "y": 688.1 }, { "x": 1355.0, "y": 141.3 }, { "x": 497.8, "y": -654.7 }],
    "4.png": [{ "x": -885.1, "y": 305.6 }, { "x": 512.4, "y": 936.1 }, { "x": 1013.7, "y": 108.1 }, { "x": -171.1, "y": -286.9 }],
    "5.png": [{ "x": -1317.9, "y": 8.3 }, { "x": -596.7, "y": 691.7 }, { "x": 1264.1, "y": 169.5 }, { "x": 388.4, "y": -488.1 }],
    "6.png": [{ "x": -591.3, "y": 762.4 }, { "x": 275.6, "y": 934.3 }, { "x": 574.6, "y": 642.9 }, { "x": -98.0, "y": 493.4 }],
    "7.png": [{ "x": -1121.8, "y": 385.2 }, { "x": -298.9, "y": 875.6 }, { "x": 1107.0, "y": 208.4 }, { "x": 249.8, "y": -133.8 }],
    "8.png": [{ "x": -434.3, "y": 189.6 }, { "x": 0.0, "y": 511.2 }, { "x": 436.0, "y": 226.9 }, { "x": -111.0, "y": 43.5 }],
    "9.png": [{ "x": -687.9, "y": 627.9 }, { "x": -268.2, "y": 1020.3 }, { "x": 799.2, "y": 627.9 }, { "x": 288.3, "y": 345.1 }]
};

function revealPortfolioView() {
    if (portfolioView) {
        portfolioView.classList.add('active');
        requestAnimationFrame(() => {
            updateAllPerspectives();
            initAllBasements();
        });
    }
}

window.openPortfolioView = function () {
    if (!portfolioView) return;

    if (portfolioImageLoaded) {
        revealPortfolioView();
    } else {
        preloadPortfolioImages(() => {
            revealPortfolioView();
        });
    }
};

window.closePortfolioView = function () {
    if (portfolioView) {
        portfolioView.classList.remove('active');
    }
};

// Also preload on load
window.addEventListener('load', () => {
    preloadPortfolioImages();
});

// ------------------------------------------------------------
// Drag and Drop Logic for 3D Objects on Portfolio Table
// ------------------------------------------------------------
let activeDraggable = null;
let currentX = 0;
let currentY = 0;
let initialX = 0;
let initialY = 0;
let xOffset = 0;
let yOffset = 0;
let maxZIndex = 10;

function updatePerspective(element) {
    // Calculate Y distance from the top of the physical table.
    // Using local offset instead of screen bounding rect prevents the parallax shifts from breaking the scale!
    const ty = parseFloat(element.getAttribute('data-y')) || 0;
    const localY = element.offsetTop + element.offsetHeight + ty;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    const rawScale = 0.6 + (localY / viewportHeight) * 0.8;
    // Removed the upper bound so scaling is perfectly consistent everywhere without capping out
    const boundedScale = Math.max(0.2, rawScale);

    element.style.setProperty('--perspective', boundedScale);
}

function updateAllPerspectives() {
    const allObjs = Array.from(document.querySelectorAll('.draggable-3d-obj'));

    // First, update CSS scales which are required for accurate screen polygons
    allObjs.forEach(obj => {
        updatePerspective(obj);
    });

    // Second, topologically sort based on overlapping isometric bounds
    allObjs.sort((objA, objB) => {
        const polyA = getScreenPolygon(objA);
        const polyB = getScreenPolygon(objB);
        if (!polyA || !polyB) return 0;

        // 0: Left, 1: Bottom, 2: Right, 3: Top
        const bottomA = polyA[1];
        const bottomB = polyB[1];

        // If strictly vertically aligned, compare bottom tips
        if (Math.abs(bottomA.x - bottomB.x) < 1) {
            return bottomA.y - bottomB.y;
        }

        // Topologically compare the nearest planes
        if (bottomA.x < bottomB.x) {
            // A is left, B is right. Compare A's Right plane to B's Left plane
            return polyA[2].y - polyB[0].y;
        } else {
            // B is left, A is right. Compare A's Left plane to B's Right plane
            return polyA[0].y - polyB[2].y;
        }
    });

    // Apply sequential Z-indexes based on correct 3D depth order
    allObjs.forEach((obj, index) => {
        obj.style.zIndex = index + 10;
    });
}

// Physics & Collision Data
const objectBasements = new Map();

function initAllBasements() {
    document.querySelectorAll('.draggable-3d-obj').forEach(obj => {
        if (!objectBasements.has(obj)) {
            const filename = obj.getAttribute('src').split('/').pop();
            const poly = precalculatedBasements[filename] || [
                { x: -50, y: 25 },
                { x: 0, y: 50 },
                { x: 50, y: 25 },
                { x: 0, y: 0 }
            ];

            objectBasements.set(obj, {
                localPoly: poly,
                naturalWidth: obj.naturalWidth || 1000,
                naturalHeight: obj.naturalHeight || 1000
            });
        }
    });
}

function getScreenPolygon(obj) {
    const baseData = objectBasements.get(obj);
    if (!baseData) return null;

    const rect = obj.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const scale = parseFloat(obj.style.getPropertyValue('--perspective')) || 1;

    // Compute the ratio of current displayed size vs natural size, applying CSS scale
    const scaleX = (obj.offsetWidth / baseData.naturalWidth) * scale;
    const scaleY = (obj.offsetHeight / baseData.naturalHeight) * scale;

    return baseData.localPoly.map(p => ({
        x: centerX + p.x * scaleX,
        y: centerY + p.y * scaleY
    }));
}

function getAxes(poly) {
    const axes = [];
    for (let i = 0; i < poly.length; i++) {
        const p1 = poly[i];
        const p2 = poly[i + 1 == poly.length ? 0 : i + 1];
        const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
        const normal = { x: -edge.y, y: edge.x };
        const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
        axes.push({ x: normal.x / len, y: normal.y / len });
    }
    return axes;
}

function projectPolygon(axis, poly) {
    let min = (poly[0].x * axis.x + poly[0].y * axis.y);
    let max = min;
    for (let i = 1; i < poly.length; i++) {
        const proj = (poly[i].x * axis.x + poly[i].y * axis.y);
        if (proj < min) min = proj;
        if (proj > max) max = proj;
    }
    return { min, max };
}

function getOverlap(proj1, proj2) {
    if (proj1.max < proj2.min || proj2.max < proj1.min) {
        return 0;
    }
    return Math.min(proj1.max, proj2.max) - Math.max(proj1.min, proj2.min);
}

function testCollisionSAT(poly1, poly2) {
    const axes1 = getAxes(poly1);
    const axes2 = getAxes(poly2);
    const axes = [...axes1, ...axes2];

    let smallestOverlap = Infinity;
    let mtvAxis = null;

    for (let i = 0; i < axes.length; i++) {
        const axis = axes[i];
        const proj1 = projectPolygon(axis, poly1);
        const proj2 = projectPolygon(axis, poly2);

        const overlap = getOverlap(proj1, proj2);
        if (overlap === 0) {
            return null; // Found separating axis
        } else {
            if (overlap < smallestOverlap) {
                smallestOverlap = overlap;
                mtvAxis = axis;
            }
        }
    }

    const getCenter = (p) => {
        let cx = 0, cy = 0;
        p.forEach(pt => { cx += pt.x; cy += pt.y; });
        return { x: cx / p.length, y: cy / p.length };
    };
    const c1 = getCenter(poly1);
    const c2 = getCenter(poly2);
    const dir = { x: c2.x - c1.x, y: c2.y - c1.y };
    if (dir.x * mtvAxis.x + dir.y * mtvAxis.y < 0) {
        mtvAxis.x = -mtvAxis.x;
        mtvAxis.y = -mtvAxis.y;
    }

    return { overlap: smallestOverlap, axis: mtvAxis };
}

function applyPush(obj, dx, dy) {
    const oldTransition = obj.style.transition;
    obj.style.transition = 'none';

    let tx = parseFloat(obj.getAttribute('data-x')) || 0;
    let ty = parseFloat(obj.getAttribute('data-y')) || 0;

    tx += dx;
    ty += dy;

    obj.setAttribute('data-x', tx);
    obj.setAttribute('data-y', ty);
    obj.style.setProperty('--tx', `${tx}px`);
    obj.style.setProperty('--ty', `${ty}px`);
    updatePerspective(obj);

    // Force reflow
    void obj.offsetWidth;
    obj.style.transition = oldTransition;
}

function resolveAllCollisions(activeObj) {
    if (!activeObj) return;

    const allObjs = Array.from(document.querySelectorAll('.draggable-3d-obj'));
    let hasCollision = true;
    let loops = 0;

    while (hasCollision && loops < 10) {
        hasCollision = false;

        for (let i = 0; i < allObjs.length; i++) {
            for (let j = i + 1; j < allObjs.length; j++) {
                const obj1 = allObjs[i];
                const obj2 = allObjs[j];

                const poly1 = getScreenPolygon(obj1);
                const poly2 = getScreenPolygon(obj2);

                if (!poly1 || !poly2) continue;

                // Add a small padding
                const padding = 2;

                const mtv = testCollisionSAT(poly1, poly2);
                if (mtv && mtv.overlap > 0.1) {
                    hasCollision = true;
                    if (obj1 === activeObj) {
                        applyPush(obj2, mtv.axis.x * (mtv.overlap + padding), mtv.axis.y * (mtv.overlap + padding));
                    } else if (obj2 === activeObj) {
                        applyPush(obj1, -mtv.axis.x * (mtv.overlap + padding), -mtv.axis.y * (mtv.overlap + padding));
                    } else {
                        applyPush(obj2, (mtv.axis.x * (mtv.overlap + padding)) / 2, (mtv.axis.y * (mtv.overlap + padding)) / 2);
                        applyPush(obj1, -(mtv.axis.x * (mtv.overlap + padding)) / 2, -(mtv.axis.y * (mtv.overlap + padding)) / 2);
                    }
                }
            }
        }
        loops++;
    }
}

function isPointInObjectExtrusion(point, poly, rect) {
    const px = point.x, py = point.y;
    const leftPt = poly[0];
    const bottomPt = poly[1];
    const rightPt = poly[2];
    
    // Check horizontal bounds (must be within the object's width)
    if (px < leftPt.x || px > rightPt.x) return false;
    
    // Check vertical top bound (cannot be higher than the actual image)
    if (py < rect.top) return false;
    
    // Calculate the Y coordinate of the bottom isometric planes at this specific X
    let boundaryY;
    if (px < bottomPt.x) {
        if (bottomPt.x === leftPt.x) {
            boundaryY = Math.max(leftPt.y, bottomPt.y);
        } else {
            const t = (px - leftPt.x) / (bottomPt.x - leftPt.x);
            boundaryY = leftPt.y + t * (bottomPt.y - leftPt.y);
        }
    } else {
        if (rightPt.x === bottomPt.x) {
            boundaryY = Math.max(rightPt.y, bottomPt.y);
        } else {
            const t = (px - bottomPt.x) / (rightPt.x - bottomPt.x);
            boundaryY = bottomPt.y + t * (rightPt.y - bottomPt.y);
        }
    }
    
    // The click must be strictly ABOVE or ON the bottom boundary planes
    // (Smaller Y is higher up on the screen)
    return py <= boundaryY;
}

function dragStart(e) {
    const portfolioView = document.getElementById('portfolio-view');
    if (!portfolioView || !portfolioView.classList.contains('active')) return;

    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
    // Check all objects from top layer to bottom layer
    const allObjs = Array.from(document.querySelectorAll('.draggable-3d-obj'));
    allObjs.sort((a, b) => parseInt(b.style.zIndex || 0) - parseInt(a.style.zIndex || 0));
    
    let clickedObj = null;
    for (const obj of allObjs) {
        const poly = getScreenPolygon(obj);
        const rect = obj.getBoundingClientRect();
        if (poly && isPointInObjectExtrusion({x: clientX, y: clientY}, poly, rect)) {
            clickedObj = obj;
            break;
        }
    }

    if (clickedObj) {
        activeDraggable = clickedObj;

        xOffset = parseFloat(activeDraggable.getAttribute('data-x')) || 0;
        yOffset = parseFloat(activeDraggable.getAttribute('data-y')) || 0;

        initialX = clientX - xOffset;
        initialY = clientY - yOffset;

        if (e.type !== 'touchstart') {
            e.preventDefault(); // prevents native image drag bug
        }

        currentX = xOffset;
        currentY = yOffset;

        activeDraggable.classList.add('dragging');
    }
}

function drag(e) {
    if (activeDraggable) {
        if (e.type === "touchmove") {
            currentX = e.touches[0].clientX - initialX;
            currentY = e.touches[0].clientY - initialY;
        } else {
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            e.preventDefault();
        }

        xOffset = currentX;
        yOffset = currentY;

        activeDraggable.setAttribute('data-x', currentX);
        activeDraggable.setAttribute('data-y', currentY);

        activeDraggable.style.setProperty('--tx', `${currentX}px`);
        activeDraggable.style.setProperty('--ty', `${currentY}px`);

        updateAllPerspectives();

        resolveAllCollisions(activeDraggable);
    }
}

function dragEnd(e) {
    if (activeDraggable) {
        activeDraggable.classList.remove('dragging');
        // Recalculate full table depth layer now that it has been dropped
        updateAllPerspectives();
        activeDraggable = null;
    }
}

document.addEventListener('touchstart', dragStart, { passive: false });
document.addEventListener('touchend', dragEnd, { passive: false });
document.addEventListener('touchmove', drag, { passive: false });

document.addEventListener('mousedown', dragStart, false);
document.addEventListener('mouseup', dragEnd, false);
document.addEventListener('mousemove', drag, false);


