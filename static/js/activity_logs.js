function activityLogsApp() {
    const el = document.getElementById('activity-logs-data');
    const initMinDate = el && el.dataset.minDate ? el.dataset.minDate : '2026-09-01';
    const initToday = el && el.dataset.todayDate ? el.dataset.todayDate : new Date().toISOString().split('T')[0];

    return {
        logs: [],
        totalRecords: 0,
        currentPage: 1,
        limit: 15,
        isLoading: false,

        // Filters
        filterUser: 'all',
        filterRange: 'all',
        customStartDate: '',
        customEndDate: '',
        minDate: initMinDate,
        todayDate: initToday,
        filterAction: 'all',
        searchQuery: '',
        mobileFilterOpen: false,

        get activeFiltersCount() {
            let count = 0;
            if (this.filterUser && this.filterUser !== 'all') count++;
            if (this.filterRange && this.filterRange !== 'all') count++;
            if (this.filterAction && this.filterAction !== 'all') count++;
            return count;
        },

        resetFilters() {
            this.filterUser = 'all';
            this.filterRange = 'all';
            this.filterAction = 'all';
            this.customStartDate = '';
            this.customEndDate = '';
            this.fetchLogs(1);
        },

        // Sorting
        sortBy: 'created_at',
        sortDir: 'desc',

        initData() {
            this.fetchLogs(1);

            // Auto-refresh realtime berkala tiap 10 detik (silent DOM update)
            setInterval(() => {
                if (document.hidden) return;
                // Jangan auto-refresh jika user sedang memilih rentang kustom historis
                if (this.filterRange === 'custom') return;
                this.fetchLogs(this.currentPage, true);
            }, 10000);
        },

        onRangeChange() {
            if (this.filterRange !== 'custom') {
                this.fetchLogs(1);
            }
        },

        async fetchLogs(page = 1, silent = false) {
            this.currentPage = page;
            if (!silent) {
                this.isLoading = true;
            }

            try {
                const params = new URLSearchParams({
                    page: this.currentPage,
                    limit: this.limit,
                    sort_by: this.sortBy,
                    sort_dir: this.sortDir
                });

                if (this.filterUser !== 'all') params.append('username', this.filterUser);
                if (this.filterAction !== 'all') params.append('action', this.filterAction);
                if (this.searchQuery.trim()) params.append('q', this.searchQuery.trim());
                if (this.filterRange && this.filterRange !== 'all') {
                    params.append('range', this.filterRange);
                    if (this.filterRange === 'custom' && this.customStartDate && this.customEndDate) {
                        params.append('start_date', this.customStartDate);
                        params.append('end_date', this.customEndDate);
                    }
                }

                const res = await fetch(`/api/activity-logs?${params.toString()}`);
                const json = await res.json();

                if (res.ok) {
                    this.logs = json.data || [];
                    this.totalRecords = json.total || 0;
                    if (json.min_date) {
                        this.minDate = json.min_date;
                    }
                }
            } catch (err) {
                console.error("Gagal mengambil log aktivitas:", err);
            } finally {
                if (!silent) {
                    this.isLoading = false;
                }
            }
        },

        sortByColumn(column) {
            if (this.sortBy === column) {
                this.sortDir = (this.sortDir === 'asc' ? 'desc' : 'asc');
            } else {
                this.sortBy = column;
                this.sortDir = 'asc';
            }
            this.fetchLogs(1);
        },

        get totalPages() {
            return Math.max(1, Math.ceil(this.totalRecords / this.limit));
        },

        getPageNumbers() {
            const pages = [];
            const total = this.totalPages;
            const maxVisible = 5;

            if (total <= maxVisible + 2) {
                for (let i = 1; i <= total; i++) pages.push(i);
            } else {
                pages.push(1);
                let start = Math.max(2, this.currentPage - 1);
                let end = Math.min(total - 1, this.currentPage + 1);

                if (this.currentPage <= 3) {
                    end = 4;
                } else if (this.currentPage >= total - 2) {
                    start = total - 3;
                }

                if (start > 2) pages.push('...');
                for (let i = start; i <= end; i++) pages.push(i);
                if (end < total - 1) pages.push('...');
                if (total > 1) pages.push(total);
            }
            return pages;
        }
    };
}
