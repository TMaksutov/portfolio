const overlay = document.getElementById('global-overlay');
const roomContainer = document.querySelector('.room-container');
const panWrapper = document.getElementById('pan-wrapper');
const hotspots = document.querySelectorAll('.hotspot');

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
        const texts = summaryModal.querySelectorAll('.summary-text');
        if (title) title.style.transform = '';
        texts.forEach(text => text.style.transform = '');
    }
    
    // Restore hotspots
    hotspots.forEach(h => {
        h.style.opacity = '';
        h.style.pointerEvents = '';
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
    
    if (!card || !container || !container.closest('.active')) return;

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

