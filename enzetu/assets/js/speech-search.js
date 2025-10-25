// 本文内検索（ハイライト＆前後移動）
// 依存: #article, #sTerm, #btnPrev, #btnNext, #sCount（存在しない時は何もしない）
// glossary.js の後に読み込むこと

(() => {
  const ready = (fn) =>
    document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn);

  ready(() => {
    const root = document.querySelector('#article');
    const input = document.getElementById('sTerm');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const counter = document.getElementById('sCount');

    if (!root || !input || !btnPrev || !btnNext || !counter) return;

    let hits = [];
    let idx = -1;

    const isSkippable = (el) => el.closest('.gloss-tooltip') || el.tagName === 'SCRIPT' || el.tagName === 'STYLE';

    const clearHighlights = () => {
      const marks = root.querySelectorAll('mark.hl');
      marks.forEach(m => {
        const p = m.parentNode;
        while (m.firstChild) p.insertBefore(m.firstChild, m);
        p.removeChild(m);
        p.normalize && p.normalize();
      });
      hits = [];
      idx = -1;
      counter.textContent = '';
    };

    const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const highlightAll = (term) => {
      clearHighlights();
      if (!term) return 0;
      const re = new RegExp(escapeReg(term), 'gi');

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          if (!node.parentElement || isSkippable(node.parentElement)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);

      nodes.forEach(node => {
        const text = node.nodeValue;
        if (!re.test(text)) return;

        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        text.replace(re, (match, offset) => {
          if (offset > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, offset)));
          const mark = document.createElement('mark');
          mark.className = 'hl';
          mark.textContent = match;
          frag.appendChild(mark);
          lastIdx = offset + match.length;
        });
        if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        node.parentNode.replaceChild(frag, node);
      });

      hits = Array.from(root.querySelectorAll('mark.hl'));
      counter.textContent = hits.length ? `0 / ${hits.length}` : '0 件';
      return hits.length;
    };

    const focusHit = (i) => {
      if (!hits.length) return;
      hits.forEach(m => m.classList.remove('current'));
      idx = (i + hits.length) % hits.length;
      const target = hits[idx];
      target.classList.add('current');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      counter.textContent = `${idx + 1} / ${hits.length}`;
    };

    // 入力で即時ハイライト（軽いデバウンス）
    let t;
    input.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const n = highlightAll(input.value);
        if (n) focusHit(0);
      }, 120);
    });

    btnNext.addEventListener('click', () => { if (hits.length) focusHit(idx + 1); });
    btnPrev.addEventListener('click', () => { if (hits.length) focusHit(idx - 1); });

    // Enterで次へ
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); if (hits.length) focusHit(idx + 1); }
    });
  });
})();
