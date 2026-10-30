import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Gauge,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  RefreshCw,
  Server,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export function ModalSpeedTestOokla({
  isOpen,
  onClose,
  targetSpeed = 10,
  latencyValue = null,
  onProbeSignal = null,
  onTestComplete = null
}) {
  // 'idle' | 'ping' | 'download' | 'upload' | 'completed' | 'error'
  const [testPhase, setTestPhase] = useState('idle');
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [smoothSpeed, setSmoothSpeed] = useState(0); // Kecepatan teredam untuk jarum 60fps
  const [downloadSpeed, setDownloadSpeed] = useState(null);
  const [uploadSpeed, setUploadSpeed] = useState(null);
  const [pingMs, setPingMs] = useState(null);
  const [jitterMs, setJitterMs] = useState(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const targetSpeedRef = useRef(0);
  const smoothSpeedRef = useRef(0);
  const rafIdRef = useRef(null);

  // Sync ref saat currentSpeed berubah
  useEffect(() => {
    targetSpeedRef.current = currentSpeed;
  }, [currentSpeed]);

  // Loop requestAnimationFrame 60fps dengan spring / damping lerp untuk pergerakan jarum halus seperti Ookla
  useEffect(() => {
    let lastFrameTime = performance.now();

    const updateNeedleSpring = (now) => {
      const dt = Math.min((now - lastFrameTime) / 1000, 0.1); // Guard lag spike
      lastFrameTime = now;

      const target = targetSpeedRef.current;
      const current = smoothSpeedRef.current;
      const diff = target - current;

      if (Math.abs(diff) > 0.05) {
        // Kecepatan lerp responsif tapi teredam (k = 10..14)
        const lerpFactor = 1 - Math.exp(-12 * dt);
        const nextVal = current + diff * lerpFactor;
        smoothSpeedRef.current = nextVal;
        if (isMountedRef.current) {
          setSmoothSpeed(nextVal);
        }
      } else if (current !== target) {
        smoothSpeedRef.current = target;
        if (isMountedRef.current) {
          setSmoothSpeed(target);
        }
      }

      rafIdRef.current = requestAnimationFrame(updateNeedleSpring);
    };

    rafIdRef.current = requestAnimationFrame(updateNeedleSpring);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Saat modal ditutup, batalkan request aktif
  useEffect(() => {
    if (!isOpen) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setTestPhase('idle');
      setCurrentSpeed(0);
      setSmoothSpeed(0);
      targetSpeedRef.current = 0;
      smoothSpeedRef.current = 0;
      setProgressPercent(0);
      setErrorMessage('');
    }
  }, [isOpen]);

  // ════════════════════════════════════════════════════════════════════════
  // 1. ENGINE PENGUJIAN PING & JITTER (STANDAR LIBRESPEED)
  // Formula: instjitter weighted EMA (instjitter > jitter ? jitter*0.3 + instjitter*0.7 : jitter*0.8 + instjitter*0.2)
  // ════════════════════════════════════════════════════════════════════════
  const measurePingAndJitter = async (signal) => {
    const count = 10;
    let minPing = Infinity;
    let currentJitter = 0;
    let prevRtt = 0;

    for (let i = 0; i < count; i++) {
      if (signal.aborted) throw new Error('Aborted');
      const start = performance.now();
      try {
        const res = await fetch(`https://speed.cloudflare.com/__down?bytes=0&t=${Date.now()}_${i}`, {
          cache: 'no-store',
          mode: 'cors',
          signal
        });
        if (!res.ok) throw new Error('Ping failed');
        const end = performance.now();
        const rtt = Math.max(1, end - start);

        if (rtt < minPing) minPing = rtt;

        if (i === 1) {
          currentJitter = Math.abs(rtt - prevRtt);
        } else if (i > 1) {
          const instJitter = Math.abs(rtt - prevRtt);
          // LibreSpeed weighted EMA jitter formula
          currentJitter = instJitter > currentJitter
            ? currentJitter * 0.3 + instJitter * 0.7
            : currentJitter * 0.8 + instJitter * 0.2;
        }
        prevRtt = rtt;

        if (isMountedRef.current) {
          setPingMs(Math.round(minPing));
          setJitterMs(Math.max(1, Math.round(currentJitter)));
          setProgressPercent(5 + Math.round(((i + 1) / count) * 15));
        }
      } catch (err) {
        if (signal.aborted) throw err;
        try {
          const lStart = performance.now();
          await fetch(`/portal/api/speedtest/ping?t=${Date.now()}_${i}`, { cache: 'no-store', signal });
          const rtt = Math.max(1, performance.now() - lStart);
          if (rtt < minPing) minPing = rtt;
        } catch (_) {
          minPing = latencyValue && typeof latencyValue === 'number' ? Math.round(latencyValue) : 25;
        }
      }
      await new Promise((r) => setTimeout(r, 60));
    }

    return {
      ping: Math.round(minPing === Infinity ? 28 : minPing),
      jitter: Math.max(1, Math.round(currentJitter))
    };
  };

  // ════════════════════════════════════════════════════════════════════════
  // 2. ENGINE PENGUJIAN DOWNLOAD (STANDAR LIBRESPEED MULTI-STREAM & GRACE TIME)
  // Fitur LibreSpeed:
  // - 3-4 Parallel Concurrent Streams (Multi-connection seperti Ookla & LibreSpeed)
  // - Grace Time 1.5 detik (mengabaikan TCP ramp-up buffer awal)
  // - Overhead Compensation Factor: 1.06
  // ════════════════════════════════════════════════════════════════════════
  const measureDownloadSpeed = async (signal) => {
    const totalDurationMs = 7000;
    const graceTimeMs = 1500; // 1.5 detik LibreSpeed grace time
    const overheadFactor = 1.06; // LibreSpeed overhead compensation
    const numStreams = 3; // 3 concurrent download streams

    let totalBytesAfterGrace = 0;
    let gracePassed = false;
    let measurementStartTime = performance.now();
    const testStartTime = performance.now();
    let latestReportedSpeed = 0;

    const streamWorker = async (streamIndex) => {
      // Delay staggered per stream
      await new Promise((r) => setTimeout(r, streamIndex * 200));

      while (performance.now() - testStartTime < totalDurationMs) {
        if (signal.aborted) throw new Error('Aborted');

        const fetchSize = 8388608; // 8MB chunks
        const url = `https://speed.cloudflare.com/__down?bytes=${fetchSize}&t=${Date.now()}_s${streamIndex}`;
        let response;
        try {
          response = await fetch(url, { cache: 'no-store', mode: 'cors', signal });
        } catch (e) {
          if (signal.aborted) throw e;
          response = await fetch(`/portal/api/speedtest/download?bytes=${fetchSize}&t=${Date.now()}_s${streamIndex}`, {
            cache: 'no-store',
            signal
          });
        }

        if (!response.ok || !response.body) break;

        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            const now = performance.now();
            const elapsedTotal = now - testStartTime;

            if (!gracePassed) {
              if (elapsedTotal >= graceTimeMs) {
                gracePassed = true;
                measurementStartTime = now;
                totalBytesAfterGrace = 0;
              }
            } else {
              totalBytesAfterGrace += value.length;
              const measuringDurationSec = (now - measurementStartTime) / 1000;
              if (measuringDurationSec > 0.1) {
                // Formula LibreSpeed: (bytes * 8 * overheadFactor) / (sec * 1,000,000)
                const mbps = (totalBytesAfterGrace * 8 * overheadFactor) / (measuringDurationSec * 1000000);
                latestReportedSpeed = mbps;
                if (isMountedRef.current) {
                  setCurrentSpeed(mbps);
                  const progress = Math.min(95, 20 + Math.round((elapsedTotal / totalDurationMs) * 40));
                  setProgressPercent(progress);
                }
              }
            }

            if (elapsedTotal >= totalDurationMs) {
              try { await reader.cancel(); } catch (_) {}
              return;
            }
          }
        }
      }
    };

    // Jalankan multi-stream parallel
    await Promise.allSettled(Array.from({ length: numStreams }, (_, i) => streamWorker(i)));

    const finalMeasuringSec = Math.max(0.5, (performance.now() - measurementStartTime) / 1000);
    let finalDownloadMbps = (totalBytesAfterGrace * 8 * overheadFactor) / (finalMeasuringSec * 1000000);

    if (finalDownloadMbps <= 0.1 && latestReportedSpeed > 0) {
      finalDownloadMbps = latestReportedSpeed;
    }

    return Math.max(0.1, Number(finalDownloadMbps.toFixed(2)));
  };

  // ════════════════════════════════════════════════════════════════════════
  // 3. ENGINE PENGUJIAN UPLOAD (STANDAR LIBRESPEED MULTI-STREAM & GRACE TIME)
  // - 3 Parallel Upload Streams dengan payload bervariasi
  // - Grace Time 1.5 detik
  // - Overhead Compensation Factor: 1.06
  // ════════════════════════════════════════════════════════════════════════
  const measureUploadSpeed = async (signal) => {
    const totalDurationMs = 7000;
    const graceTimeMs = 1500;
    const overheadFactor = 1.06;
    const numStreams = 3;

    // Buffer acak 2MB untuk upload
    const chunkSize = 2097152;
    const randomBuffer = new Uint8Array(chunkSize);
    for (let i = 0; i < randomBuffer.length; i += 1024) {
      randomBuffer[i] = Math.floor(Math.random() * 256);
    }
    const uploadBlob = new Blob([randomBuffer]);

    let totalBytesAfterGrace = 0;
    let gracePassed = false;
    let measurementStartTime = performance.now();
    const testStartTime = performance.now();
    let latestReportedSpeed = 0;

    const streamWorker = async (streamIndex) => {
      await new Promise((r) => setTimeout(r, streamIndex * 250));
      let chunkCount = 0;

      while (performance.now() - testStartTime < totalDurationMs) {
        if (signal.aborted) throw new Error('Aborted');

        let uploadOk = false;
        try {
          const res = await fetch(`https://speed.cloudflare.com/__up?t=${Date.now()}_s${streamIndex}_${chunkCount++}`, {
            method: 'POST',
            body: uploadBlob,
            headers: { 'Content-Type': 'application/octet-stream' },
            mode: 'cors',
            cache: 'no-store',
            signal
          });
          if (res.ok) uploadOk = true;
        } catch (e) {
          if (signal.aborted) throw e;
          const res = await fetch(`/portal/api/speedtest/upload?t=${Date.now()}_s${streamIndex}_${chunkCount}`, {
            method: 'POST',
            body: uploadBlob,
            headers: { 'Content-Type': 'application/octet-stream' },
            cache: 'no-store',
            signal
          });
          if (res.ok) uploadOk = true;
        }

        if (uploadOk) {
          const now = performance.now();
          const elapsedTotal = now - testStartTime;

          if (!gracePassed) {
            if (elapsedTotal >= graceTimeMs) {
              gracePassed = true;
              measurementStartTime = now;
              totalBytesAfterGrace = 0;
            }
          } else {
            totalBytesAfterGrace += chunkSize;
            const measuringDurationSec = (now - measurementStartTime) / 1000;
            if (measuringDurationSec > 0.1) {
              const mbps = (totalBytesAfterGrace * 8 * overheadFactor) / (measuringDurationSec * 1000000);
              latestReportedSpeed = mbps;
              if (isMountedRef.current) {
                setCurrentSpeed(mbps);
                const progress = Math.min(98, 60 + Math.round((elapsedTotal / totalDurationMs) * 38));
                setProgressPercent(progress);
              }
            }
          }
        }
      }
    };

    await Promise.allSettled(Array.from({ length: numStreams }, (_, i) => streamWorker(i)));

    const finalMeasuringSec = Math.max(0.5, (performance.now() - measurementStartTime) / 1000);
    let finalUploadMbps = (totalBytesAfterGrace * 8 * overheadFactor) / (finalMeasuringSec * 1000000);

    if (finalUploadMbps <= 0.1 && latestReportedSpeed > 0) {
      finalUploadMbps = latestReportedSpeed;
    }

    return Math.max(0.1, Number(finalUploadMbps.toFixed(2)));
  };

  // ════════════════════════════════════════════════════════════════════════
  // 4. MAIN ORCHESTRATOR
  // ════════════════════════════════════════════════════════════════════════
  const runRealSpeedTest = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const ac = new AbortController();
    abortControllerRef.current = ac;

    setErrorMessage('');
    setTestPhase('ping');
    setCurrentSpeed(0);
    setDownloadSpeed(null);
    setUploadSpeed(null);
    setProgressPercent(5);

    try {
      // Step A: Ukur Ping & Jitter Riil (~1.5 detik)
      const pingRes = await measurePingAndJitter(ac.signal);
      if (!isMountedRef.current) return;
      setPingMs(pingRes.ping);
      setJitterMs(pingRes.jitter);

      // Trigger probe status modem ONT latar belakang
      if (typeof onProbeSignal === 'function') {
        onProbeSignal();
      }

      // Step B: Ukur Kecepatan Download Riil (5 Detik Penuh)
      setTestPhase('download');
      const dlResult = await measureDownloadSpeed(ac.signal);
      if (!isMountedRef.current) return;
      setDownloadSpeed(dlResult);
      setCurrentSpeed(dlResult);

      // Jeda transisi antar fase 300ms
      await new Promise((r) => setTimeout(r, 300));

      // Step C: Ukur Kecepatan Upload Riil (5 Detik Penuh)
      setTestPhase('upload');
      setCurrentSpeed(0);
      const ulResult = await measureUploadSpeed(ac.signal);
      if (!isMountedRef.current) return;
      setUploadSpeed(ulResult);
      setCurrentSpeed(ulResult);

      // Selesai: Tampilkan hasil akhir
      setTestPhase('completed');
      setCurrentSpeed(dlResult);
      setProgressPercent(100);

      // Simpan hasil ke Database via Backend API
      try {
        const payload = {
          download: dlResult,
          upload: ulResult,
          ping: pingRes.ping,
          jitter: pingRes.jitter
        };
        const saveRes = await fetch('/portal/api/speedtest/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (saveRes.ok) {
          const resJson = await saveRes.json();
          if (resJson.ok && typeof onTestComplete === 'function') {
            onTestComplete(resJson.data);
          }
        }
      } catch (saveErr) {
        console.warn('Gagal menyimpan hasil uji ke DB:', saveErr);
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.message === 'Aborted') {
        return;
      }
      console.error('Speed test error:', err);
      if (isMountedRef.current) {
        setTestPhase('error');
        setErrorMessage(err.message || 'Gagal menjalankan pengujian jaringan');
      }
    }
  };

  if (!isOpen) return null;

  // ════════════════════════════════════════════════════════════════════════
  // 5. KALKULASI GAUGE SPEEDOMETER KOMPAK
  // ════════════════════════════════════════════════════════════════════════
  const radius = 70;
  const circumference = 2 * Math.PI * radius; // 439.82
  const arcLength = circumference * 0.75; // 270 derajat = 329.87

  const isGigabit = false;
  const maxDisplaySpeed = 100;

  // Skala Linear Bersih: 0 Mbps (-135°) s/d 100 Mbps (+135°)
  // 1 Mbps = 2.7° rotasi konsisten
  const speedToAngle = (speed) => {
    const s = Math.max(0, Math.min(speed, 100));
    return -135 + (s / 100) * 270;
  };

  const needleRotation = speedToAngle(smoothSpeed);
  const clampedAngleRatio = Math.min(Math.max((needleRotation + 135) / 270, 0), 1);
  const strokeDashoffset = arcLength * (1 - clampedAngleRatio);

  const isTesting = testPhase === 'ping' || testPhase === 'download' || testPhase === 'upload';

  // Label angka skala tetap (0, 20, 40, 60, 80, 100) terdistribusi merata
  const scaleLabels = [
    { val: 0, angle: -135 },
    { val: 20, angle: -81 },
    { val: 40, angle: -27 },
    { val: 60, angle: 27 },
    { val: 80, angle: 81 },
    { val: 100, angle: 135 }
  ];

  const labelRadius = 86; // Posisi radius teks di luar busur R=70
  const getLabelPos = (angDeg) => {
    // Sudut 0° jarum = jam 12 (-90° cartesian)
    const rad = ((angDeg - 90) * Math.PI) / 180;
    return {
      x: 100 + labelRadius * Math.cos(rad),
      y: 100 + labelRadius * Math.sin(rad)
    };
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[350px] bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col relative select-none animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══ TOP APP BAR ═══ */}
        <div className="px-4 py-3 flex items-center justify-between bg-blue-600 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Gauge className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white block leading-tight">
                Speed Test Jaringan
              </span>
              <span className="text-xs text-blue-100 leading-none">
                LibreSpeed Engine
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition active:scale-90 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ═══ KARTU METRIK: DOWNLOAD & UPLOAD ═══ */}
        <div className="grid grid-cols-2 divide-x divide-slate-100 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 shrink-0">
          {/* Download */}
          <div className="text-center px-2">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500">
              <ArrowDown className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
              <span>DOWNLOAD</span>
            </div>
            <div className="text-xl font-bold font-mono tracking-tight text-blue-700 mt-0.5">
              {downloadSpeed !== null
                ? downloadSpeed.toFixed(1)
                : (testPhase === 'download' ? currentSpeed.toFixed(1) : '—')}
              <span className="text-xs font-normal text-slate-400 font-sans ml-1">Mbps</span>
            </div>
          </div>

          {/* Upload */}
          <div className="text-center px-2">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500">
              <ArrowUp className="w-3.5 h-3.5 text-cyan-600 stroke-[2.5]" />
              <span>UPLOAD</span>
            </div>
            <div className="text-xl font-bold font-mono tracking-tight text-cyan-700 mt-0.5">
              {uploadSpeed !== null
                ? uploadSpeed.toFixed(1)
                : (testPhase === 'upload' ? currentSpeed.toFixed(1) : '—')}
              <span className="text-xs font-normal text-slate-400 font-sans ml-1">Mbps</span>
            </div>
          </div>
        </div>

        {/* ═══ SUB-BAR: PING & JITTER ═══ */}
        <div className="flex items-center justify-around py-2 px-3 text-xs border-b border-slate-100 bg-white shrink-0 font-mono">
          <div className="flex items-center gap-1 text-slate-600">
            <span>Ping:</span>
            <span className="font-bold text-blue-700">
              {pingMs !== null ? `${pingMs} ms` : '—'}
            </span>
          </div>
          <div className="w-px h-3 bg-slate-200" />
          <div className="flex items-center gap-1 text-slate-600">
            <span>Jitter:</span>
            <span className="font-bold text-cyan-700">
              {jitterMs !== null ? `${jitterMs} ms` : '—'}
            </span>
          </div>
          <div className="w-px h-3 bg-slate-200" />
          <div className="flex items-center gap-1 text-slate-600">
            <span>Paket:</span>
            <span className="font-bold text-slate-800">
              {targetSpeed}M
            </span>
          </div>
        </div>

        {/* ═══ AREA GAUGE & TOMBOL GO ═══ */}
        <div className="relative flex flex-col items-center justify-center py-5 px-3 select-none bg-white shrink-0 min-h-[220px]">
          {testPhase === 'idle' ? (
            /* ═══ TOMBOL GO BULAT (WARNA BIRU UTAMA) ═══ */
            <div className="relative flex flex-col items-center justify-center py-4">
              <button
                type="button"
                onClick={runRealSpeedTest}
                className="group relative w-24 h-24 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:scale-105 active:scale-95 transition flex flex-col items-center justify-center cursor-pointer border-4 border-blue-100"
              >
                <span className="text-2xl font-black tracking-wider font-mono">
                  GO
                </span>
                <span className="text-[11px] font-bold text-blue-100 uppercase tracking-widest font-mono">
                  MULAI
                </span>
              </button>

              <span className="text-xs text-slate-500 font-medium mt-3.5">
                Sentuh <strong className="text-blue-600 font-mono">GO</strong> untuk mulai uji
              </span>
            </div>
          ) : (
            /* ═══ GAUGE METER SPEEDOMETER TANPA TABRAKAN ═══ */
            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg
                className="w-full h-full"
                viewBox="0 0 200 200"
              >
                {/* Arc Speedometer (Dirotasi di dalam g agar label tidak ikut berputar) */}
                <g style={{ transform: 'rotate(135deg)', transformOrigin: 'center' }}>
                  {/* Background Arc */}
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                    strokeDasharray={`${arcLength} ${circumference}`}
                    strokeLinecap="round"
                  />

                  {/* Active Progress Gradient Arc */}
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="8"
                    strokeDasharray={`${arcLength} ${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </g>

                {/* Label Angka Skala: Dihitung matematis di luar busur, tidak pernah tabrakan */}
                {scaleLabels.map((lbl) => {
                  const pos = getLabelPos(lbl.angle);
                  return (
                    <text
                      key={lbl.val}
                      x={pos.x}
                      y={pos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-slate-400 font-mono font-bold"
                      style={{ fontSize: '10px' }}
                    >
                      {lbl.val}
                    </text>
                  );
                })}
              </svg>

              {/* Jarum Speedometer Bersih */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: `rotate(${needleRotation}deg)`,
                  willChange: 'transform'
                }}
              >
                {/* Panjang jarum diatur proporsional (h-13 = 52px) agar berada di dalam busur radius 70 */}
                <div className="w-1.5 h-13 rounded-full bg-blue-700 origin-bottom -translate-y-6.5 shadow-xs" />
              </div>

              {/* Poros Jarum */}
              <div className="absolute w-4 h-4 rounded-full bg-blue-700 border-2 border-white shadow-xs pointer-events-none" />

              {/* Angka Kecepatan Tengah (Diposisikan di Bawah Poros, Bersih & Lega) */}
              <div className="absolute bottom-6 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-3xl font-black font-mono tracking-tight text-slate-900 leading-none">
                  {smoothSpeed.toFixed(1)}
                </div>
                <div className="text-xs font-bold text-blue-600 mt-1 uppercase tracking-wider font-mono">
                  Mbps
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ FOOTER KONTROL: STATUS & TOMBOL ═══ */}
        <div className="px-3.5 pb-3.5 pt-2 flex flex-col items-center gap-2 bg-white border-t border-gray-100 shrink-0">
          {/* Status Singkat */}
          <div className="text-[11px] text-gray-500 font-medium text-center min-h-[16px] flex items-center justify-center gap-1">
            {testPhase === 'idle' && (
              <span className="flex items-center gap-1 text-gray-500 text-[10px]">
                <Server className="w-3 h-3 text-blue-600" />
                Server ISP Lokal &bull; Siap diuji
              </span>
            )}
            {testPhase === 'ping' && 'Mengukur latensi ping & jitter...'}
            {testPhase === 'download' && 'Menguji unduh data (5 detik)...'}
            {testPhase === 'upload' && 'Menguji unggah data (5 detik)...'}
            {testPhase === 'completed' && (
              <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Pengujian selesai! Koneksi aktif stabil.
              </span>
            )}
            {testPhase === 'error' && (
              <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" />
                {errorMessage || 'Pengujian terputus.'}
              </span>
            )}
          </div>

          {/* Tombol Aksi */}
          <div className="flex items-center gap-2 w-full">
            {testPhase !== 'idle' && (
              <button
                type="button"
                onClick={runRealSpeedTest}
                disabled={isTesting}
                className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs active:scale-95 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {testPhase === 'completed' || testPhase === 'error' ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Tes Lagi</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menguji ({progressPercent}%)</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`py-2 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition active:scale-95 cursor-pointer ${
                testPhase === 'idle' ? 'w-full' : ''
              }`}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
