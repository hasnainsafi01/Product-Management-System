// ─── Firebase SDK (CDN modules) ────────────────────────────────────────────
import { initializeApp }        from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
    getFirestore, collection, addDoc, getDocs,
    updateDoc, deleteDoc, doc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
    getStorage, ref, uploadString, getDownloadURL, deleteObject
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

// ─── Firebase Config ────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey:            "AIzaSyB51QUy-6JfhsIBAIET2wQxTc9Yp1RXekY",
    authDomain:        "portfolio-8f1ca.firebaseapp.com",
    projectId:         "portfolio-8f1ca",
    storageBucket:     "portfolio-8f1ca.firebasestorage.app",
    messagingSenderId: "261283936769",
    appId:             "1:261283936769:web:ce65b52a9dbc1df0f6de00"
};

const app     = initializeApp(firebaseConfig);
const db      = getFirestore(app);
const storage = getStorage(app);
console.log("Firebase Initialized!");

// Global error catcher for debugging
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Global Error:', msg, url, lineNo, columnNo, error);
    alert('A system error occurred: ' + msg);
    return false;
};
window.onunhandledrejection = function(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
    alert('Connection error: ' + (event.reason.message || event.reason));
};

// ─── App Logic ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Main Form
    const productForm      = document.getElementById('productForm');
    const adminProductsGrid = document.getElementById('adminProductsGrid');
    const imageInput       = document.getElementById('adminProductImages');
    const adminSubmitBtn   = document.getElementById('adminSubmitBtn');

    // Edit Modal Elements
    const editModal        = document.getElementById('editModal');
    const editProductForm  = document.getElementById('editProductForm');
    const modalCloseBtn    = document.getElementById('modalCloseBtn');
    const modalCancelBtn   = document.getElementById('modalCancelBtn');
    const modalSubmitBtn   = document.getElementById('modalSubmitBtn');

    // Delete Modal Elements
    const deleteModal      = document.getElementById('deleteModal');
    const deleteCancelBtn  = document.getElementById('deleteCancelBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    let adminProducts = [];
    let productToDeleteId = null;

    // ── Helpers ──────────────────────────────────────────────────────────────

    const readImages = (files) => new Promise((resolve, reject) => {
        const promises = [];
        const max = Math.min(files.length, 3);
        for (let i = 0; i < max; i++) {
            const file = files[i];
            // Warn if file is > 2MB
            if (file.size > 2 * 1024 * 1024) {
                console.warn(`File ${file.name} is quite large (${(file.size/1024/1024).toFixed(2)}MB). Upload might be slow.`);
            }
            promises.push(new Promise((res) => {
                const reader = new FileReader();
                reader.onload = (e) => res(e.target.result);
                reader.onerror = (err) => reject(new Error(`Failed to read file ${file.name}`));
                reader.readAsDataURL(file);
            }));
        }
        Promise.all(promises).then(resolve).catch(reject);
    });

    const uploadImages = async (base64Images, prefix) => {
        console.log("Starting image upload for", base64Images.length, "images...");
        const urls = [], paths = [];
        
        for (let i = 0; i < base64Images.length; i++) {
            try {
                const path = `products/${prefix}_${i}_${Date.now()}`;
                const storageRef = ref(storage, path);
                
                console.log(`Uploading image ${i+1}/${base64Images.length} to ${path}...`);
                
                // Add a timeout promise to prevent hanging
                const uploadPromise = uploadString(storageRef, base64Images[i], 'data_url');
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Upload timed out (15s). Check your internet or Firebase Storage rules.")), 15000)
                );

                await Promise.race([uploadPromise, timeoutPromise]);
                
                const url = await getDownloadURL(storageRef);
                urls.push(url);
                paths.push(path);
                console.log(`Image ${i+1} uploaded successfully.`);
            } catch (error) {
                console.error(`Error uploading image ${i+1}:`, error);
                throw error; // Let the main try/catch handle it
            }
        }
        return { urls, paths };
    };

    const deleteStorageImages = async (paths = []) => {
        for (const path of paths) {
            try { await deleteObject(ref(storage, path)); }
            catch (e) { console.warn('Could not delete storage file:', path); }
        }
    };

    const toggleBtnLoading = (btn, isLoading, originalText) => {
        if (isLoading) {
            btn.textContent = 'Processing...';
            btn.disabled    = true;
            btn.style.opacity = '0.7';
        } else {
            btn.textContent = originalText;
            btn.disabled    = false;
            btn.style.opacity = '1';
        }
    };

    const openEditModal = (product) => {
        document.getElementById('modalProductId').value    = product.id;
        document.getElementById('modalProductName').value  = product.name;
        document.getElementById('modalProductDesc').value  = product.description;
        document.getElementById('modalProductPrice').value = product.price || '';
        document.getElementById('modalProductImages').value = '';
        editModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const openDeleteModal = (id) => {
        productToDeleteId = id;
        deleteModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeModals = () => {
        editModal.classList.remove('active');
        deleteModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        productToDeleteId = null;
    };

    // ── Firestore Ops ────────────────────────────────────────────────────────

    const loadProducts = async () => {
        adminProductsGrid.innerHTML = '<div style="color:var(--text-gray);font-size:14px;padding:20px;grid-column:1/-1;text-align:center;">Loading products...</div>';
        try {
            const snap = await getDocs(collection(db, 'products'));
            adminProducts = [];
            snap.forEach((d) => adminProducts.push({ id: d.id, ...d.data() }));
            console.log("Loaded products:", adminProducts.length);
            adminProducts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            renderAdminProducts();
        } catch (err) {
            console.error('Load error:', err);
            adminProductsGrid.innerHTML = '<div style="color:red;font-size:14px;padding:20px;grid-column:1/-1;">⚠️ Failed to load products.</div>';
        }
    };

    const renderAdminProducts = () => {
        adminProductsGrid.innerHTML = '';
        if (adminProducts.length === 0) {
            adminProductsGrid.innerHTML = '<div style="color:var(--text-gray);font-size:14px;padding:40px 20px;text-align:center;grid-column:1/-1;">No products yet.</div>';
            return;
        }

        adminProducts.forEach(product => {
            const card = document.createElement('div');
            card.className = 'admin-product-card';
            const images = product.imageUrls || [];
            let imageHtml = '';

            if (images.length > 0) {
                const showDel = images.length > 1;
                const slides = images.map((img, idx) => `
                    <div class="slider-image-wrapper">
                        ${showDel ? `
                        <button type="button" class="delete-image-btn" data-id="${product.id}" data-idx="${idx}" title="Remove Image">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>` : ''}
                        <img src="${img}" alt="${product.name}">
                    </div>
                `).join('');
                imageHtml = `<div class="slider-track" data-index="0" data-count="${images.length}">${slides}</div>`;
                if (images.length > 1) {
                    imageHtml += `
                        <button type="button" class="slider-prev">&#10094;</button>
                        <button type="button" class="slider-next">&#10095;</button>
                        <div class="slider-counter" style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.7);color:#fff;font-size:11px;padding:4px 8px;border-radius:12px;font-weight:600;">1 / ${images.length}</div>
                    `;
                }
            } else {
                imageHtml = `<div style="color:var(--text-gray);font-size:13px;font-weight:500;">No Image Provided</div>`;
            }

            card.innerHTML = `
                <button type="button" class="admin-card-edit" data-id="${product.id}" title="Edit Product">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <div class="admin-card-image">${imageHtml}</div>
                <div class="admin-card-details">
                    <h4>${product.name}</h4>
                    ${product.price ? `<div class="product-price-badge">PKR ${parseFloat(product.price).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : ''}
                    <p>${product.description}</p>
                    <div class="admin-card-controls">
                        <button type="button" class="admin-card-delete" data-id="${product.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Delete</button>
                        <button type="button" class="admin-card-add-more" data-id="${product.id}" title="Add more images"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                    </div>
                </div>
            `;
            adminProductsGrid.appendChild(card);
        });
    };

    // ── Listeners ────────────────────────────────────────────────────────────

    adminProductsGrid.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.admin-card-edit');
        if (editBtn) {
            const product = adminProducts.find(p => p.id === editBtn.dataset.id);
            if (product) openEditModal(product);
            return;
        }

        const deleteBtn = e.target.closest('.admin-card-delete');
        if (deleteBtn) {
            openDeleteModal(deleteBtn.dataset.id);
            return;
        }

        const addMoreBtn = e.target.closest('.admin-card-add-more');
        if (addMoreBtn) {
            const id = addMoreBtn.dataset.id;
            const product = adminProducts.find(p => p.id === id);
            if (product) {
                const slots = 3 - (product.imageUrls?.length || 0);
                if (slots <= 0) { alert('Max 3 images reached.'); return; }
                const input = document.createElement('input');
                input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
                input.onchange = async (ev) => {
                    const files = ev.target.files;
                    if (!files.length) return;
                    try {
                        const b64 = await readImages(files);
                        const { urls, paths } = await uploadImages(b64.slice(0, slots), id);
                        await updateDoc(doc(db, 'products', id), {
                            imageUrls: [...(product.imageUrls || []), ...urls],
                            imagePaths: [...(product.imagePaths || []), ...paths]
                        });
                        await loadProducts();
                    } catch (err) { console.error(err); }
                };
                input.click();
            }
            return;
        }

        const deleteImgBtn = e.target.closest('.delete-image-btn');
        if (deleteImgBtn) {
            const id = deleteImgBtn.dataset.id;
            const idx = parseInt(deleteImgBtn.dataset.idx);
            const product = adminProducts.find(p => p.id === id);
            if (product && product.imageUrls.length > 1) {
                try {
                    if (product.imagePaths?.[idx]) await deleteStorageImages([product.imagePaths[idx]]);
                    await updateDoc(doc(db, 'products', id), {
                        imageUrls: product.imageUrls.filter((_, i) => i !== idx),
                        imagePaths: (product.imagePaths || []).filter((_, i) => i !== idx)
                    });
                    await loadProducts();
                } catch (err) { console.error(err); }
            }
            return;
        }

        const prevBtn = e.target.closest('.slider-prev');
        const nextBtn = e.target.closest('.slider-next');
        if (prevBtn || nextBtn) {
            const cardImage = e.target.closest('.admin-card-image');
            const track = cardImage.querySelector('.slider-track');
            const counter = cardImage.querySelector('.slider-counter');
            let index = parseInt(track.dataset.index);
            const count = parseInt(track.dataset.count);
            index = prevBtn ? (index - 1 + count) % count : (index + 1) % count;
            track.dataset.index = index;
            track.style.transform = `translateX(-${index * 100}%)`;
            if (counter) counter.textContent = `${index + 1} / ${count}`;
        }
    });

    // Close Modal Events
    modalCloseBtn.onclick = closeModals;
    modalCancelBtn.onclick = closeModals;
    deleteCancelBtn.onclick = closeModals;
    window.onclick = (e) => { 
        if (e.target === editModal || e.target === deleteModal) closeModals(); 
    };

    // Confirm Delete Click
    confirmDeleteBtn.onclick = async () => {
        if (!productToDeleteId) return;
        const product = adminProducts.find(p => p.id === productToDeleteId);
        if (!product) return;

        toggleBtnLoading(confirmDeleteBtn, true);
        try {
            if (product.imagePaths?.length) await deleteStorageImages(product.imagePaths);
            await deleteDoc(doc(db, 'products', productToDeleteId));
            await loadProducts();
            closeModals();
        } catch (err) {
            console.error(err);
            alert('Failed to delete product.');
        } finally {
            toggleBtnLoading(confirmDeleteBtn, false, 'Delete Now');
        }
    };

    // Create New Product
    productForm.onsubmit = async (e) => {
        e.preventDefault();
        toggleBtnLoading(adminSubmitBtn, true);
        try {
            const name = document.getElementById('adminProductName').value.trim();
            const description = document.getElementById('adminProductDesc').value.trim();
            const price = document.getElementById('adminProductPrice').value;
            const files = imageInput.files;

            console.log("Attempting to add product:", { name, price });

            const prefix = `prod_${Date.now()}`;
            let imageUrls = [], imagePaths = [];
            if (files.length > 0) {
                const b64 = await readImages(files);
                ({ urls: imageUrls, paths: imagePaths } = await uploadImages(b64, prefix));
            }

            console.log("Saving to Firestore...");
            await addDoc(collection(db, 'products'), {
                name, description, price, imageUrls, imagePaths, createdAt: Date.now()
            });
            console.log("Product saved successfully!");

            await loadProducts();
            productForm.reset();
        } catch (err) { 
            console.error("Detailed Add Error:", err); 
            alert(`Error saving product: ${err.message}`); 
        }
        finally { toggleBtnLoading(adminSubmitBtn, false, 'Add New Product'); }
    };

    // Update Product via Modal
    editProductForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('modalProductId').value;
        const product = adminProducts.find(p => p.id === id);
        if (!product) return;

        toggleBtnLoading(modalSubmitBtn, true);
        try {
            const name = document.getElementById('modalProductName').value.trim();
            const description = document.getElementById('modalProductDesc').value.trim();
            const price = document.getElementById('modalProductPrice').value;
            const files = document.getElementById('modalProductImages').files;

            const updateData = { name, description, price };
            if (files.length > 0) {
                if (product.imagePaths?.length) await deleteStorageImages(product.imagePaths);
                const b64 = await readImages(files);
                const { urls, paths } = await uploadImages(b64, id);
                updateData.imageUrls = urls;
                updateData.imagePaths = paths;
            }

            await updateDoc(doc(db, 'products', id), updateData);
            await loadProducts();
            closeModals();
        } catch (err) { console.error(err); alert('Error updating product.'); }
        finally { toggleBtnLoading(modalSubmitBtn, false, 'Update Product'); }
    };

    // Auto-slide
    setInterval(() => {
        document.querySelectorAll('.slider-track').forEach(track => {
            const count = parseInt(track.dataset.count);
            if (count > 1) {
                let index = (parseInt(track.dataset.index) + 1) % count;
                track.dataset.index = index;
                track.style.transform = `translateX(-${index * 100}%)`;
                const counter = track.closest('.admin-card-image')?.querySelector('.slider-counter');
                if (counter) counter.textContent = `${index + 1} / ${count}`;
            }
        });
    }, 3500);

    await loadProducts();
});
