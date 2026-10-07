function userManagement() {
    return {
        isModalOpen: false,
        isConfirmSaveModalOpen: false,
        isToggleModalOpen: false,
        isDeleteModalOpen: false,
        isEdit: false,
        showPassword: false,
        modalTitle: 'Tambah User Baru',
        formAction: '/users/add',
        sortBy: 'username',
        sortDir: 'asc',
        searchQuery: '',
        filterRole: 'all',
        filterStatus: 'all',
        filterKantor: 'all',
        mobileFilterOpen: false,

        get activeFiltersCount() {
            let count = 0;
            if (this.filterRole && this.filterRole !== 'all') count++;
            if (this.filterStatus && this.filterStatus !== 'all') count++;
            if (this.filterKantor && this.filterKantor !== 'all') count++;
            return count;
        },

        resetFilters() {
            this.searchQuery = '';
            this.filterRole = 'all';
            this.filterStatus = 'all';
            this.filterKantor = 'all';
            this.filterUsers();
        },

        filterUsers() {
            const tbody = document.getElementById('usersTableBody');
            if (!tbody) return;
            const rows = Array.from(tbody.querySelectorAll('tr.user-row'));
            const emptyRow = document.getElementById('usersEmptyRow');
            const q = this.searchQuery.trim().toLowerCase();
            const role = this.filterRole.toLowerCase();
            const status = this.filterStatus.toLowerCase();
            const kantor = this.filterKantor.toLowerCase();

            let visibleCount = 0;
            rows.forEach((row) => {
                const u = (row.dataset.username || '').toLowerCase();
                const n = (row.dataset.nama || '').toLowerCase();
                const r = (row.dataset.role || '').toLowerCase();
                const s = (row.dataset.status || '').toLowerCase();
                const k = (row.dataset.kantor || '').toLowerCase();

                let match = true;
                if (q && !u.includes(q) && !n.includes(q)) match = false;
                if (role !== 'all' && r !== role) match = false;
                if (status !== 'all' && s !== status) match = false;
                if (kantor !== 'all' && !k.includes(kantor)) match = false;

                if (match) {
                    row.style.display = '';
                    visibleCount++;
                    const noCell = row.querySelector('td:first-child');
                    if (noCell) noCell.textContent = visibleCount;
                } else {
                    row.style.display = 'none';
                }
            });

            if (emptyRow) {
                emptyRow.style.display = visibleCount === 0 ? '' : 'none';
            }
        },

        form: {
            id: null,
            username: '',
            nama_karyawan: '',
            role: 'teknisi',
            kantor: ['cabang'],
            password: ''
        },
        toggleTarget: {
            id: null,
            username: '',
            isActive: false
        },
        deleteTarget: {
            id: null,
            username: ''
        },

        sortTable(column) {
            if (this.sortBy === column) {
                this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortBy = column;
                this.sortDir = 'asc';
            }
            this.doSort();
        },

        doSort() {
            const tbody = document.getElementById('usersTableBody');
            if (!tbody) return;
            const rows = Array.from(tbody.querySelectorAll('tr.user-row'));
            const col = this.sortBy;
            const dir = this.sortDir;

            rows.sort((a, b) => {
                let valA = (a.dataset[col === 'nama' ? 'nama' : col] || '').toLowerCase();
                let valB = (b.dataset[col === 'nama' ? 'nama' : col] || '').toLowerCase();
                if (valA < valB) return dir === 'asc' ? -1 : 1;
                if (valA > valB) return dir === 'asc' ? 1 : -1;
                return 0;
            });

            let visibleIdx = 0;
            rows.forEach((row) => {
                if (row.style.display !== 'none') {
                    visibleIdx++;
                    const noCell = row.querySelector('td:first-child');
                    if (noCell) noCell.textContent = visibleIdx;
                }
                tbody.appendChild(row);
            });
        },

        onRoleChange() {
            if (this.form.role === 'super admin') {
                this.form.kantor = ['cabang', 'pusat', 'banyumas'];
            } else if (!this.form.kantor || this.form.kantor.length === 0) {
                this.form.kantor = ['cabang'];
            }
        },

        toggleKantor(k) {
            if (this.form.role === 'super admin') return;
            const idx = this.form.kantor.indexOf(k);
            if (idx > -1) {
                if (this.form.kantor.length > 1) {
                    this.form.kantor.splice(idx, 1);
                }
            } else {
                this.form.kantor.push(k);
            }
        },

        openAddModal() {
            this.isEdit = false;
            this.showPassword = false;
            this.modalTitle = 'Tambah User Baru';
            this.formAction = '/users/add';
            this.form = { id: null, username: '', nama_karyawan: '', role: 'teknisi', kantor: ['cabang'], password: '' };
            this.isModalOpen = true;
        },

        openEditModal(id, username, nama_karyawan, role, allowed_kantor) {
            this.isEdit = true;
            this.showPassword = false;
            this.modalTitle = 'Edit User';
            this.formAction = '/users/edit/' + id;
            this.form = { 
                id, 
                username, 
                nama_karyawan, 
                role, 
                kantor: (role === 'super admin') ? ['cabang', 'pusat', 'banyumas'] : (allowed_kantor && allowed_kantor.length ? [...allowed_kantor] : ['cabang']), 
                password: '' 
            };
            this.isModalOpen = true;
        },

        openToggleModal(id, username, isActive) {
            this.toggleTarget = { id, username, isActive: Boolean(isActive) };
            this.isToggleModalOpen = true;
        },

        openDeleteModal(id, username) {
            this.deleteTarget = { id, username };
            this.isDeleteModalOpen = true;
        },

        requestSaveConfirm() {
            const formEl = document.getElementById('userMainForm');
            if (formEl && !formEl.reportValidity()) {
                return;
            }
            this.isConfirmSaveModalOpen = true;
        },

        executeSubmitForm() {
            const formEl = document.getElementById('userMainForm');
            if (formEl) {
                this.isConfirmSaveModalOpen = false;
                formEl.submit();
            }
        }
    };
}
