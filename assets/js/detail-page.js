
/*! detail-page.js
 * - Normalize query (?q=) and resolve glossary item by key/pattern
 * - Auto-generate news links if missing
 * - Render into #title, #memo, #who, #topics, #news
 * Requires: assets/js/glossary.js loaded first
 */
(() => {
  const G = window.GLOSSARY || {};
  const norm = (s)=> (s||'').normalize('NFKC').replace(/\s+/g,'').replace(/[（）()]/g,'');

  function findItem(q){
    if (G[q]) return G[q];
    const nq = norm(q);
    for (const k of Object.keys(G)){
      if (norm(k) === nq) return G[k];
    }
    for (const [k,v] of Object.entries(G)){
      const pat = v && v.pattern;
      try{
        if (pat && (new RegExp(pat,'i').test(q) || new RegExp(pat,'i').test(nq))) return v;
      }catch(e){}
    }
    return null;
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

  function set(id, html){ const el = document.getElementById(id); if (el) el.innerHTML = html; }
  function clearList(id){ const el = document.getElementById(id); if (el) el.innerHTML=''; return el; }

  document.addEventListener('DOMContentLoaded', () => {
    const q = new URLSearchParams(location.search).get('q') || '';
    const item = findItem(q);
    if (!item){
      set('title','用語情報が見つかりません');
      set('memo','glossary.js に追加してください。');
      return;
    }
    const titleText = item.title || q;
    set('title', titleText);
    set('memo', item.memo || '');
    set('who', item.who ? `担当・所管：${item.who}` : '（情報未設定）');

    const topicsUl = clearList('topics');
    if (Array.isArray(item.topics) && item.topics.length){
      item.topics.forEach(t => {
        const li = document.createElement('li');
        li.textContent = t;
        topicsUl.appendChild(li);
      });
    }

    const newsUl = clearList('news');
    const news = ensureNews(item, titleText);
    news.forEach(n => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="${n.url}" target="_blank" rel="noopener">${n.title||n.url}</a>`;
      newsUl.appendChild(li);
    });
  });
})();
