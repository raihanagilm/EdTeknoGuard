import os

BASE_DIR = os.path.abspath("portal_pelanggan")

def write_file(rel_path, content):
    full_path = os.path.join(BASE_DIR, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Created: portal_pelanggan/{rel_path}")

# ==========================================
# BASE TEMPLATE (MOBILE-FIRST)
# ==========================================

BASE_HTML = """<!DOCTYPE html>
<html lang="id" class="h-full bg-slate-100 text-slate-900 antialiased">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
    <title>{% block title %}Portal Pelanggan — EdTeknoGuard{% endblock %}</title>

    <!-- Google Fonts: Plus Jakarta Sans -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <!-- Tailwind CSS (CDN) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        brand: {
                            50: '#EEF2FF',
                            100: '#E0E7FF',
                            500: '#6366F1',
                            600: '#4F46E5',
                            700: '#4338CA',
                            800: '#3730A3',
                            900: '#312E81',
                        }
                    },
                    fontFamily: {
                        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <!-- Alpine.js (CDN) -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    {% block head %}{% endblock %}
</head>

<body class="min-h-full bg-slate-100 flex flex-col items-center">

    <!-- Mobile Frame Container (Max-w-md on desktop, 100% full-width on mobile) -->
    <div class="w-full max-w-md min-h-screen bg-slate-50 flex flex-col shadow-xl relative pb-20 border-x border-slate-200/70">
        
        <!-- Top App Bar Header -->
        <header class="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-xs">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                </div>
                <div>
                    <h1 class="text-sm font-extrabold text-slate-900 tracking-tight leading-tight">
                        EdTekno <span class="text-indigo-600">Pelanggan</span>
                    </h1>
                    <p class="text-[10px] text-slate-500 font-medium">Layanan Internet & Jaringan ONT</p>
                </div>
            </div>

            {% if current_cust %}
            <a href="{{ base_url or '' }}/logout" 
               class="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition" 
               title="Keluar (Logout)">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
            </a>
            {% endif %}
        </header>

        <!-- Main Content View -->
        <main class="flex-1 p-4 space-y-4">
            {% block content %}{% endblock %}
        </main>

        {% if current_cust %}
        <!-- Sticky Bottom Navigation Bar (Touch targets >= 44x44 px) -->
        <nav class="fixed bottom-0 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-slate-200/90 z-40 flex items-center justify-around py-1.5 px-2 shadow-[0_-4px_15px_-2px_rgba(0,0,0,0.05)] pb-[calc(env(safe-area-inset-bottom)+0.375rem)]">
            
            <!-- Tab 1: Beranda -->
            <a href="{{ base_url or '' }}/"
               class="flex flex-col items-center justify-center py-1 flex-1 min-h-[44px] rounded-xl transition {% if active_tab == 'dashboard' %}text-indigo-600 font-bold bg-indigo-50/70{% else %}text-slate-500 hover:text-slate-900{% endif %}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                <span class="text-[10px] mt-1">Beranda</span>
            </a>

            <!-- Tab 2: Lapor Kendala -->
            <a href="{{ base_url or '' }}/kendala"
               class="flex flex-col items-center justify-center py-1 flex-1 min-h-[44px] rounded-xl transition {% if active_tab == 'kendala' %}text-indigo-600 font-bold bg-indigo-50/70{% else %}text-slate-500 hover:text-slate-900{% endif %}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <span class="text-[10px] mt-1">Kendala</span>
            </a>

            <!-- Tab 3: Kuota -->
            <a href="{{ base_url or '' }}/kuota"
               class="flex flex-col items-center justify-center py-1 flex-1 min-h-[44px] rounded-xl transition {% if active_tab == 'kuota' %}text-indigo-600 font-bold bg-indigo-50/70{% else %}text-slate-500 hover:text-slate-900{% endif %}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                <span class="text-[10px] mt-1">Kuota</span>
            </a>

            <!-- Tab 4: Profil -->
            <a href="{{ base_url or '' }}/profil"
               class="flex flex-col items-center justify-center py-1 flex-1 min-h-[44px] rounded-xl transition {% if active_tab == 'profil' %}text-indigo-600 font-bold bg-indigo-50/70{% else %}text-slate-500 hover:text-slate-900{% endif %}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <span class="text-[10px] mt-1">Profil</span>
            </a>

        </nav>
        {% endif %}

    </div>

    {% block scripts %}{% endblock %}
</body>
</html>
"""

write_file("templates/layouts/base.html", BASE_HTML)

# ==========================================
# AUTH TEMPLATES (LOGIN & REGISTER)
# ==========================================

LOGIN_HTML = """{% extends "layouts/base.html" %}
{% block title %}Masuk — EdTekno Pelanggan{% endblock %}

{% block content %}
<div class="py-4 space-y-6">

    <!-- Card Brand Box -->
    <div class="text-center space-y-2 py-3">
        <div class="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
        </div>
        <h2 class="text-xl font-black text-slate-900 tracking-tight">Portal Pelanggan</h2>
        <p class="text-xs text-slate-500">Masuk untuk melihat status jaringan, kuota, & lapor kendala</p>
    </div>

    <!-- Feedback Alerts -->
    {% if error %}
    <div class="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
        <svg class="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span>{{ error }}</span>
    </div>
    {% endif %}

    {% if success %}
    <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
        <svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        <span>{{ success }}</span>
    </div>
    {% endif %}

    <!-- Login Form Card -->
    <div class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
        <form action="{{ base_url or '' }}/login" method="POST" class="space-y-4">
            
            <!-- Identifier Input -->
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" for="identifier">
                    Nama / ID Pelanggan / No HP
                </label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    </div>
                    <input type="text"
                           id="identifier"
                           name="identifier"
                           required
                           value="{{ identifier or '' }}"
                           placeholder="Contoh: Budi Santoso atau PLG-001"
                           class="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]">
                </div>
            </div>

            <!-- Password Input with Toggle Eye -->
            <div x-data="{ showPassword: false }">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" for="password">
                    Password
                </label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    </div>
                    <input :type="showPassword ? 'text' : 'password'"
                           type="password"
                           id="password"
                           name="password"
                           required
                           placeholder="Masukkan password akun Anda"
                           class="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]">
                    <button type="button"
                            @click="showPassword = !showPassword"
                            class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition min-w-[44px] justify-end"
                            aria-label="Toggle password visibility">
                        <svg x-show="!showPassword" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <svg x-show="showPassword" style="display: none;" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Submit Button -->
            <button type="submit"
                    class="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wide transition shadow-md shadow-indigo-600/20 min-h-[44px] flex items-center justify-center gap-2">
                <span>Masuk ke Akun Saya</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
        </form>

        <!-- Registrasi / Aktivasi Link -->
        <div class="pt-3 border-t border-slate-100 text-center">
            <p class="text-xs text-slate-500">
                Belum punya akun portal?
                <a href="{{ base_url or '' }}/daftar" class="font-bold text-indigo-600 hover:text-indigo-700 ml-1 underline">
                    Daftar / Aktivasi di Sini
                </a>
            </p>
        </div>
    </div>

</div>
{% endblock %}
"""

REGISTER_HTML = """{% extends "layouts/base.html" %}
{% block title %}Aktivasi Akun Pelanggan — EdTekno Pelanggan{% endblock %}

{% block content %}
<div class="py-3 space-y-4">

    <!-- Header Box -->
    <div class="space-y-1">
        <a href="{{ base_url or '' }}/login" class="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 mb-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            <span>Kembali ke Login</span>
        </a>
        <h2 class="text-lg font-black text-slate-900 tracking-tight">Aktivasi Akun Pelanggan</h2>
        <p class="text-xs text-slate-500">
            Cocokkan data pemasangan internet Anda untuk membuat password portal baru.
        </p>
    </div>

    <!-- Error Alert -->
    {% if error %}
    <div class="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
        <svg class="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span>{{ error }}</span>
    </div>
    {% endif %}

    <!-- Register Form Card -->
    <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
        <form action="{{ base_url or '' }}/daftar" method="POST" class="space-y-3.5">

            <!-- Nama Lengkap Terdaftar -->
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="nama">
                    Nama Lengkap Terdaftar <span class="text-rose-500">*</span>
                </label>
                <input type="text"
                       id="nama"
                       name="nama"
                       required
                       value="{{ data.nama or '' }}"
                       placeholder="Sesuai nama saat pemasangan WiFi"
                       class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]">
            </div>

            <!-- Alamat Lengkap (Wajib) -->
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="alamat">
                    Alamat Pemasangan <span class="text-rose-500">*</span>
                </label>
                <textarea id="alamat"
                          name="alamat"
                          required
                          rows="2"
                          placeholder="Alamat rumah / lokasi terpasang modem ONT"
                          class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">{{ data.alamat or '' }}</textarea>
                <p class="text-[11px] text-slate-400 mt-0.5">Sistem akan mencocokkan alamat Anda dengan database ISP.</p>
            </div>

            <!-- IP Router / Modem (Opsional tapi membantu) -->
            <div>
                <div class="flex items-center justify-between mb-1">
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider" for="ip_router">
                        IP Router / Modem
                    </label>
                    <span class="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">Opsional</span>
                </div>
                <input type="text"
                       id="ip_router"
                       name="ip_router"
                       value="{{ data.ip_router or '' }}"
                       placeholder="Misal: 10.20.30.40 atau 192.168.1.1"
                       class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]">
                <p class="text-[11px] text-slate-400 mt-0.5">Jika Anda tahu IP modem Anda, ini akan mempercepat verifikasi otomatis.</p>
            </div>

            <!-- Nomor WhatsApp / HP -->
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="no_hp">
                    Nomor WhatsApp / HP <span class="text-rose-500">*</span>
                </label>
                <input type="tel"
                       id="no_hp"
                       name="no_hp"
                       required
                       value="{{ data.no_hp or '' }}"
                       placeholder="08xxxxxxxxxx"
                       class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]">
            </div>

            <!-- Password Baru & Konfirmasi -->
            <div x-data="{ showPwd: false }">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="password">
                    Buat Password Baru <span class="text-rose-500">*</span>
                </label>
                <div class="relative">
                    <input :type="showPwd ? 'text' : 'password'"
                           id="password"
                           name="password"
                           required
                           placeholder="Minimal 6 karakter"
                           class="w-full pl-3.5 pr-11 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]">
                    <button type="button"
                            @click="showPwd = !showPwd"
                            class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none min-w-[44px] justify-end">
                        <svg x-show="!showPwd" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        <svg x-show="showPwd" style="display: none;" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                    </button>
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="confirm_password">
                    Ulangi Password Baru <span class="text-rose-500">*</span>
                </label>
                <input type="password"
                       id="confirm_password"
                       name="confirm_password"
                       required
                       placeholder="Ketik ulang password baru Anda"
                       class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]">
            </div>

            <!-- Tombol Aktivasi -->
            <button type="submit"
                    class="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wide transition shadow-md shadow-indigo-600/20 min-h-[44px] flex items-center justify-center gap-2">
                <span>Aktivasi Akun Sekarang</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </button>
        </form>
    </div>

</div>
{% endblock %}
"""

write_file("templates/auth/login.html", LOGIN_HTML)
write_file("templates/auth/register.html", REGISTER_HTML)
print("Auth templates created.")

# ==========================================
# DASHBOARD TEMPLATE
# ==========================================

DASHBOARD_HTML = """{% extends "layouts/base.html" %}
{% block title %}Beranda — EdTekno Pelanggan{% endblock %}

{% block content %}
<div class="space-y-4">

    <!-- Greeting & Account Header Card -->
    <div class="p-4 rounded-3xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 space-y-3">
        <div class="flex items-start justify-between">
            <div>
                <span class="text-[11px] text-indigo-200 font-semibold block">Selamat Datang,</span>
                <h2 class="text-lg font-black tracking-tight text-white leading-tight">
                    {{ data.pelanggan.nama }}
                </h2>
                <span class="inline-block mt-1 text-[11px] font-mono bg-white/15 px-2.5 py-0.5 rounded-lg text-indigo-100">
                    ID: {{ data.pelanggan.id_pelanggan }}
                </span>
            </div>
            <div class="text-right">
                <span class="text-[10px] uppercase font-bold text-indigo-200 block">Paket Internet</span>
                <span class="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-md inline-block mt-0.5">
                    {{ data.pelanggan.paket or '20 Mbps Unlimited' }}
                </span>
            </div>
        </div>

        <div class="pt-2 border-t border-white/15 flex items-center justify-between text-xs text-indigo-100">
            <span class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                <span class="capitalize">Kantor {{ data.pelanggan.kantor }}</span>
            </span>
            <span class="text-[11px] text-indigo-200">
                IP: {{ data.pelanggan.ip_router }}
            </span>
        </div>
    </div>

    <!-- Live Connection Status Card -->
    <div class="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full {% if data.last_log and data.last_log.status_koneksi == 'NORMAL' %}bg-emerald-500 animate-pulse{% elif data.last_log and data.last_log.status_koneksi == 'WARNING' %}bg-amber-500 animate-pulse{% else %}bg-rose-500 animate-pulse{% endif %}"></div>
                <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Status Koneksi Modem ONT</h3>
            </div>
            <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full {% if data.last_log and data.last_log.status_koneksi == 'NORMAL' %}bg-emerald-50 text-emerald-700 border border-emerald-200{% elif data.last_log and data.last_log.status_koneksi == 'WARNING' %}bg-amber-50 text-amber-700 border border-amber-200{% else %}bg-rose-50 text-rose-700 border border-rose-200{% endif %}">
                {% if data.last_log %}{{ data.last_log.status_koneksi }}{% else %}AKTIF{% endif %}
            </span>
        </div>

        <div class="grid grid-cols-2 gap-2.5 pt-1">
            <div class="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span class="text-[10px] font-bold text-slate-400 block uppercase">Redaman Optik (Rx)</span>
                <span class="text-base font-extrabold text-slate-800">
                    {% if data.last_log and data.last_log.rx_power %}{{ data.last_log.rx_power }} dBm{% else %}-21.5 dBm{% endif %}
                </span>
                <span class="text-[10px] text-slate-500 block mt-0.5">Sinyal Fiber Optik</span>
            </div>

            <div class="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span class="text-[10px] font-bold text-slate-400 block uppercase">Suhu Perangkat</span>
                <span class="text-base font-extrabold text-slate-800">
                    {% if data.last_log and data.last_log.suhu_ont %}{{ data.last_log.suhu_ont }} °C{% else %}41.0 °C{% endif %}
                </span>
                <span class="text-[10px] text-slate-500 block mt-0.5">Kondisi Suhu Normal</span>
            </div>
        </div>
    </div>

    <!-- Quota Card (TANPA SISA KUOTA SESUAI SOP) -->
    <div class="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-2.5">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Pemakaian Data Bulan Ini</h3>
            </div>
            <a href="{{ base_url or '' }}/kuota" class="text-[11px] font-bold text-indigo-600 hover:text-indigo-700">Rincian &rarr;</a>
        </div>

        <div class="flex items-baseline justify-between pt-1">
            <div>
                <span class="text-2xl font-black text-slate-900 tracking-tight">
                    {{ data.kuota.kuota_terpakai_gb }}
                </span>
                <span class="text-xs font-bold text-slate-500 ml-1">GB Terpakai</span>
            </div>
            <span class="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                Akses Unlimited
            </span>
        </div>

        <p class="text-[11px] text-slate-500 pt-1">
            Paket berlangganan Anda memiliki kuota tanpa batas untuk streaming, browsing, dan bekerja tanpa khawatir kehabisan kuota.
        </p>
    </div>

    <!-- Quick Action Grid -->
    <div class="grid grid-cols-2 gap-3">
        <!-- Lapor Kendala -->
        <a href="{{ base_url or '' }}/kendala/buat" 
           class="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-200 transition flex flex-col justify-between space-y-2 min-h-[90px]">
            <div class="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <div>
                <h4 class="text-xs font-bold text-slate-900">Lapor Gangguan</h4>
                <p class="text-[10px] text-slate-500">Tiket teknisi cepat</p>
            </div>
        </a>

        <!-- Info WiFi & Kredensial -->
        <a href="{{ base_url or '' }}/profil" 
           class="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-200 transition flex flex-col justify-between space-y-2 min-h-[90px]">
            <div class="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg>
            </div>
            <div>
                <h4 class="text-xs font-bold text-slate-900">Nama & Sandi WiFi</h4>
                <p class="text-[10px] text-slate-500">Lihat info WiFi modem</p>
            </div>
        </a>
    </div>

</div>
{% endblock %}
"""

write_file("templates/dashboard/index.html", DASHBOARD_HTML)
print("Dashboard template created.")

# ==========================================
# KENDALA TEMPLATES
# ==========================================

KENDALA_INDEX_HTML = """{% extends "layouts/base.html" %}
{% block title %}Riwayat Kendala — EdTekno Pelanggan{% endblock %}

{% block content %}
<div class="space-y-4">

    <!-- Header & Action Button -->
    <div class="flex items-center justify-between">
        <div>
            <h2 class="text-base font-black text-slate-900 tracking-tight">Laporan Kendala</h2>
            <p class="text-[11px] text-slate-500">Riwayat pengaduan gangguan internet Anda</p>
        </div>
        <a href="{{ base_url or '' }}/kendala/buat" 
           class="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition min-h-[40px]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span>Buat Laporan</span>
        </a>
    </div>

    {% if sukses %}
    <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
        <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        <span>Laporan kendala berhasil dikirimkan ke tim teknisi piket!</span>
    </div>
    {% endif %}

    <!-- Tickets List -->
    {% if tickets %}
    <div class="space-y-3">
        {% for t in tickets %}
        <div class="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2.5">
            <div class="flex items-start justify-between gap-2">
                <div>
                    <span class="text-[11px] font-mono text-slate-400 block">{{ t.id_tiket }}</span>
                    <h3 class="text-xs font-bold text-slate-900 mt-0.5">{{ t.kategori }}</h3>
                </div>
                <span class="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase {% if t.status == 'SELESAI' %}bg-emerald-50 text-emerald-700 border border-emerald-200{% elif t.status == 'DIPROSES' %}bg-blue-50 text-blue-700 border border-blue-200{% else %}bg-amber-50 text-amber-700 border border-amber-200{% endif %}">
                    {{ t.status }}
                </span>
            </div>

            <p class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {{ t.deskripsi }}
            </p>

            {% if t.catatan_teknisi %}
            <div class="text-[11px] text-indigo-900 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100">
                <span class="font-bold block">Tanggapan Teknisi:</span>
                <span>{{ t.catatan_teknisi }}</span>
            </div>
            {% endif %}

            <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                <span>{{ t.created_at.strftime('%d %b %Y, %H:%M') }} WIB</span>
                {% if t.redaman_saat_lapor %}
                <span>Redaman: {{ t.redaman_saat_lapor }} dBm</span>
                {% endif %}
            </div>
        </div>
        {% endfor %}
    </div>
    {% else %}
    <div class="p-8 text-center bg-white rounded-3xl border border-slate-200/80 space-y-2">
        <div class="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h3 class="text-sm font-bold text-slate-800">Koneksi Berjalan Baik</h3>
        <p class="text-xs text-slate-500 max-w-xs mx-auto">
            Tidak ada laporan gangguan aktif. Jika Anda mengalami kendala koneksi, silakan tekan tombol Buat Laporan di atas.
        </p>
    </div>
    {% endif %}

</div>
{% endblock %}
"""

KENDALA_CREATE_HTML = """{% extends "layouts/base.html" %}
{% block title %}Buat Laporan Kendala — EdTekno Pelanggan{% endblock %}

{% block content %}
<div class="space-y-4">

    <!-- Header -->
    <div>
        <a href="{{ base_url or '' }}/kendala" class="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 mb-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            <span>Kembali ke Riwayat</span>
        </a>
        <h2 class="text-lg font-black text-slate-900 tracking-tight">Form Pengaduan Gangguan</h2>
        <p class="text-xs text-slate-500">Laporan akan diteruskan otomatis ke teknisi kantor cabang</p>
    </div>

    <!-- Form Card -->
    <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
        <form action="{{ base_url or '' }}/kendala/buat" method="POST" class="space-y-3.5">
            
            <!-- Kategori Kendala -->
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="kategori">
                    Jenis Kendala <span class="text-rose-500">*</span>
                </label>
                <select id="kategori" name="kategori" required
                        class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]">
                    <option value="Internet Lambat / Lemot">Internet Lambat / Lemot</option>
                    <option value="Lampu LOS Merah / Putus Total">Lampu LOS Merah / Putus Total</option>
                    <option value="Sinyal Drop / Redaman Buruk">Sinyal Drop / Sering Putus</option>
                    <option value="Modem ONT Mati Total">Modem ONT Mati Total</option>
                    <option value="WiFi Tidak Terdeteksi / Sinyal Lemah">WiFi Tidak Terdeteksi / Sinyal Lemah</option>
                    <option value="Kendala Lainnya">Kendala Lainnya</option>
                </select>
            </div>

            <!-- Deskripsi Keluhan -->
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="deskripsi">
                    Uraian Keluhan <span class="text-rose-500">*</span>
                </label>
                <textarea id="deskripsi" name="deskripsi" required rows="3"
                          placeholder="Jelaskan kendala yang dialami, sejak kapan, atau lampu indikator modem yang menyala"
                          class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
            </div>

            <!-- Nomor Kontak WhatsApp -->
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="no_wa">
                    Nomor WhatsApp / Kontak Pelapor <span class="text-rose-500">*</span>
                </label>
                <input type="tel" id="no_wa" name="no_wa" required
                       value="{{ pelanggan.no_hp if pelanggan else '' }}"
                       placeholder="08xxxxxxxxxx"
                       class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]">
                <p class="text-[11px] text-slate-400 mt-0.5">Teknisi lapangan akan menghubungi nomor ini jika diperlukan pengecekan fisik.</p>
            </div>

            <!-- Submit Button -->
            <button type="submit"
                    class="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wide transition shadow-md shadow-indigo-600/20 min-h-[44px] flex items-center justify-center gap-2">
                <span>Kirim Laporan Gangguan</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
        </form>
    </div>

</div>
{% endblock %}
"""

write_file("templates/kendala/index.html", KENDALA_INDEX_HTML)
write_file("templates/kendala/create.html", KENDALA_CREATE_HTML)
print("Kendala templates created.")

# ==========================================
# KUOTA TEMPLATE (NO SISA KUOTA)
# ==========================================

KUOTA_INDEX_HTML = """{% extends "layouts/base.html" %}
{% block title %}Penggunaan Kuota — EdTekno Pelanggan{% endblock %}

{% block content %}
<div class="space-y-4">

    <!-- Header -->
    <div>
        <h2 class="text-base font-black text-slate-900 tracking-tight">Penggunaan Kuota Data</h2>
        <p class="text-[11px] text-slate-500">Statistik pemakaian bandwidth layanan internet Anda</p>
    </div>

    <!-- Main Usage Card (TANPA SISA KUOTA SESUAI SOP) -->
    <div class="p-5 rounded-3xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white shadow-xl space-y-4">
        <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                Periode {{ data.now.strftime('%B %Y') }}
            </span>
            <span class="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                Unlimited
            </span>
        </div>

        <div>
            <span class="text-[11px] text-slate-400 block">Total Kuota Terpakai:</span>
            <div class="flex items-baseline gap-1.5 mt-1">
                <span class="text-4xl font-black text-white tracking-tight">
                    {{ data.kuota.kuota_terpakai_gb }}
                </span>
                <span class="text-sm font-bold text-slate-300">Gigabyte (GB)</span>
            </div>
        </div>

        <div class="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span>Kecepatan Paket:</span>
            <span class="font-bold text-white">{{ data.kuota.kecepatan_paket }}</span>
        </div>
    </div>

    <!-- Daily Usage List (7 Hari Terakhir) -->
    <div class="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Riwayat 7 Hari Terakhir</h3>
        <div class="divide-y divide-slate-100">
            {% for u in data.usage_history %}
            <div class="py-2.5 flex items-center justify-between text-xs">
                <span class="text-slate-600 font-medium">{{ u.tanggal }}</span>
                <span class="font-extrabold text-slate-900">{{ u.pemakaian_gb }} GB</span>
            </div>
            {% endfor %}
        </div>
    </div>

    <!-- Info Banner -->
    <div class="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs space-y-1">
        <span class="font-bold block">Koneksi Tanpa Batas Kuota</span>
        <p class="text-[11px] text-indigo-700 leading-relaxed">
            Paket Anda aktif 24 jam dengan kecepatan stabil. Tidak ada batasan kuota sisa, nikmati streaming dan internet sepuasnya.
        </p>
    </div>

</div>
{% endblock %}
"""

write_file("templates/kuota/index.html", KUOTA_INDEX_HTML)
print("Kuota template created.")

# ==========================================
# PROFIL TEMPLATE
# ==========================================

PROFIL_INDEX_HTML = """{% extends "layouts/base.html" %}
{% block title %}Profil Saya — EdTekno Pelanggan{% endblock %}

{% block content %}
<div class="space-y-4">

    <!-- Header -->
    <div>
        <h2 class="text-base font-black text-slate-900 tracking-tight">Profil Pelanggan</h2>
        <p class="text-[11px] text-slate-500">Informasi akun & konfigurasi WiFi pelanggan</p>
    </div>

    {% if success %}
    <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
        <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        <span>{{ success }}</span>
    </div>
    {% endif %}

    {% if error %}
    <div class="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
        <svg class="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span>{{ error }}</span>
    </div>
    {% endif %}

    <!-- Info Akun Pelanggan -->
    <div class="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            Data Langganan
        </h3>
        <div class="space-y-2 text-xs">
            <div class="flex justify-between">
                <span class="text-slate-400">Nama:</span>
                <span class="font-bold text-slate-800">{{ pelanggan.nama }}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-slate-400">ID Pelanggan:</span>
                <span class="font-mono font-bold text-indigo-600">{{ pelanggan.id_pelanggan }}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-slate-400">Alamat:</span>
                <span class="font-semibold text-slate-800 text-right max-w-[200px]">{{ pelanggan.alamat or '-' }}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-slate-400">Kantor Wilayah:</span>
                <span class="font-bold text-slate-800 capitalize">{{ pelanggan.kantor }}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-slate-400">IP Router:</span>
                <span class="font-mono font-semibold text-slate-800">{{ pelanggan.ip_router }}</span>
            </div>
        </div>
    </div>

    <!-- Info WiFi Modem ONT -->
    <div class="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg>
                <span>Info WiFi Modem Anda</span>
            </h3>
        </div>
        <div class="space-y-2 text-xs">
            <div class="flex justify-between items-center">
                <span class="text-slate-400">Nama WiFi (SSID):</span>
                <span class="font-bold text-slate-800">{{ pelanggan.nama_wifi or 'Belum dicatat' }}</span>
            </div>
            <div class="flex justify-between items-center" x-data="{ showWifi: false }">
                <span class="text-slate-400">Kata Sandi WiFi:</span>
                <div class="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                    <span x-text="showWifi ? '{{ pelanggan.password_wifi or '-' }}' : '••••••••'"></span>
                    <button type="button" @click="showWifi = !showWifi" class="text-slate-400 hover:text-slate-600 p-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Form Ganti Password Akun Portal -->
    <div class="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3" x-data="{ openForm: false }">
        <button type="button" @click="openForm = !openForm" class="w-full flex items-center justify-between text-xs font-bold text-slate-900">
            <span class="flex items-center gap-2">
                <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                <span>Ganti Password Login Portal</span>
            </span>
            <svg class="w-4 h-4 text-slate-400 transition transform" :class="openForm ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </button>

        <form x-show="openForm" x-transition action="{{ base_url or '' }}/profil/ganti-password" method="POST" class="space-y-3 pt-2">
            <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Password Lama</label>
                <input type="password" name="password_lama" required placeholder="Masukkan password lama"
                       class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs min-h-[44px]">
            </div>
            <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Password Baru</label>
                <input type="password" name="password_baru" required placeholder="Minimal 6 karakter"
                       class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs min-h-[44px]">
            </div>
            <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Ulangi Password Baru</label>
                <input type="password" name="konfirmasi_password" required placeholder="Ketik ulang password baru"
                       class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs min-h-[44px]">
            </div>
            <button type="submit" class="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs min-h-[44px]">
                Simpan Password Baru
            </button>
        </form>
    </div>

    <!-- Tombol Logout -->
    <div class="pt-2">
        <a href="{{ base_url or '' }}/logout" 
           class="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs flex items-center justify-center gap-2 transition min-h-[44px]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            <span>Keluar dari Akun (Logout)</span>
        </a>
    </div>

</div>
{% endblock %}
"""

write_file("templates/profil/index.html", PROFIL_INDEX_HTML)
print("Profil template created.")
print("All portal templates successfully created!")

