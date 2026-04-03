// ============================================
// translations.js — словарь переводов
// ============================================

const Translations = {
    dict: {
        // Люди и транспорт
        'person': 'человек',
        'car': 'машина',
        'truck': 'грузовик',
        'bus': 'автобус',
        'motorcycle': 'мотоцикл',
        'bicycle': 'велосипед',

        // Животные
        'dog': 'собака',
        'cat': 'кошка',
        'bird': 'птица',

        // Предметы
        'chair': 'стул',
        'table': 'стол',
        'bed': 'кровать',
        'bottle': 'бутылка',
        'cup': 'чашка',
        'cell phone': 'телефон',
        'book': 'книга',
        'backpack': 'рюкзак',
        'tv': 'телевизор',
        'laptop': 'ноутбук',

        // Улица
        'stop sign': 'знак стоп',
        'traffic light': 'светофор',
        'bench': 'скамейка',
        'potted plant': 'дерево'
    },

    // Получить перевод
    get(className) {
        return this.dict[className] || className;
    },

    // Вывести статистику в консоль
    logStats() {
        console.log(`📖 Загружено ${Object.keys(this.dict).length} переводов`);
    }
};

window.Translations = Translations;