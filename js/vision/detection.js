// ============================================
// detection.js — распознавание объектов через COCO-SSD
// ============================================

const Detection = {
    model: null,
    modelLoaded: false,
    confidence: 0.4,
    videoWidth: 640,
    videoHeight: 480,
    
    async init() {
        console.log('🔍 Detection: загрузка модели COCO-SSD...');
        
        try {
            // Загружаем модель
            this.model = await cocoSsd.load({
                base: 'mobilenet_v2'
            });
            
            this.modelLoaded = true;
            console.log('✅ Модель COCO-SSD загружена');
            
            // Обновляем UI
            if (UICore) {
                UICore.updateModelStatus(true);
                UICore.log('✅ Модель распознавания готова');
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки модели:', error);
            this.modelLoaded = false;
            
            if (UICore) {
                UICore.updateModelStatus(false);
                UICore.log('❌ Ошибка загрузки модели: ' + error.message, 'error');
            }
            
            return false;
        }
    },
    
    async detect(videoElement) {
        // Проверки
        if (!this.modelLoaded || !this.model) {
            return [];
        }
        
        if (!videoElement || videoElement.readyState < 2) {
            return [];
        }
        
        try {
            // Запоминаем размеры видео для отрисовки
            if (videoElement.videoWidth) {
                this.videoWidth = videoElement.videoWidth;
                this.videoHeight = videoElement.videoHeight;
            }
            
            // Запускаем распознавание
            const predictions = await this.model.detect(videoElement);
            
            // Фильтруем по уверенности
            const filtered = predictions.filter(p => p.score >= this.confidence);
            
            // Форматируем результат
            return filtered.map(p => ({
                class: p.class,
                score: p.score,
                bbox: p.bbox  // [x, y, width, height]
            }));
            
        } catch (error) {
            console.warn('Ошибка распознавания:', error);
            return [];
        }
    },
    
    drawBoxes(ctx, detections) {
        if (!ctx || !detections || detections.length === 0) return;
        
        // Очищаем canvas
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Рисуем рамки для каждого объекта
        detections.forEach(det => {
            const [x, y, width, height] = det.bbox;
            const score = Math.round(det.score * 100);
            
            // Выбираем цвет рамки
            let color = '#4CAF50'; // зелёный по умолчанию
            if (det.class === 'person') {
                color = '#2196F3'; // синий для людей
            } else if (['car', 'truck', 'bus', 'motorcycle'].includes(det.class)) {
                color = '#F44336'; // красный для машин
            } else if (['dog', 'cat'].includes(det.class)) {
                color = '#FF9800'; // оранжевый для животных
            }
            
            // Рисуем рамку
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
            
            // Рисуем фон для текста
            ctx.fillStyle = color;
            ctx.font = '14px Arial';
            const text = `${det.class} ${score}%`;
            const textWidth = ctx.measureText(text).width;
            ctx.fillRect(x, y - 20, textWidth + 8, 20);
            
            // Рисуем текст
            ctx.fillStyle = '#fff';
            ctx.fillText(text, x + 4, y - 6);
        });
    },
    
    updateSettings(settings) {
        if (settings.confidence !== undefined) {
            this.confidence = settings.confidence;
            console.log(`Detection: уверенность = ${this.confidence}`);
        }
    },
    
    isReady() {
        return this.modelLoaded && this.model !== null;
    }
};

window.Detection = Detection;