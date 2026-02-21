// ==========================================================
//  vibe-animations.js
//  Enhanced animations for TC3 TECH-HUB
//  Handles: header glow effects, confetti, particle trails,
//           scroll effects, nav active states, mouse glow
// ==========================================================

(function () {
    'use strict';

    /* ──────────────────────────────────────────────────────
       1. HEADER ENHANCED GLOW ON NAV ITEMS
    ─────────────────────────────────────────────────────── */
    function initHeaderAnimations() {
        const userHeader = document.getElementById('header-user');
        if (!userHeader) return;

        const navLinks = userHeader.querySelectorAll('nav a');
        navLinks.forEach(link => {
            // Click ripple effect
            link.addEventListener('click', function (e) {
                const ripple = document.createElement('span');
                const rect = link.getBoundingClientRect();
                ripple.style.cssText = `
                    position: absolute;
                    width: 8px; height: 8px;
                    border-radius: 50%;
                    background: rgba(59,130,246,0.6);
                    pointer-events: none;
                    left: 50%; top: 50%;
                    transform: translate(-50%, -50%) scale(0);
                    animation: rippleNav 0.5s ease-out forwards;
                    z-index: 10;
                `;
                link.style.position = 'relative';
                link.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            });
        });

        // Inject ripple keyframes if not already present
        if (!document.getElementById('vibe-keyframes')) {
            const style = document.createElement('style');
            style.id = 'vibe-keyframes';
            style.textContent = `
                @keyframes rippleNav {
                    to { transform: translate(-50%, -50%) scale(12); opacity: 0; }
                }
                @keyframes confettiFall {
                    0%   { transform: translate(var(--x), -20px) rotate(0deg); opacity: 1; }
                    100% { transform: translate(calc(var(--x) + var(--dx)), 120vh) rotate(720deg); opacity: 0; }
                }
                @keyframes starBurst {
                    0%   { transform: scale(0) rotate(0deg); opacity: 1; }
                    60%  { opacity: 1; }
                    100% { transform: scale(1.5) rotate(180deg); opacity: 0; }
                }
                @keyframes glowPulseBtn {
                    0%, 100% { box-shadow: 0 0 12px rgba(59,130,246,0.3); }
                    50%       { box-shadow: 0 0 30px rgba(59,130,246,0.6), 0 0 60px rgba(139,92,246,0.3); }
                }
                @keyframes slideInFromRight {
                    from { opacity: 0; transform: translateX(30px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes countUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /* ──────────────────────────────────────────────────────
       2. MOUSE GLOW TRAILER (subtle orb following cursor)
    ─────────────────────────────────────────────────────── */
    function initMouseGlow() {
        const orb = document.createElement('div');
        orb.style.cssText = `
            position: fixed;
            width: 300px; height: 300px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%);
            pointer-events: none;
            z-index: 0;
            transition: left 0.15s ease, top 0.15s ease;
            transform: translate(-50%, -50%);
        `;
        document.body.appendChild(orb);

        document.addEventListener('mousemove', (e) => {
            orb.style.left = e.clientX + 'px';
            orb.style.top = e.clientY + 'px';
        });
    }

    /* ──────────────────────────────────────────────────────
       3. CONFETTI BURST for upload success
    ─────────────────────────────────────────────────────── */
    window.triggerConfetti = function () {
        const container = document.getElementById('confetti-container');
        if (!container) return;

        const colors = ['#3b82f6', '#8b5cf6', '#d946ef', '#22c55e', '#f59e0b', '#06b6d4'];
        const shapes = ['●', '■', '▲', '★', '◆'];

        for (let i = 0; i < 60; i++) {
            const piece = document.createElement('span');
            const x = Math.random() * 100;
            const dx = (Math.random() - 0.5) * 200;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            const delay = Math.random() * 0.8;
            const size = 8 + Math.random() * 12;

            piece.textContent = shape;
            piece.style.cssText = `
                position: absolute;
                color: ${color};
                font-size: ${size}px;
                left: ${x}%;
                top: 0;
                --x: ${x}%;
                --dx: ${dx}px;
                animation: confettiFall ${1.5 + Math.random() * 1.5}s ease-in ${delay}s forwards;
                pointer-events: none;
            `;
            container.appendChild(piece);
        }

        // Clean up after animation
        setTimeout(() => {
            if (container) container.innerHTML = '';
        }, 4000);
    };

    /* ──────────────────────────────────────────────────────
       4. UPLOAD SUCCESS SCREEN (called from my-projects-v2 override)
    ─────────────────────────────────────────────────────── */
    window.showUploadSuccessScreen = function () {
        const overlay = document.getElementById('success-overlay');
        if (!overlay) return;
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';

        // Trigger confetti
        setTimeout(() => window.triggerConfetti(), 200);

        // Auto-hide after 3 seconds
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }, 3500);
    };

    /* ──────────────────────────────────────────────────────
       5. FILE TYPE BADGE UPDATE in preview modal
    ─────────────────────────────────────────────────────── */
    window.updatePreviewBadge = function (ext) {
        const badge = document.getElementById('preview-file-type-badge');
        if (!badge) return;

        if (ext === 'pdf') {
            badge.textContent = 'PDF';
            badge.style.cssText = 'background: rgba(139,92,246,0.2); color: #c4b5fd; border: 1px solid rgba(139,92,246,0.3); padding: 2px 8px; border-radius: 50px; font-size: 11px;';
        } else {
            badge.textContent = 'SB3';
            badge.style.cssText = 'background: rgba(59,130,246,0.2); color: #93c5fd; border: 1px solid rgba(59,130,246,0.3); padding: 2px 8px; border-radius: 50px; font-size: 11px;';
        }
    };

    /* ──────────────────────────────────────────────────────
       6. LOADING OVERLAY STATUS TEXT CYCLE
    ─────────────────────────────────────────────────────── */
    let loadingTextInterval = null;
    const loadingTexts = [
        'Đang đọc file...',
        'Kiểm tra định dạng...',
        'Chuẩn bị bản xem trước...',
        'Sắp hoàn tất...'
    ];

    window.startLoadingTextCycle = function () {
        let i = 0;
        const el = document.getElementById('loading-status-text');
        if (!el) return;
        clearInterval(loadingTextInterval);
        loadingTextInterval = setInterval(() => {
            el.style.opacity = '0';
            setTimeout(() => {
                el.textContent = loadingTexts[i % loadingTexts.length];
                el.style.transition = 'opacity 0.4s ease';
                el.style.opacity = '1';
                i++;
            }, 300);
        }, 1200);
    };

    window.stopLoadingTextCycle = function () {
        clearInterval(loadingTextInterval);
    };

    /* ──────────────────────────────────────────────────────
       7. ANIMATED COUNTER for user project count
    ─────────────────────────────────────────────────────── */
    window.animateCounter = function (elementId, targetValue, duration = 1000) {
        const el = document.getElementById(elementId);
        if (!el) return;
        let start = 0;
        const step = targetValue / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= targetValue) { el.textContent = targetValue; clearInterval(timer); }
            else el.textContent = Math.floor(start);
        }, 16);
    };

    /* ──────────────────────────────────────────────────────
       8. CARD ENTRANCE STAGGER ANIMATION
    ─────────────────────────────────────────────────────── */
    window.staggerCards = function (gridId) {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        const cards = grid.querySelectorAll('.product-card');
        cards.forEach((card, i) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'none';
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, i * 80);
        });
    };

    /* ──────────────────────────────────────────────────────
       9. PLUS BUTTON HOVER SPARK
    ─────────────────────────────────────────────────────── */
    function initPlusButtonSpark() {
        const plusBtn = document.querySelector('.plus-btn');
        if (!plusBtn) return;
        plusBtn.addEventListener('mouseenter', function () {
            for (let i = 0; i < 6; i++) {
                const spark = document.createElement('div');
                const angle = (i / 6) * 360;
                const dist = 40 + Math.random() * 20;
                spark.style.cssText = `
                    position: absolute;
                    width: 4px; height: 4px;
                    border-radius: 50%;
                    background: ${['#3b82f6', '#8b5cf6', '#d946ef'][i % 3]};
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                    animation: starBurst 0.5s ease-out ${i * 0.05}s forwards;
                    z-index: 20;
                `;
                plusBtn.style.position = 'relative';
                plusBtn.style.overflow = 'visible';
                plusBtn.appendChild(spark);
                setTimeout(() => spark.remove(), 700);
            }
        });
    }

    /* ──────────────────────────────────────────────────────
       10. PATCH openPreviewModal to trigger badge update
    ─────────────────────────────────────────────────────── */
    function patchPreviewModal() {
        const originalOpen = window.openPreviewModal;
        if (typeof originalOpen !== 'function') return;
        window.openPreviewModal = function (file, ext) {
            window.updatePreviewBadge(ext);
            originalOpen(file, ext);
        };
    }

    /* ──────────────────────────────────────────────────────
       11. PATCH loading overlay to start text cycle
    ─────────────────────────────────────────────────────── */
    function patchLoadingOverlay() {
        const original = window.handleNewFileSelect;
        if (typeof original !== 'function') return;
        window.handleNewFileSelect = function (event) {
            window.startLoadingTextCycle();
            original(event);
        };
    }

    /* ──────────────────────────────────────────────────────
       12. PATCH showToast in my-projects-v2 success
           to also show the full success screen
    ─────────────────────────────────────────────────────── */
    function patchUploadSuccess() {
        const original = window.uploadProjectToFirebase;
        if (typeof original !== 'function') return;
        // We override by wrapping the then() chain externally
        // The success overlay is shown from renderMyProjects patch
    }

    /* ──────────────────────────────────────────────────────
       INIT
    ─────────────────────────────────────────────────────── */
    function init() {
        initHeaderAnimations();
        initMouseGlow();

        // Small delay to ensure DOM is ready and other scripts have loaded
        setTimeout(() => {
            initPlusButtonSpark();
            patchPreviewModal();
            patchLoadingOverlay();
        }, 500);

        // Observe for new product cards and stagger them
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length > 0) {
                    const gridIds = ['product-display-grid', 'my-personal-projects-grid'];
                    gridIds.forEach(id => {
                        const grid = document.getElementById(id);
                        if (grid && mutation.target === grid) {
                            setTimeout(() => window.staggerCards(id), 50);
                        }
                    });
                }
            });
        });

        const grids = ['product-display-grid', 'my-personal-projects-grid'];
        grids.forEach(id => {
            const el = document.getElementById(id);
            if (el) observer.observe(el, { childList: true });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
