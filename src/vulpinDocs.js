// Reference data for Vulpin's single-character commands, driven off the
// actual parser/VM (src/parser.c, src/vm.c in the vulpin-lang/Vulpin repo),
// not just the README — a couple of these (E, X) aren't documented there.
'use strict';

const COMMANDS = {
  G: { title: 'G — Print (newline)', detail: 'G <expr>', doc: 'Prints the value of an expression followed by a newline.\n\n```vul\nG "Hello World!"\nG 5 + 3        # 8\nG name         # prints variable `name`\n```' },
  P: { title: 'P — Print (no newline)', detail: 'P <expr>', doc: 'Prints the value of an expression without a trailing newline.\n\n```vul\nP "Loading..."\n```' },
  K: { title: 'K — Input', detail: 'K [var] "prompt" [type]', doc: 'Reads a line from stdin into `var`, showing an optional prompt, coerced to an optional type letter (default value on invalid input):\n\n| Char | Type | Default |\n|---|---|---|\n| I | Integer | 0 |\n| F | Float | 0.0 |\n| N | Number (int/float) | 0 |\n| L | Single letter | "" |\n| W | Word (letters only) | "" |\n| E | Lowercase only | "" |\n| U | Uppercase only | "" |\n| A | Letters + spaces | "" |\n| P | Alphanumeric + spaces | "" |\n\n```vul\nK age "Age: " I\n```' },
  A: { title: 'A — Compound assign (arithmetic)', detail: 'A"var" <op> <expr>', doc: 'Applies an operator to a variable in place: `var = var <op> expr`.\n\n```vul\nA"x"+5     # x = x + 5\n```' },
  S: { title: 'S — String replace', detail: 'S"var""from""to"', doc: 'Replaces all occurrences of a substring inside the string variable `var`, in place.\n\n```vul\nS"name""Vul""VUL"\n```' },
  D: { title: 'D — Delay / Delete', detail: 'D<seconds>  or  D"varname"', doc: 'Two meanings depending on the argument:\n- `D 1` / `D 0.5` / `D delay` — sleep for that many seconds.\n- `D"y"` — delete variable `y`.\n\n```vul\nD1          # wait 1 second\nD"y"        # delete variable y\n```' },
  Q: { title: 'Q — Quit', detail: 'Q', doc: 'Exits the program immediately (exit code 0).' },
  X: { title: 'X — Raise error and exit', detail: 'X <expr>', doc: '**Undocumented in the README.** Prints `Error: <expr>` to stderr and exits with code 1. Not the same as `T/C/Y` try/catch — this is unconditional/fatal.' },
  E: { title: 'E — Explicit assign', detail: 'E name [=] expr', doc: '**Undocumented in the README.** An alternate, explicit form of assignment: `E name = expr` (the `=` is optional). Plain `name=expr` without a leading command letter works identically and is what the README shows.' },
  U: { title: 'U — Import', detail: 'U"module"', doc: 'Imports a built-in module (`math`, `os`, `random`) or another `.vul` file by name.\n\n```vul\nU"math"\nG math.sqrt(16)\n```' },
  F: { title: 'F — Function definition', detail: 'F name(params)', doc: 'Begins a function definition, closed by `~`.\n\n```vul\nF add(a, b)\n    R a + b\n~\n```' },
  R: { title: 'R — Return', detail: 'R [expr]', doc: 'Returns from the current function, optionally with a value.' },
  T: { title: 'T — Try', detail: 'T', doc: 'Begins a try block. Pair with `C"err"` (catch) and `Y` (end try).' },
  C: { title: 'C — Catch', detail: 'C"err"', doc: 'Begins the catch block for the preceding `T`; binds the error message to variable `err`.' },
  Y: { title: 'Y — End try', detail: 'Y', doc: 'Closes a `T ... C ... Y` try/catch block.' },
  W: { title: 'W — Switch', detail: 'W <expr>', doc: 'Begins a switch on the value of `expr`. Pair with `V` (case), `N` (default), `Z` (end switch).' },
  V: { title: 'V — Case', detail: 'V <expr>', doc: 'A case label inside a `W` switch block; matches when equal to the switch value.' },
  N: { title: 'N — Default case', detail: 'N', doc: 'The default case inside a `W` switch block, taken when no `V` case matched.' },
  Z: { title: 'Z — End switch', detail: 'Z', doc: 'Closes a `W ... Z` switch block.' },
  L: { title: 'L — Label', detail: 'L name', doc: 'Defines a jump target for `J`.' },
  J: { title: 'J — Jump', detail: 'J name', doc: 'Jumps unconditionally to the label `name`. Also usable inline after a condition: `? cond J label`.' },
  O: { title: 'O — For-range loop', detail: 'O var start end [step]', doc: 'Loops `var` from `start` up to (but excluding) `end`, incrementing by `step` (default 1, may be negative). Closed by `&`.\n\n```vul\nO i 0 5      # 0,1,2,3,4\n    G i\n&\n```' },
};

const SYMBOLS = {
  '?': { title: '? — If', detail: '? <condition>', doc: 'Begins an if-block, closed by `;`. Optionally followed by `J label` to jump instead of running an inline block: `? x > 3 J skip`.\n\nChain elses with `:`:\n```vul\n? score >= 90\n    G"A"\n:\n    G"C"\n;\n```' },
  ':': { title: ': — Else', detail: ':', doc: 'Else branch of the nearest open `?` if-block. `:? cond` chains an else-if.' },
  ';': { title: '; — End if', detail: ';', doc: 'Closes a `?` if-block (and its `:` else, if present).' },
  '@': { title: '@ — While', detail: '@ <condition>', doc: 'Begins a while-loop, closed by `&`. `@1` is an infinite loop.\n\n```vul\n@ i < 5\n    G i\n    i=i+1\n&\n```' },
  '&': { title: '& — End loop', detail: '&', doc: 'Closes the nearest open `@` while-loop or `O` for-range loop.' },
  '~': { title: '~ — End function', detail: '~', doc: 'Closes an `F` function definition.' },
  '$': { title: '$ — Explicit variable reference', detail: '$name', doc: 'Explicitly dereferences a variable in an expression. Mainly useful inside recursive function calls where a bare name could be ambiguous:\n\n```vul\nR n*factorial($n-1)\n```' },
};

const BUILTIN_FUNCS = {
  len: { title: 'len(x)', doc: 'Length of a List, Dict, Set, or Str.' },
  push: { title: 'push(list, value)', doc: 'Appends `value` to `list` in place (mutates). Returns nothing.' },
  pop: { title: 'pop(list)', doc: 'Removes and returns the last item of `list`. Errors if the list is empty.' },
  keys: { title: 'keys(dict)', doc: 'Returns a List of a Dict\'s keys.' },
  values: { title: 'values(dict)', doc: 'Returns a List of a Dict\'s values.' },
};

const MODULES = {
  math: {
    sqrt: 'math.sqrt(x) — square root (Float)',
    pi: 'math.pi — the constant π (Float)',
    e: 'math.e — the constant e (Float)',
    floor: 'math.floor(x) — round down to Int',
    ceil: 'math.ceil(x) — round up to Int',
    abs: 'math.abs(x) — absolute value',
  },
  os: {
    name: 'os.name — "posix" or "nt"',
    getcwd: 'os.getcwd() — current working directory (Str)',
    system: 'os.system(cmd) — run a shell command, returns its exit code',
  },
  random: {
    randint: 'random.randint(a, b) — random Int in [a, b] inclusive',
  },
};

const STRING_METHODS = {
  U: { title: '.U — upper()', doc: '`"hello".U` → `"HELLO"`' },
  L: { title: '.L — lower()', doc: '`"HELLO".L` → `"hello"`' },
  S: { title: '.S — strip()', doc: '`" hi ".S` → `"hi"`' },
  T: { title: '.T — title()', doc: '`"hi there".T` → `"Hi There"`' },
  C: { title: '.C — capitalize()', doc: '`"hello".C` → `"Hello"`' },
};

module.exports = { COMMANDS, SYMBOLS, BUILTIN_FUNCS, MODULES, STRING_METHODS };
