// --- my-projects-v2.js (FINAL — No Firebase Storage, No Index Required) ---

let currentSelectedFile = null;
let currentThumbnailFile = null;

function compressToBase64(file, maxWidth, quality) {
    maxWidth = maxWidth || 600;
    quality = quality || 0.8;
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var w = img.width, h = img.height;
                if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
                canvas.width = w; canvas.height = h;
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

function handleNewFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'sb3' && ext !== 'pdf') { showToast("Lỗi: Chỉ hỗ trợ file .sb3 và .pdf!"); return; }
    currentSelectedFile = file;
    window._tc3ProjFile = file;
    const loadingOverlay = document.getElementById('upload-loading-overlay');
    if (loadingOverlay) { loadingOverlay.classList.remove('hidden'); loadingOverlay.style.display = 'flex'; }
    if (typeof window.startLoadingTextCycle === 'function') window.startLoadingTextCycle();
    let t = (file.size / (1024 * 1024)) * 500;
    if (t < 1500) t = 1500;
    if (t > 5000) t = 5000;
    setTimeout(() => {
        if (loadingOverlay) { loadingOverlay.classList.add('hidden'); loadingOverlay.style.display = 'none'; }
        if (typeof window.stopLoadingTextCycle === 'function') window.stopLoadingTextCycle();
        openPreviewModal(file, ext);
    }, t);
}

function openPreviewModal(file, ext) {
    const modal = document.getElementById('preview-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    const cu = JSON.parse(localStorage.getItem('currentUser'));
    const authorEl = document.getElementById('preview-author');
    if (authorEl) authorEl.value = cu ? (cu.username || cu.displayName || 'TC3 Member') : 'Khách';
    const fileNameEl = document.getElementById('preview-file-name');
    if (fileNameEl) fileNameEl.textContent = file.name;
    const nameEl = document.getElementById('preview-name');
    if (nameEl) nameEl.value = file.name.replace('.' + ext, '');
    const thumbEl = document.getElementById('preview-thumbnail');
    if (thumbEl) thumbEl.src = 'https://via.placeholder.com/300x200?text=Chua+co+anh';
    currentThumbnailFile = null;
    window._tc3ThumbFile = null;
    const dc = document.getElementById('demo-container');
    if (dc) {
        if (ext === 'pdf') {
            dc.innerHTML = '<iframe src="' + URL.createObjectURL(file) + '" style="width:100%;height:100%;border:none;border-radius:12px;background:white;"></iframe>';
        } else {
            dc.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;height:100%;gap:1.2rem;padding:2rem;"><div style="width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg,rgba(255,140,0,0.15),rgba(255,80,0,0.08));border:2px solid rgba(255,140,0,0.3);display:flex;align-items:center;justify-content:center;"><svg width="52" height="52" viewBox="0 0 100 100"><circle cx="50" cy="45" r="28" fill="rgba(255,140,0,0.7)"/><ellipse cx="50" cy="72" rx="22" ry="14" fill="rgba(255,140,0,0.7)"/><polygon points="28,28 20,10 38,22" fill="rgba(255,140,0,0.7)"/><polygon points="72,28 80,10 62,22" fill="rgba(255,140,0,0.7)"/><ellipse cx="42" cy="43" rx="5" ry="6" fill="white"/><ellipse cx="58" cy="43" rx="5" ry="6" fill="white"/><circle cx="43" cy="44" r="3" fill="#1a1a2e"/><circle cx="59" cy="44" r="3" fill="#1a1a2e"/><path d="M 42 55 Q 50 62 58 55" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg></div><h3 style="font-size:1.2rem;font-weight:800;background:linear-gradient(135deg,#fbbf24,#f97316);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">Scratch Project Loaded ✓</h3><p style="color:rgba(255,255,255,0.4);font-size:0.78rem;max-width:260px;line-height:1.6;">File <strong style="color:rgba(255,255,255,0.6)">' + file.name + '</strong> đã được nhận diện.<br>Demo sẽ hiển thị sau khi xuất bản.</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;"><span style="background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.25);border-radius:50px;padding:4px 12px;font-size:11px;color:#93c5fd;font-weight:600;">.SB3</span><span style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:50px;padding:4px 12px;font-size:11px;color:#86efac;font-weight:600;">✓ Hợp lệ</span><span style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.2);border-radius:50px;padding:4px 12px;font-size:11px;color:#fcd34d;font-weight:600;">' + (file.size/1024).toFixed(1) + ' KB</span></div></div>';
        }
    }
}

function closePreviewModal() {
    const modal = document.getElementById('preview-modal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
    currentSelectedFile = null; currentThumbnailFile = null;
    window._tc3ProjFile = null; window._tc3ThumbFile = null;
}

function handleThumbnailSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    currentThumbnailFile = file;
    window._tc3ThumbFile = file;
    const thumbEl = document.getElementById('preview-thumbnail');
    if (thumbEl) thumbEl.src = URL.createObjectURL(file);
    console.log('[TC3] Thumbnail ready:', file.name);
}

function uploadProjectToFirebase() {
    const user = (typeof auth !== 'undefined') ? auth.currentUser : null;
    if (!user) { showToast("Vui lòng đăng nhập lại!"); return; }
    const nameEl = document.getElementById('preview-name');
    const name = nameEl ? nameEl.value.trim() : '';
    if (!name) { showToast("Bạn chưa nhập tên sản phẩm!"); return; }
    const projFile = currentSelectedFile || window._tc3ProjFile;
    const thumbFile = currentThumbnailFile || window._tc3ThumbFile;
    if (!projFile) { showToast("Không tìm thấy file dự án!"); return; }
    if (!thumbFile) { showToast("Vui lòng tải lên 1 ảnh minh họa!"); return; }
    const btn = document.querySelector('.upload-btn-main');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:8px"></i>Đang xử lý...'; }
    showToast("Đang nén ảnh và lưu dữ liệu...");
    const ext = projFile.name.split('.').pop().toLowerCase();
    const cu = JSON.parse(localStorage.getItem('currentUser')) || {};
    compressToBase64(thumbFile, 600, 0.8)
        .then((b64) => {
            const kb = Math.round(b64.length * 0.75 / 1024);
            return kb > 800 ? compressToBase64(thumbFile, 380, 0.55) : b64;
        })
        .then((b64) => db.collection('projects').add({
            name: name,
            desc: 'Dự án tải lên từ TC3 TECH-HUB',
            author: user.displayName || cu.username || 'TC3 Member',
            authorId: user.uid,
            tech: ext === 'sb3' ? 'Scratch' : 'PDF',
            fileType: ext,
            fileName: projFile.name,
            fileSize: (projFile.size / 1024).toFixed(1) + ' KB',
            fileUrl: '',
            image: b64,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            category: 'Cộng đồng'
        }))
        .then(() => {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up" style="margin-right:8px"></i>Xuất bản lên TC3'; }
            if (typeof window.showUploadSuccessScreen === 'function') window.showUploadSuccessScreen();
            else showToast("Tải sản phẩm thành công!");
            closePreviewModal();
            setTimeout(() => {
                if (typeof renderMyProjects === 'function') renderMyProjects();
                if (typeof renderProducts === 'function') renderProducts();
            }, 400);
        })
        .catch((err) => {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up" style="margin-right:8px"></i>Xuất bản lên TC3'; }
            showToast("Lỗi: " + err.message);
        });
}

// ✅ NO .orderBy() here — sorted in JavaScript below instead
// This means ZERO Firestore index needed — works on free plan forever
function renderMyProjects() {
    const user = (typeof auth !== 'undefined') ? auth.currentUser : null;
    if (!user) return;
    const grid = document.getElementById('my-personal-projects-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="col-span-full text-center text-slate-500 py-10"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2 block"></i>Đang tải dữ liệu...</div>';

    db.collection('projects')
        .where('authorId', '==', user.uid)
        .get()
        .then((snap) => {
            const items = [];
            snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
            items.sort((a, b) => {
                const at = a.createdAt ? a.createdAt.toDate().getTime() : 0;
                const bt = b.createdAt ? b.createdAt.toDate().getTime() : 0;
                return bt - at;
            });
            grid.innerHTML = '';
            if (items.length === 0) {
                grid.innerHTML = '<div class="col-span-full text-center text-slate-500 py-10 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">Bạn chưa có sản phẩm nào. Hãy nhấn dấu cộng ở trên để bắt đầu!</div>';
                return;
            }
            items.forEach((p) => {
                const date = p.createdAt ? new Date(p.createdAt.toDate()).toLocaleDateString('vi-VN') : '';
                grid.innerHTML += `
                    <div class="product-card">
                        <div class="h-40 w-full mb-4 rounded-xl overflow-hidden relative group">
                            <img src="${p.image || 'https://via.placeholder.com/300'}"
                                 class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                 alt="${p.name}" onerror="this.src='https://via.placeholder.com/300'">
                            <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span class="bg-blue-600/80 text-white px-4 py-2 rounded-full font-bold text-xs backdrop-blur-sm">${p.tech || 'File'}</span>
                            </div>
                        </div>
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="text-base font-bold text-white truncate w-3/4">${p.name}</h3>
                            <span class="text-xs font-semibold px-2 py-1 rounded-lg bg-blue-900/40 text-blue-300 border border-blue-500/20">${p.tech || ''}</span>
                        </div>
                        <p class="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <i class="fa-regular fa-clock text-blue-400/40"></i>
                            ${date}${p.fileSize ? ' · ' + p.fileSize : ''}
                        </p>
                    </div>`;
            });
        })
        .catch((err) => {
            grid.innerHTML = `<div class="col-span-full text-red-400 text-center py-8">Không thể tải dữ liệu.<br><small class="text-slate-600">${err.message}</small></div>`;
        });
}