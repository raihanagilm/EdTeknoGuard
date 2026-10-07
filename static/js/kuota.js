function kuotaApp() {
    let initialQuota = [];
    try {
        const el = document.getElementById('serialized-quota-json');
        if (el) initialQuota = JSON.parse(el.textContent);
    } catch(e) {
        initialQuota = [];
    }

    return {
        rawQuota: initialQuota,
        currentPage: 1,
        limit: 15,

        // Filters
        filterPaket: 'all',
        filterLevel: 'all',
        searchQuery: '',
        mobileFilterOpen: false,
        get activeFiltersCount() {
            let count = 0;
            if (this.filterPaket && this.filterPaket !== 'all') count++;
            if (this.filterLevel && this.filterLevel !== 'all') count++;
            return count;
        },

        // Sorting
        sortBy: 'terpakai_gb',
        sortDir: 'desc',

        initData() {
            // Inisialisasi siap
        },

        get currentPeriod() {
            if (this.rawQuota.length > 0 && this.rawQuota[0].periode) {
                return this.rawQuota[0].periode;
            }
            const d = new Date();
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            return `${y}-${m}`;
        },

        get paketOptions() {
            const set = new Set();
            this.rawQuota.forEach(q => {
                if (q.paket) set.add(q.paket);
            });
            return Array.from(set).sort();
        },

        resetFilters() {
            this.filterPaket = 'all';
            this.filterLevel = 'all';
            this.searchQuery = '';
            this.currentPage = 1;
            this.sortBy = 'terpakai_gb';
            this.sortDir = 'desc';
        },

        sortByColumn(col) {
            if (this.sortBy === col) {
                this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortBy = col;
                this.sortDir = (col === 'terpakai_gb') ? 'desc' : 'asc';
            }
            this.currentPage = 1;
        },

        get filteredQuota() {
            let list = [...this.rawQuota];

            // 1. Filter Paket
            if (this.filterPaket !== 'all') {
                list = list.filter(q => q.paket === this.filterPaket);
            }

            // 2. Filter Level Pemakaian
            if (this.filterLevel !== 'all') {
                list = list.filter(q => {
                    const val = q.terpakai_gb;
                    if (this.filterLevel === 'very_high') return val > 150;
                    if (this.filterLevel === 'high') return val >= 100 && val <= 150;
                    if (this.filterLevel === 'medium') return val >= 50 && val < 100;
                    if (this.filterLevel === 'low') return val > 0 && val < 50;
                    if (this.filterLevel === 'zero') return val === 0;
                    return true;
                });
            }

            // 3. Pencarian Cepat
            if (this.searchQuery.trim()) {
                const q = this.searchQuery.toLowerCase().trim();
                list = list.filter(item => {
                    return (item.id_pelanggan && item.id_pelanggan.toLowerCase().includes(q)) ||
                           (item.nama && item.nama.toLowerCase().includes(q)) ||
                           (item.alamat && item.alamat.toLowerCase().includes(q)) ||
                           (item.paket && item.paket.toLowerCase().includes(q)) ||
                           (item.ip_router && item.ip_router.toLowerCase().includes(q));
                });
            }

            // 4. Sorting
            list.sort((a, b) => {
                let valA = a[this.sortBy];
                let valB = b[this.sortBy];

                if (valA === null || valA === undefined) valA = '';
                if (valB === null || valB === undefined) valB = '';

                if (typeof valA === 'number' && typeof valB === 'number') {
                    return this.sortDir === 'asc' ? valA - valB : valB - valA;
                }

                const strA = String(valA).toLowerCase();
                const strB = String(valB).toLowerCase();

                if (strA < strB) return this.sortDir === 'asc' ? -1 : 1;
                if (strA > strB) return this.sortDir === 'asc' ? 1 : -1;
                return 0;
            });

            return list;
        },

        get totalTrafficGb() {
            return this.filteredQuota.reduce((sum, item) => sum + (item.terpakai_gb || 0), 0);
        },

        get avgTrafficGb() {
            if (this.filteredQuota.length === 0) return 0;
            return this.totalTrafficGb / this.filteredQuota.length;
        },

        get totalPages() {
            const pages = Math.ceil(this.filteredQuota.length / this.limit);
            return pages > 0 ? pages : 1;
        },

        get paginatedQuota() {
            const start = (this.currentPage - 1) * this.limit;
            return this.filteredQuota.slice(start, start + this.limit);
        },

        getPageNumbers() {
            const total = this.totalPages;
            const current = this.currentPage;
            const delta = 1;
            const range = [];
            const rangeWithDots = [];
            let l;

            for (let i = 1; i <= total; i++) {
                if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
                    range.push(i);
                }
            }

            for (let i of range) {
                if (l) {
                    if (i - l === 2) {
                        rangeWithDots.push(l + 1);
                    } else if (i - l !== 1) {
                        rangeWithDots.push('...');
                    }
                }
                rangeWithDots.push(i);
                l = i;
            }

            return rangeWithDots;
        }
    };
}
