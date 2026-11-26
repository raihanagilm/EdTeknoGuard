// Transformasi Non-linear Sumbu Y (Piecewise Stretched Scale)
export const TICK_DBM_LIST = [0, 5, 10, 15, 20, 25.0, 25.5, 26.0, 26.5, 27.0, 28.0, 29.0, 30.0, 35.0]

export function transformDbm(val) {
  if (val === null || val === undefined || isNaN(val)) return null
  const v = Math.abs(Number(val))
  if (v <= 25.0) {
    return v
  } else if (v <= 27.0) {
    return 25.0 + ((v - 25.0) / 2.0) * 30.0
  } else if (v <= 30.0) {
    return 55.0 + ((v - 27.0) / 3.0) * 30.0
  } else {
    const clamped = Math.min(v, 35.0)
    return 85.0 + ((clamped - 30.0) / 5.0) * 15.0
  }
}

export function inverseTransformDbm(u) {
  if (u <= 25.0) {
    return u
  } else if (u <= 55.0) {
    return 25.0 + ((u - 25.0) / 30.0) * 2.0
  } else if (u <= 85.0) {
    return 27.0 + ((u - 55.0) / 30.0) * 3.0
  } else {
    return 30.0 + ((u - 85.0) / 15.0) * 5.0
  }
}

export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00'
  seconds = Math.floor(seconds)
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (num) => num.toString().padStart(2, '0')
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

