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

// Helper function to get image source for a card
// For default cards, returns path to images folder
// For user-created cards, returns Base64 from localStorage
function getCardImageSrc(card) {
    if (card.isDefault && card.imageFilename) {
        // Default card - load from images folder
        const pathVariations = [
            `./images/${card.imageFilename}`,
            `images/${card.imageFilename}`,
            `${window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1)}images/${card.imageFilename}`
        ];
        // Return the first path variation (browser will try to load it)
        return pathVariations[0];
    } else {
        // User-created card - use Base64 from localStorage
        return card.image || '';
    }
}

// Special function to get "I want" card image - always loads from folder
function getIWantImageSrc() {
    const pathVariations = [
        `./images/i_want.png`,
        `images/i_want.png`,
        `${window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1)}images/i_want.png`
    ];
    return pathVariations[0];
}

// Initialize default cards if they don't exist (deprecated - use loadDefaultCards instead)
// This function removes old hardcoded cards - cards should be loaded from images folder
function initializeDefaultCards() {
    // Remove old hardcoded cards if they exist (they will be replaced by loadDefaultCards)
    const oldIWantIndex = cards.findIndex(c => c.id === 'default-iwant');
    const oldIDontWantIndex = cards.findIndex(c => c.id === 'default-idontwant');
    
    if (oldIWantIndex >= 0) {
        cards.splice(oldIWantIndex, 1);
    }
    if (oldIDontWantIndex >= 0) {
        cards.splice(oldIDontWantIndex, 1);
    }
    
    // Save if we removed old cards
    if (oldIWantIndex >= 0 || oldIDontWantIndex >= 0) {
        localStorage.setItem('pecsCards', JSON.stringify(cards));
    }
    
    // Don't create new hardcoded cards - let loadDefaultCards handle it from images folder
}

// Load default cards from JSON file and images folder
async function loadDefaultCards() {
    try {
        const response = await fetch('default-cards.json');
        if (!response.ok) {
            console.warn('default-cards.json not found, skipping default cards');
            return;
        }
        
        const defaultData = await response.json();
        if (!defaultData.cards || !Array.isArray(defaultData.cards)) {
            console.warn('Invalid default-cards.json format');
            return;
        }
        
        let loadedCount = 0;
        let skippedCount = 0;
        
        for (const cardData of defaultData.cards) {
            // Check if default card already exists (by ID or old ID format)
            let existingIndex = cards.findIndex(c => c.id === cardData.id);
            
            // Also check for old ID formats for backward compatibility
            if (existingIndex < 0 && cardData.id === 'default-wants-iwant') {
                existingIndex = cards.findIndex(c => c.id === 'default-iwant');
            }
            if (existingIndex < 0 && cardData.id === 'default-wants-idontwant') {
                existingIndex = cards.findIndex(c => c.id === 'default-idontwant');
            }
            
            // If card exists, remove it first to replace with image version
            if (existingIndex >= 0) {
                cards.splice(existingIndex, 1);
            }
            
            // Try to load image from images/ folder (relative to index.html)
            try {
                // Use relative path - works when images/ folder is in same directory as index.html
                // Try multiple path variations to handle different scenarios
                const pathVariations = [
                    `./images/${cardData.imageFilename}`,  // Relative path with ./
                    `images/${cardData.imageFilename}`,   // Simple relative path
                    `${window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1)}images/${cardData.imageFilename}` // Absolute from current path
                ];
                
                let imageResponse = null;
                let imagePath = '';
                
                // Try each path variation until one works
                for (const path of pathVariations) {
                    try {
                        imagePath = path;
                        console.log(`Attempting to load image from: ${imagePath}`);
                        imageResponse = await fetch(imagePath);
                        if (imageResponse.ok) {
                            break; // Found working path
                        }
                    } catch (e) {
                        continue; // Try next path
                    }
                }
                
                if (!imageResponse || !imageResponse.ok) {
                    // Image not found with any path variation
                    skippedCount++;
                    console.log(`Default image not found: ${imagePath} (Status: ${imageResponse?.status || 'N/A'}) - will be loaded when image is added`);
                } else {
                    // Image found - for default cards, store only filename (not Base64)
                    // Images will be loaded from folder when displayed
                    const card = {
                        id: cardData.id,
                        category: cardData.category,
                        imageFilename: cardData.imageFilename, // Store filename instead of Base64
                        image: null, // Will be loaded dynamically from folder
                        textEn: cardData.textEn,
                        textVi: cardData.textVi,
                        createdAt: new Date().toISOString(),
                        isDefault: true
                    };
                    
                    cards.push(card);
                    loadedCount++;
                    console.log(`Successfully loaded card metadata: ${cardData.id} (image will load from folder: ${imagePath})`);
                }
            } catch (error) {
                skippedCount++;
                console.log(`Error loading default card image ${cardData.id}:`, error);
            }
        }
        
        if (loadedCount > 0) {
            localStorage.setItem('pecsCards', JSON.stringify(cards));
            console.log(`Loaded ${loadedCount} default cards from images folder`);
            // Log the I want card specifically
            const iWantCard = cards.find(c => c.id === 'default-wants-iwant' || c.id === 'default-iwant');
            if (iWantCard) {
                console.log('I want card is in cards array:', {
                    id: iWantCard.id,
                    hasImage: !!iWantCard.image,
                    imageLength: iWantCard.image ? iWantCard.image.length : 0,
                    textEn: iWantCard.textEn
                });
            } else {
                console.log('I want card NOT found in cards array after loading');
            }
            if (skippedCount > 0) {
                console.log(`${skippedCount} default cards skipped (images not found yet)`);
            }
            
            // Update sentence bar if it's currently visible
            if (document.getElementById('makeSentenceScreen').classList.contains('active')) {
                initializeSentenceBar();
            }
            
            // Refresh Edit Cards screen if it's currently visible
            const editCardsScreen = document.getElementById('editCardsScreen');
            if (editCardsScreen && editCardsScreen.classList.contains('active')) {
                const categoryCardsView = document.getElementById('categoryCardsView');
                const editCategorySelection = document.getElementById('editCategorySelection');
                // If a category is currently being viewed, refresh it
                if (categoryCardsView && !categoryCardsView.classList.contains('hidden')) {
                    const categoryCardsTitle = document.getElementById('categoryCardsTitle');
                    const currentCategory = categoryCardsTitle.textContent;
                    // Find the category by matching the title
                    const categoryMap = {
                        'People': 'people',
                        'Người': 'people',
                        'Actions': 'actions',
                        'Hành động': 'actions',
                        'Food': 'food',
                        'Thức ăn': 'food',
                        'Place': 'place',
                        'Nơi chốn': 'place',
                        'Things': 'things',
                        'Đồ vật': 'things',
                        'Animals': 'animals',
                        'Động vật': 'animals',
                        'Wants': 'wants',
                        'Muốn': 'wants'
                    };
                    const category = categoryMap[currentCategory];
                    if (category) {
                        showCategoryCards(category);
                    }
                }
            }
        } else if (skippedCount > 0) {
            console.log(`No default cards loaded yet. Add images to images/ folder to load them.`);
        }
    } catch (error) {
        console.warn('Error loading default cards:', error);
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
        'I want': 'CON MUỐN',
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
    
    document.getElementById('makeSentenceBtn').addEventListener('click', async () => {
        // Reload cards from localStorage to ensure we have the latest data
        cards = JSON.parse(localStorage.getItem('pecsCards') || '[]');
        
        // Ensure default cards are loaded (in case they weren't loaded on page load)
        await loadDefaultCards();
        
        // Reload cards again after loadDefaultCards (it may have added new cards)
        cards = JSON.parse(localStorage.getItem('pecsCards') || '[]');
        
        showScreen('makeSentenceScreen');
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            initializeSentenceBar();
        }, 100);
    });
    
    // Edit Cards button
    document.getElementById('editCardsBtn').addEventListener('click', () => {
        // Reload cards from localStorage to ensure we have the latest data
        cards = JSON.parse(localStorage.getItem('pecsCards') || '[]');
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
        document.getElementById('backToCategoriesBtn').classList.add('hidden');
        document.getElementById('cardLibraryCategories').classList.remove('hidden');
        document.getElementById('cardLibrary').classList.add('hidden');
        currentSlotIndex = null;
        selectedCardForEdit = null;
    });
    
    document.getElementById('closeLoadModal').addEventListener('click', () => {
        document.getElementById('loadSentenceModal').classList.add('hidden');
    });
    
    document.getElementById('closeEditModal').addEventListener('click', () => {
        document.getElementById('editCardModal').classList.add('hidden');
        resetEditForm();
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
        }
    });
    
    document.getElementById('loadSentenceModal').addEventListener('click', (e) => {
        if (e.target.id === 'loadSentenceModal') {
            document.getElementById('loadSentenceModal').classList.add('hidden');
        }
    });
    
    // Load default cards from JSON file
    loadDefaultCards().then(() => {
        // After cards are loaded, update the sentence bar if we're on that screen
        if (document.getElementById('makeSentenceScreen').classList.contains('active')) {
            initializeSentenceBar();
        }
        // Also update language after cards are loaded
        updateLanguage();
    }).catch(() => {
        // If loadDefaultCards fails, still update language
        updateLanguage();
    });
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
    
    // Prevent editing default cards
    if (card.isDefault) {
        alert(currentLanguage === 'en' 
            ? 'Default cards cannot be edited. You can create new cards to customize.' 
            : 'Thẻ mặc định không thể chỉnh sửa. Bạn có thể tạo thẻ mới để tùy chỉnh.');
        return;
    }
    
    editingCardId = cardId;
    const modal = document.getElementById('editCardModal');
    
    // Populate form with card data
    document.getElementById('editCardText').value = card.textEn;
    document.getElementById('editTranslatedText').textContent = card.textVi;
    document.getElementById('editImagePreview').innerHTML = `<img src="${getCardImageSrc(card)}" alt="${card.textEn}">`;
    document.getElementById('editImagePreview').classList.remove('hidden');
    
    // Set cropped image data for update (only for user-created cards, default cards can't be edited)
    croppedImageData = card.isDefault ? null : card.image;
    
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
    if (updatedCard && (updatedCard.id === 'default-wants-iwant' || updatedCard.id === 'default-iwant')) {
        const fixedSlot = document.querySelector('.fixed-slot');
        if (fixedSlot) {
            fixedSlot.innerHTML = `
                <img src="${getCardImageSrc(updatedCard)}" alt="${updatedCard.textEn}">
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
                <img src="${getCardImageSrc(card)}" alt="${card.textEn}">
                <div class="category-card-item-text">${currentLanguage === 'en' ? card.textEn : card.textVi}</div>
                <button class="category-card-edit-btn">
                    <span data-en="Edit" data-vi="Sửa">Edit</span>
                </button>
            `;
            
            const editBtn = cardItem.querySelector('.category-card-edit-btn');
            
            // Disable edit button for default cards
            if (card.isDefault) {
                editBtn.disabled = true;
                editBtn.style.opacity = '0.5';
                editBtn.style.cursor = 'not-allowed';
                editBtn.title = currentLanguage === 'en' ? 'Default cards cannot be edited' : 'Thẻ mặc định không thể chỉnh sửa';
            } else {
                editBtn.addEventListener('click', () => {
                    openEditCard(card.id);
                    categoryCardsView.classList.add('hidden');
                    editCategorySelection.classList.remove('hidden');
                });
            }
            
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
        // Remove old event listeners
        const newSlot = iwantSlot.cloneNode(true);
        iwantSlot.parentNode.replaceChild(newSlot, iwantSlot);
        const updatedSlot = sentenceBar.querySelector('.fixed-slot');
        
        // Check for new ID format first, then fallback to old format
        const defaultIWant = cards.find(c => c.id === 'default-wants-iwant' || c.id === 'default-iwant');
        console.log('Looking for I want card. Cards array length:', cards.length);
        console.log('Found I want card:', defaultIWant);
        
        // Always use the image from folder for "I want" card
        const iWantTextEn = defaultIWant ? defaultIWant.textEn : 'I want';
        const iWantTextVi = defaultIWant ? defaultIWant.textVi : 'Tôi muốn';
        const iWantCardId = defaultIWant ? defaultIWant.id : 'default-wants-iwant';
        
        updatedSlot.dataset.cardId = iWantCardId;
        updatedSlot.innerHTML = `
            <img src="${getIWantImageSrc()}" alt="${iWantTextEn}" onerror="this.onerror=null; this.src='./images/i_want.png';">
            <span class="slot-text">${currentLanguage === 'en' ? iWantTextEn.toUpperCase() : iWantTextVi.toUpperCase()}</span>
        `;
        // Make it clickable to change the card
        updatedSlot.addEventListener('click', () => openCardLibrary(updatedSlot));
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
    const modal = document.getElementById('cardLibraryModal');
    const categoriesView = document.getElementById('cardLibraryCategories');
    const library = document.getElementById('cardLibrary');
    const selectBtn = document.getElementById('selectCardBtn');
    const backBtn = document.getElementById('backToCategoriesBtn');
    const title = document.getElementById('cardLibraryTitle');
    
    // Show categories, hide cards
    categoriesView.classList.remove('hidden');
    library.classList.add('hidden');
    selectBtn.classList.add('hidden');
    backBtn.classList.add('hidden');
    
    // Update title
    title.textContent = currentLanguage === 'en' ? 'Select Category' : 'Chọn danh mục';
    
    // Clear and populate categories
    categoriesView.innerHTML = '';
    
    const categoryNames = {
        'people': { en: 'People', vi: 'Người' },
        'actions': { en: 'Actions', vi: 'Hành động' },
        'food': { en: 'Food', vi: 'Thức ăn' },
        'place': { en: 'Place', vi: 'Nơi chốn' },
        'things': { en: 'Things', vi: 'Đồ vật' },
        'animals': { en: 'Animals', vi: 'Động vật' },
        'wants': { en: 'Wants', vi: 'Muốn' }
    };
    
    // Get unique categories that have cards
    const categoriesWithCards = [...new Set(cards.map(c => c.category))];
    
    if (categoriesWithCards.length === 0) {
        categoriesView.innerHTML = `<p style="text-align: center; padding: 40px; color: var(--text-secondary); grid-column: 1 / -1;">
            ${currentLanguage === 'en' ? 'No cards available. Create cards first!' : 'Chưa có thẻ. Hãy tạo thẻ trước!'}
        </p>`;
    } else {
        categoriesWithCards.forEach(category => {
            const categoryTile = document.createElement('div');
            categoryTile.className = 'card-library-category-tile';
            categoryTile.dataset.category = category;
            categoryTile.innerHTML = `
                <span>${categoryNames[category] ? (currentLanguage === 'en' ? categoryNames[category].en : categoryNames[category].vi) : category}</span>
            `;
            
            categoryTile.addEventListener('click', () => {
                showCardsInCategory(category, modal, library, categoriesView, selectBtn, backBtn, title);
            });
            
            categoriesView.appendChild(categoryTile);
        });
    }
    
    modal.classList.remove('hidden');
}

// Show cards in selected category
function showCardsInCategory(category, modal, library, categoriesView, selectBtn, backBtn, title) {
    const categoryCards = cards.filter(card => card.category === category);
    
    // Hide categories, show cards
    categoriesView.classList.add('hidden');
    library.classList.remove('hidden');
    backBtn.classList.remove('hidden');
    
    // Update title
    const categoryNames = {
        'people': { en: 'People', vi: 'Người' },
        'actions': { en: 'Actions', vi: 'Hành động' },
        'food': { en: 'Food', vi: 'Thức ăn' },
        'place': { en: 'Place', vi: 'Nơi chốn' },
        'things': { en: 'Things', vi: 'Đồ vật' },
        'animals': { en: 'Animals', vi: 'Động vật' },
        'wants': { en: 'Wants', vi: 'Muốn' }
    };
    const categoryName = categoryNames[category] 
        ? (currentLanguage === 'en' ? categoryNames[category].en : categoryNames[category].vi)
        : category;
    title.textContent = categoryName;
    
    // Clear and populate cards
    library.innerHTML = '';
    let selectedCardItem = null;
    
    if (categoryCards.length === 0) {
        library.innerHTML = `<p style="text-align: center; padding: 40px; color: var(--text-secondary); grid-column: 1 / -1;">
            ${currentLanguage === 'en' ? 'No cards in this category.' : 'Chưa có thẻ trong danh mục này.'}
        </p>`;
    } else {
        categoryCards.forEach(card => {
            const cardItem = document.createElement('div');
            cardItem.className = 'card-item';
            cardItem.dataset.cardId = card.id;
            cardItem.innerHTML = `
                <img src="${getCardImageSrc(card)}" alt="${card.textEn}">
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
            
            // Double click to use in slot directly
            cardItem.addEventListener('dblclick', () => {
                const selectedCard = cards.find(c => c.id === card.id);
                if (selectedCard) {
                    selectCardForSlot(selectedCard);
                    modal.classList.add('hidden');
                }
            });
            
            library.appendChild(cardItem);
        });
    }
    
    // Back to categories button
    backBtn.onclick = () => {
        library.classList.add('hidden');
        categoriesView.classList.remove('hidden');
        backBtn.classList.add('hidden');
        selectBtn.classList.add('hidden');
        title.textContent = currentLanguage === 'en' ? 'Select Category' : 'Chọn danh mục';
    };
    
    // Select button
    selectBtn.onclick = () => {
        if (selectedCardForEdit) {
            const selectedCard = cards.find(c => c.id === selectedCardForEdit);
            if (selectedCard) {
                selectCardForSlot(selectedCard);
                modal.classList.add('hidden');
            }
        }
    };
}

// Select card for slot
function selectCardForSlot(card) {
    if (!currentSlotIndex) return;
    
    // Remove fixed-slot class if it was the "I want" slot
    currentSlotIndex.classList.remove('fixed-slot');
    currentSlotIndex.className = 'sentence-slot';
    currentSlotIndex.dataset.cardId = card.id;
    currentSlotIndex.innerHTML = `
        <img src="${getCardImageSrc(card)}" alt="${card.textEn}">
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
        const cardId = fixedSlot.dataset.cardId;
        if (cardId) {
            // If it has a card ID, use that card
            const card = cards.find(c => c.id === cardId);
            if (card) {
                const textSpan = fixedSlot.querySelector('.slot-text');
                const img = fixedSlot.querySelector('img');
                if (textSpan) {
                    textSpan.textContent = currentLanguage === 'en' 
                        ? card.textEn.toUpperCase() 
                        : card.textVi.toUpperCase();
                }
                if (img) {
                    img.src = getCardImageSrc(card);
                    img.alt = card.textEn;
                }
            }
        } else {
            // No card selected, always use "I want" from folder
            const defaultIWant = cards.find(c => c.id === 'default-wants-iwant' || c.id === 'default-iwant');
            const iWantTextEn = defaultIWant ? defaultIWant.textEn : 'I want';
            const iWantTextVi = defaultIWant ? defaultIWant.textVi : 'Tôi muốn';
            const iWantCardId = defaultIWant ? defaultIWant.id : 'default-wants-iwant';
            
            fixedSlot.dataset.cardId = iWantCardId;
            fixedSlot.innerHTML = `
                <img src="${getIWantImageSrc()}" alt="${iWantTextEn}" onerror="this.onerror=null; this.src='./images/i_want.png';">
                <span class="slot-text">${currentLanguage === 'en' ? iWantTextEn.toUpperCase() : iWantTextVi.toUpperCase()}</span>
            `;
            // Re-attach click handler
            fixedSlot.addEventListener('click', () => openCardLibrary(fixedSlot));
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
            
            // Add "I want" card - always load from folder
            const iwantPreview = document.createElement('div');
            iwantPreview.className = 'sentence-slot fixed-slot';
            const defaultIWant = cards.find(c => c.id === 'default-wants-iwant' || c.id === 'default-iwant');
            const iWantText = defaultIWant ? (currentLanguage === 'en' ? defaultIWant.textEn.toUpperCase() : defaultIWant.textVi.toUpperCase()) : 'I WANT';
            iwantPreview.innerHTML = `
                <img src="${getIWantImageSrc()}" alt="I want" onerror="this.onerror=null; this.src='./images/i_want.png';">
                <span class="slot-text">${iWantText}</span>
            `;
            preview.appendChild(iwantPreview);
            
            // Add preset cards
            preset.cards.forEach(cardId => {
                const card = cards.find(c => c.id === cardId);
                if (card) {
                    const cardPreview = document.createElement('div');
                    cardPreview.className = 'sentence-slot';
                    cardPreview.innerHTML = `
                        <img src="${getCardImageSrc(card)}" alt="${card.textEn}">
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
                <img src="${getCardImageSrc(card)}" alt="${card.textEn}">
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


