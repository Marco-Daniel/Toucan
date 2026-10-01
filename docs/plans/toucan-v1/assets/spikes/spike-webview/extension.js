// Toucan spike: per-window colour surfaces without writing colorCustomizations.
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const COLOUR = '#e91e63';
const LOG = path.join(__dirname, '..', 'spike-wv-events.log');
const log = (m) => fs.appendFileSync(LOG, `${new Date().toISOString()} pid=${process.pid} ${m}\n`);

function swatchHtml(colour) {
  // No scripts needed: colour is baked in; re-set webview.html to change it.
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<style>html,body{margin:0;padding:0;height:100%;width:100%;background:${colour};}</style>
</head><body></body></html>`;
}

class SwatchProvider {
  constructor(name) { this.name = name; this.view = undefined; }
  resolveWebviewView(view) {
    this.view = view;
    view.webview.options = { enableScripts: false };
    view.webview.html = swatchHtml(COLOUR);
    log(`resolveWebviewView ${this.name} visible=${view.visible}`);
    view.onDidChangeVisibility(() => log(`${this.name} visible=${view.visible}`));
  }
}

function svgUri(colour, w, h) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${colour}"/></svg>`;
  return vscode.Uri.parse(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
}

function activate(context) {
  log('activate');
  const aux = new SwatchProvider('aux');
  const strip = new SwatchProvider('explorerStrip');
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('toucan.swatch', aux, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.window.registerWebviewViewProvider('toucan.explorerStrip', strip),
  );

  // Tree view with a coloured SVG icon (arbitrary colour, data URI).
  const tree = vscode.window.createTreeView('toucan.tree', {
    treeDataProvider: {
      getChildren: () => ['w'],
      getTreeItem: () => {
        const item = new vscode.TreeItem('Toucan window colour');
        item.iconPath = svgUri(COLOUR, 16, 16);
        item.description = COLOUR;
        return item;
      },
    },
  });
  context.subscriptions.push(tree);
  tree.badge = { value: 1, tooltip: 'badge colour is theme-controlled' };

  // Editor decorations: overview-ruler full lane + 3px left border + gutter bar.
  const deco = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    overviewRulerColor: COLOUR,
    overviewRulerLane: vscode.OverviewRulerLane.Full,
    borderColor: COLOUR,
    borderStyle: 'solid',
    borderWidth: '0 0 0 3px',
    gutterIconPath: svgUri(COLOUR, 4, 40),
    gutterIconSize: 'contain',
  });
  context.subscriptions.push(deco);
  const paint = (editors) => {
    for (const ed of editors) {
      const last = Math.max(0, ed.document.lineCount - 1);
      ed.setDecorations(deco, [new vscode.Range(0, 0, last, 0)]);
    }
  };
  paint(vscode.window.visibleTextEditors);
  context.subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(paint));

  // Status bar: text colour accepts arbitrary CSS colour (background does not).
  const sb = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10000);
  sb.text = '$(circle-filled) Toucan';
  sb.color = COLOUR;
  sb.show();
  context.subscriptions.push(sb);

  // Reveal the aux-sidebar view WITHOUT stealing focus.
  vscode.commands.executeCommand('toucan.swatch.focus', { preserveFocus: true })
    .then(() => log('revealed aux (preserveFocus)'), (e) => log('reveal error ' + e));

  for (const id of ['toucan.explorerStrip', 'toucan.tree']) {
    vscode.commands.executeCommand(id + '.focus', { preserveFocus: true })
      .then(() => log('revealed ' + id), (e) => log('reveal error ' + id + ' ' + e));
  }
  log(`initial windowState focused=${vscode.window.state.focused} active=${vscode.window.state.active}`);
  context.subscriptions.push(vscode.window.onDidChangeWindowState((s) =>
    log(`onDidChangeWindowState focused=${s.focused} active=${s.active}`)));
}

module.exports = { activate, deactivate() {} };
