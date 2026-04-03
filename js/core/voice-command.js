// ============================================
// voice-command.js — голосовые команды (не мешает основной озвучке)
// ============================================

const VoiceCommand = {
    recognition: null,
    isListening: false,
    isInitialized: false,

    async init() {
        console.log('🎤 Инициализация голосовых команд...');

        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Распознавание речи не поддерживается');
            return false;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            console.log('✅ Доступ к микрофону получен');
        } catch (e) {
            console.warn('❌ Нет доступа к микрофону:', e);
            return false;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'ru-RU';
        this.recognition.continuous = true;
        this.recognition.interimResults = false;

        this.recognition.onresult = (event) => {
            const text = event.results[event.results.length - 1][0].transcript.toLowerCase();
            console.log('🎤 Распознано:', text);

            if (text.includes('лина')) {
                if (navigator.vibrate) navigator.vibrate(100);
                // Используем speak, но без очистки очереди
                if (window.Speech) Speech.speak('я готова');

                const command = text.replace('лина', '').trim();
                this.processCommand(command);
            }
        };

        this.recognition.onerror = (e) => console.warn('Ошибка распознавания:', e.error);
        this.recognition.onend = () => {
            this.isListening = false;
            if (this.isInitialized) {
                setTimeout(() => this.start(), 500);
            }
        };

        this.isInitialized = true;
        this.start();
        if (window.UICore) UICore.log('🎤 Голосовые команды активны. Скажите "Лина"', 'success');
        return true;
    },

    start() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
                this.isListening = true;
                console.log('🎤 Слушаю...');
            } catch (e) {
                console.warn('Ошибка старта распознавания:', e);
            }
        }
    },

    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    },

    processCommand(command) {
        if (!command) return;
        console.log('Команда:', command);

        if (command.includes('что видишь') || command.includes('описание')) {
            if (window.GuideMe && GuideMe.describeScene) GuideMe.describeScene();
        }
        else if (command.includes('калибровка')) {
            if (window.GuideMe && GuideMe.calibrate) GuideMe.calibrate();
        }
        else if (command.includes('стоп') || command.includes('останови')) {
            if (window.GuideMe && GuideMe.stopCamera) GuideMe.stopCamera();
        }
        else if (command.includes('старт') || command.includes('запусти')) {
            if (window.GuideMe && GuideMe.startCamera) GuideMe.startCamera();
        }
        else if (command.includes('громче')) {
            const vol = document.getElementById('volume');
            if (vol) {
                let newVal = Math.min(1, parseFloat(vol.value) + 0.1);
                vol.value = newVal;
                vol.dispatchEvent(new Event('input'));
                if (window.Speech) Speech.speak(`громкость ${Math.round(newVal * 100)} процентов`);
            }
        }
        else if (command.includes('тише')) {
            const vol = document.getElementById('volume');
            if (vol) {
                let newVal = Math.max(0, parseFloat(vol.value) - 0.1);
                vol.value = newVal;
                vol.dispatchEvent(new Event('input'));
                if (window.Speech) Speech.speak(`громкость ${Math.round(newVal * 100)} процентов`);
            }
        }
        else if (command.includes('помощь')) {
            const helpText = 'что видишь, калибровка, стоп, старт, громче, тише, настройки';
            if (window.Speech) Speech.speak(helpText);
            if (window.UICore) UICore.log(`Команды: ${helpText}`);
        }
        else if (command !== '') {
            if (window.Speech) Speech.speak('команда не распознана');
        }
    }
};

window.VoiceCommand = VoiceCommand;