const vscode = require('vscode');
const HEX = '#e91e63';
function svgSwatch(hex, w = 120, h = 24) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="4" fill="${hex}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
function activate(ctx) {
  const tip = new vscode.MarkdownString(undefined, true);
  tip.supportHtml = true;
  tip.isTrusted = true;
  tip.appendMarkdown(`**Toucan** — repo color \`${HEX}\`\n\n`);
  tip.appendMarkdown(`span: <span style="color:${HEX};">$(circle-large-filled) colored text ████</span>\n\n`);
  tip.appendMarkdown(`bg: <span style="color:#ffffff;background-color:${HEX};display:inline-block;border-radius:4px;">&nbsp;&nbsp;my-repo&nbsp;&nbsp;</span>\n\n`);
  tip.appendMarkdown(`svg: ![swatch](${svgSwatch(HEX)})\n\n`);
  tip.appendMarkdown(`[Change color](command:workbench.action.showCommands)`);
  const variants = [
    ['maxprio', '$(circle-large-filled)', Number.MAX_VALUE],
    ['custom-pill', '$(toucan-pill)', 100000.9],
    ['custom-pill-name', '$(toucan-bar) my-repo', 100000.8],
    ['custom-square', '$(toucan-square) my-repo', 100000.7],
    ['blocks', '████', 100000],
    ['geom', '⬤ ■ ▇▇ ◼', 99999.5],
    ['dots', '$(circle-large-filled)$(circle-large-filled)$(circle-large-filled)', 99999.4],
    ['halfblock', '▐█▌ my-repo', 99999],
    ['codicon-circle', '$(circle-large-filled) my-repo', 99998],
    ['codicon-stop', '$(debug-stop)$(debug-stop) $(primitive-square) my-repo', 99997],
    ['record', '$(record) $(heart-filled) $(star-full)', 99996],
    ['name', '$(repo) my-repo', 99995],
  ];
  for (const [id, text, prio] of variants) {
    const it = vscode.window.createStatusBarItem('toucan.' + id, vscode.StatusBarAlignment.Left, prio);
    it.name = 'Toucan ' + id; if (id==='name') it.command='toucan.spike.showHover'; it.text = text; it.color = HEX; it.tooltip = tip;
    it.accessibilityInformation = { label: `Repository color ${HEX} for my-repo`, role: 'button' };
    it.show(); ctx.subscriptions.push(it);
  }
  // background attempts
  const bad = vscode.window.createStatusBarItem('toucan.bg-hex', vscode.StatusBarAlignment.Left, 99990);
  bad.text = 'bg:hex?'; bad.backgroundColor = HEX; bad.show(); ctx.subscriptions.push(bad);
  const prom = vscode.window.createStatusBarItem('toucan.bg-prominent', vscode.StatusBarAlignment.Left, 99989);
  prom.text = 'bg:prominent?'; prom.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground'); prom.show(); ctx.subscriptions.push(prom);
  const err = vscode.window.createStatusBarItem('toucan.bg-error', vscode.StatusBarAlignment.Left, 99988);
  err.text = 'bg:error'; err.color = HEX; err.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground'); err.show(); ctx.subscriptions.push(err);
  console.log('TOUCAN bg-hex readback:', String(bad.backgroundColor), 'prominent readback:', prom.backgroundColor && prom.backgroundColor.id);
  ctx.subscriptions.push(vscode.commands.registerCommand('toucan.spike.showHover', () => {}));
}
module.exports = { activate };
