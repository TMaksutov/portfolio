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
    
    // Position modal in center
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%) scale(1)';

    // Blur background
    roomContainer.classList.add('blurred');
}

function closeModals() {
    overlay.classList.remove('show');
    document.querySelectorAll('.modal-content').forEach(m => {
        m.classList.remove('active');
        m.style.transform = 'translate(-50%, -50%) scale(0.95)';
    });
    roomContainer.classList.remove('blurred');
}

// Initial positioning for modals (centered)
document.querySelectorAll('.modal-content').forEach(modal => {
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%) scale(0.95)';
});

/* ============================================================
   BUSINESS CARD INTERACTIVE 3D LOGIC
   ============================================================ */
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

