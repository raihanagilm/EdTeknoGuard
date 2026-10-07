/**
 * TeknoGuard - Dedicated Login Page Logic
 * File: /static/js/login.js
 * Manages Password Visibility Toggle and Local Storage "Ingat Saya" (Remember Me)
 */

document.addEventListener('DOMContentLoaded', function () {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const rememberCheckbox = document.getElementById('remember_me');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const eyeOpenIcon = document.getElementById('eyeOpenIcon');
  const eyeSlashIcon = document.getElementById('eyeSlashIcon');
  const loginForm = document.getElementById('loginForm');

  const STORAGE_KEY_REMEMBER_USERNAME = 'tekno_remembered_username';
  const STORAGE_KEY_REMEMBER_CHECKED = 'tekno_remember_me_checked';

  // 1. Inisialisasi Data Tersimpan (Ingat Saya)
  if (usernameInput && rememberCheckbox) {
    const savedUsername = localStorage.getItem(STORAGE_KEY_REMEMBER_USERNAME);
    const isRememberChecked = localStorage.getItem(STORAGE_KEY_REMEMBER_CHECKED) === 'true';

    if (savedUsername && isRememberChecked) {
      usernameInput.value = savedUsername;
      rememberCheckbox.checked = true;
      // Fokus ke password jika username sudah terisi
      if (passwordInput && !passwordInput.value) {
        passwordInput.focus();
      }
    }
  }

  // 2. Toggle Password Visibility (Mata Terbuka / Tertutup)
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', function () {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';

      if (eyeOpenIcon && eyeSlashIcon) {
        if (isPassword) {
          eyeOpenIcon.style.display = 'none';
          eyeSlashIcon.style.display = 'block';
          togglePasswordBtn.setAttribute('title', 'Sembunyikan password');
          togglePasswordBtn.setAttribute('aria-label', 'Sembunyikan password');
        } else {
          eyeOpenIcon.style.display = 'block';
          eyeSlashIcon.style.display = 'none';
          togglePasswordBtn.setAttribute('title', 'Lihat password');
          togglePasswordBtn.setAttribute('aria-label', 'Lihat password');
        }
      }
    });
  }

  // 3. Simpan atau Hapus Username Saat Form Di-submit
  if (loginForm) {
    loginForm.addEventListener('submit', function () {
      if (rememberCheckbox && usernameInput) {
        if (rememberCheckbox.checked) {
          localStorage.setItem(STORAGE_KEY_REMEMBER_USERNAME, usernameInput.value.trim());
          localStorage.setItem(STORAGE_KEY_REMEMBER_CHECKED, 'true');
        } else {
          localStorage.removeItem(STORAGE_KEY_REMEMBER_USERNAME);
          localStorage.removeItem(STORAGE_KEY_REMEMBER_CHECKED);
        }
      }
    });
  }
});
