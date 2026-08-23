const fs = require('node:fs');
const path = require('node:path');
const p = path.resolve(__dirname, '..', 'lib', 'client.js');
let c = fs.readFileSync(p, 'utf8');

// 1. takeover receipt delivery
const old1 = 'finishTask(task, "taken-over", "人工已接管该会话，自动回执省略");\n\t\t\t\t\tcontinue;';
const new1 = [
  'finishTask(task, "taken-over", "人工接管：结果以该会话为准");',
  '\t\t\t\t\tif (state.config.reportTakeover !== false) {',
  '\t\t\t\t\t\tconst cmdFace = runtime.sessions.binding(task.commanderId)?.session;',
  '\t\t\t\t\t\tif (cmdFace !== undefined) {',
  '\t\t\t\t\t\t\ttry { await cmdFace.prompt([{ type: "text", text: "[指挥官回执 · " + (task.alias || task.workerTitle || task.workerId) + "]\\n状态：人工已接管，插件不再自动跟进度。" }], "queue"); } catch {}',
  '\t\t\t\t\t\t}',
  '\t\t\t\t\t}',
  '\t\t\t\t\tcontinue;',
].join('\n');
c = c.replace(old1, new1);

// 2. worker mail blocks
const old2 = 'if ((data.humanMessages ?? 0) > 0) {';
const new2 = [
  'const wMails = (data.events ?? []).flatMap((event) => parseMailBlocks(event.text));',
  '\t\t\t\tif (wMails.length > 0) {',
  '\t\t\t\t\tconst cmdRecord = state.commanders.get(task.commanderId);',
  '\t\t\t\t\tif (cmdRecord !== undefined) await deliverMailFromBlocks(cmdRecord, task.workerId, wMails);',
  '\t\t\t\t}',
  '\t\t\t\tif ((data.humanMessages ?? 0) > 0) {',
].join('\n');
c = c.replace(old2, new2);

fs.writeFileSync(p, c);
console.log('takeover:', c.includes('reportTakeover !== false'), '| worker mail:', c.includes('wMails'));
