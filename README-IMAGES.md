# Default Images Folder

This folder should contain the default card images referenced in `default-cards.json`.

## Required Images

Place the following image files in the `images/` folder:

### People Category
- `papa.png` - Papa / Bố
- `mama.png` - Mama / Mẹ
- `teacher.png` - Teacher / Giáo viên
- `teacher_assistant.png` - Teacher Assistant / Trợ giảng

### Actions Category
- `drink.png` - Drink / Uống
- `eat.png` - Eat / Ăn
- `open.png` - Open / Mở
- `watch.png` - Watch / Xem
- `help.png` - Help / Giúp

### Things Category
- `door.png` - Door / Cửa
- `window.png` - Window / Cửa sổ
- `light.png` - Light / Đèn

### Wants Category
- `i_want.png` - I want / Tôi muốn
- `i_dont_want.png` - I don't want / Tôi không muốn

## Folder Structure

```
PECS/
├── index.html
├── app.js
├── styles.css
├── default-cards.json
└── images/
    ├── papa.png
    ├── mama.png
    ├── teacher.png
    ├── teacher_assistant.png
    ├── drink.png
    ├── eat.png
    ├── open.png
    ├── watch.png
    ├── help.png
    ├── door.png
    ├── window.png
    ├── light.png
    ├── i_want.png
    └── i_dont_want.png
```

## Notes

- All images should be in PNG format
- Images will be loaded automatically when the app starts
- Default cards cannot be edited - they are read-only
- If an image is missing, the card will not be loaded (a warning will appear in console)

