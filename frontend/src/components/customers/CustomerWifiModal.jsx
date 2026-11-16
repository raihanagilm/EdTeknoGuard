import React, { useState, useEffect } from 'react';
import { Wifi, X, Eye, EyeOff, Server, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { CustomerService } from '../../services/api';

export function CustomerWifiModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
  onNotify
}) {
  const [namaWifi, setNamaWifi] = useState('');
  const [passwordWifi, setPasswordWifi] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pushToModem, setPushToModem] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (customer && isOpen) {
      setNamaWifi(customer.nama_wifi && customer.nama_wifi !== '-' ? customer.nama_wifi : '');
      setPasswordWifi(customer.password_wifi && customer.password_wifi !== '-' ? customer.password_wifi : '');
      setShowPassword(false);
      setPushToModem(true);
      setErrorMsg('');
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const ipTarget = (customer.ip_ont || customer.ip_router || '').trim();
  const cId = customer.id_pelanggan || customer.id || '-';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedSsid = namaWifi.trim();
    const trimmedPass = passwordWifi.trim();

    if (trimmedSsid.length < 3) {
      setErrorMsg('Nama WiFi (SSID) minimal 3 karakter.');
      return;
    }

    if (trimmedPass.length < 8) {
      setErrorMsg('Password WiFi minimal 8 karakter.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        nama_wifi: trimmedSsid,
        password_wifi: trimmedPass,
        dry_run: !pushToModem
      };

      const res = await CustomerService.changeWifi(cId, payload);

      if (res.ok && res.data?.status === 'success') {
        const ontSynced = res.data.ont_synced;
        const msg = res.data.message || 'Kredensial WiFi berhasil diperbarui.';

        if (onNotify) {
          onNotify(msg, ontSynced || !pushToModem ? 'success' : 'warning');
        }

        if (onSuccess) {
          onSuccess({
            ...customer,
            nama_wifi: trimmedSsid,
            password_wifi: trimmedPass
          });
        }

        onClose();
      } else {
        const errDetail = res.data?.detail || res.error || 'Gagal mengubah WiFi pelanggan.';
        setErrorMsg(errDetail);
      }
    } catch (err) {
      console.error('Error changing customer WiFi:', err);
      setErrorMsg('Terjadi kesalahan jaringan atau server saat memproses perubahan WiFi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-[#0B2545]/60 backdrop-blur-2xs animate-in fade-in duration-150 font-sans">
      <div className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-[#CCDDF0] space-y-4 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#CCDDF0] pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#F1F6FC] border border-[#CCDDF0] flex items-center justify-center text-[#026AA7] shrink-0">
              <Wifi className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[#0B2545] truncate">
                Ubah WiFi Pelanggan
              </h3>
              <p className="text-[11px] text-[#3B5B78] font-medium truncate">
                {customer.nama || customer.name} • <span className="font-mono font-semibold">{cId}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-[#F1F6FC] text-[#64839E] hover:text-[#0B2545] transition shrink-0 cursor-pointer disabled:opacity-50"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5 flex-1 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Info Remote via ISP Network */}
          <div className="p-2.5 rounded-lg bg-[#F1F6FC] border border-[#CCDDF0] text-[11px] text-[#3B5B78] flex items-start gap-2">
            <Server className="w-4 h-4 text-[#026AA7] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-[#0B2545] block">Eksekusi Jarak Jauh (NOC Management)</span>
              Server mengirim konfigurasi langsung ke IP modem <strong className="font-mono text-[#0B2545]">{ipTarget || '10.10.x.x'}</strong> via jaringan ISP. Anda tidak perlu berada di jaringan WiFi rumah pelanggan.
            </div>
          </div>

          {/* Input Nama WiFi (SSID) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#0B2545] mb-1">
              Nama WiFi (SSID) *
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={namaWifi}
              onChange={(e) => setNamaWifi(e.target.value)}
              placeholder="Contoh: WiFi_Keluarga"
              className="w-full px-3 py-2 rounded-lg border border-[#CCDDF0] bg-white text-xs font-semibold text-[#0B2545] focus:border-[#026AA7] focus:ring-1 focus:ring-[#026AA7] focus:outline-none transition disabled:bg-slate-100"
            />
            <span className="text-[10px] text-[#64839E] mt-1 block">Minimal 3 karakter tanpa spasi ganda.</span>
          </div>

          {/* Input Password WiFi */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#0B2545] mb-1">
              Password WiFi Baru *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                value={passwordWifi}
                onChange={(e) => setPasswordWifi(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full pl-3 pr-10 py-2 rounded-lg border border-[#CCDDF0] bg-white text-xs font-mono font-semibold text-[#0B2545] focus:border-[#026AA7] focus:ring-1 focus:ring-[#026AA7] focus:outline-none transition disabled:bg-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#64839E] hover:text-[#0B2545] transition cursor-pointer"
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[10px] text-[#64839E] mt-1 block">Minimal 8 karakter (standar enkripsi WPA/WPA2-PSK).</span>
          </div>

          {/* Checkbox Terapkan ke Fisik */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[#CCDDF0] bg-[#F1F6FC] cursor-pointer hover:bg-[#E2EDF8] transition">
              <input
                type="checkbox"
                disabled={loading}
                checked={pushToModem}
                onChange={(e) => setPushToModem(e.target.checked)}
                className="mt-0.5 rounded border-[#CCDDF0] text-[#026AA7] focus:ring-[#026AA7]"
              />
              <div className="text-[11px]">
                <span className="font-bold text-[#0B2545] block flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#026AA7]" />
                  <span>Terapkan langsung ke modem fisik ONT</span>
                </span>
                <span className="text-[10px] text-[#3B5B78] leading-tight block mt-0.5">
                  Jika dicentang, scraper akan login ke web GUI modem dan mengupdate SSID &amp; password secara real-time.
                </span>
              </div>
            </label>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CCDDF0]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg border border-[#CCDDF0] bg-white hover:bg-[#F1F6FC] text-[#3B5B78] hover:text-[#0B2545] text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-[#026AA7] hover:bg-[#035388] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menerapkan ke Modem...</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Simpan &amp; Terapkan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
