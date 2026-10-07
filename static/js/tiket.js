function tiketApp() {
    let initialTickets = [];
    const helperEl = document.getElementById('tiket-page-data');
    try {
        const el = document.getElementById('serialized-tickets-json');
        if (el) initialTickets = JSON.parse(el.textContent);
    } catch(e) {
        initialTickets = [];
    }

    const defaultStatus = (helperEl && helperEl.dataset.statusFilter) ? helperEl.dataset.statusFilter : 'all';
    const defaultToday = (helperEl && helperEl.dataset.todayDate) ? helperEl.dataset.todayDate : new Date().toISOString().split('T')[0];

    return {
        rawTickets: initialTickets,
        currentPage: 1,
        limit: 15,
        isLoading: false,

        // Filters
        filterStatus: defaultStatus,
        filterKategori: 'all',
        filterRange: 'all',
        customStartDate: '',
        customEndDate: '',
        todayDate: defaultToday,
        searchQuery: '',
        mobileFilterOpen: false,

        get activeFiltersCount() {
            let count = 0;
            if (this.filterStatus && this.filterStatus !== 'all') count++;
            if (this.filterKategori && this.filterKategori !== 'all') count++;
            if (this.filterRange && this.filterRange !== 'all') count++;
            return count;
        },

        // Sorting
        sortBy: 'created_at_iso',
        sortDir: 'desc',

        // Modal Update State
        isModalOpen: false,
        selectedTicket: null,
        formStatus: 'MENUNGGU',
        formCatatan: '',
        errorMessage: '',

        initData() {
            if (this.filterStatus === 'SEMUA') {
                this.filterStatus = 'all';
            }
        },

        get kategoriOptions() {
            const set = new Set();
            this.rawTickets.forEach(t => {
                if (t.kategori) set.add(t.kategori);
            });
            return Array.from(set).sort();
        },

        countByStatus(status) {
            return this.rawTickets.filter(t => t.status === status).length;
        },

        cleanWa(num) {
            if (!num) return '';
            return num.replace(/\s+/g, '').replace(/-/g, '').replace(/\+/g, '');
        },

        onRangeChange() {
            this.currentPage = 1;
        },

        resetFilters() {
            this.filterStatus = 'all';
            this.filterKategori = 'all';
            this.filterRange = 'all';
            this.customStartDate = '';
            this.customEndDate = '';
            this.searchQuery = '';
            this.currentPage = 1;
            this.sortBy = 'created_at_iso';
            this.sortDir = 'desc';
        },

        sortByColumn(col) {
            if (this.sortBy === col) {
                this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortBy = col;
                this.sortDir = (col === 'created_at_iso' || col === 'redaman_saat_lapor') ? 'desc' : 'asc';
            }
            this.currentPage = 1;
        },

        get filteredTickets() {
            let list = [...this.rawTickets];

            // 1. Filter Status
            if (this.filterStatus !== 'all') {
                list = list.filter(t => t.status === this.filterStatus);
            }

            // 2. Filter Kategori
            if (this.filterKategori !== 'all') {
                list = list.filter(t => t.kategori === this.filterKategori);
            }

            // 3. Filter Rentang Waktu
            if (this.filterRange !== 'all') {
                const now = new Date();
                list = list.filter(t => {
                    if (!t.created_at_date) return false;
                    const itemDate = new Date(t.created_at_date);

                    if (this.filterRange === 'today') {
                        return t.created_at_date === this.todayDate;
                    } else if (this.filterRange === '7d') {
                        const past7 = new Date();
                        past7.setDate(now.getDate() - 7);
                        return itemDate >= past7;
                    } else if (this.filterRange === '30d') {
                        const past30 = new Date();
                        past30.setDate(now.getDate() - 30);
                        return itemDate >= past30;
                    } else if (this.filterRange === 'custom') {
                        if (this.customStartDate && t.created_at_date < this.customStartDate) return false;
                        if (this.customEndDate && t.created_at_date > this.customEndDate) return false;
                        return true;
                    }
                    return true;
                });
            }

            // 4. Pencarian Cepat
            if (this.searchQuery.trim()) {
                const q = this.searchQuery.toLowerCase().trim();
                list = list.filter(t => {
                    return (t.id_tiket && t.id_tiket.toLowerCase().includes(q)) ||
                           (t.id_pelanggan && t.id_pelanggan.toLowerCase().includes(q)) ||
                           (t.nama_pelanggan && t.nama_pelanggan.toLowerCase().includes(q)) ||
                           (t.alamat_pelanggan && t.alamat_pelanggan.toLowerCase().includes(q)) ||
                           (t.no_wa && t.no_wa.toLowerCase().includes(q)) ||
                           (t.deskripsi && t.deskripsi.toLowerCase().includes(q)) ||
                           (t.catatan_teknisi && t.catatan_teknisi.toLowerCase().includes(q));
                });
            }

            // 5. Sorting
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

        get totalPages() {
            const pages = Math.ceil(this.filteredTickets.length / this.limit);
            return pages > 0 ? pages : 1;
        },

        get paginatedTickets() {
            const start = (this.currentPage - 1) * this.limit;
            return this.filteredTickets.slice(start, start + this.limit);
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
        },

        openModalUpdate(item) {
            this.selectedTicket = item;
            this.formStatus = item.status;
            this.formCatatan = item.catatan_teknisi || '';
            this.errorMessage = '';
            this.isModalOpen = true;
        },

        async simpanStatus() {
            if (!this.selectedTicket) return;
            this.isLoading = true;
            this.errorMessage = '';

            try {
                const res = await fetch(`/admin/api/tiket/${this.selectedTicket.id_tiket}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        new_status: this.formStatus,
                        catatan: this.formCatatan
                    })
                });
                const data = await res.json();
                if (data.status === 'success') {
                    // Update state lokal secara reaktif tanpa perlu delay full page reload
                    const found = this.rawTickets.find(t => t.id_tiket === this.selectedTicket.id_tiket);
                    if (found) {
                        found.status = this.formStatus;
                        found.catatan_teknisi = this.formCatatan;
                    }
                    this.isModalOpen = false;
                } else {
                    this.errorMessage = data.message || 'Gagal menyimpan perubahan.';
                }
            } catch (err) {
                this.errorMessage = 'Terjadi kesalahan koneksi ke server.';
            } finally {
                this.isLoading = false;
            }
        }
    };
}
