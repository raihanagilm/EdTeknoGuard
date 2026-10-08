/**
 * TeknoGuard - Master Base Layout Application Script
 * File: /static/js/app.js
 */

function teknoGuardApp() {
    return {
        sidebarCollapsed: localStorage.getItem('tekno_sidebar_collapsed') === 'true',
        profileMenuOpen: false,
        notificationModalOpen: false,
        recentTickets: [],
        unreadTicketsCount: 0,
        isInitialized: false,
        lastAlertedTicketId: parseInt(sessionStorage.getItem('tekno_last_alerted_ticket') || '0', 10),
        pollTimer: null,
        realtimeAlert: {
            show: false,
            id: null,
            id_tiket: '',
            title: '',
            desc: ''
        },
        pausedReminder: {
            show: false,
            title: '',
            message: '',
            paused_hours: 1
        },
        
        init() {
            this.pollNotifications();
            this.pollTimer = setInterval(() => {
                this.pollNotifications();
            }, 15000);

            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.pollNotifications();
                }
            });
        },

        toggleSidebar() {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            localStorage.setItem('tekno_sidebar_collapsed', this.sidebarCollapsed);
        },

        dismissAlert() {
            this.realtimeAlert.show = false;
            if (this.realtimeAlert.id) {
                this.lastAlertedTicketId = this.realtimeAlert.id;
                sessionStorage.setItem('tekno_last_alerted_ticket', this.realtimeAlert.id.toString());
            }
        },

        playNotificationSound() {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                const ctx = new AudioContext();
                
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(880, ctx.currentTime);
                gain1.gain.setValueAtTime(0.3, ctx.currentTime);
                gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                osc1.start();
                osc1.stop(ctx.currentTime + 0.25);

                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.15);
                gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.15);
                gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.start(ctx.currentTime + 0.15);
                osc2.stop(ctx.currentTime + 0.45);
            } catch (e) {
                console.warn('Audio play error:', e);
            }
        },

        triggerHaptic() {
            if (navigator.vibrate) {
                try {
                    navigator.vibrate([250, 100, 250]);
                } catch(e) {}
            }
        },

        async pollNotifications() {
            if (document.hidden) return;

            try {
                const res = await fetch('/api/notifications/poll');
                if (!res.ok) return;
                const data = await res.json();
                if (data.status === 'success' || data.status === 'ok') {
                    const newCount = data.unread_tickets_count || 0;
                    this.recentTickets = data.recent_tickets || [];
                    const latest = data.latest_ticket;

                    if (latest) {
                        const currentId = parseInt(latest.id || 0, 10);
                        const config = data.notification_config || {};
                        const vibrationEnabled = config.vibration_enabled !== false;
                        const waitingIntervalMin = config.alert_waiting_interval_minutes || 5;

                        let isNightQuiet = false;
                        if (config.night_mode_enabled && config.night_mode_start && config.night_mode_end) {
                            try {
                                const now = new Date();
                                const currentHM = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
                                const startHM = config.night_mode_start;
                                const endHM = config.night_mode_end;
                                if (startHM <= endHM) {
                                    isNightQuiet = currentHM >= startHM && currentHM < endHM;
                                } else {
                                    isNightQuiet = currentHM >= startHM || currentHM < endHM;
                                }
                            } catch(e) {}
                        }

                        const nowTs = Date.now();
                        const lastRemindTs = parseInt(sessionStorage.getItem('tekno_last_waiting_remind') || '0', 10);
                        const isRepeatDue = (nowTs - lastRemindTs) >= (waitingIntervalMin * 60 * 1000);

                        const isNewTicket = this.isInitialized && (currentId > this.lastAlertedTicketId);
                        const shouldRepeatWaitingAlert = this.isInitialized && !isNewTicket && (newCount > 0) && isRepeatDue;

                        if (isNewTicket || shouldRepeatWaitingAlert) {
                            this.realtimeAlert = {
                                show: true,
                                id: currentId,
                                id_tiket: latest.id_tiket,
                                title: (shouldRepeatWaitingAlert ? '[PENGINGAT ' + waitingIntervalMin + 'm] ' : '') + (latest.nama_pelanggan || 'Pelanggan') + ': ' + (latest.kategori || latest.jenis_kendala || 'Keluhan'),
                                desc: (shouldRepeatWaitingAlert ? 'Aduan warga masih MENUNGGU penanganan teknisi. ' : '') + (latest.deskripsi || latest.deskripsi_kendala || 'Tiket keluhan baru telah dikirimkan oleh pelanggan.')
                            };

                            if (!isNightQuiet) {
                                this.playNotificationSound();
                            }

                            if (vibrationEnabled) {
                                this.triggerHaptic();
                            }

                            if (currentId > this.lastAlertedTicketId) {
                                this.lastAlertedTicketId = currentId;
                                sessionStorage.setItem('tekno_last_alerted_ticket', currentId.toString());
                            }
                            if (shouldRepeatWaitingAlert || isNewTicket) {
                                sessionStorage.setItem('tekno_last_waiting_remind', nowTs.toString());
                            }

                            setTimeout(() => {
                                if (this.realtimeAlert.id === currentId) {
                                    this.realtimeAlert.show = false;
                                }
                            }, 10000);
                        } else if (!this.isInitialized) {
                            if (currentId > this.lastAlertedTicketId) {
                                this.lastAlertedTicketId = currentId;
                                sessionStorage.setItem('tekno_last_alerted_ticket', currentId.toString());
                            }
                            sessionStorage.setItem('tekno_last_waiting_remind', nowTs.toString());
                            this.isInitialized = true;
                        }
                    } else {
                        this.isInitialized = true;
                    }

                    this.unreadTicketsCount = newCount;

                    if (data.paused_reminder && data.paused_reminder.show) {
                        this.pausedReminder = {
                            show: true,
                            title: data.paused_reminder.title || 'Pemantauan Otomatis Dijeda',
                            message: data.paused_reminder.message || 'Pemantauan otomatis saat ini sedang dijeda.',
                            paused_hours: data.paused_reminder.paused_hours || 1
                        };
                    } else {
                        this.pausedReminder.show = false;
                    }
                }
            } catch (e) {
                // Silent network error
            }
        },

        async activateSchedulerFromReminder() {
            try {
                const res = await fetch('/api/monitoring/toggle-scheduler', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (data.status === 'success' || data.scheduler_status === 'RUNNING') {
                    this.pausedReminder.show = false;
                    window.location.reload();
                }
            } catch(e) {
                console.error('Gagal mengaktifkan scheduler:', e);
            }
        },

        async snoozeSchedulerReminder() {
            try {
                await fetch('/api/monitoring/snooze-pause-reminder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch(e) {}
            this.pausedReminder.show = false;
        }
    };
}

// --- Global Page Transition Loading Handler ---
(function() {
    function initLoader() {
        const loader = document.getElementById('global-page-loader');
        if (!loader) return;

        let safetyTimer = null;

        function startLoader() {
            if (safetyTimer) clearTimeout(safetyTimer);
            loader.classList.remove('finished');
            loader.classList.add('loading');
            
            // Safety timeout: jika halaman tidak berpindah dalam 3 detik, otomatis sembunyikan loader
            safetyTimer = setTimeout(stopLoader, 3000);
        }

        function stopLoader() {
            if (safetyTimer) clearTimeout(safetyTimer);
            loader.classList.remove('loading');
            loader.classList.add('finished');
            setTimeout(() => {
                loader.classList.remove('finished');
            }, 300);
        }

        // Pastikan loader selalu hilang saat halaman siap
        stopLoader();
        window.addEventListener('DOMContentLoaded', stopLoader);
        window.addEventListener('pageshow', stopLoader);
        window.addEventListener('load', stopLoader);

        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href) return;

            if (
                href.startsWith('#') ||
                href.startsWith('javascript:') ||
                link.hasAttribute('download') ||
                link.getAttribute('target') === '_blank' ||
                link.hasAttribute('@click') ||
                link.hasAttribute('x-on:click') ||
                link.getAttribute('role') === 'button'
            ) {
                return;
            }

            try {
                const targetUrl = new URL(link.href, window.location.origin);
                // Hanya picu jika navigasi ke halaman baru dalam domain yang sama
                if (targetUrl.origin === window.location.origin && targetUrl.pathname !== window.location.pathname) {
                    startLoader();
                }
            } catch (err) {
                // Ignore parse errors
            }
        });

        window.addEventListener('beforeunload', function() {
            startLoader();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLoader);
    } else {
        initLoader();
    }
})();
