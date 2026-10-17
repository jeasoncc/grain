import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

// Run only through test-windows-msix.ps1 -StoreGallery in a disposable Windows profile.
// Native commands create real files; every scene thereafter uses the installed app's UI.
const [readinessDirectory, packageDirectory, endpoint = 'http://127.0.0.1:9222'] = process.argv.slice(2);
assert.equal(process.platform, 'win32', 'Gallery capture requires the real installed Windows app');
assert.ok(readinessDirectory && packageDirectory, 'Expected readiness and package directories');
const readiness = path.resolve(readinessDirectory);
const output = path.join(readiness, 'store-gallery');
await mkdir(output, { recursive: true });
const json = async file => JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
const info = await json(path.join(packageDirectory, 'package-info.json'));
const installed = await json(path.join(readiness, 'installed-package.json'));
const native = await json(path.join(readiness, 'gallery-process.json'));
const exercise = await json(path.join(readiness, 'exercise-result.json'));
const reopen = await json(path.join(readiness, 'reopen-result.json'));
assert.equal(info.storeProductId, '9PF3WZLSWZHX');
assert.equal(info.identity, 'Jeason.GrainOrg');
assert.equal(info.appVersion, '0.1.606', 'Listing-only capture must retain the published application version');
assert.equal(info.version, '1.1.606.0', 'Listing-only capture must retain the published MSIX version');
assert.equal(installed.Name, info.identity);
assert.equal(native.packageFullName, installed.PackageFullName);
assert.equal(native.phase, 'gallery');
assert.ok(native.clientWidth >= 1366 && native.clientHeight >= 768);
assert.equal(native.dpiAwareness, 'PerMonitorV2');
assert.equal(exercise.status, 'passed');
assert.equal(reopen.status, 'passed');
assert.equal(exercise.relativePath, reopen.relativePath);
assert.equal(exercise.workspaceRoot, reopen.workspaceRoot);

const files = {
  writing: 'Studio-写作计划-Writing.org',
  reference: 'Studio-阅读札记-Research.org',
  tasks: 'Studio-本周安排-Week.org',
  ideas: 'Studio-灵感收件箱-Inbox.org',
  links: 'Studio-知识地图-Connections.org',
  review: 'Studio-每周回顾-Review.org',
};
const manifest = {
  schemaVersion: 1,
  status: 'capturing',
  product: { name: 'Grain Org', storeProductId: info.storeProductId },
  capturedAt: new Date().toISOString(),
  provenance: {
    source: 'Installed MSIX native window / real WebView2 CDP; raw page PNGs',
    purpose: 'Store listing assets only; CI package is capture provenance, not a package submission',
    appVersion: info.appVersion, packageVersion: info.version,
    package: info.package, packageSha256: info.sha256, executableSha256: info.executableSha256,
    identity: installed.Name, publisher: installed.Publisher,
    packageFullName: installed.PackageFullName, packageFamilyName: installed.PackageFamilyName,
    nativeProcess: native,
    githubRunId: process.env.GITHUB_RUN_ID ?? null,
    githubRunAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    commit: process.env.GITHUB_SHA ?? null,
  },
  sampleData: 'Fictional bilingual Org notes created with native workspace operations in the disposable runner profile',
  scenes: [],
};
const saveManifest = () => writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
await saveManifest();
let browser;
let page;
let scene = 'connect';
let pageErrorCount = 0;
const log = [];

async function openNote(relativePath, expectedText) {
  const row = page.getByRole('treeitem', { name: relativePath, exact: true });
  await row.click();
  await page.waitForFunction(({ relativePath, expectedText }) => {
    const row = [...document.querySelectorAll('[role="treeitem"]')]
      .find(node => node.getAttribute('aria-label') === relativePath);
    const editor = document.querySelector('[data-org-active-editor-window="true"] .cm-content');
    return row?.getAttribute('aria-current') === 'page' && editor?.getAttribute('aria-label') === `Editing ${relativePath}` &&
      editor.isContentEditable && editor.innerText.includes(expectedText);
  }, { relativePath, expectedText });
  return page.locator('[data-org-active-editor-window="true"] .cm-content');
}

async function capture(id, name, captions, evidence) {
  scene = id;
  assert.equal(pageErrorCount, 0, 'Installed app raised JavaScript errors during gallery capture');
  assert.equal(await page.getByRole('alert').filter({ visible: true }).count(), 0, 'Visible app error prevents a Store screenshot');
  // Observe actual font readiness and two painted frames; do not replace app content or emulate a viewport.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.mouse.move(1, 1);
  const file = `${id}.png`;
  const image = await page.screenshot({ path: path.join(output, file), type: 'png', fullPage: false });
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  assert.ok(width >= 1366 && height >= 768 && image.byteLength <= 50 * 1024 * 1024,
    `Raw native screenshot is not Store-sized: ${width}x${height}`);
  const sha256 = createHash('sha256').update(image).digest('hex');
  assert.ok(!manifest.scenes.some(previous => previous.sha256 === sha256), `Duplicate screenshot for ${id}`);
  const viewport = await page.evaluate(() => ({ innerWidth, innerHeight, devicePixelRatio }));
  manifest.scenes.push({ id, name, file, width, height, bytes: image.byteLength, sha256, viewport, captions, evidence });
  await saveManifest();
  log.push(`${id}: captured ${width}x${height}`);
  console.log(log.at(-1));
}

try {
  browser = await chromium.connectOverCDP(endpoint, { timeout: 60_000 });
  page = browser.contexts().flatMap(context => context.pages()).find(candidate => {
    const url = new URL(candidate.url());
    return url.hostname === 'tauri.localhost' || url.protocol === 'tauri:';
  });
  assert.ok(page, 'Installed Tauri WebView2 page is absent');
  page.setDefaultTimeout(30_000);
  page.on('pageerror', () => { pageErrorCount += 1; });
  await page.waitForFunction(() => typeof window.__TAURI__?.core?.invoke === 'function');
  await page.getByRole('button', { name: 'Refresh workspace', exact: true }).waitFor({ state: 'visible' });

  scene = 'seed-native-workspace';
  const seeded = await page.evaluate(async ({ files, smokePath, expectedRoot }) => {
    const invoke = window.__TAURI__.core.invoke;
    const workspace = await invoke('reopen_default_org_workspace');
    if (!workspace?.capabilityToken || workspace.rootPath !== expectedRoot) throw new Error('Gallery requires the smoke-tested default workspace');
    const scope = { workspaceRoot: workspace.rootPath, capabilityToken: workspace.capabilityToken };
    try {
      const scan = await invoke('scan_org_workspace', scope);
      if (scan.documents.some(document => document.relativePath !== smokePath))
        throw new Error('Gallery requires a disposable workspace containing only the readiness sample');
      const now = new Date();
      const dateAt = offset => {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      };
      const notes = [
        [files.writing, `#+title: 把想法写成文章 · From idea to essay
#+author: Lin / 林

* 文章方向 · A clear direction
把零散的观察整理成一篇有温度的文章。
A quiet morning, a notebook, and one useful idea to share.

** 核心问题 · The question
怎样在忙碌的一周，为阅读与写作留一点空间？
How can we make room for reading and writing in a busy week?

** 写作提纲 · Working outline
- [X] 收集生活中的小片段 / Gather everyday observations
- [ ] 选出三个故事 / Choose three small stories
- [ ] 写出第一稿 / Write a first draft

* 开篇草稿 · Opening paragraph
清晨的十分钟，可以是一天里最安静的起点。
Ten quiet minutes can change the rhythm of a day.

* 资料与下一步 · Sources and next steps
参考 [[file:${files.reference}][阅读札记 / Reading notes]]，把证据与自己的声音放在一起。
Next: turn the outline into a story worth sharing.
`],
        [files.reference, `#+title: 阅读札记 · Reading notes

* 阅读主题 · Make room for attention
少一点切换，多一点完整的思考。
Fewer interruptions, more room to follow a thought.

** 观察一 · Start small
每天留一页，记录一个真正值得记住的想法。
Keep one page for an idea you want to remember.

** 观察二 · Connect ideas
把阅读、散步和交谈中的线索连起来。
Connect what you read with what you notice outside.

* 可以写进文章的例子 · Story seeds
- 一杯茶的时间 / A pause over tea
- 通勤路上的一页书 / One page on the train
- 周末公园里的笔记 / Notes from a weekend walk

* 写作关联 · Writing connection
这些材料将用于 [[file:${files.writing}][从想法到文章 / From idea to essay]]。
`],
        [files.tasks, `#+title: 本周安排 · A thoughtful week

* TODO 整理阅读札记 · Review reading notes
SCHEDULED: <${dateAt(0)} 09:00>
挑出三条值得带进文章的观察。
Choose three observations for the essay.

* TODO 写出开篇草稿 · Draft the opening
SCHEDULED: <${dateAt(0)} 10:30>
先写下来，再慢慢打磨。 / Write first, refine later.

* TODO 与读书小组交流 · Share with the reading circle
DEADLINE: <${dateAt(0)} 17:00>
带上一个问题和一个发现。 / Bring a question and a discovery.

* 午后散步与观察 · Afternoon observation walk
<${dateAt(0)} 15:00>
带上笔记本，留意身边的小故事。
Take a notebook and notice the small stories around you.
`],
        [files.ideas, `#+title: 灵感收件箱 · An inbox for ideas

* 下一篇文章的种子 · Seeds for the next essay
- 城市里安静的角落 / Quiet corners of the city
- 让阅读融入日常 / Reading as an everyday habit
`],
        [files.links, `#+title: 知识地图 · Connected ideas

* 把线索连起来 · Follow the connections
一篇文章，来自多次阅读、观察与回顾。
A good essay grows from reading, noticing, and reflection.

** 阅读与写作 · Reading into writing
[[file:${files.writing}][写作计划 / Writing plan]]
[[file:${files.reference}][阅读札记 / Reading notes]]

** 行动与回顾 · Action and reflection
[[file:${files.tasks}][本周安排 / This week's plan]]
[[file:${files.review}][每周回顾 / Weekly reflection]]
`],
        [files.review, `#+title: 每周回顾 · Weekly reflection

* 本周的收获 · What stayed with me
完成一份提纲，比等待完美的开头更有用。
A useful outline beats waiting for a perfect first line.

* 继续推进 · Keep the thread
回到 [[file:${files.writing}][写作计划 / Writing plan]]，完成第一稿。
Use the reading notes to make the next draft more concrete.

* 下周的小目标 · A small goal for next week
每天给一个想法十分钟。 / Give one idea ten minutes each day.
`],
      ];
      const receipts = [];
      for (const [relativePath, content] of notes) {
        const created = await invoke('write_org_document', { ...scope, relativePath, content, expectedRevision: '<missing>' });
        const read = await invoke('read_org_document', { ...scope, relativePath });
        if (read.content !== content || read.revision !== created.revision) throw new Error('Native sample read-back failed');
        receipts.push({ relativePath, revision: read.revision });
      }
      return { date: dateAt(0), files: receipts };
    } catch {
      // Do not persist native error payloads: workspace capabilities remain only in this callback.
      throw new Error('Native gallery seeding failed; requires a clean disposable smoke-tested workspace and successful native read-back');
    } finally {
      await invoke('release_org_workspace', scope);
    }
  }, { files, smokePath: exercise.relativePath, expectedRoot: exercise.workspaceRoot });
  manifest.sampleFiles = seeded.files;
  manifest.sampleDate = seeded.date;
  await saveManifest();
  await page.getByRole('button', { name: 'Refresh workspace', exact: true }).click();
  await page.getByRole('textbox', { name: 'Filter workspace files', exact: true }).fill('Studio-');
  for (const relativePath of Object.values(files))
    await page.getByRole('treeitem', { name: relativePath, exact: true }).waitFor({ state: 'visible' });

  scene = '01-writing-outline';
  await openNote(files.writing, 'A quiet morning');
  await page.getByRole('button', { name: 'Show note inspector', exact: true }).click();
  const inspector = page.getByRole('complementary', { name: 'Note inspector', exact: true });
  await inspector.getByRole('button', { name: 'Outline', exact: true }).click();
  await inspector.getByRole('button', { name: '写作提纲 · Working outline', exact: true }).waitFor({ state: 'visible' });
  await capture(scene, 'Writing and outline', {
    'zh-CN': '从零散想法到清晰文章：提纲与正文一起推进。',
    'en-US': 'Turn scattered ideas into a clear draft, with your outline close at hand.',
  }, { document: files.writing, outlineHeading: '写作提纲 · Working outline' });

  scene = '02-split-reference';
  await inspector.getByRole('button', { name: 'Close inspector', exact: true }).click();
  await page.getByRole('button', { name: 'Split editor', exact: true }).click();
  const secondary = page.locator('[data-org-editor-window="secondary"] .cm-content');
  await secondary.click();
  await openNote(files.reference, 'Fewer interruptions');
  await page.waitForFunction(({ writing, reference }) => {
    const first = document.querySelector('[data-org-editor-window="primary"] .cm-content');
    const second = document.querySelector('[data-org-editor-window="secondary"] .cm-content');
    return first?.getAttribute('aria-label') === `Editing ${writing}` && second?.getAttribute('aria-label') === `Editing ${reference}` &&
      first.innerText.includes('A quiet morning') && second.innerText.includes('Fewer interruptions');
  }, files);
  await capture(scene, 'Writing beside reference notes', {
    'zh-CN': '一边查阅资料，一边写下自己的思考，不用来回切换。',
    'en-US': 'Keep your research beside your draft and stay with your train of thought.',
  }, { primary: files.writing, secondary: files.reference });
  await page.getByRole('button', { name: 'Close editor split', exact: true }).click();

  scene = '03-agenda';
  await page.getByRole('button', { name: 'Agenda', exact: true }).click();
  const agenda = page.getByRole('main', { name: 'Org agenda', exact: true });
  await page.waitForFunction(tasks => {
    const agenda = document.querySelector('main[aria-label="Org agenda"]');
    return agenda?.getAttribute('aria-busy') === 'false' &&
      [...agenda.querySelectorAll('[data-agenda-path]')].filter(row => row.dataset.agendaPath === tasks).length >= 4;
  }, files.tasks);
  await agenda.getByText('写出开篇草稿 · Draft the opening', { exact: true }).waitFor({ state: 'visible' });
  await capture(scene, 'Plan your next steps with Agenda', {
    'zh-CN': '把笔记里的待办、日程和截止日期汇在一起，看清下一步。',
    'en-US': 'See scheduled tasks, deadlines, and dated events together, then return to the original note.',
  }, { document: files.tasks, minimumEntries: 4, date: seeded.date });
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  await openNote(files.writing, 'A quiet morning');

  scene = '04-capture';
  await page.getByRole('button', { name: 'Quick capture', exact: true }).click();
  const template = page.getByRole('combobox', { name: 'Capture template:', exact: true });
  await template.fill('todo');
  await template.press('Enter');
  const captureTool = page.getByRole('region', { name: 'Org capture tool buffer', exact: true });
  await captureTool.waitFor({ state: 'visible' });
  await captureTool.getByRole('textbox', { name: 'Capture target file', exact: true }).fill(files.ideas);
  const draft = captureTool.getByRole('textbox', { name: 'Capture Org draft', exact: true });
  await draft.click();
  await page.keyboard.press('Control+End');
  const idea = '给下一个想法留十分钟 · Make ten minutes for the next idea';
  await page.keyboard.insertText(`${idea}\n记录散步时想到的开篇，再回到正在写的文章。\nSave the opening you noticed on a walk, then return to your draft.\n`);
  await captureTool.getByRole('button', { name: 'Preview target', exact: true }).click();
  await captureTool.locator('output[aria-label="Capture target preview"]').filter({ hasText: files.ideas }).waitFor({ state: 'visible' });
  await capture(scene, 'Capture an idea without losing your place', {
    'zh-CN': '灵感出现时先记下来，确认收件箱后，再回到手头的文章。',
    'en-US': 'Catch an idea in your inbox without losing your place in the draft.',
  }, { target: files.ideas, draft: idea, targetPreviewReviewed: true });
  await captureTool.getByRole('button', { name: 'Finish', exact: true }).click();
  await captureTool.waitFor({ state: 'hidden' });
  assert.ok((await readFile(path.join(exercise.workspaceRoot, files.ideas), 'utf8')).includes(idea),
    'UI Capture did not write the real sample inbox');
  manifest.captureSavedToDisk = true;

  scene = '05-quick-open';
  await page.getByRole('button', { name: 'Quick open (Ctrl+O)', exact: true }).click();
  const search = page.getByRole('combobox', { name: 'Search workspace notes', exact: true });
  await search.fill('Studio');
  for (const relativePath of Object.values(files))
    await page.getByRole('option', { name: relativePath, exact: true }).waitFor({ state: 'visible' });
  await capture(scene, 'Find a note and keep moving', {
    'zh-CN': '输入几个字，快速找到下一篇要用的笔记。',
    'en-US': 'Find the note you need with a few keystrokes and keep your work moving.',
  }, { query: 'Studio', expectedResults: Object.values(files) });
  // Selecting a real completion proves this is working navigation, not a staged search surface.
  await page.getByRole('option', { name: files.links, exact: true }).click();
  await search.waitFor({ state: 'hidden' });
  await openNote(files.writing, 'A quiet morning');

  scene = '06-linked-notes';
  await page.getByRole('button', { name: 'Show note inspector', exact: true }).click();
  await inspector.getByRole('button', { name: 'Backlinks', exact: true }).click();
  for (const source of [files.reference, files.links, files.review])
    await inspector.locator('button[title]').filter({ hasText: `${source}:` }).waitFor({ state: 'visible' });
  await capture(scene, 'Follow the connections between your notes', {
    'zh-CN': '顺着反向链接找回相关资料，让阅读、写作与回顾连成一条线。',
    'en-US': 'Follow backlinks to reconnect your reading, writing, and reflections.',
  }, { document: files.writing, backlinkSources: [files.reference, files.links, files.review] });
  assert.equal(manifest.scenes.length, 6, 'Every required gallery scene must be captured');
  assert.equal(pageErrorCount, 0, 'Installed app raised JavaScript errors');
  manifest.status = 'passed';
  await saveManifest();
} catch (error) {
  manifest.status = 'failed';
  manifest.failedScene = scene;
  await saveManifest();
  // Keep native bridge error payloads and capabilities out of logs/artifacts.
  const message = `Store gallery failed at ${scene} (${error?.name ?? 'Error'}); inspect the raw failure screenshot and readiness artifacts.`;
  await writeFile(path.join(output, 'failure.txt'), message);
  if (page && !page.isClosed()) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  throw new Error(message);
} finally {
  await writeFile(path.join(output, 'gallery.log'), log.join('\n'));
  // Disconnect only: the PowerShell harness owns process shutdown and cleanup.
  if (browser) await browser.close();
}
