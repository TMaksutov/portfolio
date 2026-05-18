const overlay = document.getElementById('global-overlay');
const roomContainer = document.querySelector('.room-container');
const panWrapper = document.getElementById('pan-wrapper');
const hotspots = document.querySelectorAll('.hotspot');

// Window view elements
const windowView = document.getElementById('window-view');
const windowBgWrapper = document.getElementById('window-bg-wrapper');
const windowFrameWrapper = document.getElementById('window-frame-wrapper');
const windowBgBlurred = document.querySelector('.window-bg-blurred');
const wipeLayer = document.getElementById('wipe-interaction-layer');

// High-performance offscreen Mask Canvas (low resolution for soft upscaled boundaries and instant dataURL generation)
const maskCanvas = document.createElement('canvas');
const maskCtx = maskCanvas.getContext('2d');
const maskW = 320; // 320x180 resolution generates naturally feathered paths when upscaled
const maskH = 180;
maskCanvas.width = maskW;
maskCanvas.height = maskH;

let condensationInterval = null;
let condensationDelayTimeout = null;
let isWiping = false;
let lastWipeX = 0;
let lastWipeY = 0;

// Apply offscreen mask canvas as the CSS mask for the blurred layer
function updateMask() {
    if (!windowBgBlurred) return;
    const dataUrl = maskCanvas.toDataURL('image/png');
    windowBgBlurred.style.webkitMaskImage = `url(${dataUrl})`;
    windowBgBlurred.style.maskImage = `url(${dataUrl})`;
}

function initMask() {
    // Start completely transparent = 0% blurred layer visible (fully sharp landscape)
    maskCtx.clearRect(0, 0, maskW, maskH);
    updateMask();
}

function startCondensation() {
    if (condensationInterval) clearInterval(condensationInterval);
    
    let cycleTime = 0; // Elapsed time in current 8-second breathing cycle (ms)
    const tickRate = 50; // Update every 50ms
    
    // Exhalation plume settings (placed slightly below center, e.g. Y=65%)
    const breathX = maskW * 0.5;
    const breathY = maskH * 0.65;
    const breathRadius = maskW * 0.65; // Broader, stronger dispersion covering more glass

    condensationInterval = setInterval(() => {
        if (!windowView || !windowView.classList.contains('active')) {
            clearInterval(condensationInterval);
            return;
        }
        
        cycleTime += tickRate;
        if (cycleTime >= 8000) {
            cycleTime = 0; // Reset cycle every 8 seconds (3s exhalation, 5s evaporation)
        }
        
        const grad = maskCtx.createRadialGradient(breathX, breathY, 0, breathX, breathY, breathRadius);
        grad.addColorStop(0, 'rgba(0,0,0,1)'); // Center: warm moisture, dense and maximum blur
        grad.addColorStop(0.2, 'rgba(0,0,0,0.85)'); // Core remains strongly fogged
        grad.addColorStop(0.5, 'rgba(0,0,0,0.25)'); // Rapid drop-off: sides are significantly weaker/sharper
        grad.addColorStop(1, 'rgba(0,0,0,0)'); // Edge: vanishes completely into clear landscape
        
        if (cycleTime < 3000) {
            // Phase 1 (0s to 3s): Active exhalation (fogging up)
            maskCtx.globalCompositeOperation = 'source-over';
            maskCtx.globalAlpha = 0.055; // Significantly increased (from 0.025) for dense, strong breaths
            maskCtx.fillStyle = grad;
            
            maskCtx.beginPath();
            maskCtx.arc(breathX, breathY, breathRadius, 0, Math.PI * 2);
            maskCtx.fill();
        } else {
            // Phase 2 (3s to 8s): Evaporation / dissipation
            // We erase 5% of what was added during the exhalation phase using destination-out.
            maskCtx.globalCompositeOperation = 'destination-out';
            maskCtx.globalAlpha = 0.00165; // Re-balanced (0.055 * 3% = 0.00165) to preserve the 5% evaporation math
            maskCtx.fillStyle = grad;
            
            maskCtx.beginPath();
            maskCtx.arc(breathX, breathY, breathRadius, 0, Math.PI * 2);
            maskCtx.fill();
        }
        
        updateMask();
    }, tickRate);
}

function openWindowView() {
    if (windowView) {
        windowView.classList.add('active');
        initMask();
        
        // Pause for 1 second before starting the first breath condensation cycle
        if (condensationDelayTimeout) clearTimeout(condensationDelayTimeout);
        condensationDelayTimeout = setTimeout(() => {
            if (windowView.classList.contains('active')) {
                startCondensation();
            }
        }, 1000);
    }
}

function closeWindowView() {
    if (windowView) {
        windowView.classList.remove('active');
        if (condensationDelayTimeout) {
            clearTimeout(condensationDelayTimeout);
            condensationDelayTimeout = null;
        }
        if (condensationInterval) {
            clearInterval(condensationInterval);
            condensationInterval = null;
        }
    }
}

// Get mouse or touch coordinates relative to the interaction layer, mapped to 320x180 resolution
function getWipePos(e) {
    if (!wipeLayer) return { x: 0, y: 0 };
    const rect = wipeLayer.getBoundingClientRect();
    
    // Support touches and changedTouches safely
    let clientX = 0;
    let clientY = 0;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    return {
        x: ((clientX - rect.left) / rect.width) * maskW,
        y: ((clientY - rect.top) / rect.height) * maskH
    };
}

function drawSoftCircle(x, y, radius) {
    // Create a radial gradient that fades out to transparent at the edges
    const grad = maskCtx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
    grad.addColorStop(0, 'rgba(0,0,0,1)'); // Center: completely clear sharp view
    grad.addColorStop(0.4, 'rgba(0,0,0,0.6)'); // Mid-point: soft transition
    grad.addColorStop(1, 'rgba(0,0,0,0)'); // Edges: untouched blur

    maskCtx.globalCompositeOperation = 'destination-out';
    maskCtx.globalAlpha = 1.0; // CRITICAL: Always reset alpha to 1.0 so user wipes are fully solid and never inherit the tiny breathing alpha!
    maskCtx.fillStyle = grad;

    maskCtx.beginPath();
    maskCtx.arc(x, y, radius, 0, Math.PI * 2);
    maskCtx.fill();
}

function wipeSegment(x, y, px, py) {
    const brushRadius = 24; // Generous soft wipe size (equivalent to ~160px on screen)
    
    const dx = x - px;
    const dy = y - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Continuous interpolation to ensure no gaps or beads when drawing fast
    const steps = Math.max(1, Math.floor(dist / 2)); 
    
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const cx = px + dx * t;
        const cy = py + dy * t;
        drawSoftCircle(cx, cy, brushRadius);
    }
    
    updateMask();
}

function startWipe(e) {
    // Prevent default scroll behavior on mobile to avoid canceling the touch session
    if (e.cancelable) e.preventDefault();
    isWiping = true;
    const pos = getWipePos(e);
    lastWipeX = pos.x;
    lastWipeY = pos.y;
    wipeSegment(pos.x, pos.y, pos.x, pos.y);
}

function handleWipe(e) {
    if (!isWiping) return;
    // Prevent default scroll behavior on mobile to avoid canceling the touch session
    if (e.cancelable) e.preventDefault();
    const pos = getWipePos(e);
    wipeSegment(pos.x, pos.y, lastWipeX, lastWipeY);
    lastWipeX = pos.x;
    lastWipeY = pos.y;
}

function stopWipe() {
    isWiping = false;
}

if (wipeLayer) {
    // Mouse Listeners: Start on interaction layer, but track moves on window
    // to prevent brush breaks if the cursor moves quickly or passes over borders.
    wipeLayer.addEventListener('mousedown', startWipe);
    window.addEventListener('mousemove', handleWipe);
    window.addEventListener('mouseup', stopWipe);
    
    // Touch Listeners: Use { passive: false } to allow e.preventDefault() for uninterrupted mobile wiping.
    wipeLayer.addEventListener('touchstart', startWipe, { passive: false });
    window.addEventListener('touchmove', handleWipe, { passive: false });
    window.addEventListener('touchend', stopWipe);
    window.addEventListener('touchcancel', stopWipe);
}

// Focus Effect Logic (Dim others)
hotspots.forEach(hotspot => {
    hotspot.addEventListener('mouseenter', () => panWrapper.classList.add('has-hover'));
    hotspot.addEventListener('mouseleave', () => panWrapper.classList.remove('has-hover'));
});

// Parallax & 3D Hover Rotation Logic
document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // 1. Handle Global Room Parallax (Pan)
    const px = mouseX / window.innerWidth;
    const py = mouseY / window.innerHeight;
    const panRange = 16.66; // (120 - 100) / 120 * 100 = 16.66%
    const moveX = (px * -panRange); 
    const moveY = (py * -panRange);
    panWrapper.style.transform = `translate(${moveX}%, ${moveY}%)`;

    // Window view parallax
    if (windowView && windowView.classList.contains('active')) {
        // bgRange: larger means it moves more (deepest layer)
        const bgRange = 15; 
        const bgMoveX = -8.33 + (0.5 - px) * bgRange;
        const bgMoveY = -8.33 + (0.5 - py) * bgRange;
        if(windowBgWrapper) windowBgWrapper.style.transform = `translate(${bgMoveX}%, ${bgMoveY}%)`;

        // frameRange: smaller means it moves less horizontally (front-most layer, text is locked inside here)
        // For 110% wrapper size, max range without showing edges is 9.09
        const frameRangeX = 5;
        const frameRangeY = 9.09;
        const frameMoveX = -4.54 + (0.5 - px) * frameRangeX;
        const frameMoveY = -4.54 + (0.5 - py) * frameRangeY;
        if(windowFrameWrapper) windowFrameWrapper.style.transform = `translate(${frameMoveX}%, ${frameMoveY}%)`;
    }

    // 2. Handle 3D Rotation for Hovered Hotspot
    hotspots.forEach(hotspot => {
        const rect = hotspot.getBoundingClientRect();
        
        // Check if mouse is inside this hotspot (with a little padding)
        if (mouseX >= rect.left - 10 && mouseX <= rect.right + 10 &&
            mouseY >= rect.top - 10 && mouseY <= rect.bottom + 10) {
            
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const dx = (mouseX - centerX) / (rect.width / 2 + 50);
            const dy = (mouseY - centerY) / (rect.height / 2 + 50);
            
            const rotateX = -dy * 45; 
            const rotateY = dx * 45;
            
            const label = hotspot.querySelector('.hotspot-label');
            const summary = hotspot.querySelector('.hotspot-summary');
            
            if (label) label.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
            if (summary) summary.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
        } else {
            const label = hotspot.querySelector('.hotspot-label');
            const summary = hotspot.querySelector('.hotspot-summary');
            if (label) label.style.transform = `rotateX(0) rotateY(0) translateZ(0)`;
            if (summary) summary.style.transform = `rotateX(0) rotateY(0) translateZ(0) translateY(10px)`;
        }
    });

    // 3. Handle 3D Rotation for Floating Text Mode Modal
    const summaryModal = document.getElementById('modal-summary');
    if (summaryModal && summaryModal.classList.contains('active') && summaryModal.classList.contains('floating-text-mode')) {
        const rect = summaryModal.getBoundingClientRect();
        
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const dx = (mouseX - centerX) / (window.innerWidth / 2);
        const dy = (mouseY - centerY) / (window.innerHeight / 2);
        
        const rotateX = -dy * 10; 
        const rotateY = dx * 10;
        
        const title = summaryModal.querySelector('.section-title');
        const texts = summaryModal.querySelectorAll('.summary-text');
        
        if (title) title.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
        texts.forEach(text => {
            text.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
        });
    }
});

// Preload the second background image
window.addEventListener('load', () => {
    const img = new Image();
    img.src = 'assets/images/Main photo 2.png';
});

// Modal Logic
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Show overlay
    overlay.classList.add('show');
    
    // Hide all other modals first
    document.querySelectorAll('.modal-content').forEach(m => m.classList.remove('active'));
    
    // Show target modal
    modal.classList.add('active');

    if (modalId === 'modal-contacts') {
        const scratchCanvas = document.getElementById('scratch-canvas');
        if (scratchCanvas) {
            const ctx = scratchCanvas.getContext('2d');
            ctx.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
        }
    }

    if (modalId === 'modal-cv' || modalId === 'modal-certs') {
        const canvases = modal.querySelectorAll('.pen-canvas');
        canvases.forEach(canvas => {
            if (canvas.width > 0 && canvas.height > 0) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        });
    }

    if (modalId === 'modal-summary') {
        // Change background with cross-dissolve
        roomContainer.classList.add('alt-bg-active');
        // Position modal on the left
        modal.style.left = '5%';
        modal.style.top = '50%';
        modal.style.transform = 'translate(0, -50%) scale(1)';
        modal.classList.add('floating-text-mode');
        // Add gradient blur, remove regular blur
        roomContainer.classList.add('gradient-blurred');
        roomContainer.classList.remove('blurred');
        // Hide hotspots gracefully
        hotspots.forEach(h => {
            h.style.opacity = '0';
            h.style.pointerEvents = 'none';
        });
    } else {
        // Position modal in center
        modal.style.left = '50%';
        modal.style.top = '50%';
        modal.style.transform = 'translate(-50%, -50%) scale(1)';
        modal.classList.remove('floating-text-mode');
        // Blur background
        roomContainer.classList.remove('gradient-blurred');
        roomContainer.classList.add('blurred');
        // Ensure background is original
        roomContainer.classList.remove('alt-bg-active');
    }
}

function closeModals() {
    const contactsModal = document.getElementById('modal-contacts');
    if (contactsModal && contactsModal.classList.contains('active')) {
        const card = document.getElementById('business-card');
        if (card) {
            card.classList.add('falling');
            card.style.transition = 'transform 0.55s cubic-bezier(0.32, 0, 0.67, 0)';
            card.style.transform = 'translateY(1200px)';
        }
        
        // Fade out the close button smoothly
        const closeBtn = contactsModal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.style.transition = 'opacity 0.3s ease';
            closeBtn.style.opacity = '0';
        }
        
        // Start fading out the room blur immediately
        roomContainer.classList.remove('blurred');
        
        // After the animation finishes, fully deactivate everything
        setTimeout(() => {
            contactsModal.classList.remove('active');
            if (card) {
                card.classList.remove('falling');
                card.style.transform = '';
                card.style.transition = '';
                card.style.boxShadow = '';
                card.style.pointerEvents = '';
            }
            if (closeBtn) {
                closeBtn.style.opacity = '';
                closeBtn.style.transition = '';
            }
            
            // Run the rest of regular closeModals cleanup
            finishCloseModals();
        }, 550);
        
        return;
    }
    
    // Regular immediate close for other modals
    finishCloseModals();
}

function finishCloseModals() {
    overlay.classList.remove('show');
    document.querySelectorAll('.modal-content').forEach(m => {
        m.classList.remove('active');
        m.classList.remove('floating-text-mode');
        m.style.transform = 'translate(-50%, -50%) scale(0.95)';
    });
    
    roomContainer.classList.remove('alt-bg-active');
    roomContainer.classList.remove('blurred');
    roomContainer.classList.remove('gradient-blurred');
    
    // Reset transforms for summary modal inner text
    const summaryModal = document.getElementById('modal-summary');
    if (summaryModal) {
        const title = summaryModal.querySelector('.section-title');
        const texts = summaryModal.querySelector('.summary-text');
        if (title) title.style.transform = '';
        const textsAll = summaryModal.querySelectorAll('.summary-text');
        textsAll.forEach(text => text.style.transform = '');
    }
    
    // Restore hotspots
    hotspots.forEach(h => {
        h.style.opacity = '';
        h.style.pointerEvents = '';
    });

    // Reset any fallen or falling certificates
    document.querySelectorAll('.cert-page').forEach(c => {
        c.classList.remove('falling', 'slipping');
        c.style.transform = '';
        c.style.transition = '';
        c.style.opacity = '';
        c.style.pointerEvents = '';
        c.style.top = '';
        c.style.left = '';
        if (c.fallTimeout) {
            clearTimeout(c.fallTimeout);
            c.fallTimeout = null;
        }
    });
}

// Initial positioning for modals (centered)
document.querySelectorAll('.modal-content').forEach(modal => {
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%) scale(0.95)';
});

/* ============================================================
   BUSINESS CARD INTERACTIVE 3D LOGIC & SCRATCHES
   ============================================================ */
const scratchCanvas = document.getElementById('scratch-canvas');
let sCtx = null;
let isScratching = false;
let scratchX = 0;
let scratchY = 0;

if (scratchCanvas) {
    const cardElement = document.getElementById('business-card');
    
    function initCanvasSize() {
        if (!sCtx && cardElement.offsetWidth > 0) {
            scratchCanvas.width = cardElement.offsetWidth;
            scratchCanvas.height = cardElement.offsetHeight;
            sCtx = scratchCanvas.getContext('2d');
        }
    }
    
    cardElement.addEventListener('mouseenter', initCanvasSize);
    
    cardElement.addEventListener('mousedown', (e) => {
        initCanvasSize();
        isScratching = true;
        scratchX = e.offsetX;
        scratchY = e.offsetY;
    });
    
    cardElement.addEventListener('mousemove', (e) => {
        if (!isScratching || !sCtx) return;
        
        const x = e.offsetX;
        const y = e.offsetY;
        
        // Highlight (bottom-right edge)
        sCtx.beginPath();
        sCtx.moveTo(scratchX + 0.5, scratchY + 0.5);
        sCtx.lineTo(x + 0.5, y + 0.5);
        sCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        sCtx.lineWidth = Math.random() * 1.5 + 1;
        sCtx.lineCap = 'round';
        sCtx.stroke();
        
        // Shadow (top-left edge)
        sCtx.beginPath();
        sCtx.moveTo(scratchX - 0.5, scratchY - 0.5);
        sCtx.lineTo(x - 0.5, y - 0.5);
        sCtx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        sCtx.lineWidth = Math.random() * 1 + 0.5;
        sCtx.stroke();

        scratchX = x;
        scratchY = y;
    });
    
    window.addEventListener('mouseup', () => {
        isScratching = false;
    });
}

document.addEventListener('mousemove', (e) => {
    const card = document.getElementById('business-card');
    const container = document.querySelector('.business-card-container');
    
    if (!card || !container || !container.closest('.active') || card.classList.contains('falling')) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation (max 15 degrees)
    const rotateX = (centerY - y) / (rect.height / 2) * 15;
    const rotateY = (x - centerX) / (rect.width / 2) * 15;
    
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(50px)`;
    
    // Add dynamic shadow based on tilt
    const shadowX = -rotateY * 2;
    const shadowY = rotateX * 2;
    card.style.boxShadow = `${shadowX}px ${shadowY}px 50px rgba(0,0,0,0.5), 0 20px 40px rgba(0,0,0,0.4)`;
});

// Reset card on mouse leave (if we want it to return to flat)
// However, since it's in a modal that captures mouse, we can just leave it or use the overlay click

