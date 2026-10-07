function customerApp() {
    const statsEl = document.getElementById("customer-stats-data");
    const initStats = {
      total: statsEl ? Number(statsEl.dataset.total) || 0 : 0,
      normal: statsEl ? Number(statsEl.dataset.normal) || 0 : 0,
      warning: statsEl ? Number(statsEl.dataset.warning) || 0 : 0,
      critical: statsEl ? Number(statsEl.dataset.critical) || 0 : 0,
      los: statsEl ? Number(statsEl.dataset.los) || 0 : 0,
      critical_los: statsEl ? Number(statsEl.dataset.criticalLos) || 0 : 0,
      monitored_inactive: statsEl
        ? Number(statsEl.dataset.monitoredInactive) || 0
        : 0,
    };

    return {
      customers: [],
      totalCustomers: 0,
      currentPage: 1,
      totalPages: 1,
      limit: 15,
      searchQuery: "",
      filterPop: "Semua POP",
      filterStatus: "Semua Status",
      filterMonitoring: "all",
      filterRange: "all",
      customStartDate: "",
      customEndDate: "",
      todayDate: new Date().toISOString().split("T")[0],
      mobileFilterOpen: false,
      get activeFiltersCount() {
        let count = 0;
        if (this.filterPop && this.filterPop !== "Semua POP") count++;
        if (this.filterStatus && this.filterStatus !== "Semua Status") count++;
        if (this.filterMonitoring && this.filterMonitoring !== "all") count++;
        if (this.filterRange && this.filterRange !== "all") count++;
        return count;
      },
      loading: false,
      probingId: null,
      togglingMonitoringId: null,

      onRangeChange() {
        if (this.filterRange !== "custom") {
          this.customStartDate = "";
          this.customEndDate = "";
          this.fetchCustomers(1);
        }
      },

      // Sorting
      sortBy: "id",
      sortDir: "asc",

      // Stats (Global counts across all customers)
      stats: initStats,

      // Bulk Selection
      selectedIds: [],
      get isAllSelected() {
        return (
          this.customers.length > 0 &&
          this.selectedIds.length === this.customers.length
        );
      },
      toggleSelectAll() {
        if (this.isAllSelected) {
          this.selectedIds = [];
        } else {
          this.selectedIds = this.customers.map((c) => c.id_pelanggan);
        }
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

          if (start > 2) pages.push("...");

          for (let i = start; i <= end; i++) {
            pages.push(i);
          }

          if (end < this.totalPages - 1) pages.push("...");

          if (this.totalPages > 1) {
            pages.push(this.totalPages);
          }
        }
        return pages;
      },

      sortTable(column) {
        if (this.sortBy === column) {
          this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
        } else {
          this.sortBy = column;
          this.sortDir = "asc";
        }
        this.fetchCustomers(1);
      },

      // Modals
      formModalOpen: false,
      isEditMode: false,
      detailModalOpen: false,
      confirmEditModalOpen: false,
      confirmDeleteModalOpen: false,
      confirmBulkDeleteModalOpen: false,
      importModalOpen: false,
            // State Import Wizard (Multi-langkah)
      importStep: 1, // 1: Upload, 2: Mapping, 3: Preview
      importFile: null,
      importSheets: [],
      importSelectedSheet: "",
      importCurrentColumns: [],
      importMapping: {},
      importPreviewData: [],
      importPreviewValid: [],
      importPreviewDuplicates: [],
      importPreviewErrors: [],
      existingDbIds: [],
      existingDbIps: [],
      isImporting: false,

      // State Sorting & Pagination Pratinjau (Langkah 3)
      previewStatusFilter: "all", // 'all', 'valid', 'duplicate', 'error'
      previewSortBy: "id_pelanggan",
      previewSortDir: "asc",
      previewPage: 1,
      previewLimit: 15,
      previewSelectedUids: [],
      get isAllPreviewSelected() {
        if (
          !this.paginatedPreviewData ||
          this.paginatedPreviewData.length === 0
        )
          return false;
        return this.paginatedPreviewData.every((r) =>
          this.previewSelectedUids.includes(r._uid),
        );
      },

      get unhandledDuplicateCount() {
        return this.importPreviewDuplicates.filter(
          (r) => r._action !== "skip",
        ).length;
      },
      dbImportFields: [
        {
          key: "id_pelanggan",
          label: "ID Pelanggan (Otomatis jika kosong)",
          required: false,
        },
        { key: "nama", label: "Nama Pelanggan", required: true },
        { key: "ip_router", label: "IP Router", required: true },
        { key: "pop", label: "POP / Cabang", required: false },
        { key: "nama_wifi", label: "Nama WiFi (SSID)", required: false },
        { key: "password_wifi", label: "Password WiFi", required: false },
        { key: "user_admin", label: "User Admin ONT", required: false },
        { key: "pass_admin", label: "Password Admin ONT", required: false },
        { key: "jenis_modem", label: "Tipe Modem", required: false },
        { key: "paket", label: "Paket Bandwidth", required: false },
        { key: "mac_address", label: "MAC Address", required: false },
        { key: "alamat", label: "Alamat Pemasangan", required: false },
        { key: "no_hp", label: "No HP / WhatsApp", required: false },
        { key: "kantor", label: "Kantor Wilayah (Cabang / Pusat / Banyumas)", required: false },
      ],
      importTargetKantor: (statsEl && statsEl.dataset.activeKantor) ? statsEl.dataset.activeKantor : "cabang",

      get isExcelFile() {
        return !!(
          this.importFile &&
          this.importFile.name &&
          this.importFile.name.match(/\.(xlsx|xls)$/i)
        );
      },
      get isCurrentSheetEmpty() {
        if (!this.isExcelFile || !this.importSelectedSheet) return false;
        const sheet = this.importSheets.find(
          (s) => s.name === this.importSelectedSheet,
        );
        return sheet
          ? sheet.columns.length === 0 || sheet.row_count === 0
          : false;
      },
      get canProceedToStep2() {
        if (!this.importFile) return false;
        if (this.isExcelFile) {
          return !!(this.importSelectedSheet && !this.isCurrentSheetEmpty);
        }
        return true;
      },
      get canProceedToStep3() {
        return !!(
          this.importMapping &&
          this.importMapping.nama &&
          this.importMapping.ip_router
        );
      },

      // Selected Targets
      selectedCustomer: null,
      selectedLogs: [],
      customerToDelete: null,

      // State Tampilan Kredensial
      showOntPass: {},
      showWifiPass: false,
      showWifiPassTable: {},

      formatDate(val) {
        if (!val || val === "-" || val === "None") return "-";
        if (typeof val === "string" && (val.includes("/") || val.includes("Baru saja"))) return val;
        try {
          const d = new Date(val);
          if (isNaN(d.getTime())) return val;
          const day = String(d.getDate()).padStart(2, "0");
          const mon = String(d.getMonth() + 1).padStart(2, "0");
          const hr = String(d.getHours()).padStart(2, "0");
          const min = String(d.getMinutes()).padStart(2, "0");
          return `${day}/${mon} ${hr}:${min}`;
        } catch (e) {
          return val;
        }
      },

      // WiFi Editing State
      isEditingWifi: false,
      isSavingWifi: false,
      editWifiData: {
        nama_wifi: "",
        password_wifi: "",
      },

      // Form state
      customerFormTab: "profile",
      formData: {
        id_pelanggan: "",
        nama: "",
        alamat: "",
        no_hp: "",
        kantor: "cabang",
        pop: "Server Cabang",
        ip_router: "",
        paket: "",
        jenis_modem: "GM220-S",
        mac_address: "",
        user_admin: "admin",
        pass_admin: "",
        is_monitored: true,
        snmp_community: "public",
      },

      // Toast
      toast: { show: false, message: "", type: "success" },

      initData() {
        const urlParams = new URLSearchParams(window.location.search);
        const q = urlParams.get("q");
        if (q) {
          this.searchQuery = q;
        }
        this.fetchCustomers(1);

        // Auto-refresh interval realtime tiap 10 detik (silent DOM update)
        setInterval(() => {
          if (document.hidden) return;
          // Jangan refresh jika user sedang membuka modal dialog atau memilih baris untuk aksi massal
          if (
            this.formModalOpen ||
            this.confirmEditModalOpen ||
            this.confirmDeleteModalOpen ||
            this.confirmBulkDeleteModalOpen ||
            this.importModalOpen ||
                        this.detailModalOpen ||
            this.isEditingWifi ||
            this.selectedIds.length > 0 ||
            this.probingId ||
            this.filterRange === "custom"
          ) {
            return;
          }
          this.fetchCustomers(this.currentPage, true);
        }, 10000);
      },

      startEditWifi() {
        this.editWifiData.nama_wifi =
          this.selectedCustomer.nama_wifi &&
          this.selectedCustomer.nama_wifi !== "-"
            ? this.selectedCustomer.nama_wifi
            : "";
        this.editWifiData.password_wifi =
          this.selectedCustomer.password_wifi &&
          this.selectedCustomer.password_wifi !== "-"
            ? this.selectedCustomer.password_wifi
            : "";
        this.isEditingWifi = true;
      },

      cancelEditWifi() {
        this.isEditingWifi = false;
      },

      async saveWifiCredentials() {
        this.isSavingWifi = true;
        try {
          const response = await fetch(
            `/api/customers/${this.selectedCustomer.id_pelanggan}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nama_wifi: this.editWifiData.nama_wifi || null,
                password_wifi: this.editWifiData.password_wifi || null,
              }),
            },
          );

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || "Gagal menyimpan kredensial WiFi");
          }

          this.selectedCustomer.nama_wifi = this.editWifiData.nama_wifi || null;
          this.selectedCustomer.password_wifi =
            this.editWifiData.password_wifi || null;

          // Update tabel utama juga
          const index = this.customers.findIndex(
            (c) => c.id_pelanggan === this.selectedCustomer.id_pelanggan,
          );
          if (index > -1) {
            this.customers[index].nama_wifi = this.selectedCustomer.nama_wifi;
            this.customers[index].password_wifi =
              this.selectedCustomer.password_wifi;
          }

          this.showToast("Kredensial WiFi berhasil diperbarui", "success");
          this.isEditingWifi = false;
        } catch (err) {
          console.error("Error saving WiFi credentials:", err);
          this.showToast(err.message, "error");
        } finally {
          this.isSavingWifi = false;
        }
      },

      showToast(message, type = "success") {
        this.toast.message = message;
        this.toast.type = type;
        this.toast.show = true;
        setTimeout(() => {
          this.toast.show = false;
        }, 4000);
      },

      copyToClipboard(text, label = "Teks") {
        if (!text || text === "-") return;
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard
            .writeText(text)
            .then(() => {
              this.showToast(
                `${label} berhasil disalin ke clipboard!`,
                "success",
              );
            })
            .catch(() => {
              this.showToast(`Gagal menyalin ${label}`, "error");
            });
        } else {
          // Fallback execCommand
          const textArea = document.createElement("textarea");
          textArea.value = text;
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand("copy");
            this.showToast(`${label} berhasil disalin!`, "success");
          } catch (err) {
            this.showToast(`Gagal menyalin ${label}`, "error");
          }
          document.body.removeChild(textArea);
        }
      },

      countByStatus(status) {
        return this.customers.filter((c) => c.status === status).length;
      },

      filterByCard(status) {
        if (this.filterStatus === status) {
          this.filterStatus = "Semua Status";
        } else {
          this.filterStatus = status;
        }
        this.fetchCustomers(1);
      },

      async fetchCustomers(page = 1, silent = false) {
        if (!silent) {
          this.loading = true;
          this.selectedIds = []; // reset pilihan setiap ganti page / filter
        }
        this.currentPage = page;
        try {
          let url = `/api/customers?page=${page}&limit=${this.limit}&sort_by=${this.sortBy}&sort_dir=${this.sortDir}`;
          if (this.searchQuery)
            url += `&q=${encodeURIComponent(this.searchQuery)}`;
          if (this.filterPop && this.filterPop !== "Semua POP")
            url += `&pop=${encodeURIComponent(this.filterPop)}`;
          if (this.filterStatus && this.filterStatus !== "Semua Status")
            url += `&status=${encodeURIComponent(this.filterStatus)}`;
          if (this.filterMonitoring && this.filterMonitoring !== "all")
            url += `&monitoring=${encodeURIComponent(this.filterMonitoring)}`;
          if (this.filterRange && this.filterRange !== "all")
            url += `&range=${encodeURIComponent(this.filterRange)}`;
          if (this.filterRange === "custom" && this.customStartDate && this.customEndDate) {
            url += `&start_date=${encodeURIComponent(this.customStartDate)}&end_date=${encodeURIComponent(this.customEndDate)}`;
          }

          const res = await fetch(url);
          const json = await res.json();
          this.customers = json.data || [];
          this.totalCustomers = json.total || 0;
          this.totalPages = Math.ceil(this.totalCustomers / this.limit) || 1;
          if (json.stats) {
            this.stats = json.stats;
          }
        } catch (err) {
          console.error("Gagal mengambil pelanggan:", err);
          if (!silent) {
            this.showToast("Gagal memuat data pelanggan", "error");
          }
        } finally {
          if (!silent) {
            this.loading = false;
          }
        }
      },

      async toggleMonitoring(customer) {
        const prevStatus = customer.is_monitored !== false;
        const newStatus = !prevStatus;
        customer.is_monitored = newStatus;
        this.togglingMonitoringId = customer.id_pelanggan;

        try {
          const res = await fetch(
            `/api/customers/${customer.id_pelanggan}/toggle-monitoring`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ is_monitored: newStatus }),
            },
          );
          const json = await res.json();
          if (res.ok) {
            customer.is_monitored = json.is_monitored;
            if (json.stats) {
              this.stats = json.stats;
            }
            const actionLabel = customer.is_monitored
              ? "diaktifkan (ON)"
              : "dinonaktifkan (OFF - dilewati saat scan & notif)";
            this.showToast(
              `Pemantauan ${customer.nama} berhasil ${actionLabel}`,
              "success",
            );
            if (
              this.selectedCustomer &&
              this.selectedCustomer.id_pelanggan === customer.id_pelanggan
            ) {
              this.selectedCustomer.is_monitored = customer.is_monitored;
            }
            // Sinkronisasi data tabel dan kartu stat secara realtime
            this.fetchCustomers(this.currentPage, true);
          } else {
            customer.is_monitored = prevStatus;
            this.showToast(
              json.detail || "Gagal mengubah status pemantauan",
              "error",
            );
          }
        } catch (err) {
          customer.is_monitored = prevStatus;
          console.error("Error toggle monitoring:", err);
          this.showToast(
            "Terjadi kesalahan sistem saat mengubah status pemantauan",
            "error",
          );
        } finally {
          this.togglingMonitoringId = null;
        }
      },

      async probeSingle(customer) {
        this.probingId = customer.id_pelanggan;
        try {
          const res = await fetch(
            `/api/monitoring/check-single/${customer.id_pelanggan}`,
            { method: "POST" },
          );
          const json = await res.json();
          if (json.status === "success") {
            const probe = json.probe_result;
            customer.redaman_current = probe.rx_power;
            customer.status = probe.status;
            customer.last_check = "Baru saja";
            if (probe.mac_address) customer.mac_address = probe.mac_address;
            if (probe.status_kredensial)
              customer.status_kredensial = probe.status_kredensial;
            this.showToast(
              `Probe ONT ${customer.nama}: ${probe.rx_power} dBm (${probe.status})`,
            );
          } else {
            this.showToast(json.detail || "Gagal melakukan probe ONT", "error");
          }
        } catch (err) {
          this.showToast("Error komunikasi server", "error");
        } finally {
          this.probingId = null;
        }
      },

      openCreateModal() {
        this.customerFormTab = "profile";
        this.isEditMode = false;
        this.formData = {
          id_pelanggan: "",
          nama: "",
          alamat: "",
          no_hp: "",
          kantor: "cabang",
          pop: "Server Cabang",
          ip_router: "",
          paket: "20 Mbps Home",
          jenis_modem: "GM220-S",
          mac_address: "",
          nama_wifi: "",
          password_wifi: "",
          user_admin: "admin",
          pass_admin: "",
          is_monitored: true,
          snmp_community: "public",
        };
        this.formModalOpen = true;
      },

      openEditModal(c) {
        this.customerFormTab = "profile";
        this.isEditMode = true;
        this.formData = {
          id_pelanggan: c.id_pelanggan,
          nama: c.nama,
          alamat: c.alamat === "-" ? "" : c.alamat,
          no_hp: c.no_hp === "-" ? "" : c.no_hp,
          kantor: c.kantor || "cabang",
          pop: c.pop,
          ip_router: c.ip_router,
          paket: c.paket === "-" ? "" : c.paket,
          jenis_modem: c.jenis_modem,
          mac_address: c.mac_address === "-" ? "" : c.mac_address,
          nama_wifi: c.nama_wifi === "-" ? "" : c.nama_wifi || "",
          password_wifi: c.password_wifi === "-" ? "" : c.password_wifi || "",
          user_admin: c.user_admin === "-" ? "admin" : c.user_admin || "admin",
          pass_admin: c.pass_admin === "-" ? "" : c.pass_admin || "",
          is_monitored: c.is_monitored !== false,
          snmp_community: "public",
        };
        this.formModalOpen = true;
      },

      onCustomerFormSubmit() {
        // 1. Validasi Field Tab 1 (Profil & Jaringan)
        if (!this.formData.nama || !this.formData.nama.trim()) {
          this.customerFormTab = "profile";
          this.showToast("Nama lengkap pelanggan wajib diisi", "error");
          return;
        }
        if (!this.formData.pop || !this.formData.pop.trim()) {
          this.customerFormTab = "profile";
          this.showToast("Point of Presence (POP) wajib diisi", "error");
          return;
        }
        if (!this.formData.kantor) {
          this.customerFormTab = "profile";
          this.showToast("Kantor wilayah / cabang wajib dipilih", "error");
          return;
        }
        if (!this.formData.ip_router || !this.formData.ip_router.trim()) {
          this.customerFormTab = "profile";
          this.showToast("IP Router ONT wajib diisi", "error");
          return;
        }

        // 2. Validasi Field Tab 2 (Modem & WiFi)
        if (!this.formData.user_admin || !this.formData.user_admin.trim()) {
          this.customerFormTab = "modem";
          this.showToast("Username admin modem wajib diisi", "error");
          return;
        }

        // 3. Eksekusi alur simpan
        if (this.isEditMode) {
          // Tampilkan popup konfirmasi edit
          this.confirmEditModalOpen = true;
        } else {
          // Tambah baru langsung eksekusi
          this.executeSaveCustomerForm();
        }
      },

      async executeSaveCustomerForm() {
        this.confirmEditModalOpen = false;
        try {
          let url = "/api/customers";
          let method = "POST";

          if (this.isEditMode) {
            url = `/api/customers/${this.formData.id_pelanggan}`;
            method = "PUT";
          }

          const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(this.formData),
          });

          const json = await res.json();
          if (res.ok) {
            this.showToast(json.message);
            this.formModalOpen = false;
            this.fetchCustomers(this.currentPage);
          } else {
            this.showToast(json.detail || "Gagal menyimpan data", "error");
          }
        } catch (err) {
          this.showToast("Terjadi kesalahan sistem", "error");
        }
      },

      confirmDeleteSingle(c) {
        this.customerToDelete = c;
        this.confirmDeleteModalOpen = true;
      },

      async executeDeleteSingle() {
        if (!this.customerToDelete) return;
        const id = this.customerToDelete.id_pelanggan;
        this.confirmDeleteModalOpen = false;
        try {
          const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
          const json = await res.json();
          if (res.ok) {
            this.showToast(json.message || "Pelanggan berhasil dihapus");
            this.fetchCustomers(this.currentPage);
          } else {
            this.showToast(json.detail || "Gagal menghapus pelanggan", "error");
          }
        } catch (err) {
          this.showToast("Terjadi kesalahan sistem saat menghapus", "error");
        } finally {
          this.customerToDelete = null;
        }
      },

      confirmBulkDelete() {
        if (this.selectedIds.length === 0) return;
        this.confirmBulkDeleteModalOpen = true;
      },

      async executeBulkDelete() {
        this.confirmBulkDeleteModalOpen = false;
        try {
          const res = await fetch("/api/customers/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: this.selectedIds }),
          });
          const json = await res.json();
          if (res.ok) {
            this.showToast(
              json.message ||
                `${this.selectedIds.length} pelanggan berhasil dihapus`,
            );
            this.selectedIds = [];
            this.fetchCustomers(this.currentPage);
          } else {
            this.showToast(
              json.detail || "Gagal menghapus pelanggan terpilih",
              "error",
            );
          }
        } catch (err) {
          this.showToast("Terjadi kesalahan sistem", "error");
        }
      },

      openImportModal() {
        this.importStep = 1;
        this.importFile = null;
        this.importSheets = [];
        this.importSelectedSheet = "";
        this.importCurrentColumns = [];
        this.importMapping = {};
        this.importPreviewData = [];
        this.importPreviewValid = [];
        this.importPreviewDuplicates = [];
        this.importPreviewErrors = [];
        this.existingDbIds = [];
        this.isImporting = false;
        this.previewStatusFilter = "all";
        this.previewSortBy = "id_pelanggan";
        this.previewSortDir = "asc";
        this.previewPage = 1;
        this.previewLimit = 25;
        this.previewSelectedUids = [];
        this.importTargetKantor = (statsEl && statsEl.dataset.activeKantor) ? statsEl.dataset.activeKantor : "cabang";
        if (this.$refs.excelFileInput) {
          this.$refs.excelFileInput.value = "";
        }
        this.importModalOpen = true;
      },

      async onImportFileSelected(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
          this.importFile = files[0];
          this.importSheets = [];
          this.importSelectedSheet = "";
          this.importCurrentColumns = [];
          this.importMapping = {};
          this.importPreviewData = [];
          this.existingDbIds = [];
          await this.analyzeImportFile();
        }
      },

      async analyzeImportFile() {
        if (!this.importFile) return;
        this.isImporting = true;
        try {
          const formData = new FormData();
          formData.append("file", this.importFile);

          const res = await fetch("/api/customers/import/analyze", {
            method: "POST",
            body: formData,
          });
          const json = await res.json();

          if (res.ok && json.result) {
            this.importSheets = json.result.sheets || [];
            if (this.importSheets.length === 1) {
              this.importSelectedSheet = this.importSheets[0].name;
              this.onSheetChanged();
            } else {
              this.importSelectedSheet = "";
              this.importCurrentColumns = [];
            }
            this.showToast(
              `Berkas berhasil dianalisis: ${this.importSheets.length} sheet terdeteksi`,
              "success",
            );
          } else {
            this.showToast(json.detail || "Gagal menganalisis berkas", "error");
          }
        } catch (err) {
          console.error("Error saat analisis file:", err);
          this.showToast("Terjadi kesalahan saat membaca berkas", "error");
        } finally {
          this.isImporting = false;
        }
      },

      onSheetChanged() {
        const sheet = this.importSheets.find(
          (s) => s.name === this.importSelectedSheet,
        );
        if (sheet) {
          this.importCurrentColumns = sheet.columns || [];
          this.autoMapColumns();
        } else {
          this.importCurrentColumns = [];
          this.importMapping = {};
        }
      },

      proceedToStep2() {
        if (!this.canProceedToStep2) {
          if (this.isExcelFile && !this.importSelectedSheet) {
            this.showToast(
              "Silakan pilih sheet/tabel yang akan diimpor terlebih dahulu",
              "error",
            );
          } else if (this.isCurrentSheetEmpty) {
            this.showToast(
              "Sheet terpilih tidak memuat data yang valid",
              "error",
            );
          }
          return;
        }
        if (
          Object.keys(this.importMapping).length === 0 ||
          !this.importMapping.nama
        ) {
          this.autoMapColumns();
        }
        this.importStep = 2;
      },

      autoMapColumns() {
        if (
          !this.importCurrentColumns ||
          this.importCurrentColumns.length === 0
        )
          return;
        this.importMapping = {};

        const cleanStr = (s) =>
          (s || "")
            .toString()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

        const aliases = {
          id_pelanggan: [
            "idpelanggan",
            "id",
            "cid",
            "nopelanggan",
            "nomerpelanggan",
            "no",
          ],
          nama: [
            "nama",
            "namapelanggan",
            "customer",
            "name",
            "client",
            "namalengkap",
          ],
          ip_router: ["iprouter", "ip", "ipaddress", "ipont", "ipmodem"],
          pop: [
            "pop",
            "cabang",
            "area",
            "olt",
            "odpbaru",
            "odplama",
            "odp",
            "lokasi",
            "server",
          ],
          nama_wifi: [
            "namawifi",
            "wifi",
            "ssid",
            "wifibaru",
            "namassid",
            "ssidwifi",
          ],
          password_wifi: [
            "passwordwifi",
            "passwifi",
            "pswd",
            "passbaru",
            "sandiwifi",
            "passwordwifibaru",
            "pass",
          ],
          user_admin: [
            "useradmin",
            "user",
            "username",
            "adminuser",
            "userlogin",
            "useront",
          ],
          pass_admin: [
            "passadmin",
            "pass",
            "password",
            "adminpass",
            "passlogin",
            "passont",
          ],
          jenis_modem: [
            "jenismodem",
            "tipemodem",
            "modem",
            "type",
            "tipe",
            "onttype",
          ],
          paket: [
            "paket",
            "profile",
            "bandwidth",
            "speed",
            "layanan",
            "paketinternet",
          ],
          mac_address: ["macaddress", "mac", "sn", "serialnumber", "gponsn"],
          alamat: ["alamat", "alamatpasang", "address", "lokasipasang"],
          no_hp: [
            "nohp",
            "hp",
            "telepon",
            "whatsapp",
            "wa",
            "telp",
            "phone",
            "nomorhp",
          ],
          kantor: [
            "kantor",
            "wilayah",
            "cabang",
            "office",
            "kantorwilayah",
            "site",
            "lokasikantor",
          ],
        };

        this.dbImportFields.forEach((field) => {
          const targetKey = field.key;
          const matchPatterns = aliases[targetKey] || [cleanStr(field.label)];
          let matchedCol = "";

          // Prioritas 1: Exact match atau alias match
          for (const col of this.importCurrentColumns) {
            const normCol = cleanStr(col);
            if (matchPatterns.includes(normCol)) {
              matchedCol = col;
              break;
            }
          }

          // Prioritas 2: Substring match jika belum cocok
          if (!matchedCol) {
            for (const col of this.importCurrentColumns) {
              const normCol = cleanStr(col);
              for (const pat of matchPatterns) {
                if (
                  normCol.length >= 3 &&
                  (normCol.includes(pat) ||
                    (pat.length >= 3 && pat.includes(normCol)))
                ) {
                  matchedCol = col;
                  break;
                }
              }
              if (matchedCol) break;
            }
          }

          this.importMapping[targetKey] = matchedCol || "";
        });
        this.showToast("Pemetaan kolom diperbarui secara otomatis");
      },

      async previewImportData() {
        if (!this.canProceedToStep3) {
          this.showToast(
            "Kolom Nama Pelanggan dan IP Router wajib dipetakan",
            "error",
          );
          return;
        }
        this.isImporting = true;
        try {
          const formData = new FormData();
          formData.append("file", this.importFile);
          formData.append("sheet_name", this.importSelectedSheet || "");
          formData.append("mapping", JSON.stringify(this.importMapping));

          const res = await fetch("/api/customers/import/preview", {
            method: "POST",
            body: formData,
          });
          const json = await res.json();

          if (res.ok && json.result) {
            let counter = 1;
            this.importPreviewData = (json.result.preview_data || []).map(
              (r) => {
                r._uid = "row_" + counter++;
                return r;
              },
            );
            this.existingDbIds = json.result.existing_ids || [];
            this.existingDbIps = json.result.existing_ips || [];
            this.previewStatusFilter = "all";
            this.previewPage = 1;
            this.previewSelectedUids = [];
            this.updatePreviewStats();
            this.importStep = 3;
            this.showToast(
              `Pratinjau siap: ${this.importPreviewData.length} baris data dimuat`,
              "success",
            );
          } else {
            this.showToast(
              json.detail || "Gagal membuat pratinjau data",
              "error",
            );
          }
        } catch (err) {
          console.error("Error preview data:", err);
          this.showToast(
            "Terjadi kesalahan sistem saat memproses pratinjau",
            "error",
          );
        } finally {
          this.isImporting = false;
        }
      },

      generateCustomerIdFromIp(ip, sequence = 1) {
        const cleanIp = (ip || "").toString().replace(/[^0-9]/g, "");
        const seqStr = String(sequence).padStart(5, "0");
        if (cleanIp) {
          return `P${cleanIp}${seqStr}`;
        }
        return `PLG${seqStr}`;
      },

      updatePreviewStats() {
        this.importPreviewValid = [];
        this.importPreviewDuplicates = [];
        this.importPreviewErrors = [];
        const seenBatchIds = new Map();
        const seenBatchIps = new Map();

        const dbIps = this.existingDbIps || [];
        const dbIds = this.existingDbIds || [];

        this.importPreviewData.forEach((row, idx) => {
          const d = row.data || row;
          const id = (d.id_pelanggan || "").toString().trim();
          const nama = (d.nama || "").toString().trim();
          const ip = (d.ip_router || "").toString().trim();

          if (!nama || !ip) {
            row._status = "error";
            row._message = "Nama Pelanggan dan IP Router wajib diisi";
            this.importPreviewErrors.push(row);
          } else if (!id) {
            row._status = "error";
            row._message = "ID Pelanggan tidak boleh kosong";
            this.importPreviewErrors.push(row);
          } else if (dbIps.includes(ip)) {
            row._status = "duplicate";
            if (!row._action || row._action === "insert" || row._action === "update") {
              row._action = "skip";
            }
            row._message = `IP Router '${ip}' sudah terdaftar di database`;
            this.importPreviewDuplicates.push(row);
          } else if (seenBatchIps.has(ip)) {
            row._status = "duplicate";
            if (!row._action || row._action === "insert" || row._action === "update") {
              row._action = "skip";
            }
            row._message = `IP Router '${ip}' duplikat di berkas ini (baris ${seenBatchIps.get(ip)})`;
            this.importPreviewDuplicates.push(row);
          } else if (dbIds.includes(id)) {
            row._status = "duplicate";
            if (!row._action || row._action === "insert" || row._action === "update") {
              row._action = "skip";
            }
            row._message = `ID Pelanggan '${id}' sudah terdaftar di database`;
            this.importPreviewDuplicates.push(row);
          } else if (seenBatchIds.has(id)) {
            row._status = "duplicate";
            if (!row._action || row._action === "insert" || row._action === "update") {
              row._action = "skip";
            }
            row._message = `ID Pelanggan '${id}' duplikat di berkas ini (baris ${seenBatchIds.get(id)})`;
            this.importPreviewDuplicates.push(row);
          } else {
            seenBatchIds.set(id, idx + 1);
            seenBatchIps.set(ip, idx + 1);
            row._status = "valid";
            row._action = "insert";
            if (row._autoGenerated) {
              row._action = "insert";
              row._message = `ID Unik: ${id}`;
            } else {
              row._message = "Data baru siap di-import";
            }
            this.importPreviewValid.push(row);
          }

          if (ip && !seenBatchIps.has(ip)) seenBatchIps.set(ip, idx + 1);
          if (id && !seenBatchIds.has(id)) seenBatchIds.set(id, idx + 1);
        });
      },

      onRowIdChanged(row) {
        this.updatePreviewStats();
      },

      setPreviewFilter(status) {
        if (this.previewStatusFilter === status) {
          this.previewStatusFilter = "all";
        } else {
          this.previewStatusFilter = status;
        }
        this.previewPage = 1;
      },

      sortPreviewTable(col) {
        if (this.previewSortBy === col) {
          this.previewSortDir = this.previewSortDir === "asc" ? "desc" : "asc";
        } else {
          this.previewSortBy = col;
          this.previewSortDir = "asc";
        }
        this.previewPage = 1;
      },

      get filteredSortedPreviewData() {
        let list = this.importPreviewData;
        if (this.previewStatusFilter !== "all") {
          list = list.filter((r) => r._status === this.previewStatusFilter);
        }
        const dir = this.previewSortDir === "asc" ? 1 : -1;
        const col = this.previewSortBy;

        return [...list].sort((a, b) => {
          const da = a.data || a;
          const db = b.data || b;
          let va = "";
          let vb = "";

          if (col === "status") {
            va = (a._status || "").toLowerCase();
            vb = (b._status || "").toLowerCase();
          } else if (col === "aksi") {
            va = (a._action || "").toLowerCase();
            vb = (b._action || "").toLowerCase();
          } else if (col === "id_pelanggan") {
            va = (da.id_pelanggan || "").toString();
            vb = (db.id_pelanggan || "").toString();
            return (
              va.localeCompare(vb, undefined, {
                numeric: true,
                sensitivity: "base",
              }) * dir
            );
          } else if (col === "nama") {
            va = (da.nama || "").toString().toLowerCase();
            vb = (db.nama || "").toString().toLowerCase();
          } else if (col === "ip_router") {
            va = (da.ip_router || "").toString();
            vb = (db.ip_router || "").toString();
            return va.localeCompare(vb, undefined, { numeric: true }) * dir;
          } else if (col === "pop") {
            va = (da.pop || "").toString().toLowerCase();
            vb = (db.pop || "").toString().toLowerCase();
          } else if (col === "wifi") {
            va = (da.nama_wifi || "").toString().toLowerCase();
            vb = (db.nama_wifi || "").toString().toLowerCase();
          } else {
            va = (da[col] || "").toString().toLowerCase();
            vb = (db[col] || "").toString().toLowerCase();
          }

          if (va < vb) return -1 * dir;
          if (va > vb) return 1 * dir;
          return 0;
        });
      },

      get previewTotalCount() {
        return this.filteredSortedPreviewData.length;
      },

      get previewTotalPages() {
        return Math.max(
          1,
          Math.ceil(this.previewTotalCount / this.previewLimit),
        );
      },

      get paginatedPreviewData() {
        const start = (this.previewPage - 1) * this.previewLimit;
        return this.filteredSortedPreviewData.slice(
          start,
          start + this.previewLimit,
        );
      },

      getPreviewPageNumbers() {
        const pages = [];
        const total = this.previewTotalPages;
        const maxVisible = 5;

        if (total <= maxVisible + 2) {
          for (let i = 1; i <= total; i++) pages.push(i);
        } else {
          pages.push(1);
          let start = Math.max(2, this.previewPage - 1);
          let end = Math.min(total - 1, this.previewPage + 1);

          if (this.previewPage <= 3) {
            end = 4;
          } else if (this.previewPage >= total - 2) {
            start = total - 3;
          }

          if (start > 2) pages.push("...");
          for (let i = start; i <= end; i++) pages.push(i);
          if (end < total - 1) pages.push("...");
          if (total > 1) pages.push(total);
        }
        return pages;
      },

      removePreviewRow(row) {
        const index = this.importPreviewData.indexOf(row);
        if (index > -1) {
          this.importPreviewData.splice(index, 1);
          this.previewSelectedUids = this.previewSelectedUids.filter(
            (id) => id !== row._uid,
          );
          this.updatePreviewStats();
          if (this.previewPage > this.previewTotalPages) {
            this.previewPage = this.previewTotalPages;
          }
        }
      },

      toggleSelectAllPreview() {
        if (this.isAllPreviewSelected) {
          const currentUids = new Set(
            this.paginatedPreviewData.map((r) => r._uid),
          );
          this.previewSelectedUids = this.previewSelectedUids.filter(
            (id) => !currentUids.has(id),
          );
        } else {
          const uidsToAdd = this.paginatedPreviewData.map((r) => r._uid);
          this.previewSelectedUids = Array.from(
            new Set([...this.previewSelectedUids, ...uidsToAdd]),
          );
        }
      },

      deleteSelectedPreviewRows() {
        if (this.previewSelectedUids.length === 0) return;
        const count = this.previewSelectedUids.length;
        const selectedSet = new Set(this.previewSelectedUids);
        this.importPreviewData = this.importPreviewData.filter(
          (r) => !selectedSet.has(r._uid),
        );
        this.previewSelectedUids = [];
        this.updatePreviewStats();
        if (this.previewPage > this.previewTotalPages) {
          this.previewPage = Math.max(1, this.previewTotalPages);
        }
        this.showToast(
          `${count} baris data berhasil dihapus dari pratinjau`,
          "success",
        );
      },

      makeSelectedPreviewUnique() {
        if (this.previewSelectedUids.length === 0) return;
        const selectedSet = new Set(this.previewSelectedUids);
        let count = 0;
        this.importPreviewData.forEach((r) => {
          if (selectedSet.has(r._uid)) {
            this.makeRowUnique(r);
            count++;
          }
        });
        this.showToast(
          `${count} baris terpilih berhasil diubah menjadi ID unik!`,
          "success",
        );
      },

      setSelectedPreviewAction(action) {
        if (this.previewSelectedUids.length === 0) return;
        const selectedSet = new Set(this.previewSelectedUids);
        let count = 0;
        this.importPreviewData.forEach((r) => {
          if (selectedSet.has(r._uid)) {
            r._action = action;
            count++;
          }
        });
        this.showToast(
          `${count} baris terpilih diatur ke: Abaikan (Skip)`,
        );
      },

      setAllDuplicatesAction(action) {
        let count = 0;
        this.importPreviewData.forEach((r) => {
          if (r._status === "duplicate" && !r._autoGenerated) {
            r._action = action;
            count++;
          }
        });
        this.updatePreviewStats();
        this.showToast(
          `${count} data duplikat diatur ke: ${action === "skip" ? "Abaikan (Skip)" : "Aktif"}`,
        );
      },

      makeRowUnique(row) {
        const d = row.data || row;
        const ip = d.ip_router || "";
        const allIds = new Set([
          ...this.existingDbIds,
          ...this.importPreviewData.map((r) => (r.data || r).id_pelanggan),
        ]);

        let seq = 1;
        let candidate = this.generateCustomerIdFromIp(ip, seq);
        while (allIds.has(candidate)) {
          seq++;
          candidate = this.generateCustomerIdFromIp(ip, seq);
        }
        allIds.add(candidate);

        d.id_pelanggan = candidate;
        row._status = "valid";
        row._action = "insert";
        row._autoGenerated = true;
        row._wasDuplicate = true;
        row._message = `ID diubah menjadi ${candidate} (Unik)`;
        this.updatePreviewStats();
        this.showToast(`ID berhasil diubah menjadi ${candidate} (Unik)`, "success");
      },

      autoGenerateAllDuplicates() {
        let changed = 0;
        const allIds = new Set([
          ...this.existingDbIds,
          ...this.importPreviewData.map((r) => (r.data || r).id_pelanggan),
        ]);
        const ipSeqMap = {};

        this.importPreviewData.forEach((r) => {
          if (r._status === "duplicate" && !r._autoGenerated) {
            const d = r.data || r;
            const ip = d.ip_router || "";
            const cleanIp = ip.replace(/[^0-9]/g, "") || "PLG";

            let seq = ipSeqMap[cleanIp] || 1;
            let candidate = this.generateCustomerIdFromIp(ip, seq);
            while (allIds.has(candidate)) {
              seq++;
              candidate = this.generateCustomerIdFromIp(ip, seq);
            }
            ipSeqMap[cleanIp] = seq + 1;
            allIds.add(candidate);

            d.id_pelanggan = candidate;
            r._status = "valid";
            r._action = "insert";
            r._autoGenerated = true;
            r._wasDuplicate = true;
            r._message = `ID diubah menjadi ${candidate} (Unik)`;
            changed++;
          }
        });

        this.updatePreviewStats();
        this.showToast(
          `${changed} data duplikat berhasil diperbarui dengan format ID unik!`,
          "success",
        );
      },

      getActiveImportCount() {
        return this.importPreviewData.filter(
          (r) => r._status !== "error" && r._action !== "skip",
        ).length;
      },

      async executeImportData() {
        if (this.unhandledDuplicateCount > 0) {
          this.showToast(
            `Ditolak: Masih terdapat ${this.unhandledDuplicateCount} data duplikat aktif! Harap jadikan ID unik atau abaikan (skip) terlebih dahulu.`,
            "error",
          );
          return;
        }

        const dataToImport = this.importPreviewData.filter(
          (r) => r._status !== "error" && r._action !== "skip",
        );
        if (dataToImport.length === 0) {
          this.showToast("Tidak ada data yang valid untuk di-import", "error");
          return;
        }

        this.isImporting = true;
        try {
          const res = await fetch("/api/customers/import/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              data: dataToImport,
              target_kantor: this.importTargetKantor
            }),
          });
          const json = await res.json();

          if (res.ok) {
            this.showToast(
              json.message || "Import data berhasil diproses!",
              "success",
            );
            this.importModalOpen = false;
                        this.fetchCustomers(1);
          } else {
            this.showToast(
              json.detail || "Gagal menyimpan data import",
              "error",
            );
          }
        } catch (err) {
          console.error("Error eksekusi import:", err);
          this.showToast(
            "Terjadi kesalahan sistem saat menyimpan import",
            "error",
          );
        } finally {
          this.isImporting = false;
        }
      },

      async openDetailModal(id_pelanggan) {
        try {
          const res = await fetch(`/api/customers/${id_pelanggan}`);
          const json = await res.json();
          if (res.ok) {
            this.selectedCustomer = json.customer;
            this.selectedLogs = json.recent_logs;
            this.showWifiPass = false;
            this.detailModalOpen = true;
          } else {
            this.showToast("Gagal mengambil detail pelanggan", "error");
          }
        } catch (err) {
          this.showToast("Gagal mengambil detail pelanggan", "error");
        }
      },
    };
  }