// assets/js/tooltip-card.js
(() => {
  // ---- safety: GLOSSARY is required
  if (!window.GLOSSARY || typeof window.GLOSSARY !== 'object') {
    console.error('[tooltip-card] window.GLOSSARY が未定義です。glossary.js を先に読み込んでください。');
    return;
  }
  const G = window.GLOSSARY;

  // ---- utils
  const norm = (s)=> (s||'').normalize('NFKC').replace(/\s+/g,'').replace(/[（）()]/g,'');
  const ONE = (sel, root=document) => root.querySelector(sel);

  function findItem(key){
    if (G[key]) return G[key];
    const nk = norm(key);
    // exact (normalized) match
    for (const [k,v] of Object.entries(G)) {
      if (norm(k) === nk) return v;
    }
    // pattern fallback
    for (const [k,v] of Object.entries(G)) {
      if (v && v.pattern) {
        try {
          const re = new RegExp(v.pattern, 'i');
          if (re.test(key) || re.test(nk)) return v;
        } catch (e) {
          // invalid pattern: ignore
        }
      }
    }
    return null;
  }

  function ensureNews(item, titleText){
  if (!item.news || !Array.isArray(item.news) || item.news.length === 0){
    const qn = encodeURIComponent((titleText||'').replace(/[（(].*?[)）]/g, ''));
    item.news = [
      { title: `Googleニュースで「${titleText}」`, 
        url: `https://news.google.com/search?q=${qn}&hl=ja&gl=JP&ceid=JP:ja` }
    ];
  }
  return item.news.slice(0,1);
}


  // ---- style inject (once)
  if (!ONE('#tooltip-card-style')) {
    const style = document.createElement('style');
    style.id = 'tooltip-card-style';
    style.textContent = `
      .gloss-term{ position:relative; cursor:pointer; }
      .explain-card{
        position:absolute; left:0; top:100%; z-index:50;
        min-width:280px; max-width:520px; margin-top:.25rem;
        background:#fff; border:1px solid #e5e7eb; border-radius:.6rem;
        box-shadow:0 8px 28px rgba(0,0,0,.12);
        padding:.7rem .8rem;
      }
      .explain-title{ font-weight:700; margin-bottom:.25rem; }
      .explain-memo{ font-size:.95rem; color:#0f172a; line-height:1.5; margin:.2rem 0 .45rem; }
      .tip-news-head{ font-weight:600; font-size:.92rem; color:#0f172a; margin:.1rem 0 .2rem; }
      .explain-news{ margin:.2rem 0 .5rem; padding-left:1.2em; }
      .explain-news li{ list-style:disc; line-height:1.5; }
      .explain-news a{ text-decoration:underline; }
      .explain-more{ display:inline-block; font-weight:600; color:#0369a1; }
    `;
    document.head.appendChild(style);
  }

  function closeAllCards(except=null){
    document.querySelectorAll('.explain-card').forEach(el => {
      if (except && el === except) return;
      el.remove();
    });
  }

  function buildCard(termEl, item){
    const key = termEl.dataset.key || termEl.textContent.trim();
    const titleText = item.title || key;
    const memoText  = (item.memo || '').trim();
    const news = ensureNews(item, titleText);

    // container
    const card = document.createElement('div');
    card.className = 'explain-card';

    // title
    const title = document.createElement('div');
    title.className = 'explain-title';
    title.textContent = titleText;
    card.appendChild(title);

    // memo (解説)
    if (memoText) {
      const memo = document.createElement('div');
      memo.className = 'explain-memo';
      memo.textContent = memoText; // textContent で安全に
      card.appendChild(memo);
    }

    // news head
    const head = document.createElement('div');
    head.className = 'tip-news-head';
    head.textContent = '最近のニュース';
    card.appendChild(head);

    // news list
    const ul = document.createElement('ul');
    ul.className = 'explain-news';
    news.forEach(n => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = n.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = n.title || n.url;
      li.appendChild(a);
      ul.appendChild(li);
    });
    card.appendChild(ul);

    // more link (これだけが遷移トリガー)
    const more = document.createElement('a');
    more.className = 'explain-more';
    more.href = `detail.html?q=${encodeURIComponent(key)}`;
    more.textContent = '詳しく見る →';
    card.appendChild(more);

    // カード自身のクリックは遷移しない（リンクのみ遷移）
    card.addEventListener('click', (ev) => {
      if (!ev.target.closest('a')) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    });

    return card;
  }

  // ---- main: click to toggle card
  document.addEventListener('click', (e) => {
    const term = e.target.closest('.gloss-term');
    if (!term) {
      // outside: close any open cards
      closeAllCards();
      return;
    }

    // トグル
    const existing = term.querySelector('.explain-card');
    if (existing) {
      existing.remove();
      return;
    }

    // open new card
    const key = term.dataset.key || term.textContent.trim();
    const item = findItem(key);
    if (!item) return;
    closeAllCards(); // 他を閉じる
    const card = buildCard(term, item);
    term.appendChild(card);
    // 位置はCSSで bottom-align（必要ならここで調整）
  }, true);

  // ---- esc to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllCards();
  });
})();
