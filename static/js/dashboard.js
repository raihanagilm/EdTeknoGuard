// EdTeknoGuard Dashboard Alpine.js Application
document.addEventListener('alpine:init', () => {
    Alpine.data('dashboardApp', () => ({
        // State Engine & Kontrol
        engineStatus: 'RUNNING',
        lastScanTime: '',
        intervalMinutes: Number(document.getElementById('dashboard-container')?.dataset?.pollingInterval) || 5,
        isScanning: false,
        isToggling: false,
        scanningSingleId: null,

        // Toast Notification State
        toast: { show: false, message: '', type: 'success' },

        // Metrik KPI
        kpi: {
            total_monitored: 0,
            normal: 0,
            warning: 0,
            critical: 0,
            los: 0
        },

        // State Grafik
        chartRange: 'today',
        selectedDate: new Date().toISOString().split('T')[0],
        todayDate: new Date().toISOString().split('T')[0],
        minDate: document.getElementById('dashboard-container')?.dataset?.minDate || '2026-09-01',
        chartInstance: null,
        chartStats: {
            avg_dbm: null,
            min_dbm: null,
            max_dbm: null,
            total_points: 0
        },

        init() {
            this.fetchStatus();
            this.fetchKpi();
            this.initChart();

            // Refresh status berkala tiap 30 detik
            setInterval(() => {
                this.fetchStatus();
                this.fetchKpi();
            }, 30000);
        },

        showToast(message, type = 'success') {
            this.toast.message = message;
            this.toast.type = type;
            this.toast.show = true;
            setTimeout(() => {
                this.toast.show = false;
            }, 4500);
        },

        async fetchStatus() {
            try {
                const res = await fetch('/api/monitoring/status');
                if (res.ok) {
                    const data = await res.json();
                    this.engineStatus = data.status || 'RUNNING';
                    this.lastScanTime = data.last_scan_time || '-';
                    this.isScanning = data.is_scanning || false;
                    if (data.interval_minutes) {
                        this.intervalMinutes = data.interval_minutes;
                    }
                }
            } catch (err) {
                console.error('Gagal mengambil status engine:', err);
            }
        },

        async fetchKpi() {
            try {
                const res = await fetch('/api/monitoring/kpi');
                if (res.ok) {
                    const data = await res.json();
                    this.kpi = data;
                }
            } catch (err) {
                console.error('Gagal mengambil metrik KPI:', err);
            }
        },

        // Tombol Kontrol Tunggal Cerdas (Start/Scan vs Jeda)
        async handleSmartControl() {
            if (this.isScanning || this.isToggling) return;

            if (this.engineStatus === 'RUNNING') {
                // Sedang berjalan -> Jeda engine
                await this.toggleEngine();
                this.showToast('Pemantauan otomatis dijeda (STOPPED)', 'info');
            } else {
                // Sedang berhenti -> Aktifkan engine dan langsung jalankan scan
                await this.toggleEngine();
                this.showToast('Pemantauan otomatis diaktifkan dan pemindaian dimulai!', 'success');
                await this.triggerScanAll();
            }
        },

        async toggleEngine() {
            this.isToggling = true;
            try {
                const res = await fetch('/api/monitoring/toggle-scheduler', { method: 'POST' });
                if (res.ok) {
                    const data = await res.json();
                    this.engineStatus = data.scheduler_status;
                    if (data.interval_minutes) {
                        this.intervalMinutes = data.interval_minutes;
                    }
                }
            } catch (err) {
                console.error('Gagal toggle engine:', err);
                this.showToast('Gagal mengubah status pemantauan', 'error');
            } finally {
                this.isToggling = false;
            }
        },

        async triggerScanAll() {
            this.isScanning = true;
            try {
                const res = await fetch('/api/monitoring/scan-all', { method: 'POST' });
                if (res.ok) {
                    await this.fetchStatus();
                    await this.fetchKpi();
                    await this.loadChartData();
                    this.showToast('Pemindaian seluruh ONT jaringan selesai!', 'success');
                } else {
                    this.showToast('Pemindaian sedang berjalan di latar belakang', 'info');
                }
            } catch (err) {
                console.error('Gagal scan all:', err);
                this.showToast('Gagal memicu pemindaian ONT', 'error');
            } finally {
                this.isScanning = false;
            }
        },

        initChart() {
            const ctx = document.getElementById('redamanChart');
            if (!ctx) return;

            // Plugin garis ambang batas horizontal (-26.0 dBm Warning & -27.0 dBm Kritis)
            const horizontalThresholdPlugin = {
                id: 'horizontalThresholdPlugin',
                afterDraw(chart) {
                    const { ctx, chartArea, scales: { y } } = chart;
                    if (!chartArea || !y) return;
                    const { left, right } = chartArea;

                    ctx.save();

                    // 1. Garis Warning (-26.0 dBm)
                    const yWarn = y.getPixelForValue(-26.0);
                    if (yWarn >= chartArea.top && yWarn <= chartArea.bottom) {
                        ctx.strokeStyle = '#F59E0B'; // Amber
                        ctx.lineWidth = 1.5;
                        ctx.setLineDash([5, 5]);
                        ctx.beginPath();
                        ctx.moveTo(left, yWarn);
                        ctx.lineTo(right, yWarn);
                        ctx.stroke();

                        ctx.fillStyle = '#D97706';
                        ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
                        ctx.textAlign = 'right';
                        ctx.fillText('Warning: -26.0 dBm', right - 10, yWarn - 5);
                    }

                    // 2. Garis Kritis / Bahaya (-27.0 dBm)
                    const yCrit = y.getPixelForValue(-27.0);
                    if (yCrit >= chartArea.top && yCrit <= chartArea.bottom) {
                        ctx.strokeStyle = '#EF4444'; // Rose / Merah
                        ctx.lineWidth = 1.5;
                        ctx.setLineDash([3, 3]);
                        ctx.beginPath();
                        ctx.moveTo(left, yCrit);
                        ctx.lineTo(right, yCrit);
                        ctx.stroke();

                        ctx.fillStyle = '#DC2626';
                        ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
                        ctx.textAlign = 'right';
                        ctx.fillText('Kritis: -27.0 dBm', right - 10, yCrit + 13);
                    }

                    ctx.restore();
                }
            };

            this.chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Nilai Redaman Rata-rata',
                            data: [],
                            borderColor: '#4F46E5',
                            backgroundColor: 'rgba(79, 70, 229, 0.12)',
                            borderWidth: 2.5,
                            fill: true,
                            tension: 0.35,
                            pointRadius: 6,
                            pointHoverRadius: 9,
                            pointBackgroundColor: '#4F46E5',
                            pointBorderColor: '#FFFFFF',
                            pointBorderWidth: 2.5,
                            showLine: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    scales: {
                        y: {
                            // Orientasi telekomunikasi standar: -10 dBm (bagus) di atas, -35 dBm (drop) di bawah
                            reverse: false,
                            min: -35,
                            max: -10,
                            ticks: {
                                stepSize: 5,
                                callback: val => val + ' dBm',
                                color: '#64748B',
                                font: { size: 11, family: 'Plus Jakarta Sans', weight: '600' }
                            },
                            grid: {
                                color: '#F1F5F9'
                            }
                        },
                        x: {
                            ticks: {
                                color: '#64748B',
                                font: { size: 11, family: 'Plus Jakarta Sans' },
                                maxRotation: 0,
                                autoSkip: true,
                                maxTicksLimit: 12
                            },
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#0F172A',
                            titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' },
                            bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
                            padding: 12,
                            cornerRadius: 10,
                            callbacks: {
                                label: ctx => {
                                    if (ctx.parsed.y === null || isNaN(ctx.parsed.y)) return 'Tidak ada data';
                                    return `Rata-rata: ${ctx.parsed.y.toFixed(2)} dBm`;
                                }
                            }
                        }
                    }
                },
                plugins: [horizontalThresholdPlugin]
            });

            this.loadChartData();
        },

        async switchChartRange(range) {
            this.chartRange = range;
            const now = new Date();
            if (range === 'today') {
                this.selectedDate = now.toISOString().split('T')[0];
            } else if (range === 'yesterday') {
                const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                this.selectedDate = y.toISOString().split('T')[0];
            }
            await this.loadChartData();
        },

        async onDateSelect() {
            if (this.selectedDate) {
                this.chartRange = 'custom';
                await this.loadChartData();
            }
        },

        async loadChartData() {
            if (!this.chartInstance) return;
            try {
                let url = `/api/monitoring/chart-data?range=${encodeURIComponent(this.chartRange)}`;
                if (this.selectedDate) {
                    url += `&date=${encodeURIComponent(this.selectedDate)}`;
                }

                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    const rawLabels = json.labels || [];
                    const rawValues = json.values || [];

                    this.chartInstance.data.labels = rawLabels;
                    this.chartInstance.data.datasets[0].data = rawValues;

                    // Update metadata statistik grafik
                    this.chartStats = {
                        avg_dbm: json.avg_dbm,
                        min_dbm: json.min_dbm,
                        max_dbm: json.max_dbm,
                        total_points: json.total_points || 0
                    };

                    this.chartInstance.update();
                }
            } catch (err) {
                console.error('Gagal memuat data grafik:', err);
            }
        }
    }));
});
