import React, { useState } from 'react'
import {
  X,
  Send,
  Smartphone,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  Info
} from 'lucide-react'

export function BillingMessageModal({
  isOpen,
  onClose,
  selectedCustomers = [],
  onSendReminders,
  sending = false,
  resultData = null,
  onResetResult
}) {
  const [sendFcm, setSendFcm] = useState(true)
  const [customMsg, setCustomMsg] = useState('')

  if (!isOpen) return null

  const totalSum = selectedCustomers.reduce((acc, c) => acc + (c.total_tagihan || 0), 0)
  const formatRupiah = (val) => `Rp ${Math.round(val || 0).toLocaleString('id-ID')}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#CCDDF0] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#F1F6FC] border-b border-[#CCDDF0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E0F0FF] text-[#026AA7] border border-[#CCDDF0] flex items-center justify-center shrink-0">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0B2545]">Kirim Pengingat Tagihan</h4>
              <p className="text-[11px] font-sans text-[#64839E]">
                <span className="font-semibold text-[#0B2545]">{selectedCustomers.length}</span> pelanggan terpilih ({formatRupiah(totalSum)})
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (onResetResult) onResetResult()
              onClose()
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Isi Modal: Form Pengiriman vs Hasil Pengiriman */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {resultData ? (
            /* Tampilan Hasil Pengiriman */
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h5 className="font-bold text-emerald-900">Pengingat Berhasil Diproses!</h5>
                  <p className="text-emerald-700 mt-0.5">
                    {resultData.fcm_sent > 0
                      ? `${resultData.fcm_sent} push notifikasi berhasil dikirimkan ke aplikasi MyTekno pelanggan.`
                      : 'Notifikasi FCM tidak dikirim / tidak ada token aktif.'}
                  </p>
                </div>
              </div>

              {resultData.wa_targets && resultData.wa_targets.length > 0 && (
                <div>
                  <h6 className="text-xs font-bold text-[#0B2545] mb-2 font-sans">
                    Tautan WhatsApp Siap Kirim ({resultData.wa_targets.length} Pelanggan):
                  </h6>
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-[#CCDDF0] rounded-xl">
                    {resultData.wa_targets.map((item) => (
                      <div key={item.id_pelanggan} className="p-2.5 flex items-center justify-between gap-2 hover:bg-[#F8FAFC]">
                        <div>
                          <div className="text-xs font-bold text-[#0B2545]">{item.nama}</div>
                          <div className="text-[11px] font-mono text-[#64839E]">
                            {item.no_wa} • {formatRupiah(item.total_tagihan)}
                          </div>
                        </div>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-sans font-bold inline-flex items-center gap-1 shadow-2xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Kirim WA</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Form Konfigurasi Pesan */
            <>
              {/* Opsi Pengiriman Saluran */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0B2545] block font-sans">Saluran Pengiriman:</label>
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-[#CCDDF0] bg-[#F1F6FC] cursor-pointer hover:bg-[#EAF2FB] transition-colors">
                  <input
                    type="checkbox"
                    checked={sendFcm}
                    onChange={(e) => setSendFcm(e.target.value === 'true' || e.target.checked)}
                    className="rounded border-slate-300 text-[#026AA7] focus:ring-[#026AA7]"
                  />
                  <div className="flex-1">
                    <div className="text-xs font-bold text-[#0B2545] flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-[#026AA7]" />
                      <span>Push Notifikasi Native (Aplikasi MyTekno)</span>
                    </div>
                    <div className="text-[11px] text-[#64839E]">
                      Mengirim alert notifikasi prioritas ke perangkat Android pelanggan secara langsung.
                    </div>
                  </div>
                </label>
              </div>

              {/* Editor Draf Pesan */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#0B2545] font-sans">
                    Kustom Pesan WhatsApp (Opsional):
                  </label>
                  <span className="text-[10px] text-[#64839E]">Kosongkan untuk draf otomatis</span>
                </div>
                <textarea
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder="Ketik pesan khusus jika ingin mengganti draf baku..."
                  rows={4}
                  className="w-full p-2.5 rounded-xl border border-[#CCDDF0] bg-[#F1F6FC] text-xs font-sans text-[#0B2545] focus:outline-none focus:border-[#026AA7]"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#F1F6FC] border border-[#CCDDF0] flex items-start gap-2.5 text-xs text-[#3B5B78] font-sans">
                <Info className="w-4 h-4 text-[#026AA7] shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Sistem akan membuat tautan resmi WhatsApp dengan rincian nama, total tagihan, jatuh tempo, dan nomor VA masing-masing pelanggan.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer Tombol */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-[#F1F6FC] border-t border-[#CCDDF0]">
          {resultData ? (
            <button
              onClick={() => {
                if (onResetResult) onResetResult()
                onClose()
              }}
              className="px-4 py-2 rounded-lg bg-[#026AA7] hover:bg-[#035388] text-white text-xs font-sans font-semibold cursor-pointer shadow-2xs transition-colors"
            >
              Selesai & Tutup
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={sending}
                className="px-4 py-2 rounded-lg border border-[#CCDDF0] bg-white hover:bg-slate-50 text-xs font-sans font-semibold text-[#3B5B78] cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => onSendReminders({ sendFcm, customMessage: customMsg })}
                disabled={sending || selectedCustomers.length === 0}
                className="px-4 py-2 rounded-lg bg-[#026AA7] hover:bg-[#035388] disabled:opacity-50 text-white text-xs font-sans font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <Send className={`w-3.5 h-3.5 ${sending ? 'animate-spin' : ''}`} />
                <span>{sending ? 'Memproses...' : 'Kirim Sekarang'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
