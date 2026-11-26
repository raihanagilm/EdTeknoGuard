const IPV4_WITH_OPTIONAL_PORT_RE =
  /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?::(\d{1,5}))?$/

/**
 * Memvalidasi apakah string merupakan IPv4 yang valid (tiap oktet 0..255)
 * beserta port opsional (1..65535), lalu mengembalikan string ternormalisasi.
 * @param {string} value
 * @returns {string|null}
 */
function parseValidIpv4WithPort(value) {
  const match = IPV4_WITH_OPTIONAL_PORT_RE.exec(value)
  if (!match) return null

  for (let i = 1; i <= 4; i += 1) {
    const octet = Number(match[i])
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
      return null
    }
  }

  const host = `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}.${Number(match[4])}`
  if (!match[5]) return host

  const port = Number(match[5])
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return null
  }
  return `${host}:${port}`
}

/**
 * Membentuk URL GUI web modem/router yang aman untuk dibuka di tab baru.
 * Mengembalikan null bila nilai kosong, "-", atau berpotensi injeksi skema URI.
 * @param {string|null|undefined} rawIp
 * @returns {string|null}
 */
export function buildRouterGuiUrl(rawIp) {
  if (typeof rawIp !== 'string') return null
  const trimmed = rawIp.trim()
  if (!trimmed || trimmed === '-' || /\s/.test(trimmed)) return null

  const lower = trimmed.toLowerCase()
  if (lower === 'null' || lower === 'undefined' || lower === 'n/a') return null

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed)
      if (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        parsed.hostname &&
        !parsed.username &&
        !parsed.password
      ) {
        return parsed.href
      }
      return null
    } catch {
      return null
    }
  }

  // Tolak skema URI berbahaya atau path tak dikenal seperti javascript:, data:, atau CIDR
  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('@')) {
    return null
  }

  const validIpv4 = parseValidIpv4WithPort(trimmed)
  if (validIpv4) {
    return `http://${validIpv4}`
  }

  // Dukungan aman untuk IPv6 (mis. [fe80::1] atau 2001:db8::1)
  if (trimmed.includes(':')) {
    const candidate = trimmed.startsWith('[') ? `http://${trimmed}` : `http://[${trimmed}]`
    try {
      const parsed = new URL(candidate)
      if (parsed.hostname && !parsed.username && !parsed.password) {
        return parsed.href
      }
    } catch {
      return null
    }
  }

  return null
}
