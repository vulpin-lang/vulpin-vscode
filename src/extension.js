'use strict';

const vscode = require('vscode');
const { COMMANDS, SYMBOLS, BUILTIN_FUNCS, MODULES, STRING_METHODS } = require('./vulpinDocs');

const INPUT_TYPES = {
  I: 'Integer (default `0` if invalid)',
  F: 'Float (default `0.0` if invalid)',
  N: 'Number, int or float (default `0` if invalid)',
  L: 'Single letter (default `""` if invalid)',
  W: 'Word, letters only (default `""` if invalid)',
  E: 'Lowercase only (default `""` if invalid)',
  U: 'Uppercase only (default `""` if invalid)',
  A: 'Letters + spaces (default `""` if invalid)',
  P: 'Alphanumeric + spaces (default `""` if invalid)',
};

function leadingCommandChar(lineText) {
  const match = /^\s*(\S)/.exec(lineText);
  return match ? { char: match[1], col: match.index + match[0].length - 1 } : null;
}

function mdHover(title, detail, doc) {
  const md = new vscode.MarkdownString();
  md.appendMarkdown(`**${title}**\n\n`);
  if (detail) md.appendCodeblock(detail, 'vul');
  if (doc) md.appendMarkdown(doc);
  md.isTrusted = true;
  return new vscode.Hover(md);
}

function registerHover(context) {
  const provider = vscode.languages.registerHoverProvider('vul', {
    provideHover(document, position) {
      const line = document.lineAt(position.line).text;
      const lead = leadingCommandChar(line);

      if (lead && position.character === lead.col && COMMANDS[lead.char]) {
        const c = COMMANDS[lead.char];
        return mdHover(c.title, c.detail, c.doc);
      }

      const charAt = line[position.character];
      if (charAt && SYMBOLS[charAt]) {
        const s = SYMBOLS[charAt];
        return mdHover(s.title, s.detail, s.doc);
      }
      const charBefore = line[position.character - 1];
      if (charBefore && SYMBOLS[charBefore] && (!charAt || !/[A-Za-z0-9_]/.test(charAt))) {
        const s = SYMBOLS[charBefore];
        return mdHover(s.title, s.detail, s.doc);
      }

      // K <var> "prompt" <TYPE>
      if (lead && lead.char === 'K') {
        const typeRange = document.getWordRangeAtPosition(position, /\b[IFNLWEUAP]\b/);
        if (typeRange && document.getText(typeRange).length === 1) {
          const t = document.getText(typeRange);
          if (INPUT_TYPES[t]) {
            return mdHover(`${t} — K input type`, null, INPUT_TYPES[t]);
          }
        }
      }

      // .U .L .S .T .C string method shortcuts
      const methodRange = document.getWordRangeAtPosition(position, /\.[A-Za-z]\b/);
      if (methodRange) {
        const letter = document.getText(methodRange).slice(1);
        if (STRING_METHODS[letter]) {
          const m = STRING_METHODS[letter];
          return mdHover(m.title, null, m.doc);
        }
      }

      // module.method (math.sqrt, os.getcwd, random.randint)
      const dotted = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*/);
      if (dotted) {
        const [mod, method] = document.getText(dotted).split('.');
        if (MODULES[mod] && MODULES[mod][method]) {
          return mdHover(`${mod}.${method}`, null, MODULES[mod][method]);
        }
      }

      // builtin functions
      const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
      if (wordRange) {
        const word = document.getText(wordRange);
        if (BUILTIN_FUNCS[word]) {
          const f = BUILTIN_FUNCS[word];
          return mdHover(f.title, null, f.doc);
        }
      }

      return null;
    },
  });
  context.subscriptions.push(provider);
}

function registerCompletion(context) {
  const provider = vscode.languages.registerCompletionItemProvider(
    'vul',
    {
      provideCompletionItems(document, position) {
        const linePrefix = document.lineAt(position.line).text.slice(0, position.character);

        if (/^\s*$/.test(linePrefix)) {
          const items = [];
          for (const [letter, c] of Object.entries(COMMANDS)) {
            const item = new vscode.CompletionItem(letter, vscode.CompletionItemKind.Keyword);
            item.detail = c.detail;
            item.documentation = new vscode.MarkdownString(c.doc);
            items.push(item);
          }
          for (const [sym, s] of Object.entries(SYMBOLS)) {
            const item = new vscode.CompletionItem(sym, vscode.CompletionItemKind.Operator);
            item.detail = s.detail;
            item.documentation = new vscode.MarkdownString(s.doc);
            items.push(item);
          }
          return items;
        }

        if (/\.$/.test(linePrefix)) {
          const modMatch = /([A-Za-z_][A-Za-z0-9_]*)\.$/.exec(linePrefix);
          const mod = modMatch && modMatch[1];
          const items = [];
          if (mod && MODULES[mod]) {
            for (const [method, doc] of Object.entries(MODULES[mod])) {
              const item = new vscode.CompletionItem(method, vscode.CompletionItemKind.Method);
              item.documentation = new vscode.MarkdownString(doc);
              items.push(item);
            }
            return items;
          }
          for (const [letter, m] of Object.entries(STRING_METHODS)) {
            const item = new vscode.CompletionItem(letter, vscode.CompletionItemKind.Property);
            item.detail = m.title;
            item.documentation = new vscode.MarkdownString(m.doc);
            items.push(item);
          }
          return items;
        }

        const items = [];
        for (const [name, f] of Object.entries(BUILTIN_FUNCS)) {
          const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Function);
          item.detail = f.title;
          item.documentation = new vscode.MarkdownString(f.doc);
          items.push(item);
        }
        return items;
      },
    },
    '.'
  );
  context.subscriptions.push(provider);
}

function getVulpinPath() {
  return vscode.workspace.getConfiguration('vulpin').get('path') || 'vulpin';
}

function getTerminal() {
  const existing = vscode.window.terminals.find((t) => t.name === 'Vulpin');
  return existing || vscode.window.createTerminal('Vulpin');
}

function runInTerminal(args, cwd) {
  const terminal = getTerminal();
  terminal.show();
  const vulpin = getVulpinPath();
  const quotedArgs = args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ');
  if (cwd) {
    terminal.sendText(`cd "${cwd}"`);
  }
  terminal.sendText(`${vulpin} ${quotedArgs}`.trim());
}

function activeVulFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'vul') {
    vscode.window.showErrorMessage('Vulpin: open a .vul file first.');
    return null;
  }
  editor.document.save();
  return editor.document;
}

function registerCommands(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('vulpin.runFile', () => {
      const doc = activeVulFile();
      if (!doc) return;
      runInTerminal([doc.fileName]);
    }),
    vscode.commands.registerCommand('vulpin.runFileDebug', () => {
      const doc = activeVulFile();
      if (!doc) return;
      runInTerminal(['--debug', doc.fileName]);
    }),
    vscode.commands.registerCommand('vulpin.buildProject', () => {
      const folder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
      runInTerminal(['build'], folder ? folder.uri.fsPath : undefined);
    }),
    vscode.commands.registerCommand('vulpin.showVersion', () => {
      runInTerminal(['version']);
    })
  );
}

function registerTaskProvider(context) {
  const taskProvider = vscode.tasks.registerTaskProvider('vulpin', {
    provideTasks: () => {
      const makeTask = (action, label, args) => {
        const def = { type: 'vulpin', action };
        const exec = new vscode.ShellExecution(`${getVulpinPath()} ${args.join(' ')}`.trim());
        const task = new vscode.Task(def, vscode.TaskScope.Workspace, label, 'vulpin', exec, []);
        task.problemMatchers = [];
        return task;
      };
      return [
        makeTask('run', 'Run File', ['${file}']),
        makeTask('debug', 'Run with Debug', ['--debug', '${file}']),
        makeTask('build', 'Build Project', ['build']),
        makeTask('version', 'Show Version', ['version']),
      ];
    },
    resolveTask: (task) => task,
  });
  context.subscriptions.push(taskProvider);
}

function activate(context) {
  registerHover(context);
  registerCompletion(context);
  registerCommands(context);
  registerTaskProvider(context);
}

function deactivate() {}

module.exports = { activate, deactivate };
