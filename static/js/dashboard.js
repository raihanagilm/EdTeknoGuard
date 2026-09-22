// Instance Chart.js disimpan di luar objek reaktif Alpine.js
// untuk mencegah RangeError (Maximum call stack size exceeded akibat Proxy wrapper Alpine)
let redamanChart = null;

// Transformasi Non-linear Sumbu Y (Piecewise Stretched Scale)
// Rentang 0 s/d 25 step 5 (-5, -10, -15, -20, -25.0), rentang kritis 25.0 s/d 27.0 step 0.5 sangat lebar, lalu 30.0 - 35.0
const TICK_DBM_LIST = [0, 5, 10, 15, 20, 25.0, 25.5, 26.0, 26.5, 27.0, 30.0, 35.0];

function transformDbm(val) {
    if (val === null || val === undefined || isNaN(val)) return null;
    const v = Math.abs(Number(val));
    if (v <= 25.0) {
        // 0 s/d 25 dBm menempati 0 s/d 30 unit (step 5 dBm = 6 unit konsisten)
        return (v / 25.0) * 30.0;
    } else if (v <= 27.0) {
        // 25.0 s/d 27.0 dBm menempati 30 s/d 75 unit (45% tinggi grafik - SANGAT LEBAR & RENGGANG)
        return 30.0 + ((v - 25.0) / 2.0) * 45.0;
    } else {
        // 27.0 s/d 35.0 dBm menempati 75 s/d 100 unit
        const clamped = Math.min(v, 35.0);
        return 75.0 + ((clamped - 27.0) / 8.0) * 25.0;
    }
}

function inverseTransformDbm(u) {
    if (u <= 30.0) {
        return (u / 30.0) * 25.0;
    } else if (u <= 75.0) {
        return 25.0 + ((u - 30.0) / 45.0) * 2.0;
    } else {
        return 27.0 + ((u - 75.0) / 25.0) * 8.0;
    }
}

document.addEventListener('alpine:init', () => {
    Alpine.data('dashboardApp', () => ({
        // State Engine & Kontrol
        engineStatus: 'RUNNING',
        lastScanTime: '',
        intervalMinutes: Number(document.getElementById('dashboard-container')?.dataset?.pollingInterval) || 10,
        activeKantor: document.getElementById('dashboard-container')?.dataset?.activeKantor || 'all',
        isScanning: false,
        isToggling: false,
        isNetworkError: false,
        scanningSingleId: null,

        // State Progres Pemindaian & Estimasi Waktu
        scanProgress: {
            current: 0,
            total: 0,
            percent: 0,
            is_scanning: false,
            elapsed_seconds: 0,
            estimated_total_seconds: 0,
            last_scan_duration: 0
        },

        // Toast Notification State
        toast: { show: false, message: '', type: 'success' },

        formatTime(seconds) {
            if (!seconds || isNaN(seconds)) return '00:00';
            seconds = Math.floor(seconds);
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            const pad = num => num.toString().padStart(2, '0');
            if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
            return `${pad(m)}:${pad(s)}`;
        },

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
        chartDetails: [],
        activeDatasets: [],
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

            // Refresh status & data grafik berkala tiap 8 detik secara realtime
            setInterval(() => {
                if (document.hidden) return;
                if (!this.isScanning) {
                    this.fetchStatus();
                    this.fetchKpi();
                    if (this.chartRange === 'today') {
                        this.loadChartData();
                    }
                }
            }, 8000);

            // Polling cepat tiap 1.5 detik ketika sedang ada pemindaian aktif
            setInterval(() => {
                if (document.hidden) return;
                if (this.isScanning || (this.scanProgress && this.scanProgress.is_scanning)) {
                    this.fetchStatus();
                }
            }, 1500);
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
                    const wasScanning = this.isScanning;
                    this.engineStatus = data.status || 'RUNNING';
                    this.lastScanTime = data.last_scan_time || '-';
                    this.isScanning = data.is_scanning || false;
                    if (data.scan_progress) {
                        this.scanProgress = data.scan_progress;
                        if (data.scan_progress.is_scanning) {
                            this.isScanning = true;
                        }
                    }
                    // Jika pemindaian baru saja selesai, langsung mutakhirkan KPI & grafik
                    if (wasScanning && !this.isScanning) {
                        this.fetchKpi();
                        if (this.chartRange === 'today') {
                            this.loadChartData();
                        }
                    }
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

        formatKantorLabel(k) {
            if (!k || k === 'all') return 'seluruh kantor';
            if (k === 'banyumas') return 'Kantor Banyumas';
            if (k === 'cabang') return 'Kantor Cabang';
            if (k === 'pusat') return 'Kantor Pusat';
            return `Kantor ${k.toUpperCase()}`;
        },

        async actionStartScan() {
            if (this.isScanning) return;
            const target = this.formatKantorLabel(this.activeKantor);
            this.showToast(`Memulai pemindaian manual ONT ${target}...`, 'info');
            await this.triggerScanAll();
        },

        async actionPauseScan() {
            try {
                const res = await fetch('/api/monitoring/scan-pause', { method: 'POST' });
                const data = await res.json();
                if (res.ok && data.status !== 'error') {
                    this.showToast('Pemindaian dijeda. Progres tersimpan ke sistem.', 'info');
                    await this.fetchStatus();
                } else {
                    this.showToast(data.message || 'Gagal menjeda pemindaian', 'error');
                }
            } catch (err) {
                console.error('Gagal pause scan:', err);
                this.showToast('Gagal menjeda pemindaian', 'error');
            }
        },

        async actionResumeScan() {
            try {
                const res = await fetch('/api/monitoring/scan-resume', { method: 'POST' });
                const data = await res.json();
                if (res.ok && data.status !== 'error') {
                    this.showToast('Melanjutkan pemindaian ONT dari posisi jeda...', 'success');
                    this.isScanning = true;
                    await this.fetchStatus();
                } else {
                    this.showToast(data.message || 'Gagal melanjutkan pemindaian', 'error');
                }
            } catch (err) {
                console.error('Gagal resume scan:', err);
                this.showToast('Gagal melanjutkan pemindaian', 'error');
            }
        },

        async actionStopScan() {
            if (!confirm('Hentikan paksa pemindaian? Progres pemindaian saat ini akan direset ke awal.')) return;
            try {
                const res = await fetch('/api/monitoring/scan-stop', { method: 'POST' });
                const data = await res.json();
                if (res.ok && data.status !== 'error') {
                    this.showToast('Pemindaian dihentikan paksa. Data progres dibersihkan.', 'info');
                    this.isScanning = false;
                    await this.fetchStatus();
                    await this.fetchKpi();
                } else {
                    this.showToast(data.message || 'Gagal menghentikan pemindaian', 'error');
                }
            } catch (err) {
                console.error('Gagal stop scan:', err);
                this.showToast('Gagal menghentikan pemindaian', 'error');
            }
        },

        async actionToggleEngine() {
            if (this.isScanning || this.isToggling) return;
            const wasRunning = this.engineStatus === 'RUNNING';
            await this.toggleEngine();
            if (wasRunning) {
                this.showToast('Jadwal pemantauan otomatis dijeda (STOPPED)', 'info');
            } else {
                this.showToast('Jadwal pemantauan otomatis diaktifkan (RUNNING)', 'success');
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
                    const target = this.formatKantorLabel(data.target_kantor || this.activeKantor);
                    this.showToast(`Pemindaian ONT ${target} selesai!`, 'success');
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

        toggleDatasetVisibility(idx) {
            if (!redamanChart || !this.activeDatasets[idx]) return;
            const isHidden = !this.activeDatasets[idx].hidden;
            this.activeDatasets[idx].hidden = isHidden;
            redamanChart.setDatasetVisibility(idx, !isHidden);
            redamanChart.update('none');
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
                            tension: 0.12,
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
                                    if (dbm >= 24.9) {
                                        return `-${dbm.toFixed(1)} dBm`;
                                    }
                                    return `-${Math.round(dbm)} dBm`;
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
                            filter: tooltipItem => !tooltipItem.dataset.isThreshold,
                            callbacks: {
                                title: items => {
                                    if (!items || !items.length) return '';
                                    return `Waktu: ${items[0].label} WIB`;
                                },
                                label: ctx => {
                                    const ds = ctx.dataset;
                                    const idx = ctx.dataIndex;
                                    const rawVal = ds.rawValues ? ds.rawValues[idx] : null;
                                    let valStr = '-';
                                    if (rawVal !== null && rawVal !== undefined && !isNaN(rawVal)) {
                                        valStr = `${Number(rawVal).toFixed(2)} dBm`;
                                    }
                                    const lines = [`${ds.label}: ${valStr}`];
                                    
                                    // Option B: Jika ada rincian status (Normal, Warning, Kritis, LOS)
                                    if (ds.details && ds.details[idx]) {
                                        const d = ds.details[idx];
                                        lines.push(`Total Terpantau: ${d.total} ONT`);
                                        lines.push(`• Normal: ${d.normal} | Warning: ${d.warning}`);
                                        lines.push(`• Kritis: ${d.critical} | LOS: ${d.los}`);
                                    } else if (self.chartCounts && self.chartCounts[idx]) {
                                        lines.push(`Total ONT: ${self.chartCounts[idx]} Pelanggan`);
                                    }
                                    return lines;
                                }
                            }
                        },
                        zoom: {
                            pan: { enabled: false },
                            zoom: { wheel: { enabled: false }, pinch: { enabled: false } }
                        }
                    }
                }
            });

            // Touch Gestures (Pinch-to-zoom & Pan Drag seperti Foto di HP)
            const chartContainer = document.getElementById('chart-canvas-container');
            if (chartContainer) {
                let initialDistance = 0;
                let initialScale = 1.0;
                let startTouchX = 0;
                let startTouchY = 0;
                let initialPanX = 0;
                let initialPanY = 0;

                chartContainer.addEventListener('touchstart', (e) => {
                    if (e.touches.length === 2) {
                        // Pinch gesture
                        const dx = e.touches[0].clientX - e.touches[1].clientX;
                        const dy = e.touches[0].clientY - e.touches[1].clientY;
                        initialDistance = Math.hypot(dx, dy);
                        initialScale = this.zoomScale;
                    } else if (e.touches.length === 1 && this.zoomScale > 1.0) {
                        // Pan gesture saat zoom > 1
                        startTouchX = e.touches[0].clientX;
                        startTouchY = e.touches[0].clientY;
                        initialPanX = this.panX;
                        initialPanY = this.panY;
                    }
                }, { passive: true });

                chartContainer.addEventListener('touchmove', (e) => {
                    if (e.touches.length === 2 && initialDistance > 0) {
                        const dx = e.touches[0].clientX - e.touches[1].clientX;
                        const dy = e.touches[0].clientY - e.touches[1].clientY;
                        const currentDistance = Math.hypot(dx, dy);
                        const factor = currentDistance / initialDistance;
                        this.zoomScale = Math.min(3.5, Math.max(0.8, +(initialScale * factor).toFixed(2)));
                        this.applyPhotoZoom();
                    } else if (e.touches.length === 1 && this.zoomScale > 1.0) {
                        const deltaX = (e.touches[0].clientX - startTouchX) / this.zoomScale;
                        const deltaY = (e.touches[0].clientY - startTouchY) / this.zoomScale;
                        this.panX = initialPanX + deltaX;
                        this.panY = initialPanY + deltaY;
                        this.applyPhotoZoom();
                    }
                }, { passive: true });
            }

            this.loadChartData();
        },

        zoomScale: 1.0,
        panX: 0,
        panY: 0,

        applyPhotoZoom() {
            const canvas = document.getElementById('redamanChart');
            if (canvas) {
                canvas.style.transformOrigin = 'center center';
                canvas.style.transform = `scale(${this.zoomScale}) translate(${this.panX}px, ${this.panY}px)`;
            }
        },

        zoomInChart() {
            if (this.zoomScale < 3.5) {
                this.zoomScale = Math.min(3.5, +(this.zoomScale + 0.35).toFixed(2));
                this.applyPhotoZoom();
            }
        },

        zoomOutChart() {
            if (this.zoomScale > 0.7) {
                this.zoomScale = Math.max(0.7, +(this.zoomScale - 0.35).toFixed(2));
                if (this.zoomScale <= 1.0) {
                    this.panX = 0;
                    this.panY = 0;
                }
                this.applyPhotoZoom();
            }
        },

        resetZoomChart() {
            this.zoomScale = 1.0;
            this.panX = 0;
            this.panY = 0;
            this.applyPhotoZoom();
            if (redamanChart && typeof redamanChart.resetZoom === 'function') {
                redamanChart.resetZoom();
            }
        },

        async switchChartRange(range) {
            this.chartRange = range;
            // Gunakan tanggal hari ini sebagai anchor acuan agar label perbandingan selalu tepat
            this.selectedDate = this.todayDate;
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
                    this.chartCounts = json.counts || [];
                    this.rawChartValues = json.values || [];
                    this.chartDetails = json.details || [];

                    const count = rawLabels.length;
                    const warnThreshold = json.threshold !== undefined ? json.threshold : -26.0;
                    const critThreshold = json.critical_threshold !== undefined ? json.critical_threshold : -27.0;
                    const warnVal = transformDbm(Math.abs(warnThreshold));
                    const critVal = transformDbm(Math.abs(critThreshold));

                    let datasets = [];

                    // Jika backend mengembalikan json.datasets (1, 2, atau 7 garis perbandingan)
                    if (json.datasets && json.datasets.length > 0) {
                        const isMulti = json.datasets.length > 1;
                        datasets = json.datasets.map(ds => {
                            const transformed = (ds.values || []).map(v => (v !== null && !isNaN(v) && typeof v === 'number') ? transformDbm(v) : null);
                            return {
                                label: ds.label,
                                data: transformed,
                                rawValues: ds.values || [],
                                details: ds.details || [],
                                borderColor: ds.color || '#4F46E5',
                                backgroundColor: (!isMulti) ? 'rgba(79, 70, 229, 0.12)' : 'transparent',
                                borderWidth: json.datasets.length > 2 ? 2 : 2.5,
                                fill: !isMulti,
                                tension: 0.12,
                                pointRadius: json.datasets.length > 2 ? 3.5 : 5,
                                pointHoverRadius: json.datasets.length > 2 ? 6 : 8,
                                pointBackgroundColor: ds.color || '#4F46E5',
                                pointBorderColor: '#FFFFFF',
                                pointBorderWidth: 2,
                                showLine: true,
                                spanGaps: true,
                                isThreshold: false
                            };
                        });
                    } else {
                        // Fallback single dataset
                        const transformedValues = (json.values || []).map(v => (v !== null && !isNaN(v) && typeof v === 'number') ? transformDbm(v) : null);
                        datasets.push({
                            label: 'Nilai Redaman Rata-rata',
                            data: transformedValues,
                            rawValues: json.values || [],
                            details: json.details || [],
                            borderColor: '#4F46E5',
                            backgroundColor: 'rgba(79, 70, 229, 0.12)',
                            borderWidth: 2.5,
                            fill: true,
                            tension: 0.12,
                            pointRadius: 5,
                            pointHoverRadius: 8,
                            pointBackgroundColor: '#4F46E5',
                            pointBorderColor: '#FFFFFF',
                            pointBorderWidth: 2,
                            showLine: true,
                            spanGaps: true,
                            isThreshold: false
                        });
                    }

                    // Tambahkan 2 garis ambang batas warning & kritis
                    datasets.push({
                        label: `Garis Warning (${Number(warnThreshold).toFixed(1)} dBm)`,
                        data: count > 0 ? new Array(count).fill(warnVal) : [],
                        borderColor: '#F59E0B',
                        borderWidth: 2,
                        borderDash: [6, 6],
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false,
                        tension: 0,
                        isThreshold: true
                    });

                    datasets.push({
                        label: `Garis Kritis (${Number(critThreshold).toFixed(1)} dBm)`,
                        data: count > 0 ? new Array(count).fill(critVal) : [],
                        borderColor: '#EF4444',
                        borderWidth: 2,
                        borderDash: [4, 4],
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false,
                        tension: 0,
                        isThreshold: true
                    });

                    redamanChart.data.labels = rawLabels;
                    redamanChart.data.datasets = datasets;

                    // Update activeDatasets untuk kontrol custom legend di bawah grafik
                    this.activeDatasets = datasets.map((d, i) => ({
                        index: i,
                        label: d.label,
                        color: d.borderColor,
                        isThreshold: Boolean(d.isThreshold),
                        borderDash: Boolean(d.borderDash),
                        hidden: false
                    }));

                    // Rentang Sumbu Y tetap 0 - 100
                    redamanChart.options.scales.y.min = 0;
                    redamanChart.options.scales.y.max = 100;

                    // Update metadata statistik grafik di chip
                    this.chartStats = {
                        avg_dbm: json.avg_dbm,
                        min_dbm: json.min_dbm,
                        max_dbm: json.max_dbm,
                        total_points: json.total_points || 0
                    };

                    redamanChart.update('none');
                }
            } catch (err) {
                console.error('Gagal memuat data grafik:', err);
            }
        }
    }));
});
