function finalizeUpload() {
    const user = auth.currentUser;
    if (!user) { alert("Bạn cần đăng nhập!"); return; }

    const name = document.getElementById('up-prod-name').value;
    const desc = document.getElementById('up-desc').value;
    
    // File code và File ảnh (Lấy từ input thực tế thay vì FileReader)
    const codeFile = document.getElementById('main-file-input').files[0];
    const imgFile = document.getElementById('demo-img-input').files[0];

    if (!name || !codeFile) { alert("Thiếu tên hoặc file code!"); return; }

    // 1. Upload File lên Firebase Storage
    const storageRef = storage.ref();
    const codeRef = storageRef.child(`projects/${user.uid}/${Date.now()}_${codeFile.name}`);
    
    showToast("Đang tải file lên máy chủ...");

    codeRef.put(codeFile).then((snapshot) => {
        return snapshot.ref.getDownloadURL();
    }).then((codeUrl) => {
        // Nếu có ảnh thì upload ảnh, không thì dùng ảnh mặc định
        if (imgFile) {
            const imgRef = storageRef.child(`images/${user.uid}/${Date.now()}_${imgFile.name}`);
            return imgRef.put(imgFile).then(s => s.ref.getDownloadURL()).then(imgUrl => ({ codeUrl, imgUrl }));
        } else {
            return { codeUrl, imgUrl: 'https://via.placeholder.com/300' };
        }
    }).then((urls) => {
        // 2. Lưu thông tin vào Firestore Database
        return db.collection('projects').add({
            name: name,
            desc: desc,
            author: user.displayName,
            authorId: user.uid,
            tech: codeFile.name.split('.').pop().toUpperCase(), // Lấy đuôi file làm tech
            fileUrl: urls.codeUrl,
            image: urls.imgUrl,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            category: "Cộng đồng"
        });
    }).then(() => {
        showToast("Đăng dự án thành công!");
        closeUploadModal();
        renderProducts(); // Tải lại danh sách
    }).catch((error) => {
        console.error(error);
        alert("Lỗi khi tải lên: " + error.message);
    });
}
