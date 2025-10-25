// assets/js/terms-highlight.js
(() => {
  // ログ出力（必要なら消してOK）
  const dbg = (...a) => { /* console.debug('[terms]', ...a); */ };

  // GLOSSARY の存在チェック
  if (!window.GLOSSARY || typeof window.GLOSSARY !== 'object') {
    console.error('[terms-highlight] window.GLOSSARY が未定義です。glossary.js を先に読み込んでください。');
    return;
  }
  const G = window.GLOSSARY;

  // ヘルパー
  const esc = (s) => (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function buildTerms() {
    try {
      const list = Object.entries(G).map(([k, v]) => {
        const title = (v && (v.title || k)) || k;
        let re;
        if (v && v.pattern) {
          try { re = new RegExp(v.pattern, 'g'); }
          catch (e) { console.warn('[terms] 無効なpatternを無視:', k, v.pattern, e); re = new RegExp(esc(title), 'g'); }
        } else {
          re = new RegExp(esc(title), 'g');
        }
        return { key: k, re, length: title.length };
      });
      // 長い語優先（短い語の誤爆を防ぐ）
      list.sort((a, b) => b.length - a.length);
      return list;
    } catch (e) {
      console.error('[terms-highlight] buildTerms エラー:', e);
      return [];
    }
  }

  function highlight(root) {
    const terms = buildTerms();
    if (!terms.length) return;

    // TreeWalker（未対応環境はスキップ）
    if (!window.TreeWalker || !window.NodeFilter) {
      console.warn('[terms-highlight] TreeWalker 未対応環境のためスキップ');
      return;
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node || !node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName;
        if (p.closest('.gloss-term') || p.closest('a') || tag === 'SCRIPT' || tag === 'STYLE') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((textNode) => {
      try {
        const original = textNode.nodeValue;
        const frags = [original];
        let replaced = false;

        terms.forEach(({ key, re }) => {
          for (let i = 0; i < frags.length; i++) {
            const chunk = frags[i];
            if (typeof chunk !== 'string') continue;
            re.lastIndex = 0;
            if (!re.test(chunk)) continue;

            const parts = [];
            let last = 0;
            re.lastIndex = 0;
            let m;
            while ((m = re.exec(chunk))) {
              const before = chunk.slice(last, m.index);
              if (before) parts.push(before);

              const span = document.createElement('span');
              span.className = 'gloss-term';
              span.dataset.key = key;
              span.textContent = m[0];

              parts.push(span);
              last = m.index + m[0].length;
            }
            const after = chunk.slice(last);
            if (after) parts.push(after);

            frags.splice(i, 1, ...parts);
            i += parts.length - 1;
            replaced = true;
          }
        });

        if (replaced) {
          const frag = document.createDocumentFragment();
          frags.forEach((p) => frag.appendChild(typeof p === 'string' ? document.createTextNode(p) : p));
          textNode.parentNode.replaceChild(frag, textNode);
        }
      } catch (e) {
        console.error('[terms-highlight] ノード置換でエラー:', e);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('#article') || document.body;
    highlight(root);
  });
})();
