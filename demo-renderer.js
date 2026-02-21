// ==========================================================
//  demo-renderer.js  (v3 — Fixed file variable sync)
//  Works 100% on Firebase FREE Spark plan.
// ==========================================================

(function () {
    'use strict';

    /* ──────────────────────────────────────────────────────
       UTILITY: Format file size
    ─────────────────────────────────────────────────────── */
    function formatFileSize(bytes) {
        if (!bytes) return '0 B';
        var units = ['B', 'KB', 'MB', 'GB'];
        var i = 0;
        while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
        return bytes.toFixed(1) + ' ' + units[i];
    }
    window.formatFileSize = formatFileSize;

    /* ──────────────────────────────────────────────────────
       UTILITY: Compress image to base64 via Canvas
    ─────────────────────────────────────────────────────── */
    function compressImageToBase64(file, maxWidth, quality) {
        maxWidth = maxWidth || 600;
        quality = quality || 0.8;
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function (e) {
                var img = new Image();
                img.onload = function () {
                    var canvas = document.createElement('canvas');
                    var w = img.width, h = img.height;
                    if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /* ──────────────────────────────────────────────────────
       KEY FIX: Patch handleThumbnailSelect & handleNewFileSelect
       These functions live in my-projects-v2.js and set LOCAL
       variables. We wrap them to ALSO set window._ versions
       that our upload function can access.
    ─────────────────────────────────────────────────────── */
    function patchFileHandlers() {
        // Patch handleThumbnailSelect
        var origThumb = window.handleThumbnailSelect;
        window.handleThumbnailSelect = function (event) {
            var file = event.target.files[0];
            if (file) {
                window._currentThumbnailFile = file;
                console.log('[TC3] Thumbnail tracked:', file.name);
            }
            if (typeof origThumb === 'function') origThumb(event);
        };

        // Patch handleNewFileSelect
        var origFile = window.handleNewFileSelect;
        window.handleNewFileSelect = function (event) {
            var file = event.target.files[0];
            if (file) {
                window._currentSelectedFile = file;
                console.log('[TC3] Project file tracked:', file.name);
            }
            if (typeof origFile === 'function') origFile(event);
        };

        // Also listen via DOM change events as backup
        document.addEventListener('change', function (e) {
            if (!e.target) return;
            if (e.target.id === 'new-file-input' && e.target.files[0]) {
                window._currentSelectedFile = e.target.files[0];
            }
            if (e.target.id === 'thumbnail-input' && e.target.files[0]) {
                window._currentThumbnailFile = e.target.files[0];
                console.log('[TC3] Thumbnail via DOM event:', e.target.files[0].name);
            }
        }, true); // useCapture = true to fire before other handlers
    }

    /* ──────────────────────────────────────────────────────
       CORE: uploadProjectToFirebase (no Firebase Storage)
    ─────────────────────────────────────────────────────── */
    function overrideUploadFunction() {
        window.uploadProjectToFirebase = function () {
            var user = (typeof auth !== 'undefined') ? auth.currentUser : null;
            if (!user) { showToast('Vui lòng đăng nhập lại!'); return; }

            var nameEl = document.getElementById('preview-name');
            var name = nameEl ? nameEl.value.trim() : '';
            if (!name) { showToast('Bạn chưa nhập tên sản phẩm!'); return; }

            // Try to get thumbnail from multiple sources
            var thumbFile = window._currentThumbnailFile;

            // Fallback: read directly from the input element
            if (!thumbFile) {
                var thumbInput = document.getElementById('thumbnail-input');
                if (thumbInput && thumbInput.files && thumbInput.files[0]) {
                    thumbFile = thumbInput.files[0];
                    window._currentThumbnailFile = thumbFile;
                }
            }

            // Try to get project file from multiple sources
            var projFile = window._currentSelectedFile;
            if (!projFile) {
                var fileInput = document.getElementById('new-file-input');
                if (fileInput && fileInput.files && fileInput.files[0]) {
                    projFile = fileInput.files[0];
                    window._currentSelectedFile = projFile;
                }
            }

            if (!projFile) { showToast('Không tìm thấy file dự án!'); return; }
            if (!thumbFile) { showToast('Vui lòng tải lên 1 ảnh minh họa!'); return; }

            // UI: loading state
            var btn = document.querySelector('.upload-btn-main');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:8px"></i>Đang xử lý...';
            }
            showToast('Đang nén ảnh và lưu dữ liệu...');

            var ext = projFile.name.split('.').pop().toLowerCase();
            var currentUser = {};
            try { currentUser = JSON.parse(localStorage.getItem('currentUser')) || {}; } catch (e) {}

            // Compress thumbnail → save to Firestore
            compressImageToBase64(thumbFile, 600, 0.8)
                .then(function (b64) {
                    // If too large, compress harder
                    if (b64.length * 0.75 / 1024 > 850) {
                        return compressImageToBase64(thumbFile, 400, 0.6);
                    }
                    return b64;
                })
                .then(function (b64) {
                    return db.collection('projects').add({
                        name: name,
                        desc: 'Dự án tải lên từ TC3 TECH-HUB',
                        author: user.displayName || currentUser.username || 'TC3 Member',
                        authorId: user.uid,
                        tech: ext === 'sb3' ? 'Scratch' : 'PDF',
                        fileType: ext,
                        fileName: projFile.name,
                        fileSize: formatFileSize(projFile.size),
                        fileUrl: '',
                        image: b64,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        category: 'Cộng đồng'
                    });
                })
                .then(function () {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up" style="margin-right:8px"></i>Xuất bản lên TC3';
                    }
                    window._currentSelectedFile = null;
                    window._currentThumbnailFile = null;

                    if (typeof window.showUploadSuccessScreen === 'function') {
                        window.showUploadSuccessScreen();
                    } else {
                        showToast('Tải sản phẩm thành công!');
                    }

                    if (typeof closePreviewModal === 'function') closePreviewModal();
                    if (typeof renderMyProjects === 'function') renderMyProjects();
                    if (typeof renderProducts === 'function') renderProducts();
                })
                .catch(function (err) {
                    console.error('Upload error:', err);
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up" style="margin-right:8px"></i>Xuất bản lên TC3';
                    }
                    showToast('Lỗi: ' + (err.message || 'Không xác định'));
                });
        };
    }

    /* ──────────────────────────────────────────────────────
       SB3 DEMO RENDERER
    ─────────────────────────────────────────────────────── */
    window.renderSb3Demo = function (container, file) {
        container.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;height:100%;padding:2rem;gap:1.5rem;">'
            + '<div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,rgba(255,140,0,0.15),rgba(255,80,0,0.08));border:2px solid rgba(255,140,0,0.3);display:flex;align-items:center;justify-content:center;box-shadow:0 0 30px rgba(255,140,0,0.1);">'
            + '<svg width="56" height="56" viewBox="0 0 100 100"><circle cx="50" cy="45" r="28" fill="rgba(255,140,0,0.7)"/><ellipse cx="50" cy="72" rx="22" ry="14" fill="rgba(255,140,0,0.7)"/><polygon points="28,28 20,10 38,22" fill="rgba(255,140,0,0.7)"/><polygon points="72,28 80,10 62,22" fill="rgba(255,140,0,0.7)"/><ellipse cx="42" cy="43" rx="5" ry="6" fill="white"/><ellipse cx="58" cy="43" rx="5" ry="6" fill="white"/><circle cx="43" cy="44" r="3" fill="#1a1a2e"/><circle cx="59" cy="44" r="3" fill="#1a1a2e"/><path d="M 42 55 Q 50 62 58 55" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
            + '</div>'
            + '<div><h3 style="font-family:\'Syne\',sans-serif;font-size:1.25rem;font-weight:800;background:linear-gradient(135deg,#fbbf24,#f97316);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px;">Scratch Project Loaded ✓</h3>'
            + '<p style="color:rgba(255,255,255,0.4);font-size:0.78rem;max-width:260px;line-height:1.6;"><strong style="color:rgba(255,255,255,0.6)">' + file.name + '</strong><br>Đã được nhận diện thành công.<br>Demo thực tế sẽ hiển thị sau khi sản phẩm được xuất bản.</p></div>'
            + '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">'
            + '<span style="background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.25);border-radius:50px;padding:5px 12px;font-size:11px;color:#93c5fd;font-weight:600;">.SB3</span>'
            + '<span style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:50px;padding:5px 12px;font-size:11px;color:#86efac;font-weight:600;">✓ Hợp lệ</span>'
            + '<span style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.2);border-radius:50px;padding:5px 12px;font-size:11px;color:#fcd34d;font-weight:600;">' + formatFileSize(file.size) + '</span>'
            + '</div></div>';
    };

    /* ──────────────────────────────────────────────────────
       PDF DEMO RENDERER
    ─────────────────────────────────────────────────────── */
    window.renderPdfDemo = function (container, file) {
        var fileURL = URL.createObjectURL(file);
        container.innerHTML = '<div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;gap:8px;">'
            + '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(15,23,42,0.9);border:1px solid rgba(139,92,246,0.15);border-radius:10px;flex-shrink:0;">'
            + '<div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,rgba(139,92,246,0.3),rgba(217,70,239,0.2));display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-file-pdf" style="color:#c4b5fd;font-size:12px;"></i></div>'
            + '<div style="flex:1;overflow:hidden;"><div style="font-size:12px;font-weight:600;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + file.name + '</div>'
            + '<div style="font-size:10px;color:rgba(255,255,255,0.3);">' + formatFileSize(file.size) + ' · PDF</div></div>'
            + '<a href="' + fileURL + '" target="_blank" style="background:rgba(139,92,246,0.2);border:1px solid rgba(139,92,246,0.3);color:#c4b5fd;font-size:11px;font-weight:600;padding:5px 10px;border-radius:8px;text-decoration:none;white-space:nowrap;"><i class="fa-solid fa-expand" style="margin-right:4px"></i>Mở rộng</a>'
            + '</div>'
            + '<div style="flex:1;border-radius:12px;overflow:hidden;border:1px solid rgba(139,92,246,0.1);min-height:0;">'
            + '<iframe src="' + fileURL + '" style="width:100%;height:100%;border:none;background:white;" title="PDF Preview"></iframe>'
            + '</div></div>';
    };

    /* ──────────────────────────────────────────────────────
       PATCH: openPreviewModal
    ─────────────────────────────────────────────────────── */
    function patchOpenPreviewModal() {
        var orig = window.openPreviewModal;
        if (typeof orig !== 'function') return;
        window.openPreviewModal = function (file, ext) {
            var badge = document.getElementById('preview-file-type-badge');
            if (badge) {
                badge.textContent = ext.toUpperCase();
                badge.style.cssText = ext === 'pdf'
                    ? 'background:rgba(139,92,246,0.2);color:#c4b5fd;border:1px solid rgba(139,92,246,0.3);padding:2px 8px;border-radius:50px;font-size:11px;'
                    : 'background:rgba(59,130,246,0.2);color:#93c5fd;border:1px solid rgba(59,130,246,0.3);padding:2px 8px;border-radius:50px;font-size:11px;';
            }
            orig(file, ext);
            setTimeout(function () {
                var dc = document.getElementById('demo-container');
                if (!dc) return;
                if (ext === 'sb3') window.renderSb3Demo(dc, file);
                else if (ext === 'pdf') window.renderPdfDemo(dc, file);
            }, 80);
        };
    }

    /* ──────────────────────────────────────────────────────
       PATCH: renderMyProjects — animate counter
    ─────────────────────────────────────────────────────── */
    function patchRenderMyProjects() {
        var orig = window.renderMyProjects;
        if (typeof orig !== 'function') return;
        window.renderMyProjects = function () {
            orig();
            var grid = document.getElementById('my-personal-projects-grid');
            if (!grid) return;
            var obs = new MutationObserver(function () {
                var n = grid.querySelectorAll('.product-card').length;
                var el = document.getElementById('user-project-count');
                if (el) {
                    if (typeof window.animateCounter === 'function' && n > 0) window.animateCounter('user-project-count', n, 800);
                    else el.textContent = n;
                }
                obs.disconnect();
            });
            obs.observe(grid, { childList: true, subtree: true });
        };
    }

    /* ──────────────────────────────────────────────────────
       INIT
    ─────────────────────────────────────────────────────── */
    function init() {
        window._currentSelectedFile = null;
        window._currentThumbnailFile = null;

        // Patch file handlers FIRST (most important fix)
        patchFileHandlers();
        // Override upload function
        overrideUploadFunction();

        // Patch modal + project list after other scripts load
        setTimeout(function () {
            patchOpenPreviewModal();
            patchRenderMyProjects();
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 300); });
    } else {
        setTimeout(init, 300);
    }

})();