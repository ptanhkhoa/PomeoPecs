// State management
let currentLanguage = 'en';
let currentCategory = null;
let uploadedImage = null;
let croppedImageData = null;
let currentSlotIndex = null;
let cards = JSON.parse(localStorage.getItem('pecsCards') || '[]');
let sentencePresets = JSON.parse(localStorage.getItem('pecsSentencePresets') || '[]');
let editingCardId = null;
let selectedCardForEdit = null;

// Initialize default cards if they don't exist
function initializeDefaultCards() {
    const defaultIWantId = 'default-iwant';
    const defaultIDontWantId = 'default-idontwant';
    
    const hasIWant = cards.some(c => c.id === defaultIWantId);
    const hasIDontWant = cards.some(c => c.id === defaultIDontWantId);
    
    if (!hasIWant) {
        const iwantCard = {
            id: defaultIWantId,
            category: 'wants',
            image: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect fill=\'%234CAF50\' width=\'100\' height=\'100\'/%3E%3Ctext x=\'50\' y=\'60\' font-size=\'40\' fill=\'white\' text-anchor=\'middle\'%3EI WANT%3C/text%3E%3C/svg%3E',
            textEn: 'I want',
            textVi: 'Tôi muốn',
            createdAt: new Date().toISOString(),
            isDefault: true
        };
        cards.push(iwantCard);
    }
    
    if (!hasIDontWant) {
        const idontwantCard = {
            id: defaultIDontWantId,
            category: 'wants',
            image: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect fill=\'%23f44336\' width=\'100\' height=\'100\'/%3E%3Ctext x=\'50\' y=\'60\' font-size=\'30\' fill=\'white\' text-anchor=\'middle\'%3EI DON\'T%3C/text%3E%3Ctext x=\'50\' y=\'85\' font-size=\'30\' fill=\'white\' text-anchor=\'middle\'%3EWANT%3C/text%3E%3C/svg%3E',
            textEn: "I don't want",
            textVi: 'Tôi không muốn',
            createdAt: new Date().toISOString(),
            isDefault: true
        };
        cards.push(idontwantCard);
    }
    
    if (!hasIWant || !hasIDontWant) {
        localStorage.setItem('pecsCards', JSON.stringify(cards));
    }
}

// Crop state
let cropState = {
    scale: 1,
    x: 0,
    y: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    image: null,
    viewport: null
};

let editCropState = {
    scale: 1,
    x: 0,
    y: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    image: null,
    viewport: null
};

// Translation dictionary (basic mapping - can be expanded)
const translations = {
    en: {
        'Create Card': 'Create Card',
        'Make Sentence': 'Make Sentence',
        '← Back': '← Back',
        'Upload Image': 'Upload Image',
        'Crop': 'Crop',
        'Save Card': 'Save Card',
        'Save Sentence': 'Save Sentence',
        'Load Sentence': 'Load Sentence',
        'Select Card': 'Select Card',
        'People': 'People',
        'Actions': 'Actions',
        'Food': 'Food',
        'Place': 'Place',
        'Things': 'Things',
        'Animals': 'Animals',
        'Wants': 'Wants',
        'Enter text (English)': 'Enter text (English)'
    },
    vi: {
        'Create Card': 'Tạo Thẻ',
        'Make Sentence': 'Tạo Câu',
        '← Back': '← Quay lại',
        'Upload Image': 'Tải ảnh lên',
        'Crop': 'Cắt',
        'Save Card': 'Lưu thẻ',
        'Save Sentence': 'Lưu câu',
        'Load Sentence': 'Tải câu',
        'Select Card': 'Chọn thẻ',
        'People': 'Người',
        'Actions': 'Hành động',
        'Food': 'Thức ăn',
        'Place': 'Nơi chốn',
        'Things': 'Đồ vật',
        'Animals': 'Động vật',
        'Wants': 'Muốn',
        'Enter text (English)': 'Nhập văn bản (Tiếng Anh)'
    }
};

// Translation API function (using LibreTranslate - free and open source)
async function translateText(text, fromLang = 'en', toLang = 'vi') {
    if (!text || text.trim() === '') return '';
    if (fromLang === toLang) return text;
    
    try {
        // Using LibreTranslate public API (free, no API key required)
        const response = await fetch('https://libretranslate.de/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text,
                source: fromLang,
                target: toLang,
                format: 'text'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.translatedText || text;
        } else {
            // Fallback to simple translation if API fails
            return simpleTranslate(text);
        }
    } catch (error) {
        console.warn('Translation API error, using fallback:', error);
        // Fallback to simple translation
        return simpleTranslate(text);
    }
}

// Simple translation function for common words (fallback)
const simpleTranslate = (text) => {
    if (currentLanguage === 'en') return text;
    
    // Basic word mappings
    const wordMap = {
        'Papa': 'Bố',
        'Mama': 'Mẹ',
        'Teacher': 'Giáo viên',
        'Teacher Assistant': 'Trợ giảng',
        'Drink': 'Uống',
        'Eat': 'Ăn',
        'Open': 'Mở',
        'Watch': 'Xem',
        'Help': 'Giúp',
        'Door': 'Cửa',
        'Window': 'Cửa sổ',
        'Light': 'Đèn',
        'I want': 'Tôi muốn',
        "I don't want": 'Tôi không muốn'
    };
    
    return wordMap[text] || text;
};

// Update UI language
function updateLanguage() {
    const langElements = document.querySelectorAll('[data-en]');
    langElements.forEach(el => {
        const text = el.getAttribute(`data-${currentLanguage}`);
        if (text) {
            if (el.tagName === 'INPUT' && el.hasAttribute('data-placeholder-en')) {
                el.placeholder = el.getAttribute(`data-placeholder-${currentLanguage}`);
            } else {
                el.textContent = text;
            }
        }
    });
    
    // Update flag icons on all screens - show the OTHER language flag (the one you'll switch to)
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.querySelector('.flag').textContent = currentLanguage === 'en' ? '🇻🇳' : '🇬🇧';
    });
    
    // Update sentence slots text
    updateSentenceSlotsText();
}

// Screen navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Language toggles (all screens)
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentLanguage = currentLanguage === 'en' ? 'vi' : 'en';
            updateLanguage();
        });
    });
    
    // Home screen buttons
    document.getElementById('createCardBtn').addEventListener('click', () => {
        showScreen('createCardScreen');
        document.getElementById('categorySelection').classList.remove('hidden');
        document.getElementById('cardForm').classList.add('hidden');
    });
    
    document.getElementById('makeSentenceBtn').addEventListener('click', () => {
        showScreen('makeSentenceScreen');
        initializeSentenceBar();
    });
    
    // Edit Cards button
    document.getElementById('editCardsBtn').addEventListener('click', () => {
        showScreen('editCardsScreen');
        document.getElementById('editCategorySelection').classList.remove('hidden');
        document.getElementById('categoryCardsView').classList.add('hidden');
    });
    
    // Back buttons
    document.getElementById('backFromCreate').addEventListener('click', () => {
        showScreen('homeScreen');
        resetCardForm();
    });
    
    document.getElementById('backFromSentence').addEventListener('click', () => {
        showScreen('homeScreen');
    });
    
    document.getElementById('backFromEdit').addEventListener('click', () => {
        const categoryView = document.getElementById('categoryCardsView');
        if (categoryView.classList.contains('hidden')) {
            showScreen('homeScreen');
        } else {
            categoryView.classList.add('hidden');
            document.getElementById('editCategorySelection').classList.remove('hidden');
        }
    });
    
    // Category selection (for creating)
    document.querySelectorAll('.category-tile:not([data-edit])').forEach(tile => {
        tile.addEventListener('click', () => {
            currentCategory = tile.dataset.category;
            document.getElementById('categorySelection').classList.add('hidden');
            document.getElementById('cardForm').classList.remove('hidden');
            resetCardForm();
        });
    });
    
    // Category selection (for editing)
    document.querySelectorAll('.category-tile[data-edit]').forEach(tile => {
        tile.addEventListener('click', () => {
            const category = tile.dataset.category;
            showCategoryCards(category);
        });
    });
    
    // Initialize default cards
    initializeDefaultCards();
    
    // Image upload
    document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
    
    // Zoom controls
    document.getElementById('zoomInBtn').addEventListener('click', () => adjustZoom(1.2, 'create'));
    document.getElementById('zoomOutBtn').addEventListener('click', () => adjustZoom(0.8, 'create'));
    
    // Crop button
    document.getElementById('cropBtn').addEventListener('click', () => handleCrop('create'));
    
    // Translation checkbox
    document.getElementById('autoTranslateCheck').addEventListener('change', handleTranslationToggle);
    
    // Text input with auto-translation
    document.getElementById('cardText').addEventListener('input', handleTextInput);
    document.getElementById('manualTranslation').addEventListener('input', checkSaveButtonState);
    
    // Edit card image upload
    document.getElementById('editImageUpload').addEventListener('change', handleEditImageUpload);
    document.getElementById('editZoomInBtn').addEventListener('click', () => adjustZoom(1.2, 'edit'));
    document.getElementById('editZoomOutBtn').addEventListener('click', () => adjustZoom(0.8, 'edit'));
    document.getElementById('editCropBtn').addEventListener('click', () => handleCrop('edit'));
    document.getElementById('editAutoTranslateCheck').addEventListener('change', handleEditTranslationToggle);
    document.getElementById('editCardText').addEventListener('input', handleEditTextInput);
    document.getElementById('editManualTranslation').addEventListener('input', () => {});
    document.getElementById('updateCardBtn').addEventListener('click', updateCard);
    
    // Save card
    document.getElementById('saveCardBtn').addEventListener('click', saveCard);
    
    // Sentence building
    document.getElementById('addSlotBefore').addEventListener('click', () => addSentenceSlot(0));
    document.getElementById('addSlotAfter').addEventListener('click', () => addSentenceSlot(1));
    
    // Save/Load sentence
    document.getElementById('saveSentenceBtn').addEventListener('click', saveSentence);
    document.getElementById('loadSentenceBtn').addEventListener('click', showLoadSentenceModal);
    
    // Modal close buttons
    document.getElementById('closeLibrary').addEventListener('click', () => {
        document.getElementById('cardLibraryModal').classList.add('hidden');
        document.getElementById('selectCardBtn').classList.add('hidden');
        document.getElementById('libraryBackBtn').classList.add('hidden');
        document.getElementById('cardLibrary').className = 'card-library';
        currentSlotIndex = null;
        selectedCardForEdit = null;
    });
    
    // Library back button
    document.getElementById('libraryBackBtn').addEventListener('click', () => {
        showCardLibraryCategories();
    });
    
    // Select card button
    document.getElementById('selectCardBtn').addEventListener('click', () => {
        if (selectedCardForEdit) {
            const card = cards.find(c => c.id === selectedCardForEdit);
            if (card) {
                selectCardForSlot(card);
                document.getElementById('cardLibraryModal').classList.add('hidden');
            }
        }
    });
    
    document.getElementById('closeLoadModal').addEventListener('click', () => {
        document.getElementById('loadSentenceModal').classList.add('hidden');
    });
    
    document.getElementById('closeEditModal').addEventListener('click', () => {
        document.getElementById('editCardModal').classList.add('hidden');
        resetEditForm();
    });
    
    });
    
    // Close modals on background click
    document.getElementById('editCardModal').addEventListener('click', (e) => {
        if (e.target.id === 'editCardModal') {
            document.getElementById('editCardModal').classList.add('hidden');
            resetEditForm();
        }
    });
    
    // Close modals on background click
    document.getElementById('cardLibraryModal').addEventListener('click', (e) => {
        if (e.target.id === 'cardLibraryModal') {
            document.getElementById('cardLibraryModal').classList.add('hidden');
            document.getElementById('selectCardBtn').classList.add('hidden');
            document.getElementById('libraryBackBtn').classList.add('hidden');
            document.getElementById('cardLibrary').className = 'card-library';
        }
    });
    
    document.getElementById('loadSentenceModal').addEventListener('click', (e) => {
        if (e.target.id === 'loadSentenceModal') {
            document.getElementById('loadSentenceModal').classList.add('hidden');
        }
    });
    
    updateLanguage();
});

// Image upload handler
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        uploadedImage = event.target.result;
        initializeCrop(uploadedImage, 'create');
    };
    reader.readAsDataURL(file);
}

// Initialize crop viewport with pan and zoom
function initializeCrop(imageSrc, mode = 'create') {
    const isEdit = mode === 'edit';
    const preview = isEdit ? document.getElementById('editImagePreview') : document.getElementById('imagePreview');
    const cropContainer = isEdit ? document.getElementById('editCropContainer') : document.getElementById('cropContainer');
    const viewport = isEdit ? document.getElementById('editCropViewport') : document.getElementById('cropViewport');
    const cropImage = isEdit ? document.getElementById('editCropImage') : document.getElementById('cropImage');
    const state = isEdit ? editCropState : cropState;
    
    preview.innerHTML = `<img src="${imageSrc}" alt="Preview">`;
    preview.classList.remove('hidden');
    
    const img = new Image();
    img.onload = () => {
        state.image = img;
        state.viewport = viewport;
        cropImage.src = imageSrc;
        
        // Calculate initial scale to fit image in viewport
        // Wait for viewport to be rendered
        setTimeout(() => {
            const viewportRect = viewport.getBoundingClientRect();
            const viewportSize = viewportRect.width;
            
            // Calculate scale to fit image (cover the viewport)
            const scaleX = viewportSize / img.width;
            const scaleY = viewportSize / img.height;
            const initialScale = Math.max(scaleX, scaleY) * 1.1; // Slightly larger to allow cropping
            
            // Reset crop state
            state.scale = Math.max(0, Math.min(1, initialScale));
            state.x = 0;
            state.y = 0;
            
            updateCropImageTransform(state);
            updateZoomLevel(state.scale, mode);
            
            // Setup pan handlers
            setupPanHandlers(viewport, cropImage, state);
        }, 100);
        
        cropContainer.classList.remove('hidden');
    };
    img.src = imageSrc;
}

// Update crop image transform
function updateCropImageTransform(state) {
    if (!state.image || !state.viewport) return;
    
    const img = state.viewport.querySelector('.crop-image');
    if (!img) return;
    
    const viewportRect = state.viewport.getBoundingClientRect();
    const viewportSize = viewportRect.width;
    const imgWidth = state.image.width * state.scale;
    const imgHeight = state.image.height * state.scale;
    
    // Constrain position
    const maxX = Math.max(0, (imgWidth - viewportSize) / 2);
    const maxY = Math.max(0, (imgHeight - viewportSize) / 2);
    state.x = Math.max(-maxX, Math.min(maxX, state.x));
    state.y = Math.max(-maxY, Math.min(maxY, state.y));
    
    // Center the image and apply pan/zoom
    img.style.transform = `translate(calc(-50% + ${state.x}px), calc(-50% + ${state.y}px)) scale(${state.scale})`;
    img.style.transformOrigin = 'center center';
}

// Setup pan (drag) handlers
function setupPanHandlers(viewport, image, state) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startImageX = 0;
    let startImageY = 0;
    
    const startDrag = (e) => {
        isDragging = true;
        state.isDragging = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        startX = clientX;
        startY = clientY;
        startImageX = state.x;
        startImageY = state.y;
        e.preventDefault();
    };
    
    const drag = (e) => {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const deltaX = clientX - startX;
        const deltaY = clientY - startY;
        state.x = startImageX + deltaX;
        state.y = startImageY + deltaY;
        updateCropImageTransform(state);
        e.preventDefault();
    };
    
    const endDrag = () => {
        isDragging = false;
        state.isDragging = false;
    };
    
    // Remove old listeners
    viewport.removeEventListener('mousedown', startDrag);
    viewport.removeEventListener('touchstart', startDrag);
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchend', endDrag);
    
    // Add new listeners
    viewport.addEventListener('mousedown', startDrag);
    viewport.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
}

// Adjust zoom
function adjustZoom(factor, mode = 'create') {
    const state = mode === 'edit' ? editCropState : cropState;
    const viewport = state.viewport;
    
    if (!viewport) return;
    
    const viewportRect = viewport.getBoundingClientRect();
    const viewportSize = viewportRect.width;
    
    // Calculate new scale (0 to 100% = 0 to 1.0)
    const newScale = Math.max(0, Math.min(1, state.scale * factor));
    state.scale = newScale;
    
    updateCropImageTransform(state);
    updateZoomLevel(newScale, mode);
}

// Update zoom level display
function updateZoomLevel(scale, mode = 'create') {
    const zoomLevel = mode === 'edit' 
        ? document.getElementById('editZoomLevel')
        : document.getElementById('zoomLevel');
    if (zoomLevel) {
        zoomLevel.textContent = Math.round(scale * 100) + '%';
    }
}

// Handle crop
function handleCrop(mode = 'create') {
    const state = mode === 'edit' ? editCropState : cropState;
    const preview = mode === 'edit' 
        ? document.getElementById('editImagePreview')
        : document.getElementById('imagePreview');
    
    if (!state.image || !state.viewport) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const viewportRect = state.viewport.getBoundingClientRect();
    const viewportSize = viewportRect.width;
    
    canvas.width = viewportSize;
    canvas.height = viewportSize;
    
    // Calculate source rectangle
    const imgWidth = state.image.width;
    const imgHeight = state.image.height;
    const scaledWidth = imgWidth * state.scale;
    const scaledHeight = imgHeight * state.scale;
    
    // Calculate what part of the image is visible in viewport
    const sourceX = (imgWidth / 2) - (viewportSize / 2 / state.scale) - (state.x / state.scale);
    const sourceY = (imgHeight / 2) - (viewportSize / 2 / state.scale) - (state.y / state.scale);
    const sourceSize = viewportSize / state.scale;
    
    // Draw cropped image
    ctx.drawImage(
        state.image,
        Math.max(0, sourceX),
        Math.max(0, sourceY),
        Math.min(sourceSize, imgWidth - Math.max(0, sourceX)),
        Math.min(sourceSize, imgHeight - Math.max(0, sourceY)),
        0, 0, viewportSize, viewportSize
    );
    
    croppedImageData = canvas.toDataURL('image/png');
    
    // Update preview
    preview.innerHTML = `<img src="${croppedImageData}" alt="Cropped">`;
    
    if (mode === 'create') {
        checkSaveButtonState();
    }
}

// Handle translation toggle
function handleTranslationToggle(e) {
    const isChecked = e.target.checked;
    const translatedDiv = document.getElementById('translatedText');
    const manualInput = document.getElementById('manualTranslation');
    
    if (isChecked) {
        manualInput.classList.add('hidden');
        translatedDiv.classList.remove('hidden');
        // Re-translate current text
        const text = document.getElementById('cardText').value.trim();
        if (text) {
            translateAndUpdate(text, 'create');
        }
    } else {
        translatedDiv.classList.add('hidden');
        manualInput.classList.remove('hidden');
        manualInput.value = translatedDiv.textContent;
    }
    checkSaveButtonState();
}

// Handle text input with auto-translation
async function handleTextInput(e) {
    const text = e.target.value;
    const autoTranslate = document.getElementById('autoTranslateCheck').checked;
    
    if (text.trim() && autoTranslate) {
        await translateAndUpdate(text, 'create');
    } else if (!text.trim()) {
        document.getElementById('translatedText').textContent = '';
        document.getElementById('manualTranslation').value = '';
    }
    
    checkSaveButtonState();
}

// Translate and update UI
async function translateAndUpdate(text, mode = 'create') {
    const isEdit = mode === 'edit';
    const translatedDiv = isEdit 
        ? document.getElementById('editTranslatedText')
        : document.getElementById('translatedText');
    
    if (!text.trim()) {
        translatedDiv.textContent = '';
        return;
    }
    
    translatedDiv.textContent = 'Translating...';
    const translated = await translateText(text, 'en', 'vi');
    translatedDiv.textContent = translated;
    
    if (mode === 'create') {
        checkSaveButtonState();
    }
}

// Handle edit translation toggle
function handleEditTranslationToggle(e) {
    const isChecked = e.target.checked;
    const translatedDiv = document.getElementById('editTranslatedText');
    const manualInput = document.getElementById('editManualTranslation');
    
    if (isChecked) {
        manualInput.classList.add('hidden');
        translatedDiv.classList.remove('hidden');
        const text = document.getElementById('editCardText').value.trim();
        if (text) {
            translateAndUpdate(text, 'edit');
        }
    } else {
        translatedDiv.classList.add('hidden');
        manualInput.classList.remove('hidden');
        manualInput.value = translatedDiv.textContent;
    }
}

// Handle edit text input
async function handleEditTextInput(e) {
    const text = e.target.value;
    const autoTranslate = document.getElementById('editAutoTranslateCheck').checked;
    
    if (text.trim() && autoTranslate) {
        await translateAndUpdate(text, 'edit');
    } else if (!text.trim()) {
        document.getElementById('editTranslatedText').textContent = '';
        document.getElementById('editManualTranslation').value = '';
    }
}

// Check if save button should be enabled
function checkSaveButtonState() {
    const saveBtn = document.getElementById('saveCardBtn');
    const hasImage = croppedImageData !== null;
    const hasText = document.getElementById('cardText').value.trim() !== '';
    saveBtn.disabled = !(hasImage && hasText);
}

// Save card
function saveCard() {
    const text = document.getElementById('cardText').value.trim();
    const autoTranslate = document.getElementById('autoTranslateCheck').checked;
    let translatedText;
    
    if (autoTranslate) {
        translatedText = document.getElementById('translatedText').textContent;
    } else {
        translatedText = document.getElementById('manualTranslation').value.trim();
    }
    
    if (!croppedImageData || !text) return;
    
    const card = {
        id: Date.now().toString(),
        category: currentCategory,
        image: croppedImageData,
        textEn: text,
        textVi: translatedText || text,
        createdAt: new Date().toISOString()
    };
    
    cards.push(card);
    localStorage.setItem('pecsCards', JSON.stringify(cards));
    
    // Reset and go back to categories
    resetCardForm();
    document.getElementById('categorySelection').classList.remove('hidden');
    document.getElementById('cardForm').classList.add('hidden');
    
    alert(currentLanguage === 'en' ? 'Card saved!' : 'Đã lưu thẻ!');
}

// Reset card form
function resetCardForm() {
    uploadedImage = null;
    croppedImageData = null;
    cropState.scale = 1;
    cropState.x = 0;
    cropState.y = 0;
    cropState.image = null;
    cropState.viewport = null;
    document.getElementById('imageUpload').value = '';
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('cropContainer').classList.add('hidden');
    document.getElementById('cardText').value = '';
    document.getElementById('translatedText').textContent = '';
    document.getElementById('manualTranslation').value = '';
    document.getElementById('autoTranslateCheck').checked = true;
    document.getElementById('manualTranslation').classList.add('hidden');
    document.getElementById('translatedText').classList.remove('hidden');
    document.getElementById('saveCardBtn').disabled = true;
}

// Handle edit image upload
function handleEditImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        initializeCrop(event.target.result, 'edit');
    };
    reader.readAsDataURL(file);
}

// Open edit card modal
function openEditCard(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    
    editingCardId = cardId;
    const modal = document.getElementById('editCardModal');
    
    // Populate form with card data
    document.getElementById('editCardText').value = card.textEn;
    document.getElementById('editTranslatedText').textContent = card.textVi;
    document.getElementById('editImagePreview').innerHTML = `<img src="${card.image}" alt="${card.textEn}">`;
    document.getElementById('editImagePreview').classList.remove('hidden');
    
    // Set cropped image data for update
    croppedImageData = card.image;
    
    // Reset edit form state
    document.getElementById('editAutoTranslateCheck').checked = true;
    document.getElementById('editManualTranslation').classList.add('hidden');
    document.getElementById('editTranslatedText').classList.remove('hidden');
    document.getElementById('editCropContainer').classList.add('hidden');
    
    // Show modal
    modal.classList.remove('hidden');
    document.getElementById('cardLibraryModal').classList.add('hidden');
}

// Update card
function updateCard() {
    const card = cards.find(c => c.id === editingCardId);
    if (!card) return;
    
    const text = document.getElementById('editCardText').value.trim();
    const autoTranslate = document.getElementById('editAutoTranslateCheck').checked;
    let translatedText;
    
    if (autoTranslate) {
        translatedText = document.getElementById('editTranslatedText').textContent;
    } else {
        translatedText = document.getElementById('editManualTranslation').value.trim();
    }
    
    if (!text) {
        alert(currentLanguage === 'en' ? 'Please enter text!' : 'Vui lòng nhập văn bản!');
        return;
    }
    
    // Update card
    card.textEn = text;
    card.textVi = translatedText || text;
    if (croppedImageData) {
        card.image = croppedImageData;
    }
    
    localStorage.setItem('pecsCards', JSON.stringify(cards));
    
    // Store card category before resetting
    const updatedCard = cards.find(c => c.id === editingCardId);
    const cardCategory = updatedCard ? updatedCard.category : null;
    
    // Close modal and refresh
    document.getElementById('editCardModal').classList.add('hidden');
    resetEditForm();
    
    // Refresh card library if open
    if (document.getElementById('cardLibraryModal').classList.contains('hidden') === false) {
        openCardLibrary(currentSlotIndex);
    }
    
    // Refresh category cards view if open
    const categoryCardsView = document.getElementById('categoryCardsView');
    if (!categoryCardsView.classList.contains('hidden') && cardCategory) {
        showCategoryCards(cardCategory);
    }
    
    // Update sentence bar if "I want" card was edited
    if (updatedCard && updatedCard.id === 'default-iwant') {
        const fixedSlot = document.querySelector('.fixed-slot');
        if (fixedSlot) {
            fixedSlot.innerHTML = `
                <img src="${updatedCard.image}" alt="${updatedCard.textEn}">
                <span class="slot-text">${currentLanguage === 'en' ? updatedCard.textEn.toUpperCase() : updatedCard.textVi.toUpperCase()}</span>
            `;
            resizeSentenceBar();
        }
    }
    
    alert(currentLanguage === 'en' ? 'Card updated!' : 'Đã cập nhật thẻ!');
}

// Reset edit form
function resetEditForm() {
    editingCardId = null;
    croppedImageData = null;
    editCropState.scale = 1;
    editCropState.x = 0;
    editCropState.y = 0;
    editCropState.image = null;
    editCropState.viewport = null;
    document.getElementById('editImageUpload').value = '';
    document.getElementById('editImagePreview').classList.add('hidden');
    document.getElementById('editCropContainer').classList.add('hidden');
    document.getElementById('editCardText').value = '';
    document.getElementById('editTranslatedText').textContent = '';
    document.getElementById('editManualTranslation').value = '';
    document.getElementById('editAutoTranslateCheck').checked = true;
    document.getElementById('editManualTranslation').classList.add('hidden');
    document.getElementById('editTranslatedText').classList.remove('hidden');
}

// Show cards in a category for editing
function showCategoryCards(category) {
    const categoryCards = cards.filter(card => card.category === category);
    const categoryCardsView = document.getElementById('categoryCardsView');
    const categoryCardsGrid = document.getElementById('categoryCardsGrid');
    const categoryCardsTitle = document.getElementById('categoryCardsTitle');
    const editCategorySelection = document.getElementById('editCategorySelection');
    
    // Update title
    const categoryNames = {
        'people': currentLanguage === 'en' ? 'People' : 'Người',
        'actions': currentLanguage === 'en' ? 'Actions' : 'Hành động',
        'food': currentLanguage === 'en' ? 'Food' : 'Thức ăn',
        'place': currentLanguage === 'en' ? 'Place' : 'Nơi chốn',
        'things': currentLanguage === 'en' ? 'Things' : 'Đồ vật',
        'animals': currentLanguage === 'en' ? 'Animals' : 'Động vật',
        'wants': currentLanguage === 'en' ? 'Wants' : 'Muốn'
    };
    categoryCardsTitle.textContent = categoryNames[category] || category;
    
    // Clear grid
    categoryCardsGrid.innerHTML = '';
    
    if (categoryCards.length === 0) {
        categoryCardsGrid.innerHTML = `<p style="text-align: center; padding: 40px; color: var(--text-secondary); grid-column: 1 / -1;">
            ${currentLanguage === 'en' ? 'No cards in this category.' : 'Chưa có thẻ trong danh mục này.'}
        </p>`;
    } else {
        categoryCards.forEach(card => {
            const cardItem = document.createElement('div');
            cardItem.className = 'category-card-item';
            cardItem.innerHTML = `
                <img src="${card.image}" alt="${card.textEn}">
                <div class="category-card-item-text">${currentLanguage === 'en' ? card.textEn : card.textVi}</div>
                <button class="category-card-edit-btn">
                    <span data-en="Edit" data-vi="Sửa">Edit</span>
                </button>
            `;
            
            const editBtn = cardItem.querySelector('.category-card-edit-btn');
            editBtn.addEventListener('click', () => {
                openEditCard(card.id);
                categoryCardsView.classList.add('hidden');
                editCategorySelection.classList.remove('hidden');
            });
            
            categoryCardsGrid.appendChild(cardItem);
        });
    }
    
    // Show category cards view, hide category selection
    editCategorySelection.classList.add('hidden');
    categoryCardsView.classList.remove('hidden');
}

// Initialize sentence bar
function initializeSentenceBar() {
    const sentenceBar = document.getElementById('sentenceBar');
    // Remove only empty slots and slots with cards, keep fixed "I want" and add buttons
    const slotsToRemove = sentenceBar.querySelectorAll('.sentence-slot:not(.fixed-slot)');
    slotsToRemove.forEach(slot => slot.remove());
    
    // Update "I want" card to use default if available
    const iwantSlot = sentenceBar.querySelector('.fixed-slot');
    if (iwantSlot) {
        const defaultIWant = cards.find(c => c.id === 'default-iwant');
        if (defaultIWant) {
            iwantSlot.innerHTML = `
                <img src="${defaultIWant.image}" alt="${defaultIWant.textEn}">
                <span class="slot-text">${currentLanguage === 'en' ? defaultIWant.textEn.toUpperCase() : defaultIWant.textVi.toUpperCase()}</span>
            `;
        }
    }
    
    resizeSentenceBar();
}

// Add sentence slot
function addSentenceSlot(position) {
    const sentenceBar = document.getElementById('sentenceBar');
    const iwantSlot = sentenceBar.querySelector('.fixed-slot');
    const addButtons = sentenceBar.querySelectorAll('.add-slot-btn');
    
    const emptySlot = document.createElement('div');
    emptySlot.className = 'sentence-slot empty-slot';
    emptySlot.dataset.cardId = '';
    emptySlot.addEventListener('click', () => openCardLibrary(emptySlot));
    
    if (position === 0) {
        // Add before "I want"
        sentenceBar.insertBefore(emptySlot, iwantSlot);
    } else {
        // Add after "I want"
        sentenceBar.insertBefore(emptySlot, addButtons[1]);
    }
    
    resizeSentenceBar();
}

// Open card library
function openCardLibrary(slotElement) {
    currentSlotIndex = slotElement;
    selectedCardForEdit = null;
    showCardLibraryCategories();
}

// Show card library categories
function showCardLibraryCategories() {
    const modal = document.getElementById('cardLibraryModal');
    const library = document.getElementById('cardLibrary');
    const selectBtn = document.getElementById('selectCardBtn');
    const backBtn = document.getElementById('libraryBackBtn');
    
    library.innerHTML = '';
    library.className = 'card-library category-grid-container';
    selectBtn.classList.add('hidden');
    backBtn.classList.add('hidden');
    
    const allCategories = [
        { id: 'people', en: 'People', vi: 'Người' },
        { id: 'actions', en: 'Actions', vi: 'Hành động' },
        { id: 'food', en: 'Food', vi: 'Thức ăn' },
        { id: 'place', en: 'Place', vi: 'Nơi chốn' },
        { id: 'things', en: 'Things', vi: 'Đồ vật' },
        { id: 'animals', en: 'Animals', vi: 'Động vật' },
        { id: 'wants', en: 'Wants', vi: 'Muốn' }
    ];
    
    // Only show categories that have cards
    const categoriesWithCards = allCategories.filter(category => 
        cards.some(card => card.category === category.id)
    );
    
    categoriesWithCards.forEach(category => {
        const categoryTile = document.createElement('div');
        categoryTile.className = 'category-tile';
        categoryTile.dataset.category = category.id;
        categoryTile.innerHTML = `<span data-en="${category.en}" data-vi="${category.vi}">${currentLanguage === 'en' ? category.en : category.vi}</span>`;
        
        categoryTile.addEventListener('click', () => {
            showCardLibraryCategoryCards(category.id);
        });
        
        library.appendChild(categoryTile);
    });
    
    modal.classList.remove('hidden');
}

// Show cards in a specific category
function showCardLibraryCategoryCards(category) {
    const modal = document.getElementById('cardLibraryModal');
    const library = document.getElementById('cardLibrary');
    const selectBtn = document.getElementById('selectCardBtn');
    const backBtn = document.getElementById('libraryBackBtn');
    
    library.innerHTML = '';
    library.className = 'card-library';
    selectBtn.classList.add('hidden');
    backBtn.classList.remove('hidden');
    
    const categoryCards = cards.filter(card => card.category === category);
    
    if (categoryCards.length === 0) {
        library.innerHTML = `<p style="text-align: center; padding: 40px; color: var(--text-secondary);">
            ${currentLanguage === 'en' ? 'No cards in this category.' : 'Chưa có thẻ trong danh mục này.'}
        </p>`;
    } else {
        let selectedCardItem = null;
        
        categoryCards.forEach(card => {
            const cardItem = document.createElement('div');
            cardItem.className = 'card-item';
            cardItem.dataset.cardId = card.id;
            cardItem.innerHTML = `
                <img src="${card.image}" alt="${card.textEn}">
                <div class="card-item-text">${currentLanguage === 'en' ? card.textEn : card.textVi}</div>
            `;
            
            // Single click to select for slot
            cardItem.addEventListener('click', (e) => {
                // Remove previous selection
                if (selectedCardItem) {
                    selectedCardItem.classList.remove('selected');
                }
                
                // If clicking the same card, toggle selection
                if (selectedCardItem === cardItem) {
                    selectedCardItem = null;
                    selectedCardForEdit = null;
                    selectBtn.classList.add('hidden');
                } else {
                    // Select this card
                    cardItem.classList.add('selected');
                    selectedCardItem = cardItem;
                    selectedCardForEdit = card.id;
                    selectBtn.classList.remove('hidden');
                }
            });
            
            // Double click to use in slot
            cardItem.addEventListener('dblclick', () => {
                selectCardForSlot(card);
                modal.classList.add('hidden');
            });
            
            library.appendChild(cardItem);
        });
    }
}

// Select card for slot
function selectCardForSlot(card) {
    if (!currentSlotIndex) return;
    
    currentSlotIndex.className = 'sentence-slot';
    currentSlotIndex.dataset.cardId = card.id;
    currentSlotIndex.innerHTML = `
        <img src="${card.image}" alt="${card.textEn}">
        <span class="slot-text">${currentLanguage === 'en' ? card.textEn.toUpperCase() : card.textVi.toUpperCase()}</span>
    `;
    
    currentSlotIndex.addEventListener('click', () => openCardLibrary(currentSlotIndex));
    currentSlotIndex = null;
    
    resizeSentenceBar();
}

// Update sentence slots text on language change
function updateSentenceSlotsText() {
    // Update "I want" fixed slot
    const fixedSlot = document.querySelector('.fixed-slot');
    if (fixedSlot) {
        const defaultIWant = cards.find(c => c.id === 'default-iwant');
        if (defaultIWant) {
            const textSpan = fixedSlot.querySelector('.slot-text');
            const img = fixedSlot.querySelector('img');
            if (textSpan) {
                textSpan.textContent = currentLanguage === 'en' 
                    ? defaultIWant.textEn.toUpperCase() 
                    : defaultIWant.textVi.toUpperCase();
            }
            if (img) {
                img.src = defaultIWant.image;
                img.alt = defaultIWant.textEn;
            }
        } else {
            const textSpan = fixedSlot.querySelector('.slot-text');
            if (textSpan) {
                textSpan.textContent = currentLanguage === 'en' ? 'I WANT' : 'TÔI MUỐN';
            }
        }
    }
    
    // Update other slots
    const slots = document.querySelectorAll('.sentence-slot:not(.fixed-slot)');
    slots.forEach(slot => {
        const cardId = slot.dataset.cardId;
        if (cardId) {
            const card = cards.find(c => c.id === cardId);
            if (card) {
                const textSpan = slot.querySelector('.slot-text');
                if (textSpan) {
                    textSpan.textContent = currentLanguage === 'en' 
                        ? card.textEn.toUpperCase() 
                        : card.textVi.toUpperCase();
                }
            }
        }
    });
    resizeSentenceBar();
}

// Resize sentence bar to fit content
function resizeSentenceBar() {
    const sentenceBar = document.getElementById('sentenceBar');
    const slots = sentenceBar.querySelectorAll('.sentence-slot');
    
    // Reset font sizes
    slots.forEach(slot => {
        const textSpan = slot.querySelector('.slot-text');
        if (textSpan) {
            textSpan.style.fontSize = '';
        }
    });
    
    // Calculate if content fits
    let attempts = 0;
    const maxAttempts = 10;
    let fontSize = 16;
    
    while (attempts < maxAttempts) {
        sentenceBar.style.fontSize = `${fontSize}px`;
        
        // Check if content overflows (more than 2 lines)
        const barHeight = sentenceBar.scrollHeight;
        const maxHeight = window.innerHeight * 0.4; // Max 40% of viewport height
        
        if (barHeight <= maxHeight && sentenceBar.scrollWidth <= sentenceBar.clientWidth) {
            break;
        }
        
        fontSize -= 1;
        attempts++;
        
        if (fontSize < 10) break; // Minimum font size
    }
    
    // Apply font size to slot texts
    slots.forEach(slot => {
        const textSpan = slot.querySelector('.slot-text');
        if (textSpan) {
            textSpan.style.fontSize = `${fontSize}px`;
        }
    });
    
    // Ensure slots scale properly
    const slotCount = slots.length;
    if (slotCount > 0) {
        const availableWidth = sentenceBar.clientWidth - 120; // Account for add buttons
        const maxSlotWidth = Math.max(100, Math.min(150, availableWidth / slotCount));
        
        slots.forEach(slot => {
            slot.style.flexBasis = `${maxSlotWidth}px`;
            slot.style.maxWidth = `${maxSlotWidth}px`;
        });
    }
}

// Save sentence preset
function saveSentence() {
    const sentenceBar = document.getElementById('sentenceBar');
    const slots = Array.from(sentenceBar.querySelectorAll('.sentence-slot:not(.fixed-slot)'));
    
    const sentenceData = slots
        .filter(slot => slot.dataset.cardId)
        .map(slot => slot.dataset.cardId);
    
    if (sentenceData.length === 0) {
        alert(currentLanguage === 'en' 
            ? 'Please add cards to create a sentence!' 
            : 'Vui lòng thêm thẻ để tạo câu!');
        return;
    }
    
    const presetName = prompt(
        currentLanguage === 'en' 
            ? 'Enter a name for this sentence:' 
            : 'Nhập tên cho câu này:',
        `Sentence ${sentencePresets.length + 1}`
    );
    
    if (!presetName) return;
    
    const preset = {
        id: Date.now().toString(),
        name: presetName,
        cards: sentenceData,
        createdAt: new Date().toISOString()
    };
    
    sentencePresets.push(preset);
    localStorage.setItem('pecsSentencePresets', JSON.stringify(sentencePresets));
    
    alert(currentLanguage === 'en' ? 'Sentence saved!' : 'Đã lưu câu!');
}

// Show load sentence modal
function showLoadSentenceModal() {
    const modal = document.getElementById('loadSentenceModal');
    const presetsContainer = document.getElementById('sentencePresets');
    
    presetsContainer.innerHTML = '';
    
    if (sentencePresets.length === 0) {
        presetsContainer.innerHTML = `<p style="text-align: center; padding: 40px; color: var(--text-secondary);">
            ${currentLanguage === 'en' ? 'No saved sentences.' : 'Chưa có câu đã lưu.'}
        </p>`;
    } else {
        sentencePresets.forEach(preset => {
            const presetItem = document.createElement('div');
            presetItem.className = 'preset-item';
            
            const preview = document.createElement('div');
            preview.className = 'preset-preview';
            
            // Add "I want" card
            const iwantPreview = document.createElement('div');
            iwantPreview.className = 'sentence-slot fixed-slot';
            iwantPreview.innerHTML = `
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%234CAF50' width='100' height='100'/%3E%3Ctext x='50' y='60' font-size='40' fill='white' text-anchor='middle'%3EI WANT%3C/text%3E%3C/svg%3E" alt="I want">
                <span class="slot-text">I WANT</span>
            `;
            preview.appendChild(iwantPreview);
            
            // Add preset cards
            preset.cards.forEach(cardId => {
                const card = cards.find(c => c.id === cardId);
                if (card) {
                    const cardPreview = document.createElement('div');
                    cardPreview.className = 'sentence-slot';
                    cardPreview.innerHTML = `
                        <img src="${card.image}" alt="${card.textEn}">
                        <span class="slot-text">${currentLanguage === 'en' ? card.textEn.toUpperCase() : card.textVi.toUpperCase()}</span>
                    `;
                    preview.appendChild(cardPreview);
                }
            });
            
            presetItem.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 10px; font-size: 18px;">${preset.name}</div>
            `;
            presetItem.appendChild(preview);
            
            presetItem.addEventListener('click', () => {
                loadSentencePreset(preset);
                modal.classList.add('hidden');
            });
            
            presetsContainer.appendChild(presetItem);
        });
    }
    
    modal.classList.remove('hidden');
}

// Load sentence preset
function loadSentencePreset(preset) {
    const sentenceBar = document.getElementById('sentenceBar');
    const iwantSlot = sentenceBar.querySelector('.fixed-slot');
    const addButtons = sentenceBar.querySelectorAll('.add-slot-btn');
    
    // Clear existing slots (except I want)
    sentenceBar.innerHTML = '';
    sentenceBar.appendChild(addButtons[0]);
    sentenceBar.appendChild(iwantSlot);
    
    // Add preset cards
    preset.cards.forEach(cardId => {
        const card = cards.find(c => c.id === cardId);
        if (card) {
            const slot = document.createElement('div');
            slot.className = 'sentence-slot';
            slot.dataset.cardId = card.id;
            slot.innerHTML = `
                <img src="${card.image}" alt="${card.textEn}">
                <span class="slot-text">${currentLanguage === 'en' ? card.textEn.toUpperCase() : card.textVi.toUpperCase()}</span>
            `;
            slot.addEventListener('click', () => openCardLibrary(slot));
            sentenceBar.appendChild(slot);
        }
    });
    
    sentenceBar.appendChild(addButtons[1]);
    resizeSentenceBar();
}

// Handle window resize
window.addEventListener('resize', () => {
    if (document.getElementById('makeSentenceScreen').classList.contains('active')) {
        resizeSentenceBar();
    }
});
