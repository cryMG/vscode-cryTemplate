# vscode-crytpl examples

Open this folder in VS Code and verify:

- `01-interpolations.crytpl`: `{{ }}`, `{{= }}`, fallbacks `||` / `??`, filters with args, trim markers `-`/`~`, `{# #}` comments, `${...}` placeholders.
- `01-interpolations.crytpl`: `{{ }}`, `{{= }}`, fallbacks `||` / `??`, filters with args, trim markers `-`/`~`, `{# #}` comments.
- `02-control-flow.crytpl`: `{% if %}` / `{% elseif %}` / `{% else %}` / `{% endif %}`, comparisons, logical ops, `{% each ... as ... %}`.
- `03-injection-in-html.html`: injection highlighting for cryTemplate tokens inside plain HTML.
- `04-injection-in-markdown.md`: injection highlighting inside Markdown.
- `05-edge-cases.crytpl`: pipe-vs-OR and malformed tokens.
- `06-extension.crytemplate`: file association test for the `.crytemplate` extension.

Tip: use VS Code command “Developer: Inspect Editor Tokens and Scopes” to validate scopes.
