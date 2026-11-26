import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRouterGuiUrl } from './networkLinks.js'

test('buildRouterGuiUrl accepts valid IPv4 addresses and optional ports', () => {
  assert.equal(buildRouterGuiUrl('192.168.20.185'), 'http://192.168.20.185')
  assert.equal(buildRouterGuiUrl(' 10.10.1.25 '), 'http://10.10.1.25')
  assert.equal(buildRouterGuiUrl('192.168.1.1:8080'), 'http://192.168.1.1:8080')
})

test('buildRouterGuiUrl preserves safe explicit http/https URLs', () => {
  assert.equal(buildRouterGuiUrl('https://192.168.20.185:8443'), 'https://192.168.20.185:8443/')
  assert.equal(buildRouterGuiUrl('http://10.10.0.1/login'), 'http://10.10.0.1/login')
})

test('buildRouterGuiUrl supports valid IPv6 addresses', () => {
  assert.equal(buildRouterGuiUrl('2001:db8::1'), 'http://[2001:db8::1]/')
  assert.equal(buildRouterGuiUrl('[fe80::1]'), 'http://[fe80::1]/')
})

test('buildRouterGuiUrl rejects empty values, invalid IPs, and unsafe URI schemes', () => {
  assert.equal(buildRouterGuiUrl(null), null)
  assert.equal(buildRouterGuiUrl(undefined), null)
  assert.equal(buildRouterGuiUrl(''), null)
  assert.equal(buildRouterGuiUrl('-'), null)
  assert.equal(buildRouterGuiUrl('999.168.1.1'), null)
  assert.equal(buildRouterGuiUrl('192.168.1.1:99999'), null)
  assert.equal(buildRouterGuiUrl('192.168.1.0/24'), null)
  assert.equal(buildRouterGuiUrl('javascript:alert(1)'), null)
  assert.equal(buildRouterGuiUrl('data:text/html,<script>alert(1)</script>'), null)
  assert.equal(buildRouterGuiUrl('http://admin:pass@192.168.1.1'), null)
})
