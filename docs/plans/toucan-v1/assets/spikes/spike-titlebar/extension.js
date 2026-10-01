const vscode = require('vscode');
const colors = ['🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛', '⬜'];
let i = 0;
function apply() {
  // Hijack the SCM-registered window-title variable ${activeRepositoryName}
  // (context key 'scmActiveRepositoryName', per window).
  vscode.commands.executeCommand('setContext', 'scmActiveRepositoryName', colors[i % colors.length]);
}
exports.activate = async (ctx) => {
  i = Math.abs(hash(vscode.workspace.name || 'x')) % colors.length;
  apply();
  ctx.subscriptions.push(vscode.commands.registerCommand('toucanSpike.cycle', () => { i++; apply(); }));
  ctx.subscriptions.push(vscode.commands.registerCommand('toucanSpike.red', () => {}));
  // SCM core rewrites the key whenever the active repo / branch changes: re-apply after it.
  const later = () => setTimeout(apply, 50);
  ctx.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(later), vscode.window.onDidChangeWindowState(later));
  const gitExt = vscode.extensions.getExtension('vscode.git');
  if (gitExt) {
    const git = (await gitExt.activate()).getAPI(1);
    const hook = (r) => ctx.subscriptions.push(r.state.onDidChange(later));
    git.repositories.forEach(hook);
    ctx.subscriptions.push(git.onDidOpenRepository((r) => { hook(r); later(); }), git.onDidCloseRepository(later));
    later();
  }
};
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }
