'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createStore } = require('../app/ai-store.cjs');
const settings = { provider: 'openai', model: 'test-model', apiKey: 'test-secret-not-real' };
async function fixture(t, overrides = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'brain-ai-store-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  // Test-only authenticated cipher stands in for the OS API, never real credentials.
  const key = crypto.randomBytes(32);
  const safeStorage = {
    isEncryptionAvailable: () => true,
    getSelectedStorageBackend: () => 'gnome_libsecret',
    encryptString: value => { const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key, iv); const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]); return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]); },
    decryptString: value => { const decipher = crypto.createDecipheriv('aes-256-gcm', key, value.subarray(0, 12)); decipher.setAuthTag(value.subarray(12, 28)); return Buffer.concat([decipher.update(value.subarray(28)), decipher.final()]).toString('utf8'); },
    ...overrides
  };
  return { directory, safeStorage, store: createStore({ directory, safeStorage, platform: 'linux' }), filename: path.join(directory, 'ai-providers.encrypted.json') };
}
test('saved providers encrypt all records, return metadata only, activate internally and delete', async t => {
  const f = await fixture(t);
  assert.deepEqual(await f.store.list(), { available: true, providers: [] });
  const saved = await f.store.save({ name: 'Test provider', settings });
  assert.equal(saved.apiKey, undefined);
  const bytes = await fs.readFile(f.filename, 'utf8');
  for (const sensitive of [settings.apiKey, settings.model, 'Test provider', 'api.openai.com']) assert.ok(!bytes.includes(sensitive));
  const restarted = createStore({ directory: f.directory, safeStorage: f.safeStorage, platform: 'linux' });
  assert.deepEqual((await restarted.list()).providers, [saved]);
  const status = await restarted.activate(saved.id, value => { assert.equal(value.apiKey, settings.apiKey); return { configured: true }; });
  assert.deepEqual(status, { configured: true });
  await restarted.delete(saved.id);
  assert.deepEqual((await restarted.list()).providers, []);
});
test('unavailable, plaintext and unknown Linux storage backends fail closed without a file', async t => {
  for (const overrides of [{ isEncryptionAvailable: () => false }, { getSelectedStorageBackend: () => 'basic_text' }, { getSelectedStorageBackend: () => 'unknown' }]) {
    const f = await fixture(t, overrides);
    assert.deepEqual(await f.store.list(), { available: false, providers: [] });
    await assert.rejects(f.store.save({ name: 'test', settings }), { code: 'STORAGE' });
    await assert.rejects(fs.stat(f.filename), { code: 'ENOENT' });
  }
});
test('serial writes preserve concurrent saves and enforce the 20-config limit', async t => {
  const f = await fixture(t);
  const records = await Promise.all(Array.from({ length: 20 }, (_, i) => f.store.save({ name: 'Provider ' + i, settings })));
  assert.equal((await f.store.list()).providers.length, 20);
  await assert.rejects(f.store.save({ name: 'overflow', settings }), { code: 'STORAGE' });
  const edited = await f.store.save({ id: records[0].id, name: 'Edited', settings });
  assert.equal(edited.name, 'Edited');
  assert.equal((await f.store.list()).providers.length, 20);
  assert.equal((await fs.readdir(f.directory)).length, 1);
});
test('tampered ciphertext is rejected and retained instead of overwritten', async t => {
  const f = await fixture(t); await f.store.save({ name: 'test', settings });
  const data = JSON.parse(await fs.readFile(f.filename, 'utf8'));
  const encrypted = Buffer.from(data.encrypted, 'base64'); encrypted[30] ^= 255;
  const corrupt = JSON.stringify({ ...data, encrypted: encrypted.toString('base64') });
  await fs.writeFile(f.filename, corrupt);
  await assert.rejects(f.store.list(), { code: 'STORAGE' });
  await assert.rejects(f.store.save({ name: 'new', settings }), { code: 'STORAGE' });
  assert.equal(await fs.readFile(f.filename, 'utf8'), corrupt);
});
test('invalid identities/settings and missing records never create or activate providers', async t => {
  const f = await fixture(t);
  for (const value of [{ name: '', settings }, { name: 'x', settings: { ...settings, apiKey: '' } }, { id: '../escape', name: 'x', settings }]) await assert.rejects(f.store.save(value), { code: 'STORAGE' });
  await assert.rejects(f.store.activate(crypto.randomUUID(), () => assert.fail('unexpected activation')), { code: 'STORAGE' });
  await assert.rejects(f.store.delete('../escape'), { code: 'STORAGE' });
  await assert.rejects(fs.stat(f.filename), { code: 'ENOENT' });
});
test('encryption errors never fall back to plaintext storage', async t => {
  const f = await fixture(t, { encryptString: () => { throw new Error(settings.apiKey); } });
  await assert.rejects(f.store.save({ name: 'test', settings }), error => error.code === 'STORAGE' && !error.message.includes(settings.apiKey));
  await assert.rejects(fs.stat(f.filename), { code: 'ENOENT' });
});
