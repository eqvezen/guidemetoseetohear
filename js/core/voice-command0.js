const VoiceCommand = {
    init() {
        console.log('🎤 Voice Command загружен (режим ожидания)');
        UICore.log('🎤 Голосовые команды будут добавлены в следующем обновлении');
        return this;
    }
};

window.VoiceCommand = VoiceCommand;