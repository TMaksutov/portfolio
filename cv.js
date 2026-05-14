/* ============================================================
   CV INTERACTIVE ZOOM & PANNING LOGIC
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const cvPages = document.querySelectorAll('.cv-page');
    
    cvPages.forEach(page => {
        page.addEventListener('mousemove', (e) => {
            const rect = page.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width; // 0 to 1
            const y = (e.clientY - rect.top) / rect.height; // 0 to 1

            // 1. Determine centering shift
            const isLeftPage = page.classList.contains('page-left');
            const centerShiftX = isLeftPage ? 350 : -350; // Move towards center

            // 2. Determine panning amount (inverse movement)
            const panX = (0.5 - x) * 150; 
            const panY = (0.5 - y) * 350; 

            // 3. Apply combined transform
            // Note: We use inline style to override the base CSS rotation
            page.style.transform = `translate(${centerShiftX + panX}px, ${panY}px) scale(1.6) rotateY(0deg) translateZ(150px)`;
            page.classList.add('zoomed');
        });

        page.addEventListener('mouseleave', () => {
            page.classList.remove('zoomed');
            
            // Reset to original 3D spread position defined in cv.css
            const isLeftPage = page.classList.contains('page-left');
            if (isLeftPage) {
                page.style.transform = `rotateY(15deg) translateZ(50px)`;
            } else {
                page.style.transform = `rotateY(-15deg) translateZ(50px)`;
            }
        });
    });
});
