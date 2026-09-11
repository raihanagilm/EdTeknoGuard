// Instance Chart.js disimpan di luar objek reaktif Alpine.js
// untuk mencegah RangeError (Maximum call stack size exceeded akibat Proxy wrapper Alpine)
let redamanChart = null;

// Transformasi Non-linear Sumbu Y (Piecewise Stretched Scale)
// Rentang normal dari 0 s/d -32 dBm, dengan rentang -25.0 s/d -27.0 dBm dibuat lebar/renggang
const TICK_DBM_LIST = [0, 5, 10, 15, 20, 24, 25.0, 25.5, 26.0, 26.5, 27.0, 28.0, 30.0, 32.0];

function transformDbm(val) {
    if (val === null || val === undefined || isNaN(val)) return null;
    const v = Math.abs(Number(val));
    if (v <= 25.0) {
        // 0 s/d 25 dBm menempati 0 s/d 30 unit (normal)
        return (v / 25.0) * 30.0;
    } else if (v <= 27.0) {
        // 25 s/d 27 dBm menempati 30 s/d 75 unit (45% tinggi grafik - SANGAT LEBAR & RENGGANG)
        return 30.0 + ((v - 25.0) / 2.0) * 45.0;
    } else {
        // 27 s/d 32 dBm menempati 75 s/d 100 unit
        const clamped = Math.min(v, 32.0);
        return 75.0 + ((clamped - 27.0) / 5.0) * 25.0;
    }
}

function inverseTransformDbm(u) {
    if (u <= 30.0) {
        return (u / 30.0) * 25.0;
    } else if (u <= 75.0) {
        return 25.0 + ((u - 30.0) / 45.0) * 2.0;
    } else {
        return 27.0 + ((u - 75.0) / 25.0) * 5.0;
    }
}

document.addEventListener('alpine:init', () => {
    Alpine.data('dashboardApp', () => ({
        // State Engine & Kontrol
        engineStatus: 'RUNNING',
        lastScanTime: '',
        intervalMinutes: Number(document.getElementById('dashboard-container')?.dataset?.pollingInterval) || 10,
        isScanning: false,
        isToggling: false,
        isNetworkError: false,
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
        chartCounts: [],
        rawChartValues: [],
        chartStats: {
            avg_dbm: null,
            min_dbm: null,
            max_dbm: null,
            total_points: 0
        },

        init() {
            // Inisialisasi awal
            const initInterval = Number(document.getElementById('dashboard-container')?.dataset?.pollingInterval);
            if (initInterval) {
                this.intervalMinutes = initInterval;
            }

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
                    if (data.is_network_error !== undefined) {
                        this.isNetworkError = Boolean(data.is_network_error) || (this.kpi.total_monitored > 0 && this.kpi.los === this.kpi.total_monitored);
                    }
                    if (data.interval_minutes) {
                        this.intervalMinutes = data.interval_minutes;
                    }
                }
            } catch (err) {
                console.error('Gagal mengambil status engine:', err);
                this.isNetworkError = true;
            }
        },

        async fetchKpi() {
            try {
                const res = await fetch('/api/monitoring/kpi');
                if (res.ok) {
                    const data = await res.json();
                    this.kpi = data;
                    // Jika ada pelanggan terpantau dan semuanya mengalami LOS, atau terdeteksi network error
                    if (this.kpi.total_monitored > 0 && this.kpi.los === this.kpi.total_monitored) {
                        this.isNetworkError = true;
                    }
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
                const data = await res.json();

                if (data.status === 'error' && data.error_type === 'NETWORK_UNREACHABLE') {
                    this.isNetworkError = true;
                    this.showToast(data.message || 'Koneksi Gagal: Server tidak terhubung ke jaringan lokal/VLAN ISP ONT (10.10.x.x)!', 'error');
                } else if (res.ok && data.status !== 'error') {
                    this.isNetworkError = false;
                    await this.fetchStatus();
                    await this.fetchKpi();
                    await this.loadChartData();
                    this.showToast('Pemindaian seluruh ONT jaringan selesai!', 'success');
                } else {
                    this.showToast(data.message || 'Pemindaian sedang berjalan di latar belakang', 'info');
                }
            } catch (err) {
                console.error('Gagal scan all:', err);
                this.showToast('Koneksi Gagal: Tidak dapat menghubungi server / jaringan lokal ONT (10.10.x.x)', 'error');
                this.isNetworkError = true;
            } finally {
                this.isScanning = false;
                await this.fetchStatus();
                await this.fetchKpi();
            }
        },

        initChart() {
            const ctx = document.getElementById('redamanChart');
            if (!ctx) return;

            const self = this;

            // Inisialisasi Chart.js menggunakan variabel modul non-reaktif (redamanChart)
            redamanChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Nilai Redaman Rata-rata',
                            data: [],
                            borderColor: '#4F46E5',
                            backgroundColor: 'rgba(79, 70, 229, 0.12)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.35,
                            pointRadius: 6,
                            pointHoverRadius: 9,
                            pointBackgroundColor: '#4F46E5',
                            pointBorderColor: '#FFFFFF',
                            pointBorderWidth: 2.5,
                            showLine: true
                        },
                        {
                            label: 'Garis Warning (-26.0 dBm)',
                            data: [],
                            borderColor: '#F59E0B',
                            borderWidth: 2,
                            borderDash: [6, 6],
                            pointRadius: 0,
                            pointHoverRadius: 0,
                            fill: false,
                            tension: 0
                        },
                        {
                            label: 'Garis Kritis (-27.0 dBm)',
                            data: [],
                            borderColor: '#EF4444',
                            borderWidth: 2,
                            borderDash: [4, 4],
                            pointRadius: 0,
                            pointHoverRadius: 0,
                            fill: false,
                            tension: 0
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
                            min: 0,
                            max: 100,
                            afterBuildTicks: (axis) => {
                                axis.ticks = TICK_DBM_LIST.map(val => ({
                                    value: transformDbm(val)
                                }));
                            },
                            ticks: {
                                callback: val => {
                                    const dbm = inverseTransformDbm(val);
                                    if (Math.abs(dbm) < 0.05) return '0 dBm';
                                    const isRound = Math.abs(dbm - Math.round(dbm)) < 0.05;
                                    return `-${dbm.toFixed(isRound ? 0 : 1)} dBm`;
                                },
                                color: '#64748B',
                                font: { size: 10.5, family: 'Plus Jakarta Sans', weight: '600' }
                            },
                            grid: {
                                color: (ctx) => {
                                    if (!ctx.tick) return '#F1F5F9';
                                    const dbm = inverseTransformDbm(ctx.tick.value);
                                    if (Math.abs(dbm - 26.0) < 0.05) return 'rgba(245, 158, 11, 0.35)';
                                    if (Math.abs(dbm - 27.0) < 0.05) return 'rgba(239, 68, 68, 0.35)';
                                    return '#F1F5F9';
                                }
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
                            backgroundColor: 'rgba(15, 23, 42, 0.94)',
                            titleFont: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' },
                            bodyFont: { family: 'Plus Jakarta Sans', size: 10, weight: '500' },
                            padding: { top: 8, bottom: 8, left: 10, right: 10 },
                            cornerRadius: 8,
                            displayColors: false,
                            filter: tooltipItem => tooltipItem.datasetIndex === 0,
                            callbacks: {
                                title: items => {
                                    if (!items || !items.length) return '';
                                    return `Waktu Scan: ${items[0].label} WIB`;
                                },
                                label: ctx => {
                                    const idx = ctx.dataIndex;
                                    const count = (self.chartCounts && self.chartCounts[idx]) ? self.chartCounts[idx] : 1;
                                    const rawVal = (self.rawChartValues && self.rawChartValues[idx] !== undefined) ? self.rawChartValues[idx] : null;
                                    let valStr = '-';
                                    if (rawVal !== null && rawVal !== undefined && !isNaN(rawVal)) {
                                        valStr = `${Number(rawVal).toFixed(2)} dBm`;
                                    }
                                    return [
                                        `Jumlah Pelanggan: ${count} Pelanggan`,
                                        `Rata-rata Redaman: ${valStr}`
                                    ];
                                }
                            }
                        }
                    }
                }
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
            if (!redamanChart) return;
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

                    // Simpan data mentah & counts untuk tooltip
                    this.rawChartValues = rawValues;
                    this.chartCounts = json.counts || [];

                    // Transformasi data redaman ke skala non-linear
                    const transformedValues = rawValues.map(v => (v !== null && !isNaN(v) && typeof v === 'number') ? transformDbm(v) : null);

                    // 1. Update Labels & Dataset Redaman
                    redamanChart.data.labels = rawLabels;
                    redamanChart.data.datasets[0].data = transformedValues;

                    // 2. Garis Ambang Batas Warning & Kritis
                    const count = rawLabels.length;
                    const warnThreshold = json.threshold !== undefined ? json.threshold : -26.0;
                    const critThreshold = json.critical_threshold !== undefined ? json.critical_threshold : -27.0;

                    const warnVal = transformDbm(Math.abs(warnThreshold));
                    const critVal = transformDbm(Math.abs(critThreshold));

                    if (count > 0) {
                        redamanChart.data.datasets[1].label = `Garis Warning (${Number(warnThreshold).toFixed(1)} dBm)`;
                        redamanChart.data.datasets[1].data = new Array(count).fill(warnVal);
                        redamanChart.data.datasets[2].label = `Garis Kritis (${Number(critThreshold).toFixed(1)} dBm)`;
                        redamanChart.data.datasets[2].data = new Array(count).fill(critVal);
                    } else {
                        redamanChart.data.datasets[1].data = [];
                        redamanChart.data.datasets[2].data = [];
                    }

                    // 3. Rentang Sumbu Y tetap 0 - 100 (mewakili 0 s/d 32 dBm dengan rentang 25-27 dBm sangat lebar)
                    redamanChart.options.scales.y.min = 0;
                    redamanChart.options.scales.y.max = 100;

                    // 4. Update metadata statistik grafik di chip
                    this.chartStats = {
                        avg_dbm: json.avg_dbm,
                        min_dbm: json.min_dbm,
                        max_dbm: json.max_dbm,
                        total_points: json.total_points || 0
                    };

                    redamanChart.update();
                }
            } catch (err) {
                console.error('Gagal memuat data grafik:', err);
            }
        }
    }));
});
