'use strict';
const { _electron } = require('playwright');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const root = path.resolve(__dirname, '../..');
  const isolated = await fs.mkdtemp(path.join(os.tmpdir(), 'brain-native-ai-storage-'));
  const secret = 'synthetic-test-key-never-a-real-credential';
  const filename = path.join(isolated, 'user-session-data', 'ai-providers.encrypted.json');
  let app;
  async function launch() {
    app = await _electron.launch({ args: ['.', '--user-session-test', '--evidence-dir=' + isolated, ...(process.platform === 'linux' ? ['--no-sandbox'] : [])], cwd: root });
    const page = await app.firstWindow();
    await page.locator('[data-route="library"]').waitFor();
    return page;
  }
  try {
    let page = await launch();
    const initial = await page.evaluate(() => desktop.aiProvidersList());
    assert.equal(initial.ok, true);
    assert.deepEqual(initial.value.providers, []);
    const saved = await page.evaluate(apiKey => desktop.aiProvidersSave({ name: 'Synthetic provider', settings: { provider: 'openai', model: 'synthetic-model', apiKey, stream: true } }), secret);
    let storageResult;
    if (!initial.value.available) {
      assert.equal(saved.ok, false);
      assert.equal(saved.error.code, 'STORAGE');
      await assert.rejects(fs.stat(filename), { code: 'ENOENT' });
      storageResult = 'OS secure storage unavailable: save refused and no credentials file created';
    } else {
      assert.equal(saved.ok, true);
      assert.ok(!JSON.stringify(saved).includes(secret));
      const encrypted = await fs.readFile(filename, 'utf8');
      for (const sensitive of [secret, 'Synthetic provider', 'synthetic-model']) assert.ok(!encrypted.includes(sensitive));
      const id = saved.value.id;
      await app.close(); app = null; page = await launch();
      const status = await page.evaluate(() => desktop.aiStatus());
      assert.equal(status.value.configured, false, 'saved credentials must not auto-activate');
      const listed = await page.evaluate(() => desktop.aiProvidersList());
      assert.equal(listed.value.providers.length, 1);
      assert.equal(listed.value.providers[0].id, id);
      assert.ok(!JSON.stringify(listed).includes(secret));
      const active = await page.evaluate(value => desktop.aiProvidersActivate(value), id);
      assert.equal(active.ok, true); assert.equal(active.value.configured, true);
      assert.equal(active.value.model, 'synthetic-model');
      assert.ok(!JSON.stringify(active).includes(secret));
      await page.evaluate(async value => {
        await Promise.all([desktop.aiProvidersActivate(value), desktop.aiClear()]);
      }, id);
      assert.equal((await page.evaluate(() => desktop.aiStatus())).value.configured, false, 'late activation must not undo clear');
      await page.evaluate(async value => {
        await Promise.all([desktop.aiProvidersActivate(value), desktop.aiConfigure({ provider: 'openai', model: 'newer-manual-model', apiKey: 'synthetic-manual-test-key' })]);
      }, id);
      assert.equal((await page.evaluate(() => desktop.aiStatus())).value.model, 'newer-manual-model', 'late activation must not replace manual configuration');
      const renderer = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage }, text: document.documentElement.outerHTML }));
      assert.ok(!JSON.stringify(renderer).includes(secret));
      assert.equal((await page.evaluate(value => desktop.aiProvidersDelete(value), id)).value.deleted, true);
      assert.deepEqual((await page.evaluate(() => desktop.aiProvidersList())).value.providers, []);
      await page.evaluate(() => desktop.aiClear());
      storageResult = 'Native OS-encrypted save/relaunch/list/activate/delete passed; no plaintext or renderer key readback';
    }
    await page.evaluate(() => { window.testChunks = []; window.unsubscribeChunks = desktop.aiOnStream(value => window.testChunks.push(value)); });
    await app.evaluate(({ BrowserWindow }) => {
      const contents = BrowserWindow.getAllWindows()[0].webContents;
      contents.send('ai-stream', { requestId: 'test-1', delta: 'Hello', ignored: 'not exposed' });
      contents.send('ai-stream', { requestId: '../invalid', delta: 'rejected' });
      contents.send('ai-stream', { requestId: 'test-1', delta: 17 });
    });
    await page.waitForFunction(() => window.testChunks.length === 1);
    assert.deepEqual(await page.evaluate(() => window.testChunks), [{ requestId: 'test-1', delta: 'Hello' }]);
    await page.evaluate(() => window.unsubscribeChunks());
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send('ai-stream', { requestId: 'test-1', delta: 'After unsubscribe' }));
    assert.equal((await page.evaluate(() => window.testChunks)).length, 1);
    const denied = await app.evaluate(async ({ BrowserWindow }, preload) => {
      const other = new BrowserWindow({ show: false, webPreferences: { preload, contextIsolation: true, sandbox: true, nodeIntegration: false } });
      try {
        await other.loadURL('about:blank');
        return await other.webContents.executeJavaScript("desktop.aiProvidersList().then(()=>false,()=>true)");
      } finally { other.destroy(); }
    }, path.join(root, 'app', 'preload.cjs'));
    assert.equal(denied, true, 'another renderer must not access saved providers');
    console.log(JSON.stringify({ passed: true, storage: storageResult, streamBridge: 'narrow payload filtering and unsubscribe passed', trustedSender: 'second renderer rejected', externalProviderRequests: 0 }));
  } finally { if (app) await app.close(); await fs.rm(isolated, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
