/* ============================================================
   CV INTERACTIVE ZOOM & PANNING LOGIC
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const cvPages = document.querySelectorAll('.cv-page, .cert-page');
    
    cvPages.forEach(page => {
        const isCert = page.classList.contains('cert-page');
        let ctx = null;
        let isDrawing = false;
        let pts = [];
        let canvas = null;

        if (!isCert) {
            // Create canvas for red pen drawing
            canvas = document.createElement('canvas');
            canvas.classList.add('pen-canvas');
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.zIndex = '10';
            canvas.style.pointerEvents = 'none'; // let page capture mouse
            canvas.style.opacity = '0.5'; // Use canvas opacity to prevent dark joints
            page.appendChild(canvas);
            
            // Make images ignore pointer events
            const img = page.querySelector('img');
            if (img) img.style.pointerEvents = 'none';
            
            function initCanvas() {
                if (!ctx && page.offsetWidth > 0) {
                    canvas.width = page.offsetWidth;
                    canvas.height = page.offsetHeight;
                    ctx = canvas.getContext('2d');
                }
            }
            
            page.addEventListener('mouseenter', initCanvas);
            
            page.addEventListener('mousedown', (e) => {
                initCanvas();
                isDrawing = true;
                pts = [{x: e.offsetX, y: e.offsetY}];
            });
            
            window.addEventListener('mouseup', () => {
                if (isDrawing && pts.length >= 2 && ctx) {
                    const p1 = pts[pts.length - 2];
                    const p2 = pts[pts.length - 1];
                    const midX = (p1.x + p2.x) / 2;
                    const midY = (p1.y + p2.y) / 2;
                    ctx.beginPath();
                    ctx.moveTo(midX, midY);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = '#dc143c';
                    ctx.lineWidth = 1.5;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.stroke();
                }
                isDrawing = false;
                pts = [];
            });
        }
        
        // Store original transform to reset properly
        let leaveTimeout = null;
        
        page.addEventListener('mousemove', (e) => {
            if (leaveTimeout) {
                clearTimeout(leaveTimeout);
                leaveTimeout = null;
            }

            if (!isCert && isDrawing && ctx) {
                pts.push({x: e.offsetX, y: e.offsetY});
                
                ctx.strokeStyle = '#dc143c'; // Crimson red pen (solid, transparency comes from canvas)
                ctx.lineWidth = 1.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                if (pts.length > 2) {
                    const p1 = pts[pts.length - 3];
                    const p2 = pts[pts.length - 2];
                    const p3 = pts[pts.length - 1];
                    
                    const mid1X = (p1.x + p2.x) / 2;
                    const mid1Y = (p1.y + p2.y) / 2;
                    const mid2X = (p2.x + p3.x) / 2;
                    const mid2Y = (p2.y + p3.y) / 2;
                    
                    ctx.beginPath();
                    ctx.moveTo(mid1X, mid1Y);
                    ctx.quadraticCurveTo(p2.x, p2.y, mid2X, mid2Y);
                    ctx.stroke();
                } else if (pts.length === 2) {
                    const p1 = pts[0];
                    const p2 = pts[1];
                    const mid1X = (p1.x + p2.x) / 2;
                    const mid1Y = (p1.y + p2.y) / 2;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(mid1X, mid1Y);
                    ctx.stroke();
                }
            }

            const rect = page.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width; // 0 to 1
            const y = (e.clientY - rect.top) / rect.height; // 0 to 1

            let centerShiftX = 0;
            let centerShiftY = 0;
            
            if (page.classList.contains('page-left')) {
                centerShiftX = 350;
            } else if (page.classList.contains('page-right')) {
                centerShiftX = -350;
            }

            // 2. Determine panning amount (inverse movement)
            const panX = (0.5 - x) * 150; 
            const panY = (0.5 - y) * 350; 

            // 3. Apply combined transform
            if (isCert) {
                page.style.transform = `translate(${panX}px, ${panY}px) scale(1.8) rotateY(0deg) translateZ(250px)`;
                
                // Update glanz position based on mouse X
                const glanzX = x * 100; // 0 to 100%
                page.style.setProperty('--glanz-x', `${glanzX}%`);
            } else {
                page.style.transform = `translate(${centerShiftX + panX}px, ${panY}px) scale(1.6) rotateY(0deg) translateZ(150px)`;
            }
            page.classList.add('zoomed');
        });

        page.addEventListener('mouseleave', () => {
            leaveTimeout = setTimeout(() => {
                page.classList.remove('zoomed');
                // Reset to original 3D spread position defined in css
                page.style.transform = '';
                leaveTimeout = null;
            }, 150); // 150ms buffer to prevent flickering
        });
    });
});
