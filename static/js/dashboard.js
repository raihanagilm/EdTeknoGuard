// EdTeknoGuard Dashboard Alpine.js Application
document.addEventListener('alpine:init', () => {
    Alpine.data('dashboardApp', () => ({
        // State
        engineStatus: 'RUNNING',
        lastScanTime: '',
        isScanning: false,
        isToggling: false,
        scanningSingleId: null,

        kpi: {
            total_monitored: 111,
            normal: 0,
            warning: 0,
            critical: 0,
            los: 0
        },

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

        customers: [],
        totalCustomers: 0,
        currentPage: 1,
        pageSize: 25,
        searchQuery: '',
        selectedPop: 'Semua POP',
        selectedStatus: 'Semua Status',

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

        async fetchStatus() {
            try {
                const res = await fetch('/api/monitoring/status');
                if (res.ok) {
                    const data = await res.json();
                    this.engineStatus = data.status || 'RUNNING';
                    this.lastScanTime = data.last_scan_time || '-';
                    this.isScanning = data.is_scanning || false;
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

        async fetchCustomers() {
            try {
                let url = `/api/customers?page=${this.currentPage}&limit=${this.pageSize}`;
                if (this.searchQuery) url += `&q=${encodeURIComponent(this.searchQuery)}`;
                if (this.selectedPop && this.selectedPop !== 'Semua POP') url += `&pop=${encodeURIComponent(this.selectedPop)}`;
                if (this.selectedStatus && this.selectedStatus !== 'Semua Status') url += `&status=${encodeURIComponent(this.selectedStatus)}`;

                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    this.customers = json.data || [];
                    this.totalCustomers = json.total || 0;
                }
            } catch (err) {
                console.error('Gagal mengambil daftar pelanggan:', err);
            }
        },

        prevPage() {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.fetchCustomers();
            }
        },

        nextPage() {
            this.currentPage++;
            this.fetchCustomers();
        },

        async toggleEngine() {
            this.isToggling = true;
            try {
                const res = await fetch('/api/monitoring/toggle-scheduler', { method: 'POST' });
                if (res.ok) {
                    const data = await res.json();
                    this.engineStatus = data.scheduler_status;
                }
            } catch (err) {
                console.error('Gagal toggle engine:', err);
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
                    await this.fetchCustomers();
                    await this.loadChartData();
                }
            } catch (err) {
                console.error('Gagal scan all:', err);
            } finally {
                this.isScanning = false;
            }
        },

        async triggerScanSingle(idPelanggan) {
            this.scanningSingleId = idPelanggan;
            try {
                const res = await fetch(`/api/monitoring/scan/${idPelanggan}`, { method: 'POST' });
                if (res.ok) {
                    const updated = await res.json();
                    // Update state di tabel
                    const idx = this.customers.findIndex(c => c.id_pelanggan === idPelanggan);
                    if (idx !== -1) {
                        this.customers[idx].redaman_current = updated.rx_power;
                        this.customers[idx].status = updated.status_koneksi;
                        this.customers[idx].last_check = updated.waktu_cek ? updated.waktu_cek.substring(5, 16) : '-';
                    }
                    await this.fetchKpi();
                }
            } catch (err) {
                console.error(`Gagal scan ONT ${idPelanggan}:`, err);
            } finally {
                this.scanningSingleId = null;
            }
        },

        initChart() {
            const ctx = document.getElementById('redamanChart');
            if (!ctx) return;

            this.chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Redaman (dBm)',
                            data: [],
                            borderColor: '#4F46E5',
                            backgroundColor: 'rgba(79, 70, 229, 0.08)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.35,
                            pointRadius: 2,
                            pointHoverRadius: 5
                        },
                        {
                            label: 'Threshold Peringatan (-26 dBm)',
                            data: [],
                            borderColor: '#F59E0B',
                            borderWidth: 2,
                            borderDash: [6, 6],
                            pointRadius: 0,
                            fill: false
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
                            reverse: true, // Nilai redaman optik biasanya minus: semakin ke bawah semakin drop
                            min: -36,
                            max: -14,
                            ticks: {
                                callback: val => val + ' dBm',
                                color: '#64748B',
                                font: { size: 11, family: 'Plus Jakarta Sans' }
                            },
                            grid: {
                                color: '#F1F5F9'
                            }
                        },
                        x: {
                            ticks: {
                                color: '#64748B',
                                font: { size: 10, family: 'Plus Jakarta Sans' },
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
                            titleFont: { family: 'Plus Jakarta Sans', size: 12 },
                            bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
                            padding: 10,
                            cornerRadius: 8,
                            callbacks: {
                                label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} dBm`
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
            if (!this.chartInstance) return;
            try {
                let url = `/api/monitoring/chart-data?range=${encodeURIComponent(this.chartRange)}`;
                if (this.selectedDate) {
                    url += `&date=${encodeURIComponent(this.selectedDate)}`;
                }

                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    this.chartInstance.data.labels = json.labels || [];
                    this.chartInstance.data.datasets[0].data = json.values || [];
                    
                    // Garis horizontal threshold -26.0 dBm
                    const th = json.threshold !== undefined ? json.threshold : -26.0;
                    this.chartInstance.data.datasets[1].data = new Array((json.labels || []).length).fill(th);
                    
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
