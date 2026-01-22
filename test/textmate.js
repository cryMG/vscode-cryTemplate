const fs = require('node:fs');
const path = require('node:path');

const oniguruma = require('vscode-oniguruma');
const vscodetm = require('vscode-textmate');

/**
 * @typedef {import('vscode-textmate').IGrammar} IGrammar
 */

const readWasm = async () => {
  const wasmPath = require.resolve('vscode-oniguruma/release/onig.wasm');
  return fs.promises.readFile(wasmPath);
};

const ensureOnigLib = async () => {
  const wasm = await readWasm();
  await oniguruma.loadWASM(wasm.buffer);
  return {
    createOnigScanner: (sources) => new oniguruma.OnigScanner(sources),
    createOnigString: (str) => new oniguruma.OnigString(str),
  };
};

/**
 * Creates a TextMate registry for tests.
 *
 * @param {{ grammarPathsByScopeName: Record<string, string>; injectionsByScopeName?: Record<string, string[]> }} opts
 */
const createRegistry = ({ grammarPathsByScopeName, injectionsByScopeName = {} }) => {
  const onigLib = ensureOnigLib();

  return new vscodetm.Registry({
    onigLib,
    loadGrammar: async (sn) => {
      const grammarPath = grammarPathsByScopeName[sn];
      if (!grammarPath) return null;
      const raw = await fs.promises.readFile(grammarPath, 'utf8');
      return vscodetm.parseRawGrammar(raw, grammarPath);
    },
    getInjections: (scopeName) => injectionsByScopeName[scopeName] ?? [],
  });
};

/**
 * Loads a TextMate grammar.
 *
 * @param {{ scopeName: string; grammarPath: string }} opts
 * @returns {Promise<IGrammar>}
 */
const loadGrammar = async ({ scopeName, grammarPath }) => {
  const onigLib = ensureOnigLib();

  const registry = new vscodetm.Registry({
    onigLib,
    loadGrammar: async (sn) => {
      if (sn !== scopeName) return null;
      const raw = await fs.promises.readFile(grammarPath, 'utf8');
      return vscodetm.parseRawGrammar(raw, grammarPath);
    },
  });

  const grammar = await registry.loadGrammar(scopeName);
  if (!grammar) {
    throw new Error(`Failed to load grammar ${scopeName} from ${path.basename(grammarPath)}`);
  }
  return grammar;
};

/**
 * Tokenizes lines using the provided grammar.
 *
 * @param {IGrammar} grammar
 * @param {string[]} lines
 * @returns {{ line: string; tokens: Array<{ startIndex: number; endIndex: number; scopes: string[] }> }[]}
 */
const tokenizeLines = (grammar, lines) => {
  let ruleStack = null;
  return lines.map((line) => {
    const res = grammar.tokenizeLine(line, ruleStack);
    ruleStack = res.ruleStack;
    const tokens = res.tokens.map((t) => ({
      startIndex: t.startIndex,
      endIndex: t.endIndex,
      scopes: t.scopes,
    }));
    return { line, tokens };
  });
};

module.exports = {
  createRegistry,
  loadGrammar,
  tokenizeLines,
};
