'use strict';
// Desktop only. OS-backed encryption; credentials are never returned over IPC.
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { validateSettings } = require('./ai-core.js');
const MAX_RECORDS = 20, MAX_BYTES = 300000;
function failure() { const error = new Error('Saved providers are unavailable. Check operating-system secure storage and the provider settings.'); error.code = 'STORAGE'; return error; }
function createStore({ directory, safeStorage, platform = process.platform, validate = validateSettings }) {
  const filename = path.join(directory, 'ai-providers.encrypted.json');
  let queue = Promise.resolve();
  const available = () => {
    try {
      if (!safeStorage.isEncryptionAvailable()) return false;
      if (platform === 'linux' && !['gnome_libsecret', 'kwallet', 'kwallet5', 'kwallet6'].includes(safeStorage.getSelectedStorageBackend?.())) return false;
      return true;
    } catch { return false; }
  };
  function check() { if (!available()) throw failure(); }
  function validId(id) { if (typeof id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)) throw failure(); return id; }
  function nameOf(name) { if (typeof name !== 'string' || !name.trim() || name.length > 80 || /[\x00-\x1f\x7f]/.test(name)) throw failure(); return name.trim(); }
  const metadata = record => ({ id: record.id, name: record.name, provider: record.settings.provider, model: record.settings.model, endpoint: record.settings.endpoint });
  async function read() {
    check();
    try {
      const stat = await fs.lstat(filename);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_BYTES) throw failure();
      const envelope = JSON.parse(await fs.readFile(filename, 'utf8'));
      if (envelope.version !== 1 || typeof envelope.encrypted !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(envelope.encrypted)) throw failure();
      const records = JSON.parse(safeStorage.decryptString(Buffer.from(envelope.encrypted, 'base64')));
      if (!Array.isArray(records) || records.length > MAX_RECORDS) throw failure();
      const ids = new Set();
      return records.map(record => {
        const id = validId(record.id); if (ids.has(id)) throw failure(); ids.add(id);
        return { id, name: nameOf(record.name), settings: validate(record.settings) };
      });
    } catch (error) { if (error.code === 'ENOENT') return []; throw failure(); }
  }
  async function write(records) {
    check();
    let temp;
    try {
      const encrypted = safeStorage.encryptString(JSON.stringify(records)).toString('base64');
      const data = JSON.stringify({ version: 1, encrypted });
      if (Buffer.byteLength(data) > MAX_BYTES) throw failure();
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      temp = filename + '.' + randomUUID() + '.tmp';
      await fs.writeFile(temp, data, { flag: 'wx', mode: 0o600 });
      await fs.rename(temp, filename);
    } catch { throw failure(); }
    finally { if (temp) await fs.unlink(temp).catch(() => {}); }
  }
  function serialized(operation) {
    const result = queue.then(operation).catch(() => { throw failure(); });
    queue = result.catch(() => {}); return result;
  }
  return {
    list: () => serialized(async () => available() ? { available: true, providers: (await read()).map(metadata) } : { available: false, providers: [] }),
    save: input => serialized(async () => {
      check(); const name = nameOf(input?.name), settings = validate(input?.settings);
      const records = await read(), id = input?.id ? validId(input.id) : randomUUID();
      const index = records.findIndex(record => record.id === id);
      if (input?.id && index < 0 || index < 0 && records.length >= MAX_RECORDS) throw failure();
      const record = { id, name, settings };
      if (index < 0) records.push(record); else records[index] = record;
      await write(records); return metadata(record);
    }),
    activate: (id, configure) => serialized(async () => {
      validId(id); const record = (await read()).find(item => item.id === id);
      if (!record) throw failure();
      // configure receives decrypted settings only inside the main process.
      return configure(record.settings);
    }),
    delete: id => serialized(async () => {
      validId(id); const records = await read();
      if (!records.some(record => record.id === id)) throw failure();
      await write(records.filter(record => record.id !== id)); return { deleted: true };
    })
  };
}
module.exports = { createStore, MAX_RECORDS };
