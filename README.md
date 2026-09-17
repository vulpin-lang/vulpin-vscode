# Vulpin for VS Code

Language support for [Vulpin](https://vulpin.fluxCast.dev), the tiny single-character-command scripting language, in Visual Studio Code.

## Features

- **Syntax highlighting** for `.vul` files (strings, comments, commands, control symbols, module calls, string-method shortcuts, numbers, operators).
- **Snippets** for the multi-line constructs (`if`/`ifelse`/`elif`, `while`, `loop`, `for`, `func`, `try`, `switch`, `input`, `label`, `jump`).
- **Hover docs & completions for the single-character commands** — since every Vulpin statement starts with a bare capital letter (`G`, `K`, `?`, `@`, `F`, `O`, `W`, `T`, ...), hovering or autocompleting one shows what it does, including `K`'s type-suffix letters and the `.U .L .S .T .C` string shortcuts. This also documents two commands (`X`, `E`) that aren't in the official README but exist in the interpreter.
- **Run / Build / Debug / Version commands**, mirroring the Sublime Text package's build variants:
  - `Vulpin: Run File` (also bound to <kbd>F5</kbd>, and the ▶ button in the editor toolbar for `.vul` files)
  - `Vulpin: Run with Debug` (`vulpin --debug <file>`)
  - `Vulpin: Build Project` (`vulpin build`)
  - `Vulpin: Show Version` (`vulpin version`)

  These are also available as VS Code tasks (`Terminal > Run Task... > vulpin`).

## Requirements

The `vulpin` executable must be on your `PATH`, or configured via the `vulpin.path` setting.

## Extension Settings

| Setting | Description | Default |
|---|---|---|
| `vulpin.path` | Path to the `vulpin` executable | `vulpin` |

## Example

```vul
name="Armin"
G"Hello"           # Prints with newline
P"Loading..."      # Prints without newline
G 5 + 3            # Prints 8
Gname              # Prints value of variable name
```

## License

MIT
