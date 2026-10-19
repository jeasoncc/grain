#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { chmod, chown, copyFile, cp, lstat, mkdir, mkdtemp, readFile, readdir, readlink, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const helper = path.join(path.dirname(script), 'linux-snap-accessibility.py');
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
let logDirectory;
let sequence = 0;
const logPrefix = randomBytes(4).toString('hex');
const groups = new Set();

function start(command, args, options = {}) {
  const name = `${logPrefix}-${String(++sequence).padStart(3, '0')}-${path.basename(command)}`;
  const log = createWriteStream(path.join(logDirectory, `${name}.log`), { flags: 'wx' });
  const loggedArgs = path.basename(command) === 'xauth' ? [...args.slice(0, -1), '<private X11 cookie>'] : args;
  log.write(`${JSON.stringify({ command, args: loggedArgs })}\n`);
  const child = spawn(command, args, { detached: true, stdio: ['pipe', 'pipe', 'pipe'], ...options });
  if (child.pid) groups.add(child.pid);
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { log.write(chunk); stdout = (stdout + chunk).slice(-2_000_000); });
  child.stderr.on('data', chunk => { log.write(chunk); stderr = (stderr + chunk).slice(-2_000_000); });
  child.stdin.on('error', () => {});
  const done = new Promise(resolve => {
    child.once('error', error => { stderr += error.stack; });
    child.once('close', (code, signal) => {
      log.end(`\nexit=${code} signal=${signal}\n`, () => resolve({ code, signal, stdout, stderr }));
    });
  });
  return { child, done, name };
}

function signalGroup(pid, signal) {
  try { process.kill(-pid, signal); return true; } catch (error) {
    if (error.code === 'ESRCH') return false;
    if (error.code !== 'EPERM') throw error;
    // A timed-out sudo command can have root-owned descendants; target only our allocated group.
    const killed = spawnSync('/usr/bin/sudo', ['-n', '/bin/kill', '-s', signal, '--', String(-pid)],
      { timeout: 5000, encoding: 'utf8' });
    if (killed.status !== 0) {
      try { process.kill(-pid, 0); } catch (probe) { if (probe.code === 'ESRCH') return false; }
      throw new Error(`Cannot stop owned process group ${pid}: ${killed.error || killed.stderr}`);
    }
    return true;
  }
}

async function stop(pid) {
  if (!groups.has(pid)) return;
  if (!signalGroup(pid, 'SIGTERM')) { groups.delete(pid); return; }
  await sleep(800);
  signalGroup(pid, 'SIGKILL');
  groups.delete(pid);
}

async function run(command, args, { timeout = 60_000, input, allowFailure = false, ...options } = {}) {
  const owned = start(command, args, options);
  owned.child.stdin.end(input);
  let timer;
  const result = await Promise.race([
    owned.done,
    new Promise(resolve => { timer = setTimeout(() => resolve(null), timeout); }),
  ]);
  clearTimeout(timer);
  if (!result) {
    await stop(owned.child.pid);
    throw new Error(`${command} exceeded ${timeout}ms; see ${owned.name}.log`);
  }
  // Stop any descendants left behind by a completed helper, too.
  await stop(owned.child.pid);
  if (!allowFailure && result.code !== 0) {
    throw new Error(`${command} failed (${result.code ?? result.signal}); see ${owned.name}.log\n${result.stderr.slice(-4000)}\n${result.stdout.slice(-4000)}`);
  }
  return result;
}

async function until(description, operation, timeout = 45_000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try { const value = await operation(); if (value) return value; } catch (error) { last = error; }
    await sleep(300);
  }
  throw new Error(`Timed out waiting for ${description}${last ? `: ${last.message}` : ''}`);
}

async function json(file, value) { await writeFile(file, `${JSON.stringify(value, null, 2)}\n`); }
async function exists(file) { try { await lstat(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }
function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }

async function processes() {
  const result = [];
  for (const entry of await readdir('/proc')) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      const stat = await readFile(`/proc/${entry}/stat`, 'utf8');
      const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
      const status = await readFile(`/proc/${entry}/status`, 'utf8');
      result.push({ pid: Number(entry), parent: Number(fields[1]), group: Number(fields[2]), start: fields[19], state: fields[0],
        uid: Number(status.match(/^Uid:\s+(\d+)/m)?.[1]),
        executable: await readlink(`/proc/${entry}/exe`).catch(() => null), status });
    } catch (error) { if (!['ENOENT', 'EACCES', 'EPERM', 'ESRCH'].includes(error.code)) throw error; }
  }
  return result;
}

async function session(configPath) {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  assert.equal(process.env.ORG_NOTES_DISPOSABLE_HOST, '1', 'Disposable-host opt-in is required');
  assert.equal(process.getuid(), config.uid, 'Internal session must run as its newly created isolated user');
  assert.equal(os.homedir(), config.home);
  logDirectory = config.evidence;
  const report = { status: 'failed', phases: [] };
  const source = '#+title: Org Notes native proof\r\n* 中文 日本語 café 🌾\r\nOriginal CRLF body\r\n';
  const addition = 'Visible save: 中文 日本語 café 🌾';
  const expected = Buffer.from(`${source}${addition}\r\n`, 'utf8');
  const filename = 'native-proof-中文.org';
  let app;
  let documentPath;
  let env;
  let opticalSequence = 0;
  const ui = async (action, argument) => JSON.parse((await run('/usr/bin/python3', [config.helper, action, argument], { env, timeout: 50_000 })).stdout);
  const screenshot = async phase => run('/usr/bin/import', ['-window', 'root', path.join(config.evidence, `${phase}.png`)], { env });
  const windowFrame = async () => {
    const id = await until('the actual native window', async () => {
      const result = await run('/usr/bin/xdotool', ['search', '--onlyvisible', '--pid',
        String(report.phases.at(-1).pid), '--name', '^Org Notes$'], { env, allowFailure: true });
      if (result.code !== 0) return;
      const ids = result.stdout.trim().split(/\s+/);
      assert.equal(ids.length, 1, 'Expected one visible window owned by the verified native process');
      return ids[0];
    });
    const geometry = await run('/usr/bin/xwininfo', ['-id', id], { env });
    const metric = label => {
      const match = geometry.stdout.match(new RegExp(`^\\s*${label}:\\s*(-?\\d+)`, 'm'));
      assert.ok(match, `Missing native window geometry: ${label}`);
      return Number(match[1]);
    };
    const frame = { id, x: metric('Absolute upper-left X'), y: metric('Absolute upper-left Y'),
      width: metric('Width'), height: metric('Height') };
    assert.ok(frame.width > 0 && frame.height > 0, 'Native window is not visible');
    return frame;
  };
  const textKey = text => text.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
  const visibleText = async (text, region = 'any') => {
    const wanted = textKey(text);
    assert.ok(wanted, 'Optical targets require an explicit ASCII label');
    const bounds = await windowFrame();
    await run('/usr/bin/xdotool', ['windowactivate', '--sync', bounds.id], { env });
    return until(`visible native text: ${text}`, async () => {
      await screenshot('optical-current');
      const image = path.join(config.evidence, 'optical-current.png');
      const scaled = path.join(config.evidence, 'optical-current-scaled.png');
      await run('/usr/bin/convert', [image, '-resize', '300%', scaled], { env });
      const recognition = await run('/usr/bin/tesseract', [scaled, 'stdout', '--psm', '11', 'tsv'], { env });
      const lines = new Map();
      for (const row of recognition.stdout.split('\n')) {
        const columns = row.split('\t');
        if (columns[0] !== '5' || !columns[11]?.trim()) continue;
        const key = columns.slice(1, 5).join(':');
        const [x, y, width, height] = columns.slice(6, 10).map(Number);
        const line = lines.get(key) ?? { text: '', left: x, top: y, right: x + width, bottom: y + height };
        line.text += ` ${columns.slice(11).join('\t')}`;
        line.left = Math.min(line.left, x);
        line.top = Math.min(line.top, y);
        line.right = Math.max(line.right, x + width);
        line.bottom = Math.max(line.bottom, y + height);
        lines.set(key, line);
      }
      const matches = [...lines.values()].filter(line => {
        line.x = (line.left + line.right) / 6;
        line.y = (line.top + line.bottom) / 6;
        if (line.x < bounds.x || line.x > bounds.x + bounds.width ||
          line.y < bounds.y || line.y > bounds.y + bounds.height || !textKey(line.text).includes(wanted)) return false;
        const sidebar = line.x < bounds.x + bounds.width / 3;
        if (region === 'files') return sidebar && line.y > bounds.y + 80;
        if (region === 'workspace') return sidebar && line.y < bounds.y + 80;
        if (region === 'editor') return !sidebar;
        return true;
      });
      assert.ok(matches.length <= 1, `Ambiguous visible target: ${text}`);
      if (!matches.length) return;
      const result = { target: text, region, frame: bounds, ...matches[0] };
      await json(path.join(config.evidence, `optical-${++opticalSequence}.json`), result);
      return result;
    });
  };
  const clickText = async (text, region = 'any') => {
    const target = await visibleText(text, region);
    await run('/usr/bin/xdotool', ['mousemove', '--sync', String(Math.round(target.x)), String(Math.round(target.y)), 'click', '1'], { env });
    return target;
  };
  const native = async phase => {
    const current = await until('the installed native executable', async () => {
      const matches = (await processes()).filter(item => item.uid === config.uid && item.executable === config.executable);
      assert.ok(matches.length <= 1, 'Multiple native app processes: a full restart was not achieved');
      return matches[0];
    });
    assert.equal(current.group, app.child.pid, 'Native executable escaped the owned launch process group');
    const label = (await readFile(`/proc/${current.pid}/attr/current`, 'utf8')).trim();
    assert.equal(label, 'snap.org-notes.org-notes (enforce)', 'Native AppArmor profile is not the exact enforcing Snap app profile');
    assert.match(current.status, /^Seccomp:\s+2$/m, 'Native executable is not running with seccomp filtering');
    assert.match(current.status, /^Seccomp_filters:\s+[1-9]\d*$/m, 'Kernel did not report an installed seccomp filter');
    const proof = { phase, pid: current.pid, start: current.start, executable: current.executable,
      appArmor: label, seccomp: 2, seccompFilters: Number(current.status.match(/^Seccomp_filters:\s+(\d+)/m)[1]) };
    await writeFile(path.join(config.evidence, `${phase}-native-status.txt`), current.status);
    await json(path.join(config.evidence, `${phase}-confinement.json`), proof);
    report.phases.push(proof);
    return current;
  };
  const launch = () => {
    app = start('/usr/bin/snap', ['run', 'org-notes'], { env });
    app.child.stdin.end();
  };
  const stopApp = async () => {
    if (!app) return;
    const snapshot = (await processes()).filter(item => item.uid === config.uid);
    const owned = new Map(snapshot.filter(item => item.group === app.child.pid).map(item => [item.pid, item.start]));
    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const item of snapshot) {
        if (owned.has(item.parent) && !owned.has(item.pid)) {
          owned.set(item.pid, item.start);
          expanded = true;
        }
      }
    }
    const remaining = async () => (await processes()).filter(item => item.uid === config.uid && item.state !== 'Z' &&
      (owned.get(item.pid) === item.start || item.group === app.child.pid || item.executable === config.executable));
    for (const item of await remaining()) {
      try { process.kill(item.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
    }
    await stop(app.child.pid);
    for (const item of await remaining()) {
      try { process.kill(item.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
    }
    await until('all owned native/WebKit processes to exit', async () => (await remaining()).length === 0, 10_000);
    await json(path.join(config.evidence, `stopped-${app.child.pid}.json`), {
      launchPid: app.child.pid, processes: [...owned].map(([pid, start]) => ({ pid, start })), allExited: true,
    });
    await Promise.race([app.done, sleep(2000)]);
    app = undefined;
  };
  const focusEditor = expectedText => clickText(expectedText, 'editor');
  const pasteInEditor = async text => {
    const clipboard = start('/usr/bin/xclip', ['-selection', 'clipboard', '-in', '-quiet', '-loops', '0'], { env });
    clipboard.child.stdin.end(text);
    try {
      await until('the native UTF-8 clipboard', async () => {
        const available = await run('/usr/bin/xclip', ['-selection', 'clipboard', '-out', '-target', 'TARGETS'], { env, allowFailure: true });
        return available.code === 0 && available.stdout.includes('UTF8_STRING');
      }, 10_000);
      await run('/usr/bin/xdotool', ['key', '--clearmodifiers', 'ctrl+v'], { env });
      await visibleText(text.split(':')[0], 'editor');
    } finally { await stop(clipboard.child.pid); }
  };
  const chooseFolder = async (directory, phase) => {
    assert.ok(path.resolve(directory).startsWith(`${config.home}/`) && (await lstat(directory)).isDirectory(),
      'Only an existing folder in this test user home may be selected');
    const ready = await ui('chooser-ready', '');
    const windows = (await run('/usr/bin/xdotool', ['search', '--onlyvisible', '--name', '^选择 Org 工作区$'], { env })).stdout.trim().split(/\s+/);
    assert.equal(windows.length, 1, 'Expected exactly one real native Org workspace chooser');
    await run('/usr/bin/xdotool', ['windowactivate', '--sync', windows[0]], { env });
    const steps = [];
    const point = async (name, clicks = 1) => {
      const target = await ui('chooser-point', name);
      await run('/usr/bin/xdotool', ['mousemove', '--sync', String(target.x), String(target.y),
        'click', '--repeat', String(clicks), '--delay', '100', '1'], { env });
      steps.push({ name, clicks, target });
    };
    await point('Home');
    const components = path.relative(config.home, directory).split(path.sep);
    for (let index = 0; index < components.length; index++) {
      await point(components[index], index === components.length - 1 ? 1 : 2);
    }
    await screenshot(`${phase}-chooser`);
    const confirmation = await ui('chooser-click', 'Select');
    await json(path.join(config.evidence, `${phase}-chooser.json`), { ready, steps, confirmation });
  };
  try {
    const display = `:${1000 + randomBytes(2).readUInt16BE() % 20000}`;
    const authority = path.join(config.home, '.Xauthority');
    env = { ...process.env, DISPLAY: display, XAUTHORITY: authority, GDK_BACKEND: 'x11',
      LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' };
    delete env.NO_AT_BRIDGE;
    await run('/usr/bin/xauth', ['-f', authority, 'add', display, '.', randomBytes(16).toString('hex')], { env });
    const xvfb = start('/usr/bin/Xvfb', [display, '-screen', '0', '1600x1000x24', '-nolisten', 'tcp', '-auth', authority], { env });
    xvfb.child.stdin.end();
    await until('the private X server', async () => (await run('/usr/bin/xdpyinfo', [], { env, allowFailure: true, timeout: 5000 })).code === 0);
    const wm = start('/usr/bin/openbox', ['--sm-disable'], { env });
    wm.child.stdin.end();
    const busPath = path.join(process.env.XDG_RUNTIME_DIR, 'bus');
    await until('the isolated user systemd D-Bus socket', () => exists(busPath));
    // Activated services also need the fresh identity; env -i on this process
    // alone does not remove a runner's HOME/runtime/bus from the user manager.
    await run('/usr/bin/dbus-update-activation-environment', ['--systemd', 'HOME', 'USER', 'LOGNAME', 'PATH',
      'XDG_RUNTIME_DIR', 'DBUS_SESSION_BUS_ADDRESS', 'DISPLAY', 'XAUTHORITY',
      'GDK_BACKEND', 'GTK_A11Y', 'GTK_MODULES', 'LANG', 'LC_ALL'], { env });
    // Use the supported GTK portal backend in this otherwise desktop-less disposable session.
    const portalConfig = path.join(config.home, '.config', 'xdg-desktop-portal');
    await mkdir(portalConfig, { recursive: true });
    await writeFile(path.join(portalConfig, 'portals.conf'), '[preferred]\ndefault=gtk\n');
    // Model a normal desktop user's OS directories before the Snap launcher imports them.
    const documents = path.join(config.home, 'Documents');
    const workspace = path.join(documents, 'Grain');
    const osConfigHome = path.join(config.home, '.config');
    await writeFile(path.join(osConfigHome, 'user-dirs.dirs'), `XDG_DOCUMENTS_DIR="${documents}"\n`);
    await mkdir(workspace, { recursive: true });
    documentPath = path.join(workspace, filename);
    await writeFile(documentPath, source, { flag: 'wx' });
    await run('/usr/bin/gsettings', ['set', 'org.gnome.desktop.interface', 'toolkit-accessibility', 'true'], { env });
    await run('/usr/bin/gsettings', ['set', 'org.gnome.desktop.a11y.applications', 'screen-reader-enabled', 'true'], { env });
    await run('/usr/bin/gdbus', ['call', '--session', '--dest', 'org.a11y.Bus', '--object-path', '/org/a11y/bus',
      '--method', 'org.freedesktop.DBus.Properties.GetAll', 'org.a11y.Status'], { env });
    const accessibilityAddress = await run('/usr/bin/python3', ['-c',
      'import json; from gi.repository import Gio; bus=Gio.bus_get_sync(Gio.BusType.SESSION,None); print(json.dumps(bus.call_sync("org.a11y.Bus","/org/a11y/bus","org.a11y.Bus","GetAddress",None,None,Gio.DBusCallFlags.NONE,5000,None).unpack()[0]))'], { env });
    env.AT_SPI_BUS_ADDRESS = JSON.parse(accessibilityAddress.stdout);
    assert.match(env.AT_SPI_BUS_ADDRESS, /^unix:/, 'Accessibility must use this local desktop session');
    launch();
    let first = await native('choose-existing');
    // Observe the launched process without rewriting its private application configuration.
    const environment = Object.fromEntries((await readFile(`/proc/${first.pid}/environ`, 'utf8')).split('\0').filter(Boolean).map(value => {
      const split = value.indexOf('='); return [value.slice(0, split), value.slice(split + 1)];
    }));
    const configHome = environment.XDG_CONFIG_HOME || path.join(environment.HOME, '.config');
    assert.ok(path.resolve(configHome).startsWith(`${config.home}/`), `Native config escaped isolated home: ${configHome}`);
    await json(path.join(config.evidence, 'workspace.json'), { nativeHome: environment.HOME, configHome, osConfigHome, workspace, filename,
      accessibility: { noAtBridge: environment.NO_AT_BRIDGE ?? null, gtkA11y: environment.GTK_A11Y ?? null,
        atSpiBusAddressSet: Boolean(environment.AT_SPI_BUS_ADDRESS) } });
    const existingFolder = path.join(config.home, 'Existing Org Notes');
    const existingPath = path.join(existingFolder, 'existing-note.org');
    const existingSource = '#+title: Existing folder proof\n* Existing note\nExisting physical body\n';
    const existingAddition = 'Selected-folder save: café 中文';
    const existingExpected = Buffer.from(`${existingSource}${existingAddition}\n`, 'utf8');
    await mkdir(existingFolder);
    await writeFile(existingPath, existingSource, { flag: 'wx' });
    documentPath = existingPath;
    await clickText('Choose another');
    await chooseFolder(existingFolder, 'existing');
    await clickText('existing-note.org', 'files');
    await focusEditor('Existing physical body');
    await screenshot('existing-before');
    await run('/usr/bin/xdotool', ['key', '--clearmodifiers', 'ctrl+End'], { env });
    await pasteInEditor(existingAddition);
    await run('/usr/bin/xdotool', ['key', '--clearmodifiers', 'Return'], { env });
    assert.deepEqual(await readFile(existingPath), Buffer.from(existingSource, 'utf8'), 'Chosen existing note wrote before explicit Save');
    await run('/usr/bin/xdotool', ['key', '--clearmodifiers', 'ctrl+s'], { env });
    await until('the chosen existing note physical bytes after Save', async () => (await readFile(existingPath)).equals(existingExpected));
    await screenshot('existing-saved');
    await native('existing-saved');
    await copyFile(existingPath, path.join(config.evidence, 'existing-document.org'));
    report.existingFolder = { filename: 'existing-note.org', physicalPath: existingPath,
      byteLength: existingExpected.length, sha256: sha256(existingExpected), nativeChooser: true, visibleNativeEdit: true, explicitSave: true };
    await clickText(path.basename(existingFolder), 'workspace');
    await chooseFolder(workspace, 'switch-default');
    await clickText('native-proof', 'files');
    await focusEditor('Original CRLF body');
    await screenshot('switched-default');
    report.workspaceSwitch = { nativeChooser: true, selectedContent: filename, physicalBytesUnchanged: true };
    documentPath = path.join(workspace, filename);
    assert.deepEqual(await readFile(documentPath), Buffer.from(source, 'utf8'));
    // Picker selections deliberately do not grant default recovery. Exercise the real default-open UI separately.
    await stopApp();
    launch();
    first = await native('exercise');
    await clickText('Open Documents/Grain');
    await clickText('native-proof', 'files');
    await focusEditor('Original CRLF body');
    await screenshot('exercise-before');
    await run('/usr/bin/xdotool', ['key', '--clearmodifiers', 'ctrl+End'], { env });
    await pasteInEditor(addition);
    await run('/usr/bin/xdotool', ['key', '--clearmodifiers', 'Return'], { env });
    assert.deepEqual(await readFile(documentPath), Buffer.from(source, 'utf8'), 'Editor wrote before explicit Save');
    await run('/usr/bin/xdotool', ['key', '--clearmodifiers', 'ctrl+s'], { env });
    await until('exact Unicode/CRLF bytes after explicit native Save', async () => (await readFile(documentPath)).equals(expected));
    await screenshot('exercise-saved');
    await native('saved');
    await stopApp();
    report.fullProcessStop = true;
    launch();
    const second = await native('reopen');
    assert.notEqual(`${first.pid}:${first.start}`, `${second.pid}:${second.start}`, 'Reopen reused the original native process');
    await clickText('native-proof', 'files');
    await focusEditor('Visible save');
    await visibleText('Original CRLF body', 'editor');
    assert.deepEqual(await readFile(documentPath), expected, 'Full process restart changed exact saved disk bytes');
    await screenshot('reopen');
    await copyFile(documentPath, path.join(config.evidence, 'saved-document.org'));
    report.document = { filename, byteLength: expected.length, sha256: sha256(expected), unicode: true, crlf: true,
      visibleNativeEdit: true, explicitSave: true, visibleReopen: true };
    report.status = 'passed';
  } catch (error) {
    report.error = error.stack ?? String(error);
    if (env) {
      await screenshot('failure').catch(() => {});
      await ui('dump', '').then(tree => json(path.join(config.evidence, 'failure-accessibility.json'), tree)).catch(() => {});
    }
    if (documentPath && await exists(documentPath)) await copyFile(documentPath, path.join(config.evidence, 'failed-document.org'));
  } finally {
    await stopApp().catch(error => { report.cleanupError = String(error); report.status = 'failed'; });
    for (const pid of [...groups].reverse()) await stop(pid).catch(error => { report.cleanupError = String(error); report.status = 'failed'; });
    await json(path.join(config.evidence, 'native-smoke.json'), report);
  }
  assert.equal(report.status, 'passed', report.error || report.cleanupError);
}

async function main() {
  const [packageArgument, artifactArgument, ...extra] = process.argv.slice(2);
  assert.ok(packageArgument && artifactArgument && extra.length === 0, 'Usage: ORG_NOTES_DISPOSABLE_HOST=1 node scripts/test-linux-snap.mjs <absolute.snap> <artifacts>');
  assert.equal(process.env.ORG_NOTES_DISPOSABLE_HOST, '1', 'Refusing host changes without ORG_NOTES_DISPOSABLE_HOST=1');
  assert.equal(process.platform, 'linux', 'Ubuntu Linux is required');
  assert.equal(process.arch, 'x64', 'Only amd64 has a native proof contract');
  assert.ok(path.isAbsolute(packageArgument), 'Supply an absolute package path');
  const packagePath = await realpath(packageArgument);
  assert.ok((await lstat(packagePath)).isFile(), 'Package is not a regular file');
  const artifacts = path.resolve(artifactArgument);
  await mkdir(artifacts, { recursive: true });
  logDirectory = artifacts;
  const report = { status: 'failed', startedAt: new Date().toISOString(), packagePath };
  let temporary;
  let user;
  let uid;
  let home;
  let runtime;
  let createdRuntime = false;
  let createdUser = false;
  let attemptedUserManager = false;
  let installed = false;
  let attemptedInstall = false;
  let ownedPackage = false;
  try {
    const release = await readFile('/etc/os-release', 'utf8');
    assert.match(release, /^ID=ubuntu$/m, 'Only Ubuntu is supported');
    assert.match(release, /^VERSION_ID="24\.04"$/m, 'This proof requires Ubuntu 24.04');
    await run('/usr/bin/sudo', ['-n', 'true']);
    const listing = await run('/usr/bin/snap', ['list', '--all']);
    assert.ok(!listing.stdout.split('\n').some(line => /^org-notes\s/.test(line)), 'Refusing pre-existing org-notes installation; nothing has been removed');
    assert.ok(!await exists('/snap/org-notes') && !await exists('/var/snap/org-notes'), 'Refusing stale org-notes host state; nothing has been removed');
    ownedPackage = true;
    const confinement = await run('/usr/bin/snap', ['debug', 'confinement']);
    assert.equal(confinement.stdout.trim(), 'strict', 'Host confinement is partial/unsupported; devmode cannot pass');
    const apparmor = await readFile('/sys/module/apparmor/parameters/enabled', 'utf8');
    assert.equal(apparmor.trim(), 'Y', 'AppArmor is not enabled');
    await run('/usr/bin/snap', ['debug', 'sandbox-features']);
    const yaml = await run('/usr/bin/unsquashfs', ['-cat', packagePath, 'meta/snap.yaml']);
    const metadata = JSON.parse((await run('/usr/bin/python3', ['-c', 'import json,sys,yaml; print(json.dumps(yaml.safe_load(sys.stdin.read())))'], { input: yaml.stdout })).stdout);
    const expectedVersion = JSON.parse(await readFile(path.join(path.dirname(script), '..', 'package.json'), 'utf8')).version;
    assert.match(expectedVersion, /^\d+\.\d+\.\d+$/);
    assert.equal(metadata.name, 'org-notes');
    assert.equal(String(metadata.version), expectedVersion, 'Package version differs from this checkout');
    assert.deepEqual(metadata.architectures, ['amd64']);
    assert.equal(metadata.confinement, 'strict');
    assert.equal(metadata.base, 'core24');
    assert.equal(metadata.apps?.['org-notes']?.command, 'bin/grain');
    report.package = { name: metadata.name, version: String(metadata.version), architectures: metadata.architectures,
      confinement: metadata.confinement, base: metadata.base, sha256: sha256(await readFile(packagePath)) };
    await json(path.join(artifacts, 'package-metadata.json'), metadata);
    attemptedInstall = true;
    await run('/usr/bin/sudo', ['-n', '/usr/bin/snap', 'install', '--dangerous', packagePath], { timeout: 8 * 60_000 });
    installed = true;
    const installedList = await run('/usr/bin/snap', ['list', 'org-notes']);
    const row = installedList.stdout.split('\n').find(line => /^org-notes\s/.test(line))?.trim().split(/\s+/);
    assert.ok(row && row[1] === expectedVersion, 'Installed Snap version does not match the built artifact');
    assert.ok(!row.at(-1).split(',').some(note => ['devmode', 'classic', 'jailmode', 'disabled', 'broken'].includes(note)), 'Installed Snap has unsafe/unsupported notes');
    const revision = await readlink('/snap/org-notes/current');
    assert.match(revision, /^(?:x)?\d+$/, 'Unexpected installed Snap revision');
    const installedYaml = await readFile(`/snap/org-notes/${revision}/meta/snap.yaml`, 'utf8');
    assert.equal(installedYaml, yaml.stdout, 'Installed metadata is not the provided package metadata');
    const backingPackage = `/var/lib/snapd/snaps/org-notes_${revision}.snap`;
    const backingHash = await run('/usr/bin/sudo', ['-n', '/usr/bin/sha256sum', backingPackage]);
    assert.equal(backingHash.stdout.split(/\s+/)[0], report.package.sha256, 'snapd installed different package bytes');
    await run('/usr/bin/snap', ['connections', 'org-notes']);
    const profiles = JSON.parse((await run('/usr/bin/sudo', ['-n', '/usr/sbin/aa-status', '--json'])).stdout);
    assert.equal(profiles.profiles?.['snap.org-notes.org-notes'], 'enforce', 'Installed Snap app profile is not enforcing');
    temporary = await mkdtemp(path.join(os.tmpdir(), 'org-notes-smoke-'));
    await chmod(temporary, 0o755);
    user = `orgsmoke-${randomBytes(6).toString('hex')}`;
    home = `/home/${user}`;
    assert.ok(!await exists(home), 'Refusing existing isolated-user home');
    await run('/usr/bin/sudo', ['-n', '/usr/sbin/useradd', '--create-home', '--user-group', '--shell', '/bin/bash', user]);
    createdUser = true;
    uid = Number((await run('/usr/bin/id', ['-u', user])).stdout.trim());
    assert.ok(Number.isInteger(uid) && uid >= 1000 && uid !== process.getuid(), 'Unexpected isolated user UID');
    const gid = Number((await run('/usr/bin/id', ['-g', user])).stdout.trim());
    assert.ok(Number.isInteger(gid) && gid >= 1000, 'Unexpected isolated user primary GID');
    const evidence = path.join(temporary, 'evidence');
    await mkdir(evidence);
    await chown(evidence, uid, gid).catch(async () => run('/usr/bin/sudo', ['-n', '/usr/bin/chown', `${uid}:${gid}`, evidence]));
    runtime = `/run/user/${uid}`;
    assert.ok(!await exists(runtime), 'Refusing a pre-existing runtime directory for the isolated UID');
    attemptedUserManager = true;
    await run('/usr/bin/sudo', ['-n', '/usr/bin/loginctl', 'enable-linger', user]);
    await until('the fresh user manager bus', async () => {
      const socket = await run('/usr/bin/sudo', ['-n', '/usr/bin/test', '-S', `${runtime}/bus`], { allowFailure: true });
      return socket.code === 0;
    });
    createdRuntime = true;
    const sessionScript = path.join(temporary, 'smoke.mjs');
    const sessionHelper = path.join(temporary, 'accessibility.py');
    await copyFile(script, sessionScript);
    await copyFile(helper, sessionHelper);
    const config = path.join(temporary, 'session.json');
    await json(config, { uid, home, evidence, helper: sessionHelper, executable: `/snap/org-notes/${revision}/bin/grain` });
    const sessionEnvironment = [`HOME=${home}`, `USER=${user}`, `LOGNAME=${user}`,
      'PATH=/usr/local/bin:/usr/bin:/bin:/snap/bin', 'LANG=C.UTF-8', `XDG_RUNTIME_DIR=${runtime}`,
      `DBUS_SESSION_BUS_ADDRESS=unix:path=${runtime}/bus`, 'ORG_NOTES_DISPOSABLE_HOST=1'];
    await run('/usr/bin/sudo', ['-n', '-u', user, '/usr/bin/env', '-i', ...sessionEnvironment,
      '/usr/bin/systemd-run', '--user', '--wait', '--pipe', '--collect', `--unit=org-notes-smoke-${user}`,
      '/usr/bin/env', '-i', ...sessionEnvironment, process.execPath, sessionScript, '--session', config],
      { timeout: 6 * 60_000 });
    const native = JSON.parse(await readFile(path.join(evidence, 'native-smoke.json'), 'utf8'));
    assert.equal(native.status, 'passed');
    report.native = native;
    report.status = 'passed';
  } catch (error) {
    report.error = error.stack ?? String(error);
  } finally {
    const cleanup = async (label, operation) => {
      try { await operation(); } catch (error) { (report.cleanupErrors ??= []).push(`${label}: ${error.message}`); report.status = 'failed'; }
    };
    if (ownedPackage) {
      await cleanup('capture snapd diagnostics', async () => {
        const since = `@${Math.floor(Date.parse(report.startedAt) / 1000)}`;
        await run('/usr/bin/sudo', ['-n', '/usr/bin/journalctl', '-u', 'snapd', '--since', since, '--no-pager'], { allowFailure: true });
        await run('/usr/bin/sudo', ['-n', '/usr/bin/journalctl', '-k', '--since', since, '--no-pager'], { allowFailure: true });
        if (uid !== undefined) await run('/usr/bin/sudo', ['-n', '/usr/bin/journalctl', `--since=${since}`,
          '--no-pager', `_UID=${uid}`], { allowFailure: true });
      });
    }
    if (createdRuntime) await cleanup('unmount only this session document-portal mount', async () => {
      const documentMount = path.join(runtime, 'doc');
      const mounts = (await readFile('/proc/self/mountinfo', 'utf8')).split('\n');
      const mounted = mounts.find(line => line.split(' ')[4] === documentMount);
      if (mounted) {
        assert.match(mounted, / - fuse\.portal /, 'Refusing to unmount an unexpected runtime filesystem');
        await run('/usr/bin/sudo', ['-n', '-u', user, '/usr/bin/fusermount3', '-u', documentMount], { timeout: 15_000 });
      }
    });
    if (attemptedUserManager) await cleanup('stop only the fresh user manager', async () => {
      await run('/usr/bin/sudo', ['-n', '/usr/bin/loginctl', 'disable-linger', user]);
      await run('/usr/bin/sudo', ['-n', '/usr/bin/systemctl', 'stop', `user@${uid}.service`, `user-runtime-dir@${uid}.service`]);
    });
    if (createdUser) await cleanup('stop isolated-user processes', async () => {
      await run('/usr/bin/sudo', ['-n', '/usr/bin/pkill', '-TERM', '-u', String(uid)], { allowFailure: true });
      await sleep(1000);
      await run('/usr/bin/sudo', ['-n', '/usr/bin/pkill', '-KILL', '-u', String(uid)], { allowFailure: true });
    });
    if (temporary) await cleanup('retain session evidence', async () => {
      const evidence = path.join(temporary, 'evidence');
      if (await exists(evidence)) await cp(evidence, path.join(artifacts, 'native'), { recursive: true });
    });
    if (ownedPackage && attemptedInstall) await cleanup('remove only this test installation', async () => {
      const list = await run('/usr/bin/snap', ['list', '--all']);
      if (list.stdout.split('\n').some(line => /^org-notes\s/.test(line))) {
        const revision = await readlink('/snap/org-notes/current');
        assert.match(revision, /^(?:x)?\d+$/);
        const checksum = await run('/usr/bin/sudo', ['-n', '/usr/bin/sha256sum', `/var/lib/snapd/snaps/org-notes_${revision}.snap`]);
        assert.equal(checksum.stdout.split(/\s+/)[0], report.package.sha256, 'Refusing to remove an installation not owned by this smoke');
        await run('/usr/bin/sudo', ['-n', '/usr/bin/snap', 'remove', '--purge', 'org-notes'], { timeout: 120_000 });
      }
    });
    if (createdRuntime && await exists(runtime)) await cleanup('remove only the created runtime directory', async () => {
      assert.equal((await lstat(runtime)).uid, uid);
      await run('/usr/bin/sudo', ['-n', '/usr/bin/rm', '-rf', '--', runtime]);
    });
    if (createdUser) await cleanup('remove only the created isolated user', async () => {
      const account = (await run('/usr/bin/getent', ['passwd', user])).stdout.trim().split(':');
      assert.equal(account[5], home);
      if (uid !== undefined) assert.equal(Number(account[2]), uid);
      await run('/usr/bin/sudo', ['-n', '/usr/sbin/userdel', '--remove', user]);
    });
    if (temporary) await cleanup('remove owned temporary files', async () => {
      const entry = await lstat(temporary);
      assert.ok(entry.isDirectory() && entry.uid === process.getuid(), 'Refusing changed temporary-directory ownership');
      if (process.getuid() === 0) await rm(temporary, { recursive: true, force: true });
      else await run('/usr/bin/sudo', ['-n', '/usr/bin/rm', '-rf', '--', temporary]);
    });
    report.installed = installed;
    report.completedAt = new Date().toISOString();
    await json(path.join(artifacts, 'report.json'), report);
  }
  if (report.status !== 'passed') throw new Error(`${report.error || 'Cleanup failed'}\nEvidence: ${artifacts}`);
  console.log(`PASS: org-notes ${report.package.version} amd64: same-package strict AppArmor/seccomp, visible Unicode/CRLF edit, explicit Save and full native restart. Evidence: ${artifacts}`);
}

try {
  if (process.argv[2] === '--session') await session(process.argv[3]);
  else await main();
} catch (error) {
  console.error(error.stack ?? error);
  process.exitCode = 1;
}
