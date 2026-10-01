const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');
const LOG = process.env.SPIKE_LOG || path.join(os.tmpdir(), 'tsp-log.txt');
const CMD_DIR = process.env.SPIKE_CMD_DIR || path.join(os.tmpdir(), 'tsp-cmd');
const t0 = Date.now();
let tag = 'w?';
function log(ev, extra = {}) {
  const line = JSON.stringify({ t: Date.now() - t0, ts: new Date().toISOString().slice(11, 23), win: tag, ev, ...extra });
  fs.appendFileSync(LOG, line + '\n');
}

let toucanView, otherView, probeView;
let mode = 'algo'; // 'algo' | 'log'
let lastFocused;
let openedByToucan = false;
let suppressUntil = 0;

function state() {
  return {
    toucanVisible: toucanView ? toucanView.visible : null,
    otherVisible: otherView ? otherView.visible : null,
    probeVisible: probeView ? probeView.visible : null,
    focused: vscode.window.state.focused,
    active: vscode.window.state.active,
    openedByToucan,
  };
}

class Provider {
  constructor(name, color) { this.name = name; this.color = color; }
  resolveWebviewView(view) {
    if (this.name === 'toucan') toucanView = view; else otherView = view;
    view.webview.html = `<html><body style="background:${this.color};color:#fff;font:20px sans-serif;display:flex;align-items:center;justify-content:center;height:90vh">${this.name}</body></html>`;
    log('resolve', { view: this.name, ...state() });
    view.onDidChangeVisibility(() => log('visibility', { view: this.name, ...state() }));
    view.onDidDispose(() => { log('dispose', { view: this.name }); if (this.name === 'toucan') toucanView = undefined; else otherView = undefined; });
  }
}

async function onBlur() {
  const before = state();
  if (mode !== 'algo') return log('blur(log-only)', before);
  if (toucanView && toucanView.visible) {
    openedByToucan = false;
    return log('blur: toucan already visible -> leave alone', before);
  }
  await vscode.commands.executeCommand('toucanSpike.block.focus', { preserveFocus: true });
  openedByToucan = true;
  log('blur: revealed', { before, after: state() });
  setTimeout(() => log('blur: +300ms', state()), 300);
}

async function onFocus() {
  const before = state();
  if (mode !== 'algo') return log('focus(log-only)', before);
  if (openedByToucan && toucanView && toucanView.visible) {
    openedByToucan = false;
    await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
    log('focus: closed aux bar', { before, after: state() });
    setTimeout(() => log('focus: +300ms', state()), 300);
  } else {
    log('focus: leave alone', before);
    openedByToucan = false;
  }
}

function activate(ctx) {
  tag = 'w' + process.pid;
  log('activate', { ...state(), workspace: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath, sessionId: vscode.env.sessionId });
  lastFocused = vscode.window.state.focused;
  ctx.subscriptions.push(vscode.window.registerWebviewViewProvider('toucanSpike.block', new Provider('toucan', '#d35400')));
  ctx.subscriptions.push(vscode.window.registerWebviewViewProvider('otherSpike.view', new Provider('other', '#2c3e50')));
  probeView = vscode.window.createTreeView('toucanSpike.probe', { treeDataProvider: { getChildren: () => ['probe'], getTreeItem: (e) => new vscode.TreeItem(e) } });
  probeView.onDidChangeVisibility(e => log('probe visibility', { visible: e.visible, ...state() }));
  ctx.subscriptions.push(probeView);

  ctx.subscriptions.push(vscode.window.onDidChangeWindowState(async (ws) => {
    const transition = ws.focused !== lastFocused;
    log('windowState', { focused: ws.focused, active: ws.active, realFocusTransition: transition, ...state() });
    if (!transition) return;
    lastFocused = ws.focused;
    if (ws.focused) await onFocus(); else await onBlur();
  }));

  // file-based command channel: write "<cmdId> [jsonArg]" or "mode algo|log" into CMD_DIR/<pid>.cmd or CMD_DIR/all.cmd
  fs.mkdirSync(CMD_DIR, { recursive: true });
  const timer = setInterval(async () => {
    for (const f of [`${CMD_DIR}/${process.pid}.cmd`, `${CMD_DIR}/all.cmd`]) {
      if (!fs.existsSync(f)) continue;
      const txt = fs.readFileSync(f, 'utf8').trim();
      if (f.endsWith(`${process.pid}.cmd`)) fs.unlinkSync(f);
      else { const seen = `${CMD_DIR}/all.seen.${process.pid}`; const prev = fs.existsSync(seen) ? fs.readFileSync(seen, 'utf8') : ''; if (prev === txt) continue; fs.writeFileSync(seen, txt); }
      for (const line of txt.split('\n')) {
        const [cmd, ...rest] = line.trim().split(' ');
        if (!cmd) continue;
        try {
          if (cmd === 'mode') { mode = rest[0]; log('mode', { mode }); continue; }
          if (cmd === 'state') { log('state', state()); continue; }
          if (cmd === 'reset') { openedByToucan = false; log('reset', state()); continue; }
          const arg = rest.length ? JSON.parse(rest.join(' ')) : undefined;
          const r = await vscode.commands.executeCommand(cmd, arg);
          log('ran', { cmd, arg, result: r === undefined ? undefined : String(r).slice(0, 200), ...state() });
        } catch (e) { log('cmd error', { cmd, error: String(e) }); }
      }
    }
  }, 200);
  ctx.subscriptions.push({ dispose: () => clearInterval(timer) });
}
module.exports = { activate, deactivate() { log('deactivate'); } };
