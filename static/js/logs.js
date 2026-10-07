function logsApp() {
    const el = document.getElementById('logs-summary-data');
    const initTotal = el ? (Number(el.dataset.total) || 0) : 0;
    const initNormal = el ? (Number(el.dataset.normal) || 0) : 0;
    const initWarning = el ? (Number(el.dataset.warning) || 0) : 0;
    const initKritisLos = el ? (Number(el.dataset.kritisLos) || 0) : 0;
    const initMinDate = el && el.dataset.minDate ? el.dataset.minDate : '2026-09-01';
    const todayStr = new Date().toISOString().split('T')[0];

    return {
        logs: [],
        totalRecords: 0,
        currentPage: 1,
        totalPages: 1,
        limit: 15,
        searchQuery: '',
        filterStatus: '',
        filterRange: 'today',
        customStartDate: '',
        customEndDate: '',
        mobileFilterOpen: false,
        get activeFiltersCount() {
            let count = 0;
            if (this.filterStatus) count++;
            if (this.filterRange && this.filterRange !== 'today') count++;
            return count;
        },
        minDate: initMinDate,
        todayDate: todayStr,
        sortBy: 'waktu_cek',
        sortDir: 'desc',
        loading: false,
        probingId: null,
        toast: {
            show: false,
            message: '',
            type: 'success'
        },
        summary: {
            total_records: initTotal,
            normal: initNormal,
            warning: initWarning,
            kritis_los: initKritisLos
        },

        showToast(message, type = 'success') {
            this.toast.message = message;
            this.toast.type = type;
            this.toast.show = true;
            setTimeout(() => {
                this.toast.show = false;
            }, 3500);
        },

        async probeSingle(log) {
            if (!log.id_pelanggan) {
                this.showToast("ID Pelanggan tidak valid", "error");
                return;
            }
            this.probingId = log.id_pelanggan;
            try {
                const res = await fetch(`/api/monitoring/check-single/${encodeURIComponent(log.id_pelanggan)}`, { method: 'POST' });
                const json = await res.json();
                if (json.status === 'success') {
                    const probe = json.probe_result;
                    log.rx_power = probe.rx_power;
                    log.status_koneksi = probe.status;
                    if (probe.latency_ms !== undefined && probe.latency_ms !== null) {
                        log.latency_ms = probe.latency_ms;
                    }
                    if (probe.suhu_ont !== undefined && probe.suhu_ont !== null) {
                        log.suhu_ont = probe.suhu_ont;
                    }
                    if (probe.keterangan) {
                        log.keterangan = probe.keterangan;
                    }
                    this.showToast(`Cek Live ONT ${log.nama}: ${probe.rx_power !== null ? probe.rx_power + ' dBm' : 'LOS'} (${probe.status})`, 'success');
                } else {
                    this.showToast(json.detail || "Gagal melakukan cek ONT", "error");
                }
            } catch (err) {
                this.showToast("Error komunikasi server saat mengecek ONT", "error");
            } finally {
                this.probingId = null;
            }
        },

        initData() {
            this.fetchLogs(1);

            // Auto-refresh realtime berkala tiap 10 detik (silent DOM update)
            setInterval(() => {
                if (document.hidden) return;
                // Jangan auto-refresh jika user sedang memilih rentang kustom historis atau sedang probing
                if (this.filterRange === 'custom' || this.probingId) return;
                this.fetchLogs(this.currentPage, true);
            }, 10000);
        },

        getPageNumbers() {
            const pages = [];
            const maxVisible = 5;
            
            if (this.totalPages <= maxVisible + 2) {
                for (let i = 1; i <= this.totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                
                let start = Math.max(2, this.currentPage - 1);
                let end = Math.min(this.totalPages - 1, this.currentPage + 1);
                
                if (this.currentPage <= 3) {
                    end = 4;
                } else if (this.currentPage >= this.totalPages - 2) {
                    start = this.totalPages - 3;
                }
                
                if (start > 2) pages.push('...');
                
                for (let i = start; i <= end; i++) {
                    pages.push(i);
                }
                
                if (end < this.totalPages - 1) pages.push('...');
                
                if (this.totalPages > 1) {
                    pages.push(this.totalPages);
                }
            }
            return pages;
        },

        onRangeChange() {
            if (this.filterRange !== 'custom') {
                this.fetchLogs(1);
            }
        },

        filterByCard(status) {
            if (this.filterStatus === status) {
                this.filterStatus = '';
            } else {
                this.filterStatus = status;
            }
            this.fetchLogs(1);
        },

        sortTable(column) {
            if (this.sortBy === column) {
                this.sortDir = (this.sortDir === 'asc' ? 'desc' : 'asc');
            } else {
                this.sortBy = column;
                this.sortDir = (column === 'waktu_cek' ? 'desc' : 'asc');
            }
            this.fetchLogs(1);
        },

        async fetchLogs(page = 1, silent = false) {
            if (!silent) {
                this.loading = true;
            }
            this.currentPage = page;
            try {
                let url = `/api/logs?page=${page}&limit=${this.limit}&range=${this.filterRange}&sort_by=${this.sortBy}&sort_dir=${this.sortDir}`;
                if (this.searchQuery) url += `&q=${encodeURIComponent(this.searchQuery)}`;
                if (this.filterStatus) url += `&status=${encodeURIComponent(this.filterStatus)}`;
                if (this.filterRange === 'custom' && this.customStartDate && this.customEndDate) {
                    url += `&start_date=${encodeURIComponent(this.customStartDate)}&end_date=${encodeURIComponent(this.customEndDate)}`;
                }

                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    this.logs = json.data || [];
                    this.totalRecords = json.total || 0;
                    this.totalPages = Math.ceil(this.totalRecords / this.limit) || 1;
                    if (json.summary) {
                        this.summary = json.summary;
                    }
                    if (json.min_date) {
                        this.minDate = json.min_date;
                    }
                }
            } catch (err) {
                console.error("Gagal mengambil data log:", err);
            } finally {
                if (!silent) {
                    this.loading = false;
                }
            }
        }
    };
}
