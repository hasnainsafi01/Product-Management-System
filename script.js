document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('productForm');
    const adminProductsGrid = document.getElementById('adminProductsGrid');
    const imageInput = document.getElementById('adminProductImages');
    const formTitle = document.getElementById('formTitle');
    const adminSubmitBtn = document.getElementById('adminSubmitBtn');

    let adminProducts = [];
    let editingId = null;

    const readImages = (files) => {
        return new Promise((resolve) => {
            const promises = [];
            const maxFiles = Math.min(files.length, 3);
            for (let i = 0; i < maxFiles; i++) {
                promises.push(new Promise((res) => {
                    const reader = new FileReader();
                    reader.onload = (e) => res(e.target.result);
                    reader.readAsDataURL(files[i]);
                }));
            }
            Promise.all(promises).then(resolve);
        });
    };

    // Event delegation for Edit and Delete buttons
    adminProductsGrid.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.admin-card-edit');
        if (editBtn) {
            const id = parseInt(editBtn.dataset.id);
            const product = adminProducts.find(p => p.id === id);
            if (product) {
                document.getElementById('adminProductName').value = product.name;
                document.getElementById('adminProductDesc').value = product.description;
                
                editingId = id;
                formTitle.textContent = 'Edit Product';
                adminSubmitBtn.textContent = 'Update Product';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
        }

        const deleteBtn = e.target.closest('.admin-card-delete');
        if (deleteBtn) {
            const id = parseInt(deleteBtn.dataset.id);
            adminProducts = adminProducts.filter(p => p.id !== id);
            renderAdminProducts();
            return;
        }

        const addMoreBtn = e.target.closest('.admin-card-add-more');
        if (addMoreBtn) {
            const id = parseInt(addMoreBtn.dataset.id);
            const product = adminProducts.find(p => p.id === id);
            if (product) {
                const tempInput = document.createElement('input');
                tempInput.type = 'file';
                tempInput.accept = 'image/*';
                tempInput.multiple = true;
                
                tempInput.onchange = async (event) => {
                    const files = event.target.files;
                    if (files.length > 0) {
                        const newImages = await readImages(files);
                        product.images = [...product.images, ...newImages].slice(0, 3);
                        renderAdminProducts();
                    }
                };
                
                tempInput.click();
            }
            return;
        }

        const deleteImageBtn = e.target.closest('.delete-image-btn');
        if (deleteImageBtn) {
            const id = parseInt(deleteImageBtn.dataset.id);
            const idx = parseInt(deleteImageBtn.dataset.idx);
            const product = adminProducts.find(p => p.id === id);
            if (product && product.images.length > 1) {
                product.images.splice(idx, 1);
                renderAdminProducts();
            }
            return;
        }

        // Slider logic
        const prevBtn = e.target.closest('.slider-prev');
        const nextBtn = e.target.closest('.slider-next');
        if (prevBtn || nextBtn) {
            const cardImage = e.target.closest('.admin-card-image');
            const track = cardImage.querySelector('.slider-track');
            const counter = cardImage.querySelector('.slider-counter');
            let index = parseInt(track.dataset.index);
            const count = parseInt(track.dataset.count);

            if (prevBtn) {
                index = (index - 1 + count) % count;
            } else {
                index = (index + 1) % count;
            }

            track.dataset.index = index;
            track.style.transform = `translateX(-${index * 100}%)`;
            if (counter) counter.textContent = `${index + 1} / ${count}`;
        }
    });

    // Auto-slide logic
    setInterval(() => {
        const tracks = document.querySelectorAll('.slider-track');
        tracks.forEach(track => {
            const count = parseInt(track.dataset.count);
            if (count > 1) {
                let index = parseInt(track.dataset.index);
                index = (index + 1) % count;
                track.dataset.index = index;
                track.style.transform = `translateX(-${index * 100}%)`;
                
                const cardImage = track.closest('.admin-card-image');
                const counter = cardImage.querySelector('.slider-counter');
                if (counter) counter.textContent = `${index + 1} / ${count}`;
            }
        });
    }, 3000);

    const renderAdminProducts = () => {
        adminProductsGrid.innerHTML = '';
        adminProducts.forEach(product => {
            const card = document.createElement('div');
            card.className = 'admin-product-card';
            
            let imageHtml = '';
            if (product.images && product.images.length > 0) {
                const showDeleteBtn = product.images.length > 1;
                const imagesStr = product.images.map((img, idx) => `
                    <div class="slider-image-wrapper">
                        ${showDeleteBtn ? `<button type="button" class="delete-image-btn" data-id="${product.id}" data-idx="${idx}" title="Remove Image">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>` : ''}
                        <img src="${img}" alt="${product.name}">
                    </div>
                `).join('');
                imageHtml = `<div class="slider-track" data-index="0" data-count="${product.images.length}">${imagesStr}</div>`;
                
                if(product.images.length > 1) {
                    imageHtml += `
                        <button type="button" class="slider-prev">&#10094;</button>
                        <button type="button" class="slider-next">&#10095;</button>
                        <div class="slider-counter" style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); color: #fff; font-size: 11px; padding: 4px 8px; border-radius: 12px; font-weight: 600;">1 / ${product.images.length}</div>
                    `;
                }
            } else {
                imageHtml = `<div style="color:var(--text-gray); font-size:13px; font-weight:500;">No Image Provided</div>`;
            }

            card.innerHTML = `
                <button type="button" class="admin-card-edit" data-id="${product.id}" title="Edit Product">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <div class="admin-card-image">
                    ${imageHtml}
                </div>
                <div class="admin-card-details">
                    <h4>${product.name}</h4>
                    <p>${product.description}</p>
                    <div class="admin-card-controls">
                        <button type="button" class="admin-card-delete" data-id="${product.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Delete
                        </button>
                        <button type="button" class="admin-card-add-more" data-id="${product.id}" title="Add more variants">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                    </div>
                </div>
            `;
            adminProductsGrid.appendChild(card);
        });
    };

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Change button state to Uploading
        adminSubmitBtn.textContent = 'Uploading...';
        adminSubmitBtn.disabled = true;
        adminSubmitBtn.style.opacity = '0.7';
        adminSubmitBtn.style.cursor = 'not-allowed';

        setTimeout(async () => {
            const name = document.getElementById('adminProductName').value;
            const description = document.getElementById('adminProductDesc').value;
            const files = imageInput.files;

            let images = [];
            if (files.length > 0) {
                images = await readImages(files);
            }

            if (editingId !== null) {
                const index = adminProducts.findIndex(p => p.id === editingId);
                if (index !== -1) {
                    adminProducts[index].name = name;
                    adminProducts[index].description = description;
                    if (images.length > 0) {
                        adminProducts[index].images = images;
                    }
                }
                editingId = null;
                formTitle.textContent = 'Add New Product';
            } else {
                const newProduct = {
                    id: Date.now(),
                    name,
                    description,
                    images
                };
                adminProducts.push(newProduct);
            }

            renderAdminProducts();
            productForm.reset();

            // Restore button state
            adminSubmitBtn.textContent = 'Add New Product';
            adminSubmitBtn.disabled = false;
            adminSubmitBtn.style.opacity = '1';
            adminSubmitBtn.style.cursor = 'pointer';
        }, 2000);
    });
});
