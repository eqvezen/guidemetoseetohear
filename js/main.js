const GuideMe = {
    cameraActive: false,
    detectionInterval: null,
    lastSpokenTime: 0,

    async init() {
        Camera.init('video', 'overlay');
        Speech.init();
        Calibration.init();
        UICore.init();
        UIControls.init();
        UISettings.init();

        const modelLoaded = await Detection.init();
        if (modelLoaded) console.log('Модель загружена');

        this._setupCallbacks();
        
        // Запуск голосовых команд (если есть)
        if (VoiceCommand && VoiceCommand.init) {
            try { await VoiceCommand.init(); } catch(e) { console.warn(e); }
        }

        setTimeout(() => Speech.speak('я готова'), 1500);
    },

    _setupCallbacks() {
        // Кнопка включения/выключения камеры
        const toggleBtn = document.getElementById('cameraToggleBtn');
        if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggleCamera());

        // Кнопки в настройках
        const calibrateBtn = document.getElementById('calibrateBtn');
        if (calibrateBtn) calibrateBtn.addEventListener('click', () => this.calibrate());

        const testVoiceBtn = document.getElementById('testVoiceBtn');
        if (testVoiceBtn) testVoiceBtn.addEventListener('click', () => Speech.test());

        const settingsBtn = document.getElementById('settingsBtn');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        if (settingsBtn) settingsBtn.addEventListener('click', () => UISettings.togglePanel());
        if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => UISettings.togglePanel());
    },

    async toggleCamera() {
        if (this.cameraActive) {
            await this.stopCamera();
        } else {
            await this.startCamera();
        }
    },

    async startCamera() {
        try {
            await Camera.start();
            this.cameraActive = true;
            Speech.speak('камера запущена');
            this._startDetection();
            const btn = document.getElementById('cameraToggleBtn');
            if (btn) btn.textContent = '⏹ Остановить камеру';
        } catch (e) {
            Speech.speak('ошибка камеры');
        }
    },

    async stopCamera() {
        Camera.stop();
        this.cameraActive = false;
        Speech.speak('камера остановлена');
        this._stopDetection();
        const btn = document.getElementById('cameraToggleBtn');
        if (btn) btn.textContent = '▶ Запустить камеру';
    },

    _startDetection() {
        if (this.detectionInterval) clearInterval(this.detectionInterval);
        // Обновление каждые 500 мс для быстрой реакции
        this.detectionInterval = setInterval(async () => {
            if (!this.cameraActive) return;
            const detections = await Detection.detect(Camera.videoElement);
            Detection.drawBoxes(Camera.ctx, detections);
            this._speakWithPriority(detections);
        }, 500);
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

    _speakWithPriority(detections) {
        if (detections.length === 0) return;
        const now = Date.now();
        if (now - this.lastSpokenTime < 1500) return; // чуть меньше задержка между фразами

        const person = detections.find(d => d.class === 'person');
        if (person) {
            this._speakWithDistance(person, 'человек');
            this.lastSpokenTime = now;
            return;
        }
        const car = detections.find(d => ['car', 'truck', 'bus', 'motorcycle'].includes(d.class));
        if (car) {
            this._speakWithDistance(car, 'машина');
            this.lastSpokenTime = now;
            return;
        }
        const first = detections[0];
        Speech.speak(Translations.get(first.class));
        this.lastSpokenTime = now;
    },

    _speakWithDistance(obj, typeName) {
        if (!Calibration.isCalibrated()) {
            Speech.speak(typeName);
            return;
        }
        const distance = Calibration.estimateDistance(obj.bbox[2], obj.class);
        const direction = Calibration.getDirection(obj.bbox[0], obj.bbox[2], Camera.overlayCanvas?.width || 640);
        let message = typeName;
        if (distance !== null && distance < 5) {
            if (distance < 0.8) message = `${typeName} вплотную ${direction}`;
            else if (distance < 1.5) message = `${typeName} близко ${direction}`;
            else message = `${typeName} ${direction} ${Math.round(distance)}м`;
        } else {
            message = `${typeName} ${direction}`;
        }
        Speech.speak(message);
    },

    calibrate() {
        Speech.speak('встаньте на метр');
        setTimeout(async () => {
            if (!this.cameraActive) return;
            const detections = await Detection.detect(Camera.videoElement);
            const person = detections.find(d => d.class === 'person');
            if (person) {
                Calibration.calibrate(person.bbox[2], 'person');
                Speech.speak('калибровка завершена');
            } else {
                Speech.speak('не вижу человека');
            }
        }, 500);
    }
};

window.GuideMe = GuideMe;
window.addEventListener('load', () => GuideMe.init());