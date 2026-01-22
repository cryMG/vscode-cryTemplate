const path = require('node:path');

const { expect } = require('chai');

const { createRegistry, loadGrammar, tokenizeLines } = require('./textmate');

const grammarPathMain = path.resolve(__dirname, '..', 'syntaxes', 'crytemplate.tmLanguage.json');
const grammarPathInject = path.resolve(__dirname, '..', 'syntaxes', 'crytemplate.injection.tmLanguage.json');

const grammarPathHtmlStub = path.resolve(__dirname, 'fixtures', 'text.html.basic.tmLanguage.json');
const grammarPathMarkdownStub = path.resolve(__dirname, 'fixtures', 'text.html.markdown.tmLanguage.json');

const flattenScopes = (tokens) => Array.from(new Set(tokens.flatMap((t) => t.scopes)));
const hasScope = (tokens, needle) => flattenScopes(tokens).some((s) => s === needle || s.endsWith(`.${needle}`));

const tokenHasScope = (token, scope) => token.scopes.some((s) => s === scope || s.endsWith(`.${scope}`));

describe('cryTemplate grammars', () => {
  it('loads main grammar', async () => {
    const g = await loadGrammar({ scopeName: 'source.crytemplate', grammarPath: grammarPathMain });
    expect(g).to.be.ok;
  });

  it('loads injection grammar', async () => {
    const g = await loadGrammar({ scopeName: 'source.crytemplate.injection', grammarPath: grammarPathInject });
    expect(g).to.be.ok;
  });

  it('comment ends are recognized (no bleed)', async () => {
    const g = await loadGrammar({ scopeName: 'source.crytemplate', grammarPath: grammarPathMain });

    const line = '{# comment #}<p>x</p>';
    const lines = tokenizeLines(g, [line]);

    const { tokens } = lines[0];
    expect(flattenScopes(tokens)).to.include('comment.block.crytemplate');

    const commentEndIndex = line.indexOf('#}') + 2;
    const tokensAfterComment = tokens.filter((t) => t.startIndex >= commentEndIndex);
    expect(tokensAfterComment.length).to.be.greaterThan(0);
    expect(tokensAfterComment.some((t) => tokenHasScope(t, 'comment.block.crytemplate'))).to.equal(false);
  });

  it('unterminated comment/control/interp do not bleed into next line', async () => {
    const g = await loadGrammar({ scopeName: 'source.crytemplate', grammarPath: grammarPathMain });

    const lines = tokenizeLines(g, [
      '{# unterminated',
      '<p>next</p>',
      '{% unterminated',
      '<p>next2</p>',
      '{{ unterminated',
      '<p>next3</p>',
    ]);

    // The HTML lines must not be tokenized as comments/controls/interpolations.
    expect(hasScope(lines[1].tokens, 'comment.block.crytemplate')).to.equal(false);
    expect(hasScope(lines[3].tokens, 'comment.block.crytemplate')).to.equal(false);
    expect(hasScope(lines[5].tokens, 'comment.block.crytemplate')).to.equal(false);

    // They should still be HTML
    // (We don't assert embedded HTML scopes here because we don't load VS Code's built-in HTML grammar in tests.)
  });

  it('pipe vs logical OR is distinguished in interpolations', async () => {
    const g = await loadGrammar({ scopeName: 'source.crytemplate', grammarPath: grammarPathMain });

    const [l1, l2] = tokenizeLines(g, [
      '{{ a || b }}',
      '{{ a | upper || b }}',
    ]);

    const scopes1 = flattenScopes(l1.tokens);
    expect(scopes1).to.include('keyword.operator.logical.crytemplate');
    expect(scopes1).to.not.include('keyword.operator.pipe.crytemplate');

    const scopes2 = flattenScopes(l2.tokens);
    expect(scopes2).to.include('keyword.operator.pipe.crytemplate');
    expect(scopes2).to.include('keyword.operator.logical.crytemplate');
  });

  it('escaped quotes in strings do not terminate early', async () => {
    const g = await loadGrammar({ scopeName: 'source.crytemplate', grammarPath: grammarPathMain });

    const [l] = tokenizeLines(g, [
      "{% if user.name == 'A\\'B' %}ok{% endif %}",
    ]);

    const scopes = flattenScopes(l.tokens);
    expect(scopes).to.include('string.quoted.single.crytemplate');
    expect(scopes).to.include('keyword.control.crytemplate');
  });

  it('injects cryTemplate tokens into HTML (via injection grammar)', async () => {
    const registry = createRegistry({
      grammarPathsByScopeName: {
        'text.html.basic': grammarPathHtmlStub,
        'source.crytemplate.injection': grammarPathInject,
      },
      injectionsByScopeName: {
        'text.html.basic': ['source.crytemplate.injection'],
      },
    });

    const htmlGrammar = await registry.loadGrammar('text.html.basic');
    expect(htmlGrammar).to.be.ok;

    const [l] = tokenizeLines(htmlGrammar, ['<p>{# c #} {{= raw }} {{ v | upper }}</p>']);
    const scopes = flattenScopes(l.tokens);

    expect(scopes).to.include('comment.block.crytemplate');
    expect(scopes).to.include('meta.embedded.block.crytemplate.interpolation');
    expect(scopes).to.include('keyword.operator.pipe.crytemplate');
  });

  it('injects cryTemplate tokens into Markdown (via injection grammar)', async () => {
    const registry = createRegistry({
      grammarPathsByScopeName: {
        'text.html.markdown': grammarPathMarkdownStub,
        'source.crytemplate.injection': grammarPathInject,
      },
      injectionsByScopeName: {
        'text.html.markdown': ['source.crytemplate.injection'],
      },
    });

    const mdGrammar = await registry.loadGrammar('text.html.markdown');
    expect(mdGrammar).to.be.ok;

    const [l] = tokenizeLines(mdGrammar, ['Text {# note #} {{ value ?? fallback }}']);
    const scopes = flattenScopes(l.tokens);

    expect(scopes).to.include('comment.block.crytemplate');
    expect(scopes).to.include('keyword.operator.logical.crytemplate');
    expect(scopes).to.include('meta.embedded.block.crytemplate.interpolation');
  });
});
