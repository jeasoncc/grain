import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const [phase, outputDirectory, endpoint = 'http://127.0.0.1:9222'] = process.argv.slice(2);
assert.ok(['exercise', 'reopen'].includes(phase), 'Expected exercise or reopen phase');
const output = path.resolve(outputDirectory);
await mkdir(output, { recursive: true });
const statePath = path.join(output, 'document-state.json');
const source = '#+title: \u5c0f\u9ea6 Windows\r\n* \u4e2d\u6587 \ud83c\udf3e\r\nOriginal body\r\n';
const edited = `${source}Saved edit: caf\u00e9 \u65e5\u672c\u8a9e\r\n`;
const uiLine = 'Editor saved: \u4e2d\u6587 \u65e5\u672c\u8a9e caf\u00e9';
const savedSource = `${edited}${uiLine}\r\n`;
let browser;
let page;
const logs = [];
const errors = [];

async function openVisibleDocument(relativePath, expectedText) {
  const openDefault = page.getByRole('button', { name: 'Open Documents/Grain', exact: true });
  const refresh = page.getByRole('button', { name: 'Refresh workspace', exact: true });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button =>
    !button.disabled && (button.textContent.trim() === 'Open Documents/Grain' ||
      button.getAttribute('aria-label') === 'Refresh workspace')));
  if (await openDefault.isVisible()) await openDefault.click();
  await refresh.click();
  const row = page.getByRole('treeitem', { name: relativePath, exact: true });
  await row.click();
  const editor = page.locator('.cm-content[contenteditable="true"]');
  await editor.waitFor({ state: 'visible' });
  await page.waitForFunction(({ relativePath, expectedText }) => {
    const active = [...document.querySelectorAll('[role="treeitem"]')]
      .find(row => row.getAttribute('aria-label') === relativePath);
    const editor = document.querySelector('.cm-content[contenteditable="true"]');
    return active?.getAttribute('aria-current') === 'page' && editor?.innerText.includes(expectedText);
  }, { relativePath, expectedText });
  return editor;
}
try {
  // This attaches to the installed app's real WebView2, not a browser copy of its UI.
  browser = await chromium.connectOverCDP(endpoint, { timeout: 60_000 });
  const deadline = Date.now() + 60_000;
  while (!page && Date.now() < deadline) {
    for (const context of browser.contexts()) {
      for (const candidate of context.pages()) {
        const url = new URL(candidate.url());
        if (['tauri.localhost', 'localhost'].includes(url.hostname) && !['http:', 'https:', 'tauri:'].includes(url.protocol)) continue;
        if (url.hostname === 'tauri.localhost' || url.protocol === 'tauri:') page = candidate;
      }
    }
    if (!page) await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(page, 'No installed Tauri app page exposed by WebView2');
  page.on('console', message => logs.push(`[${message.type()}] ${message.text()}`));
  page.on('pageerror', error => errors.push(error.stack ?? error.message));
  page.setDefaultTimeout(30_000);
  await page.waitForFunction(() => typeof window.__TAURI__?.core?.invoke === 'function');
  await page.locator('body').waitFor({ state: 'visible' });
  await page.waitForFunction(() => Boolean(document.body?.innerText.trim()), null, { timeout: 30_000 });
  await page.screenshot({ path: path.join(output, `${phase}-before.png`) });

  if (phase === 'exercise') {
    const relativePath = `windows-smoke-${Date.now()}-\u4e2d\u6587.org`;
    const result = await page.evaluate(async ({ relativePath, source, edited }) => {
      const invoke = window.__TAURI__.core.invoke;
      const workspace = await invoke('open_default_org_workspace');
      if (!workspace?.capabilityToken) throw new Error('Native workspace did not issue a capability');
      const scope = { workspaceRoot: workspace.rootPath, capabilityToken: workspace.capabilityToken, relativePath };
      const check = (condition, message) => { if (!condition) throw new Error(message); };
      let invalidGrantRejected = false;
      try { await invoke('read_org_document', { ...scope, capabilityToken: 'not-an-approved-grant' }); }
      catch { invalidGrantRejected = true; }
      check(invalidGrantRejected, 'Native read accepted an invalid workspace capability');
      const created = await invoke('write_org_document', { ...scope, content: source, expectedRevision: '<missing>' });
      check(created.relativePath === relativePath && typeof created.revision === 'string', 'Invalid create receipt');
      const opened = await invoke('read_org_document', scope);
      check(opened.content === source && opened.revision === created.revision, 'Create/open changed Unicode or CRLF bytes');
      const saved = await invoke('write_org_document', { ...scope, content: edited, expectedRevision: opened.revision });
      check(saved.relativePath === relativePath && saved.revision !== created.revision, 'Edit did not return a new revision');
      let staleRejected = false;
      try { await invoke('write_org_document', { ...scope, content: 'stale overwrite', expectedRevision: created.revision }); }
      catch { staleRejected = true; }
      check(staleRejected, 'Native CAS accepted a stale revision');
      let collisionRejected = false;
      try { await invoke('write_org_document', { ...scope, content: 'creation overwrite', expectedRevision: '<missing>' }); }
      catch (error) { collisionRejected = error?.kind === 'creation-collision' && error.noWrite === true && error.relativePath === relativePath; }
      check(collisionRejected, 'Create collision was not rejected with an authoritative no-write result');
      const reopened = await invoke('read_org_document', scope);
      check(reopened.content === edited && reopened.revision === saved.revision, 'Rejected writes changed saved bytes');
      await invoke('release_org_workspace', { workspaceRoot: scope.workspaceRoot, capabilityToken: scope.capabilityToken });
      // Never put the live grant into the persisted report.
      return { workspaceRoot: scope.workspaceRoot, relativePath, revision: saved.revision,
        invalidGrantRejected, staleRejected, collisionRejected, byteLength: new TextEncoder().encode(edited).length };
    }, { relativePath, source, edited });
    const disk = await readFile(path.join(result.workspaceRoot, result.relativePath));
    assert.deepEqual(disk, Buffer.from(edited, 'utf8'), 'Actual disk bytes differ from the Unicode/CRLF save');
    const editor = await openVisibleDocument(result.relativePath, 'Saved edit: caf\u00e9 \u65e5\u672c\u8a9e');
    await editor.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.insertText(uiLine);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Control+s');
    await page.waitForFunction(relativePath => {
      const row = [...document.querySelectorAll('[role="treeitem"]')]
        .find(row => row.getAttribute('aria-label') === relativePath);
      return row?.getAttribute('aria-current') === 'page' && row.getAttribute('aria-description') !== 'Unsaved changes';
    }, result.relativePath);
    assert.deepEqual(await readFile(path.join(result.workspaceRoot, result.relativePath)), Buffer.from(savedSource, 'utf8'),
      'Visible editor Ctrl+S did not preserve exact Unicode/CRLF disk bytes');
    const uiResult = await page.evaluate(async ({ relativePath, expected }) => {
      const invoke = window.__TAURI__.core.invoke;
      const workspace = await invoke('reopen_default_org_workspace');
      if (!workspace?.capabilityToken) throw new Error('Cannot verify visible editor save');
      try {
        const document = await invoke('read_org_document', {
          workspaceRoot: workspace.rootPath, capabilityToken: workspace.capabilityToken, relativePath,
        });
        if (document.content !== expected) throw new Error('Native read disagrees with visible editor save');
        return { revision: document.revision };
      } finally {
        await invoke('release_org_workspace', { workspaceRoot: workspace.rootPath, capabilityToken: workspace.capabilityToken });
      }
    }, { relativePath: result.relativePath, expected: savedSource });
    assert.notEqual(uiResult.revision, result.revision, 'Visible editor edit did not advance the disk revision');
    const proof = { ...result, nativeRevision: result.revision, revision: uiResult.revision,
      byteLength: Buffer.byteLength(savedSource, 'utf8'), editorOpenSave: true };
    await writeFile(statePath, JSON.stringify(proof, null, 2));
    await writeFile(path.join(output, 'exercise-result.json'), JSON.stringify({ status: 'passed', ...proof }, null, 2));
  } else {
    const previous = JSON.parse(await readFile(statePath, 'utf8'));
    const result = await page.evaluate(async ({ relativePath, revision, expected }) => {
      const invoke = window.__TAURI__.core.invoke;
      const workspace = await invoke('reopen_default_org_workspace');
      if (!workspace?.capabilityToken) throw new Error('Restart did not reopen the native default workspace');
      const scope = { workspaceRoot: workspace.rootPath, capabilityToken: workspace.capabilityToken, relativePath };
      const scan = await invoke('scan_org_workspace', { workspaceRoot: scope.workspaceRoot, capabilityToken: scope.capabilityToken });
      if (!scan.documents.some(document => document.relativePath === relativePath && document.revision === revision)) {
        throw new Error('Restart scan lost the saved document or its revision');
      }
      const reopened = await invoke('read_org_document', scope);
      if (reopened.content !== expected || reopened.revision !== revision) throw new Error('Process restart lost or changed editor-saved Unicode/CRLF content');
      await invoke('release_org_workspace', { workspaceRoot: scope.workspaceRoot, capabilityToken: scope.capabilityToken });
      return { workspaceRoot: scope.workspaceRoot, relativePath, revision: reopened.revision };
    }, { ...previous, expected: savedSource });
    assert.deepEqual(await readFile(path.join(result.workspaceRoot, result.relativePath)), Buffer.from(savedSource, 'utf8'));
    await openVisibleDocument(result.relativePath, uiLine);
    await writeFile(path.join(output, 'reopen-result.json'), JSON.stringify({ status: 'passed', ...result, editorReopen: true }, null, 2));
  }
  assert.equal(errors.length, 0, `Installed app raised JavaScript errors: ${errors.join('\n')}`);
  console.log(`${phase}: installed Tauri document and visible editor boundary passed (Unicode, CRLF, real filesystem).`);
} catch (error) {
  await writeFile(path.join(output, `${phase}-failure.txt`), error.stack ?? String(error));
  throw error;
} finally {
  if (page && !page.isClosed()) {
    await page.screenshot({ path: path.join(output, `${phase}-after.png`) }).catch(error => logs.push(`Screenshot failure: ${error.message}`));
  }
  await writeFile(path.join(output, `${phase}-webview.log`), [...logs, ...errors].join('\n'));
  // Disconnecting CDP does not close the installed app; the PowerShell owner stops it.
  if (browser) await browser.close();
}
