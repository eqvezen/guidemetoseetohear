// ============================================
// main.js — GuideMe 1.5 (авто-запрос разрешений)
// ============================================

const GuideMe = {
    cameraActive: false,
    detectionInterval: null,
    lastSpokenTime: 0,
    descriptionCooldown: false,

    async init() {
        console.log('🚀 GuideMe 1.5 запуск');

        // Инициализация модулей
        Camera.init('video', 'overlay');
        Speech.init();
        Calibration.init();
        Safety.init();
        ObjectTracker.init();
        UICore.init();
        UIControls.init();
        UISettings.init();

        // Загрузка модели
        const modelLoaded = await Detection.init();
        if (modelLoaded) console.log('✅ Модель загружена');

        this._setupCallbacks();

        // Запрос разрешения на камеру (пока не запускаем)
        try {
            // Просто проверяем доступ к камере, не запуская видео
            await navigator.mediaDevices.getUserMedia({ video: true });
            console.log('✅ Доступ к камере разрешён');
        } catch (e) {
            console.warn('❌ Нет доступа к камере:', e);
            UICore.log('⚠️ Разрешите доступ к камере в настройках браузера', 'warning');
        }

        // Запуск голосовых команд (автоматический запрос микрофона)
        try {
            await VoiceCommand.init();
        } catch (e) {
            console.warn('Голосовые команды не загружены:', e);
            UICore.log('⚠️ Голосовые команды недоступны', 'warning');
        }

        // Приветствие
        setTimeout(() => Speech.speak('я готова'), 1500);
    },

    _setupCallbacks() {
        UIControls.onStart(() => this.startCamera());
        UIControls.onStop(() => this.stopCamera());
        UIControls.onDescribe(() => this.describeScene());
        UIControls.onCalibrate(() => this.calibrate());
        UIControls.onTestVoice(() => Speech.test());
        UIControls.onSettings(() => UISettings.togglePanel());
        UIControls.onCloseSettings(() => UISettings.togglePanel());
    },

async startCamera() {
    // Разрешаем первое аудио (если ещё не разрешено)
    if (Speech.allowFirstSpeak) Speech.allowFirstSpeak();
    
    try {
        await Camera.start();
            this.cameraActive = true;
            Speech.speak('камера запущена');
            UIControls.setButtonsState(true);
            this._startDetection();
            UICore.log('📷 Камера запущена');
        } catch (e) {
            console.error(e);
            Speech.speak('ошибка камеры');
            UICore.log('❌ Ошибка запуска камеры: ' + e.message, 'error');
        }
    },

    stopCamera() {
        Camera.stop();
        this.cameraActive = false;
        // Очищаем очередь аудио при остановке камеры (но не трогаем голосовые команды)
        if (Speech.clearQueue) Speech.clearQueue();
        Speech.speak('камера остановлена');
        UIControls.setButtonsState(false);
        this._stopDetection();
        UICore.log('📷 Камера остановлена');
    },

    _startDetection() {
        if (this.detectionInterval) clearInterval(this.detectionInterval);
        const frequency = UISettings.get('frequency') || 5;
        const intervalMs = Math.max(500, frequency * 1000);

        this.detectionInterval = setInterval(async () => {
            if (!this.cameraActive) return;
            try {
                const detections = await Detection.detect(Camera.videoElement);
                Detection.drawBoxes(Camera.ctx, detections);
                this._updateStatus(detections);
                this._speakWithPriority(detections);

                const warnings = Safety.checkAllObjects(detections);
                if (warnings.length > 0 && Date.now() - this.lastSpokenTime > 2000) {
                    warnings.forEach(w => Speech.speak(w, true));
                    this.lastSpokenTime = Date.now();
                }
            } catch (e) {
                console.warn('Ошибка детекции:', e);
            }
        }, intervalMs);
    },

    _stopDetection() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
        if (Camera.ctx) {
            Camera.ctx.clearRect(0, 0, Camera.overlayCanvas.width, Camera.overlayCanvas.height);
        }
    },

    _updateStatus(detections) {
        const status = document.getElementById('status');
        if (!status) return;
        if (detections.length === 0) {
            status.textContent = '✨ Ничего не вижу';
            return;
        }
        const names = detections.slice(0, 3).map(d => Translations.get(d.class)).join(', ');
        status.textContent = `🔍 ${names}`;
    },

    describeScene() {
        if (this.descriptionCooldown) return;
        this.descriptionCooldown = true;
        Speech.speak('осматриваюсь');
        UICore.log('🔍 Описание сцены');
        setTimeout(() => { this.descriptionCooldown = false; }, 5000);
    },

    calibrate() {
        Speech.speak('встаньте на метр');
        UICore.log('📏 Калибровка: встаньте на расстоянии 1 метра');
        setTimeout(async () => {
            if (!this.cameraActive) return;
            const detections = await Detection.detect(Camera.videoElement);
            const person = detections.find(d => d.class === 'person');
            if (person) {
                Calibration.calibrate(person.bbox[2], 'person');
                Speech.speak('калибровка завершена');
                UICore.log('✅ Калибровка выполнена');
            } else {
                Speech.speak('не вижу человека');
                UICore.log('⚠️ Человек не найден');
            }
        }, 500);
    },

    _speakWithPriority(detections) {
        if (detections.length === 0) return;
        const now = Date.now();
        if (now - this.lastSpokenTime < 2000) return;

        const sorted = [...detections].sort((a, b) => {
            const getPriority = (d) => {
                if (d.class === 'person') return 1;
                if (['car', 'truck', 'bus', 'motorcycle'].includes(d.class)) return 2;
                return 3;
            };
            return getPriority(a) - getPriority(b);
        });

        const topObjects = sorted.slice(0, 3);
        const descriptions = topObjects.map(obj => {
            const name = Translations.get(obj.class);
            if (Calibration.isCalibrated()) {
                const distance = Calibration.estimateDistance(obj.bbox[2], obj.class);
                const direction = Calibration.getDirection(obj.bbox[0], obj.bbox[2], Camera.overlayCanvas?.width || 640);
                let distText = '';
                if (distance !== null && distance < 5) {
                    if (distance < 0.8) distText = 'вплотную';
                    else if (distance < 1.5) distText = 'близко';
                    else distText = `${Math.round(distance)}м`;
                }
                return [name, direction, distText].filter(Boolean).join(' ');
            } else {
                return name;
            }
        });

        let message = '';
        if (descriptions.length === 1) message = descriptions[0];
        else if (descriptions.length === 2) message = descriptions.join(' и ');
        else message = descriptions.slice(0, -1).join(', ') + ' и ' + descriptions[descriptions.length - 1];

        if (descriptions.length > 2) {
            const firstPart = descriptions.slice(0, 2).join(', ');
            const lastPart = descriptions[2];
            Speech.speak(firstPart);
            setTimeout(() => Speech.speak(lastPart), 100);
        } else {
            Speech.speak(message);
        }
        this.lastSpokenTime = now;
    }
};

window.GuideMe = GuideMe;

window.addEventListener('load', () => {
    GuideMe.init();
});