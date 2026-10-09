import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Plus,
  Clock,
  CheckCircle2,
  RefreshCw,
  Send,
  MessageCircle
} from 'lucide-react';
import { PortalKendalaService } from '../services/portalApi';

export function TabKendalaPelanggan({ customer }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [kategori, setKategori] = useState('Internet Lambat / Putus-putus');
  const [deskripsi, setDeskripsi] = useState('');
  const [noWa, setNoWa] = useState(customer?.no_hp || '');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await PortalKendalaService.list();
      if (res.ok && res.data?.tickets) {
        setTickets(res.data.tickets);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const res = await PortalKendalaService.create({
        kategori,
        deskripsi,
        no_wa: noWa
      });
      if (res.ok && res.data.ok) {
        setMessage('Keluhan Anda berhasil dikirim ke teknisi piket NOC!');
        setDeskripsi('');
        setShowCreateModal(false);
        fetchTickets();
      } else {
        setMessage(res.data?.message || 'Gagal mengirim tiket keluhan.');
      }
    } catch (err) {
      setMessage('Gagal menghubungi server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-fadeIn">
      {/* Header & Buat Tiket CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-slate-900">Lapor Gangguan</h2>
          <p className="text-[11px] text-slate-500">Tiket keluhan langsung diteruskan ke Teknisi Lapangan</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Tiket</span>
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Ticket List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-600 mb-2" />
            <span className="text-xs">Memuat daftar laporan keluhan...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-8 bg-white rounded-3xl border border-sky-100 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">Tidak Ada Kendala Aktif</div>
              <p className="text-xs text-slate-500 mt-1">Sambungan internet Anda terpantau normal dan stabil.</p>
            </div>
          </div>
        ) : (
          tickets.map((t) => (
            <div key={t.id_tiket} className="p-4 bg-white rounded-2xl border border-sky-100 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-lg border border-cyan-200">
                  {t.id_tiket}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    t.status === 'SELESAI'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : t.status === 'DIPROSES' || t.status === 'DICEK_ADMIN'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {t.status}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900">{t.kategori}</div>
              <p className="text-xs text-slate-600">{t.deskripsi}</p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {t.created_at?.slice(0, 16)}
                </span>
                {t.redaman_saat_lapor && <span>Redaman: {t.redaman_saat_lapor} dBm</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Buat Tiket */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-5 sm:p-6 border border-sky-200 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Formulir Lapor Gangguan</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-700">Kategori Kendala</label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-600"
                >
                  <option value="Internet Lambat / Putus-putus">Internet Lambat / Putus-putus</option>
                  <option value="Lampu Modem Merah (LOS)">Lampu Modem Merah (LOS)</option>
                  <option value="Modem Mati Total / Tidak Menyala">Modem Mati Total / Tidak Menyala</option>
                  <option value="Jangkauan Sinyal WiFi Lemah">Jangkauan Sinyal WiFi Lemah</option>
                  <option value="Kendala Tagihan / Lainnya">Kendala Tagihan / Lainnya</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700">Nomor WhatsApp Pelapor</label>
                <input
                  type="text"
                  required
                  value={noWa}
                  onChange={(e) => setNoWa(e.target.value)}
                  placeholder="08123456789"
                  className="w-full px-3 py-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700">Rincian Keluhan</label>
                <textarea
                  rows={3}
                  required
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Jelaskan kondisi lampu modem atau kendala yang dialami..."
                  className="w-full px-3 py-2 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs text-slate-900"
                ></textarea>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold transition flex items-center justify-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Kirim Tiket</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
