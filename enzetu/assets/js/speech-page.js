
/*! speech-page.js (mode: click shows lightweight explain; click the card -> detail)
 * Requires: assets/js/glossary.js loaded first
 */
(() => {
  const G = window.GLOSSARY || {};
  const norm = (s)=> (s||'').normalize('NFKC').replace(/\s+/g,'').replace(/[（）()]/g,'');
  const esc  = (s)=> (s||'').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const bySel = (sel, root=document)=> root.querySelector(sel);

  function findItemByKey(key){
    if (G[key]) return G[key];
    const nk = norm(key);
    for (const [k,v] of Object.entries(G)){
      if (norm(k) === nk) return v;
      if (v && v.pattern){
        try{
          if (new RegExp(v.pattern,'i').test(key) || new RegExp(v.pattern,'i').test(nk)) return v;
        }catch(e){}
      }
    }
    return null;
  }

  function buildTerms(){
    const list = Object.entries(G).map(([k,v])=>{
      let pat = v && v.pattern;
      let re;
      try{ re = pat ? new RegExp(pat, "g") : new RegExp(esc(k), "g"); }
      catch(e){ re = new RegExp(esc(k), "g"); }
      return { key:k, re, length: k.length };
    });
    list.sort((a,b)=> b.length - a.length);
    return list;
  }

  function highlight(root){
    const terms = buildTerms();
    if (!terms.length) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node)=>{
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest(".gloss-term") || p.closest("a") || /SCRIPT|STYLE/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(textNode => {
      let replaced = false;
      const frags = [textNode.nodeValue];

      terms.forEach(({key, re}) => {
        for (let i=0; i<frags.length; i++){
          const chunk = frags[i];
          if (typeof chunk !== "string") continue;
          re.lastIndex = 0;
          if (!re.test(chunk)) continue;

          const newParts = [];
          let last = 0, m;
          re.lastIndex = 0;
          while ((m = re.exec(chunk))){
            const before = chunk.slice(last, m.index);
            if (before) newParts.push(before);
            const span = document.createElement("span");
            span.className = "gloss-term";
            span.dataset.key = key;
            span.textContent = m[0];
            newParts.push(span);
            last = m.index + m[0].length;
          }
          const after = chunk.slice(last);
          if (after) newParts.push(after);

          frags.splice(i, 1, ...newParts);
          i += newParts.length - 1;
          replaced = true;
        }
      });

      if (replaced){
        const parent = textNode.parentNode;
        const frag = document.createDocumentFragment();
        frags.forEach(part => frag.appendChild(typeof part === "string" ? document.createTextNode(part) : part));
        parent.replaceChild(frag, textNode);
      }
    });
  }

  function ensureNews(item, titleText){
    if (!item.news || !Array.isArray(item.news) || item.news.length === 0){
      const qn = encodeURIComponent((titleText||'').replace(/[（(].*?[)）]/g, ""));
      item.news = [
        { title: `Googleニュースで「${titleText}」`, url: `https://news.google.com/search?q=${qn}&hl=ja&gl=JP&ceid=JP:ja` },
        { title: "Yahoo!ニュース検索", url: `https://news.yahoo.co.jp/search?p=${qn}` },
        { title: "共同通信（ニュース一覧・検索）", url: `https://www.47news.jp/search?keyword=${qn}` }
      ];
    }
    return item.news.slice(0,3);
  }

  function createExplainCard(termEl, item){
    const key = termEl.dataset.key || termEl.textContent.trim();
    const titleText = item.title || key;
    const memoText  = (item.memo || '').trim();
    const news = ensureNews(item, titleText);

    // remove existing
    termEl.querySelectorAll('.explain-card').forEach(n=>n.remove());

    const card = document.createElement('div');
    card.className = 'explain-card';
    card.innerHTML = `
      <div class="explain-title">${titleText}</div>
      ${memoText ? `<div class="explain-memo">${memoText}</div>` : ''}
      <ul class="explain-news">
        ${news.map(n => `<li><a href="${n.url}" target="_blank" rel="noopener">${n.title||n.url}</a></li>`).join('')}
      </ul>
      <div class="explain-more">くわしく見る →</div>
    `;
    // whole card click -> detail
    const url = `detail.html?q=${encodeURIComponent(key)}`;
    card.addEventListener('click', (ev) => {
      // allow clicks on news links to open in new tab without navigating the whole card
      const a = ev.target.closest('a');
      if (a) return;
      location.href = url;
    });
    termEl.appendChild(card);
  }

  // Styles (light)
  const style = document.createElement('style');
  style.textContent = `
    .gloss-term { position: relative; cursor: pointer; }
    .explain-card{
      position: absolute; z-index: 50;
      left: 0; top: 100%;
      min-width: 280px; max-width: 520px;
      background: #fff; border:1px solid #e5e7eb; border-radius: .6rem;
      box-shadow: 0 8px 28px rgba(0,0,0,.10);
      padding: .7rem .8rem; margin-top: .25rem;
    }
    .explain-title{ font-weight:700; margin-bottom:.25rem; }
    .explain-memo{ font-size:.95rem; color:#0f172a; line-height:1.5; margin:.2rem 0 .3rem; }
    .explain-news{ margin:.2rem 0 .4rem; padding-left:1.2em; }
    .explain-news li{ list-style:disc; line-height:1.5; }
    .explain-news a{ text-decoration: underline; }
    .explain-more{ font-size:.92rem; color:#0369a1; font-weight:600; }
  `;
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', () => {
    const article = bySel('#article') || document.body;
    highlight(article);
  });

  // click -> show lightweight explain (toggle)
  document.addEventListener('click', (e) => {
    const term = e.target.closest('.gloss-term');
    if (!term) {
      // click outside -> close open cards
      document.querySelectorAll('.explain-card').forEach(n=>n.remove());
      return;
    }
    e.preventDefault(); e.stopPropagation();
    // toggle same term
    const existing = term.querySelector('.explain-card');
    if (existing){ existing.remove(); return; }

    const key = term.dataset.key || term.textContent.trim();
    const item = findItemByKey(key);
    if (!item) return;
    createExplainCard(term, item);
  }, true);

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.explain-card').forEach(n=>n.remove());
  });
})();
