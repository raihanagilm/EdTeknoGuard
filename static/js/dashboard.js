// Instance Chart.js disimpan di luar objek reaktif Alpine.js
// untuk mencegah RangeError (Maximum call stack size exceeded akibat Proxy wrapper Alpine)
let redamanChart = null;

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
                            // Orientasi NOC: angka kecil (-10 dBm) di bawah, angka besar (-35 dBm) di atas (kecil ke besar)
                            reverse: true,
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
                                    const val = ctx.parsed.y;
                                    const valStr = (val !== null && !isNaN(val)) ? `${val.toFixed(2)} dBm` : '-';
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

                    // Simpan counts untuk tooltip
                    this.chartCounts = json.counts || [];

                    // 1. Update Labels & Dataset Redaman
                    redamanChart.data.labels = rawLabels;
                    redamanChart.data.datasets[0].data = rawValues;

                    // 2. Garis Ambang Batas Warning (-26.0 dBm) & Kritis (-27.0 dBm)
                    const count = rawLabels.length;
                    if (count > 0) {
                        const warnThreshold = json.threshold !== undefined ? json.threshold : -26.0;
                        redamanChart.data.datasets[1].data = new Array(count).fill(warnThreshold);
                        redamanChart.data.datasets[2].data = new Array(count).fill(-27.0);
                    } else {
                        redamanChart.data.datasets[1].data = [];
                        redamanChart.data.datasets[2].data = [];
                    }

                    // 3. Update metadata statistik grafik di chip
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
