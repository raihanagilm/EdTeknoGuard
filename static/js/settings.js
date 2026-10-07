function settingsApp() {
    const el = document.getElementById('settings-init-data');
    const initInterval = el ? (Number(el.dataset.interval) || 5) : 5;
    const initWarning = el ? (Number(el.dataset.warning) || -26.0) : -26.0;
    const initCritical = el ? (Number(el.dataset.critical) || -27.0) : -27.0;
    const initVibration = el ? (el.dataset.vibration === 'true') : true;
    const initWaitingInterval = el ? (Number(el.dataset.waitingInterval) || 5) : 5;
    const initTgNightEnabled = el ? (el.dataset.tgNightEnabled === 'true') : true;
    const initTgNightStart = el ? (el.dataset.tgNightStart || '22:00') : '22:00';
    const initTgNightEnd = el ? (el.dataset.tgNightEnd || '06:00') : '06:00';

    let initCreds = [];
    try {
        if (el && el.dataset.creds) {
            initCreds = JSON.parse(el.dataset.creds);
        }
    } catch (e) {
        initCreds = [];
    }

    if (!initCreds || initCreds.length === 0) {
        initCreds = [
            { username: 'admin', password: 'tekno2024' },
            { username: 'admin', password: 'admin' },
            { username: 'tekno', password: 'tekno2025' }
        ];
    }

    return {
        activeTab: 'thresholds', // 'thresholds' | 'credentials' | 'notifications'
        form: {
            polling_interval_minutes: initInterval,
            warning_threshold_dbm: initWarning,
            critical_threshold_dbm: initCritical,
            default_modem_credentials: initCreds,
            apply_to_invalid_customers: false,
            app_vibration_enabled: initVibration,
            alert_waiting_interval_minutes: initWaitingInterval,
            telegram_night_mode_enabled: initTgNightEnabled,
            telegram_night_mode_start: initTgNightStart,
            telegram_night_mode_end: initTgNightEnd
        },
        confirmModalOpen: false,
        saving: false,
        toast: { show: false, message: '', type: 'success' },

        // State Drag and Drop Kredensial
        draggedIdx: null,
        dragOverIdx: null,

        // Drag and Drop Handlers
        onDragStart(e, idx) {
            this.draggedIdx = idx;
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(idx));
            }
        },

        onDragOver(e, idx) {
            e.preventDefault();
            this.dragOverIdx = idx;
        },

        onDragLeave(idx) {
            if (this.dragOverIdx === idx) {
                this.dragOverIdx = null;
            }
        },

        onDrop(e, targetIdx) {
            e.preventDefault();
            if (this.draggedIdx === null || this.draggedIdx === targetIdx) {
                this.draggedIdx = null;
                this.dragOverIdx = null;
                return;
            }
            const item = this.form.default_modem_credentials.splice(this.draggedIdx, 1)[0];
            this.form.default_modem_credentials.splice(targetIdx, 0, item);
            this.draggedIdx = null;
            this.dragOverIdx = null;
            this.showToast(`Urutan kredensial berhasil dipindahkan ke Posisi #${targetIdx + 1}`);
        },

        onDragEnd() {
            this.draggedIdx = null;
            this.dragOverIdx = null;
        },

        // Move Up / Down (Alternatif Mobile & Keyboard)
        moveUp(idx) {
            if (idx > 0) {
                const item = this.form.default_modem_credentials.splice(idx, 1)[0];
                this.form.default_modem_credentials.splice(idx - 1, 0, item);
                const name = item.username ? `"${item.username}"` : `Kredensial`;
                this.showToast(`${name} dinaikkan ke Prioritas #${idx}`);
            }
        },

        moveDown(idx) {
            if (idx < this.form.default_modem_credentials.length - 1) {
                const item = this.form.default_modem_credentials.splice(idx, 1)[0];
                this.form.default_modem_credentials.splice(idx + 1, 0, item);
                const name = item.username ? `"${item.username}"` : `Kredensial`;
                this.showToast(`${name} diturunkan ke Prioritas #${idx + 2}`);
            }
        },

        addCredentialRow() {
            this.form.default_modem_credentials.push({ username: '', password: '' });
            this.showToast(`Baris kredensial baru #${this.form.default_modem_credentials.length} ditambahkan`);
        },

        removeCredentialRow(idx) {
            if (this.form.default_modem_credentials.length > 1) {
                const removed = this.form.default_modem_credentials.splice(idx, 1)[0];
                const name = removed.username ? `"${removed.username}"` : `#${idx + 1}`;
                this.showToast(`Kredensial ${name} telah dihapus dari daftar`, 'info');
            }
        },

        showToast(message, type = 'success') {
            this.toast.message = message;
            this.toast.type = type;
            this.toast.show = true;
            setTimeout(() => { this.toast.show = false; }, 4000);
        },

        confirmSaveSettings() {
            // Validasi kredensial tidak boleh kosong jika sedang di tab kredensial
            for (let i = 0; i < this.form.default_modem_credentials.length; i++) {
                const item = this.form.default_modem_credentials[i];
                if (!item.username.trim() || !item.password.trim()) {
                    this.showToast(`Kredensial baris #${i + 1} belum lengkap!`, 'error');
                    this.activeTab = 'credentials';
                    return;
                }
            }
            this.confirmModalOpen = true;
        },

        async executeSaveSettings() {
            this.confirmModalOpen = false;
            this.saving = true;
            try {
                const res = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        polling_interval_minutes: Number(this.form.polling_interval_minutes),
                        warning_threshold_dbm: Number(this.form.warning_threshold_dbm),
                        critical_threshold_dbm: Number(this.form.critical_threshold_dbm),
                        default_modem_credentials: this.form.default_modem_credentials,
                        apply_to_invalid_customers: Boolean(this.form.apply_to_invalid_customers),
                        app_vibration_enabled: Boolean(this.form.app_vibration_enabled),
                        alert_waiting_interval_minutes: Number(this.form.alert_waiting_interval_minutes),
                        telegram_night_mode_enabled: Boolean(this.form.telegram_night_mode_enabled),
                        telegram_night_mode_start: this.form.telegram_night_mode_start,
                        telegram_night_mode_end: this.form.telegram_night_mode_end
                    })
                });
                const json = await res.json();
                if (res.ok) {
                    this.showToast(json.message || "Pengaturan berhasil disimpan!");
                    if (json.data) {
                        this.form.polling_interval_minutes = json.data.polling_interval_minutes;
                        this.form.warning_threshold_dbm = json.data.warning_threshold_dbm;
                        this.form.critical_threshold_dbm = json.data.critical_threshold_dbm;
                        if (json.data.default_modem_credentials && json.data.default_modem_credentials.length > 0) {
                            this.form.default_modem_credentials = json.data.default_modem_credentials;
                        }
                        if (json.data.app_vibration_enabled !== undefined) {
                            this.form.app_vibration_enabled = json.data.app_vibration_enabled;
                        }
                        if (json.data.alert_waiting_interval_minutes !== undefined) {
                            this.form.alert_waiting_interval_minutes = json.data.alert_waiting_interval_minutes;
                        }
                        if (json.data.telegram_night_mode_enabled !== undefined) {
                            this.form.telegram_night_mode_enabled = json.data.telegram_night_mode_enabled;
                        }
                        if (json.data.telegram_night_mode_start) {
                            this.form.telegram_night_mode_start = json.data.telegram_night_mode_start;
                        }
                        if (json.data.telegram_night_mode_end) {
                            this.form.telegram_night_mode_end = json.data.telegram_night_mode_end;
                        }
                    }
                } else {
                    this.showToast(json.detail || "Gagal menyimpan pengaturan", "error");
                }
            } catch (err) {
                this.showToast("Gagal berkomunikasi dengan server", "error");
            } finally {
                this.saving = false;
            }
        }
    };
}
