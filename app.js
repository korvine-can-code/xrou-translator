/* Dvandva Xrou-Haxa Translator v19 — dictionary synonym suggestions, plus v18 QoL tools */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const norm=XrouEngine.norm;
  let lexicon=[], phrasebook=[], patterns=[], engine=null, liveTimer=null;
  let synonymGroups=[], synonymIndex=new Map(), dictionaryEnglish=new Map();
  let phraseVisible=48;
  const sourceLang=byId('sourceLang'),targetLang=byId('targetLang');
  const sourceText=byId('sourceText'), output=byId('translation');
  const details=byId('translationDetails'), suggestionsBox=byId('suggestions');
  const status=byId('translationStatus'), search=byId('search'),typeFilter=byId('typeFilter');
  const results=byId('results'),count=byId('count');

  // V18 — saved items/history are local to this device, not uploaded or synchronized.
  const favoriteStorageKey='dvandva-favorites-v18';
  const historyStorageKey='dvandva-history-v18';
  const HISTORY_LIMIT=40;
  const DICTIONARY_PAGE=120;
  let dictionaryVisible=DICTIONARY_PAGE;
  let dictionaryCategoryIndex={};
  let categoryNames=[];
  const themeFilter=byId('themeFilter');
  const wordLookup=new Map();
  let lastTranslation=null;
  let historyTimer=null;
  let dialogCurrentWord='';
  function storedArray(key){
    try { const v=JSON.parse(localStorage.getItem(key)||'[]'); return Array.isArray(v)?v.slice(0,200):[]; }
    catch { return []; }
  }
  let favorites=storedArray(favoriteStorageKey).filter(x=>x&&typeof x.key==='string'&&['word','phrase','translation'].includes(x.kind));
  let history=storedArray(historyStorageKey).filter(x=>x&&typeof x.source==='string'&&typeof x.result==='string').slice(0,HISTORY_LIMIT);
  function persist(key,arr){try{localStorage.setItem(key,JSON.stringify(arr));}catch(err){console.warn('Browser storage unavailable:',err);}}
  const favoriteKeyWord=w=>'word:'+norm(w);
  const favoriteKeyPhrase=p=>'phrase:'+norm(p.xrou)+'|'+norm(p.english);
  const favoriteKeyTranslation=t=>'translation:'+t.from+'|'+norm(t.source);
  const isFavorite=key=>favorites.some(f=>f.key===key);
  function toggleFavorite(entry){
    const old=favorites.findIndex(f=>f.key===entry.key);
    if(old>=0) favorites.splice(old,1);
    else favorites.unshift({...entry,savedAt:Date.now()});
    favorites=favorites.slice(0,200);
    persist(favoriteStorageKey,favorites);
    renderFavorites();
    renderHistory();
    renderDictionary();
    renderPhrasebook();
    updateTranslationFavorite();
    updateDialogFavorite();
  }
  function saveWord(word){
    const item=lookupWord(word);
    if(!item) return;
    toggleFavorite({kind:'word',key:favoriteKeyWord(item.drow),word:item.drow,english:item.english,type:item.type||''});
  }
  function savePhrase(entry){
    toggleFavorite({kind:'phrase',key:favoriteKeyPhrase(entry),xrou:entry.xrou,english:entry.english,category:entry.category||''});
  }
  function saveTranslation(t){
    if(!t||!t.source.trim()||!t.result.trim()||t.result==='—') return;
    toggleFavorite({kind:'translation',key:favoriteKeyTranslation(t),source:t.source,result:t.result,from:t.from,to:t.to});
  }
  function recordHistory(t){
    if(!t||!t.source.trim()||!t.result.trim()||t.result==='—') return;
    const key=favoriteKeyTranslation(t);
    history=history.filter(x=>favoriteKeyTranslation(x)!==key);
    history.unshift({...t,when:Date.now()});
    history=history.slice(0,HISTORY_LIMIT);
    persist(historyStorageKey,history);
    renderHistory();
  }
  // English synonym suggestions are deliberately OPT-IN. A candidate is shown only if it
  // already has a standalone English dictionary meaning. These are suggestions, never
  // automatic substitutions or new vocabulary. All data comes from local JSON files.
  function buildSynonymIndex(){
    dictionaryEnglish.clear();
    synonymIndex.clear();
    for(const item of lexicon){
      for(const alias of String(item.english||'').split(/\s*;\s*|\s+\/\s+/)){
        const key=norm(alias.replace(/\s*\([^)]*\)/g,'').trim());
        if(!key || dictionaryEnglish.has(key))continue;
        dictionaryEnglish.set(key,item.drow);
      }
    }
    for(const group of synonymGroups){
      if(!Array.isArray(group)||group.length<2)continue;
      const clean=[...new Set(group.map(norm).filter(Boolean))];
      for(const term of clean){
        if(!synonymIndex.has(term))synonymIndex.set(term,[]);
        const current=synonymIndex.get(term);
        for(const candidate of clean){
          if(candidate===term || !dictionaryEnglish.has(candidate))continue;
          if(!current.includes(candidate))current.push(candidate);
        }
      }
    }
  }
  function findSynonyms(word,max=4){
    const key=norm(word);
    if(!key || dictionaryEnglish.has(key))return [];
    const found=[],seenDrow=new Set();
    for(const english of synonymIndex.get(key)||[]){
      const drow=dictionaryEnglish.get(english);
      if(!drow || seenDrow.has(norm(drow)))continue;
      seenDrow.add(norm(drow));found.push({english,drow});
      if(found.length===max)break;
    }
    return found;
  }
  // Replace only the requested word, with a unicode-aware boundary and no global replace.
  function replaceUnknown(original,replacement){
    const escaped=original.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    sourceText.value=sourceText.value.replace(new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped})(?=$|[^\\p{L}\\p{N}])`,'iu'),(_,pre)=>pre+replacement);
    doTranslate();sourceText.focus();
  }
  function buildWordLookup(){
    wordLookup.clear();
    for(const item of lexicon){
      const k=norm(item.drow);
      if(!wordLookup.has(k)) wordLookup.set(k,item);
    }
  }
  function lookupWord(word){
    const k=norm(word);
    if(wordLookup.has(k)) return wordLookup.get(k);
    if(k.endsWith('ys')&&wordLookup.has(k.slice(0,-2))){
      const e=wordLookup.get(k.slice(0,-2));
      return {...e,drow:word,english:e.english+' (plural form)',type:e.type};
    }
    return null;
  }
  function wordButton(word,cls='wordButton'){
    return `<button type="button" class="${cls}" data-word="${encodeURIComponent(word)}" title="View Xrou word definition">${esc(word)}</button>`;
  }
  function renderXrouWords(text){
    const token=/[\p{L}\p{M}][\p{L}\p{M}\p{N}'’\-]*/gu;
    let out='',prev=0,match;
    while((match=token.exec(text))!==null){
      out+=esc(text.slice(prev,match.index));
      out+=lookupWord(match[0])?wordButton(match[0],'inlineGloss'):esc(match[0]);
      prev=token.lastIndex;
    }
    return out+esc(text.slice(prev));
  }
  function breakdown(word){
    const roots=String(word).split('-');
    if(roots.length<2) return [];
    return roots.map(root=>{
      const base=wordLookup.get(norm(root));
      if(base) return {root,meaning:base.english.split(';')[0].trim()};
      if(norm(root)==='vai') return {root,meaning:'no / without / not'};
      return {root,meaning:'Unlisted root — meaning not yet recorded'};
    });
  }
  function openWord(word){
    const item=lookupWord(word);
    if(!item)return;
    dialogCurrentWord=item.drow;
    byId('wordDialogTitle').textContent=item.drow;
    byId('wordDialogEnglish').textContent=item.english;
    byId('wordDialogType').textContent=item.type||'Vocabulary entry';
    const parts=breakdown(item.drow);
    byId('wordBreakdown').innerHTML=parts.length
      ?'<h3>Compound breakdown</h3>'+parts.map(x=>`<div class="breakdownRow"><strong>${esc(x.root)}</strong><span class="mutedSmall">${esc(x.meaning)}</span></div>`).join('')
      :'<p class="mutedSmall">Single dictionary headword. No compound breakdown is needed.</p>';
    updateDialogFavorite();
    const dialog=byId('wordDialog');
    if(!dialog.open) dialog.showModal();
  }
  function updateDialogFavorite(){
    const btn=byId('wordDialogFavorite');
    if(!btn)return;
    const saved=dialogCurrentWord&&isFavorite(favoriteKeyWord(dialogCurrentWord));
    btn.textContent=saved?'★ Saved word':'☆ Save word';
    btn.setAttribute('aria-pressed',String(!!saved));
    btn.classList.add('starButton');
  }
  function currentTranslation(){
    if(!lastTranslation||!sourceText.value.trim()) return null;
    return {...lastTranslation,source:sourceText.value,from:sourceLang.value,to:targetLang.value};
  }
  function updateTranslationFavorite(){
    const btn=byId('saveTranslation');
    if(!btn)return;
    const t=currentTranslation();
    btn.disabled=!t;
    const saved=t&&isFavorite(favoriteKeyTranslation(t));
    btn.textContent=saved?'★ Saved translation':'☆ Save translation';
    btn.setAttribute('aria-pressed',String(!!saved));
    btn.classList.add('starButton');
  }
  function renderFavorites(){
    byId('favoritesCount').textContent=favorites.length+' saved';
    const box=byId('favoritesResults');
    if(!favorites.length){box.innerHTML='<div class="empty">No favorites yet. Star a word, phrase, or translation to save it.</div>';return;}
    box.innerHTML=favorites.map((f,i)=>{
      let label=f.kind==='word'?'Dictionary word':f.kind==='phrase'?'Phrasebook':'Translation';
      const main=f.word||f.xrou||f.result||'';
      const sub=f.english||(f.source?f.source:'');
      return `<article class="savedCard"><div class="savedTag">${label}</div>
        <div class="savedTitle">${f.kind==='word'?wordButton(main):f.kind==='phrase'?renderXrouWords(main):esc(main)}</div>
        <div class="savedSub">${esc(sub)}</div><div class="actions">
        <button type="button" data-fav-copy="${i}">Copy</button>
        <button type="button" data-fav-try="${i}" class="primary">Try</button>
        <button type="button" data-fav-remove="${i}">Remove ★</button>
        </div></article>`;
    }).join('');
  }
  function renderHistory(){
    const box=byId('historyResults');
    byId('clearHistory').disabled=!history.length;
    if(!history.length){box.innerHTML='<div class="empty">Your recent translations will appear here.</div>';return;}
    box.innerHTML=history.map((h,i)=>{
      const saved=isFavorite(favoriteKeyTranslation(h));
      return `<article class="savedCard"><div class="savedTag">${h.from==='en'?'English → Xrou':'Xrou → English'}</div>
      <div class="savedSub">${esc(h.source)}</div>
      <div class="savedTitle">${h.to==='xrou'?renderXrouWords(h.result):esc(h.result)}</div>
      <div class="actions"><button type="button" data-history-copy="${i}">Copy</button>
      <button type="button" data-history-try="${i}" class="primary">Try</button>
      <button type="button" class="starButton" aria-pressed="${saved}" data-history-star="${i}">${saved?'★ Saved':'☆ Save'}</button>
      </div></article>`;
    }).join('');
  }
  function activateSavedControls(){
    byId('wordDialogClose').addEventListener('click',()=>byId('wordDialog').close());
    byId('wordDialog').addEventListener('click',e=>{if(e.target===byId('wordDialog'))byId('wordDialog').close();});
    byId('wordDialogFavorite').addEventListener('click',()=>{if(dialogCurrentWord)saveWord(dialogCurrentWord);});
    byId('wordDialogCopy').addEventListener('click',()=>{if(dialogCurrentWord)copyText(dialogCurrentWord);});
    byId('wordDialogTry').addEventListener('click',()=>{if(dialogCurrentWord){useInTranslator(dialogCurrentWord,'xrou');byId('wordDialog').close();}});
    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-word]');
      if(btn) openWord(decodeURIComponent(btn.dataset.word));
    });
    byId('saveTranslation').addEventListener('click',()=>saveTranslation(currentTranslation()));
    byId('favoritesResults').addEventListener('click',async e=>{
      const b=e.target.closest('button[data-fav-copy],button[data-fav-try],button[data-fav-remove]');
      if(!b)return;
      const i=Number(b.dataset.favCopy??b.dataset.favTry??b.dataset.favRemove),f=favorites[i];
      if(!f)return;
      if(b.hasAttribute('data-fav-copy')) await copyText(f.word||f.xrou||f.result||'');
      if(b.hasAttribute('data-fav-try')) useInTranslator(f.source||f.english||f.word||'',f.from||((f.kind==='word')?'xrou':'en'));
      if(b.hasAttribute('data-fav-remove')) toggleFavorite(f);
    });
    byId('historyResults').addEventListener('click',async e=>{
      const b=e.target.closest('button[data-history-copy],button[data-history-try],button[data-history-star]');
      if(!b)return;
      const i=Number(b.dataset.historyCopy??b.dataset.historyTry??b.dataset.historyStar),h=history[i];
      if(!h)return;
      if(b.hasAttribute('data-history-copy')) await copyText(h.result);
      if(b.hasAttribute('data-history-try'))useInTranslator(h.source,h.from);
      if(b.hasAttribute('data-history-star'))saveTranslation(h);
    });
    byId('clearHistory').addEventListener('click',()=>{
      if(history.length&&window.confirm('Clear all recent translations on this device?')){
        history=[];persist(historyStorageKey,history);renderHistory();
      }
    });
    renderFavorites();renderHistory();updateTranslationFavorite();
  }
  activateSavedControls();


  function enforceDirection(changed) {
    if(sourceLang.value===targetLang.value) {
      if(changed==='source') targetLang.value=sourceLang.value==='en'?'xrou':'en';
      else sourceLang.value=targetLang.value==='en'?'xrou':'en';
    }
    doTranslate();
  }
  sourceLang.addEventListener('change',()=>enforceDirection('source'));
  targetLang.addEventListener('change',()=>enforceDirection('target'));
  byId('swapBtn').addEventListener('click',()=>{
    [sourceLang.value,targetLang.value]=[targetLang.value,sourceLang.value];
    const current=output.textContent;
    if(current && current!=='—' && !current.startsWith('Dictionary')) sourceText.value=current.replace(/[⟦⟧]/g,'');
    doTranslate();
  });
  const copyText=async value=>{
    try { await navigator.clipboard.writeText(value); return true; }
    catch {window.prompt('Copy this:',value);return false;}
  };
  function doTranslate() {
    if(!engine) return;
    const text=sourceText.value;
    const result=engine.translate(text,sourceLang.value);
    if(targetLang.value==='xrou') {
      // Unknown brackets stay plain text; recognized Xrou headwords are clickable.
      output.innerHTML=result.text.split(/(⟦[^⟧]+⟧)/g).map(part=>
        part.startsWith('⟦')?`<span class="unknown">${esc(part)}</span>`:renderXrouWords(part)).join('');
    } else {
      output.innerHTML=esc(result.text).replace(/⟦([^⟧]+)⟧/g,'<span class="unknown">⟦$1⟧</span>');
    }
    lastTranslation={source:text,result:result.text,from:sourceLang.value,to:targetLang.value};
    updateTranslationFavorite();
    details.innerHTML='';
    suggestionsBox.replaceChildren();
    if(!text.trim()) {status.textContent='Ready to translate';lastTranslation=null;updateTranslationFavorite();return;}
    clearTimeout(historyTimer);
    historyTimer=setTimeout(()=>recordHistory(currentTranslation()),1600);
    status.textContent=result.unknown.length?`${result.unknown.length} unknown word${result.unknown.length===1?'':'s'} · ${result.matches.length} matched segment${result.matches.length===1?'':'s'}`:`${result.matches.length} matched segment${result.matches.length===1?'':'s'} · no unknown words`;
    details.innerHTML=result.matches.slice(0,10).map(x=>`<span class="chip">${esc(x)}</span>`).join('');
    for(const item of result.unknown.slice(0,8)) {
      const possibleSynonyms=sourceLang.value==='en'?findSynonyms(item.word,4):[];
      const spellingOptions=item.suggestions.filter(s=>norm(s)!==norm(item.word));
      if(!possibleSynonyms.length && !spellingOptions.length) continue;
      const row=document.createElement('div');row.className='suggestionRow';
      const label=document.createElement('strong');label.textContent=`${item.word}:`;
      row.append(label);
      if(possibleSynonyms.length){
        const section=document.createElement('div'); section.className='synonymSection';
        const intro=document.createElement('span');intro.className='synonymLabel';
        intro.textContent='Possible dictionary synonyms (choose the meaning you intend):';
        section.append(intro);
        const choices=document.createElement('div');choices.className='synonymChoices';
        for(const itemSyn of possibleSynonyms){
          const button=document.createElement('button');button.type='button';
          button.className='suggestButton synonymChoice';
          button.textContent=`${itemSyn.english} → ${itemSyn.drow}`;
          button.title=`Replace ${item.word} with ${itemSyn.english} (Xrou: ${itemSyn.drow})`;
          button.addEventListener('click',()=>replaceUnknown(item.word,itemSyn.english));
          choices.append(button);
        }
        section.append(choices);row.append(section);
      }
      if(spellingOptions.length){
        const spell=document.createElement('div');spell.className='synonymSection';
        const spellTitle=document.createElement('span');spellTitle.className='synonymLabel';spellTitle.textContent='Similar spellings:';
        spell.append(spellTitle);
        const choices=document.createElement('div');choices.className='synonymChoices';
        for(const suggestion of spellingOptions){
          const button=document.createElement('button');button.type='button';
          button.className='suggestButton';button.textContent=suggestion;
          button.title=`Replace ${item.word} with ${suggestion}`;
          button.addEventListener('click',()=>replaceUnknown(item.word,suggestion));
          choices.append(button);
        }
        spell.append(choices);row.append(spell);
      }
      suggestionsBox.append(row);
    }
  }
  sourceText.addEventListener('input',()=>{
    clearTimeout(liveTimer);
    liveTimer=setTimeout(doTranslate,170);
  });
  sourceText.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){clearTimeout(liveTimer);doTranslate();}});
  byId('translateBtn').addEventListener('click',()=>{clearTimeout(liveTimer);doTranslate();recordHistory(currentTranslation());});
  byId('clearTranslate').addEventListener('click',()=>{sourceText.value='';doTranslate();sourceText.focus();});
  byId('copyTranslation').addEventListener('click',()=>{
    const value=output.textContent;
    if(value && value!=='—') {copyText(value);recordHistory(currentTranslation());}
  });
  function showDictionarySynonyms(query){
    if(typeFilter.value || themeFilter.value)return;
    const candidates=findSynonyms(query,5);
    if(!candidates.length)return;
    const box=document.createElement('div');box.className='dictionarySynonymHints';
    const info=document.createElement('div');info.className='synonymLabel';
    info.textContent='This word has no exact dictionary entry. Try an existing synonym:';
    box.append(info);
    for(const item of candidates){
      const btn=document.createElement('button');btn.type='button';btn.className='suggestButton';
      btn.textContent=`${item.english} → ${item.drow}`;
      btn.addEventListener('click',()=>{search.value=item.english;dictionaryVisible=DICTIONARY_PAGE;renderDictionary();search.focus();});
      box.append(btn);
    }
    results.prepend(box);
  }
  function renderDictionary() {
    const q=norm(search.value),type=typeFilter.value,theme=themeFilter.value;
    const filtered=lexicon.filter(item=>{
      if(type && item.type!==type) return false;
      const categories=dictionaryCategoryIndex[item.drow]||['General & other'];
      if(theme && !categories.includes(theme))return false;
      return !q || norm(item.drow).includes(q) || norm(item.english).includes(q) || norm(item.type).includes(q);

    });
    count.textContent=`${filtered.length} of ${lexicon.length} entries`;
    const shown=filtered.slice(0,dictionaryVisible);
    const more=byId('dictionaryMore');
    more.hidden=filtered.length<=dictionaryVisible;
    more.textContent=`Show more words (${Math.max(0,filtered.length-dictionaryVisible)} remaining)`;
    if(!filtered.length){
      results.innerHTML='<div class="empty">No direct dictionary matches found.</div>';
      showDictionarySynonyms(search.value.trim());
      return;
    }
    // Avoid injecting any field as raw HTML; the public dictionary is user-maintained.
    results.innerHTML=shown.map((entry,i)=>`<article class="card">
      <div class="cardTop"><div class="word">${wordButton(entry.drow)}</div>${entry.type?`<div class="badge">${esc(entry.type)}</div>`:''}</div>
      <div class="eng">${esc(entry.english)}</div>
      <div class="mutedSmall">${esc((dictionaryCategoryIndex[entry.drow]||['General & other']).slice(0,3).join(' · '))}</div>
      <div class="actions"><button type="button" data-item="${i}">Copy Xrou</button>
      <button type="button" class="starButton" data-word-star="${i}" aria-pressed="${isFavorite(favoriteKeyWord(entry.drow))}">${isFavorite(favoriteKeyWord(entry.drow))?'★ Saved':'☆ Save'}</button></div>
    </article>`).join('');
    showDictionarySynonyms(search.value.trim());
    results.querySelectorAll('[data-item]').forEach(button=>button.addEventListener('click',async()=>{
      const word=shown[Number(button.dataset.item)]?.drow;
      if(word && await copyText(word)){
        button.textContent='Copied!';setTimeout(()=>{button.textContent='Copy Xrou';},900);
      }
    }));
    results.querySelectorAll('[data-word-star]').forEach(button=>button.addEventListener('click',()=>{
      const word=shown[Number(button.dataset.wordStar)]?.drow;
      if(word)saveWord(word);
    }));
  }
  byId('dictionaryMore').addEventListener('click',()=>{dictionaryVisible+=DICTIONARY_PAGE;renderDictionary();});
  search.addEventListener('input',()=>{dictionaryVisible=DICTIONARY_PAGE;renderDictionary();});
  typeFilter.addEventListener('change',()=>{dictionaryVisible=DICTIONARY_PAGE;renderDictionary();});
  themeFilter.addEventListener('change',()=>{dictionaryVisible=DICTIONARY_PAGE;renderDictionary();});
  byId('clearSearch').addEventListener('click',()=>{search.value='';typeFilter.value='';themeFilter.value='';dictionaryVisible=DICTIONARY_PAGE;renderDictionary();search.focus();});
  function openTab(name) {
    document.querySelectorAll('.tab').forEach(b=>{
      const active=b.dataset.tab===name;
      b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));
    });
    document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===name));
  }
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>openTab(btn.dataset.tab)));

  const pSearch=byId('phraseSearch'),pCategory=byId('phraseCategory'),pResults=byId('phraseResults');
  const gSearch=byId('patternSearch'),gCategory=byId('patternCategory'),gResults=byId('patternResults');
  function useInTranslator(text,source='en') {
    sourceLang.value=source;targetLang.value=source==='en'?'xrou':'en';
    sourceText.value=text;openTab('translator');doTranslate();sourceText.focus();
  }
  function fillCategory(select,data) {
    select.innerHTML='<option value="">All categories</option>'+
      [...new Set(data.map(x=>x.category).filter(Boolean))].sort()
      .map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  }
  function renderPhrasebook() {
    const q=norm(pSearch.value),category=pCategory.value;
    const filtered=phrasebook.filter(item=>(!category||item.category===category)&&
      (!q||[item.english,item.xrou,item.category].some(s=>norm(s).includes(q))));
    byId('phraseCount').textContent=`${filtered.length} of ${phrasebook.length} phrases`;
    const shown=filtered.slice(0,phraseVisible);
    pResults.innerHTML=shown.length?shown.map((entry,i)=>`<article class="phraseCard">
      <div class="phraseTag">${esc(entry.category)}</div>
      <div class="phraseEnglish">${esc(entry.english)}</div>
      <div class="phraseXrou">${renderXrouWords(entry.xrou)}</div>
      <div class="actions">
        <button type="button" data-pcopy="${i}">Copy Xrou</button>
        <button type="button" data-ptry="${i}" class="primary">Try in translator</button>
        <button type="button" class="starButton" data-pstar="${i}" aria-pressed="${isFavorite(favoriteKeyPhrase(entry))}">${isFavorite(favoriteKeyPhrase(entry))?'★ Saved':'☆ Save'}</button>
      </div>
    </article>`).join(''):'<div class="empty">No phrases match your search.</div>';
    const more=byId('phraseMore');more.hidden=filtered.length<=phraseVisible;
    more.textContent=`Show more phrases (${Math.max(0,filtered.length-phraseVisible)} remaining)`;
    pResults.onclick=async event=>{
      const button=event.target.closest('button[data-pcopy],button[data-ptry],button[data-pstar]');
      if(!button) return;
      const idx=Number(button.dataset.pcopy??button.dataset.ptry??button.dataset.pstar);
      const entry=shown[idx];if(!entry) return;
      if(button.hasAttribute('data-pstar'))savePhrase(entry);
      else if(button.hasAttribute('data-ptry')) useInTranslator(entry.english);
      else if(await copyText(entry.xrou)){button.textContent='Copied!';setTimeout(()=>{button.textContent='Copy Xrou';},950);}
    };
  }
  function renderPatterns() {
    const q=norm(gSearch.value),category=gCategory.value;
    const filtered=patterns.filter(item=>(!category||item.category===category)&&
      (!q||[item.english,item.xrou,item.category,item.example_en,item.example_xrou].some(s=>norm(s).includes(q))));
    byId('patternCount').textContent=`${filtered.length} of ${patterns.length} patterns`;
    gResults.innerHTML=filtered.length?filtered.map((entry,i)=>`<article class="phraseCard">
      <div class="phraseTag">${esc(entry.category)}</div>
      <div class="phraseEnglish">${esc(entry.english)}</div>
      <div class="patternForm">${esc(entry.xrou)}</div>
      <div class="patternExample"><strong>Example:</strong> ${esc(entry.example_en)}<br>${esc(entry.example_xrou)}</div>
      <div class="actions"><button type="button" class="primary" data-pattern="${i}">Try example</button></div>
    </article>`).join(''):'<div class="empty">No patterns match your search.</div>';
    gResults.onclick=event=>{
      const button=event.target.closest('button[data-pattern]');if(!button)return;
      const item=filtered[Number(button.dataset.pattern)];if(item)useInTranslator(item.example_en);
    };
  }
  pSearch.addEventListener('input',()=>{phraseVisible=48;renderPhrasebook();});
  pCategory.addEventListener('change',()=>{phraseVisible=48;renderPhrasebook();});
  byId('phraseClear').addEventListener('click',()=>{pSearch.value='';pCategory.value='';phraseVisible=48;renderPhrasebook();pSearch.focus();});
  byId('phraseMore').addEventListener('click',()=>{phraseVisible+=48;renderPhrasebook();});
  gSearch.addEventListener('input',renderPatterns);gCategory.addEventListener('change',renderPatterns);
  byId('patternClear').addEventListener('click',()=>{gSearch.value='';gCategory.value='';renderPatterns();gSearch.focus();});
  async function loadLexicon() {
    const res=await fetch('./lexicon.json',{cache:'no-store'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data=await res.json();
    if(!Array.isArray(data)) throw new Error('Dictionary must be a JSON array');
    lexicon=data.filter(item=>item && typeof item.drow==='string' && typeof item.english==='string');
    buildWordLookup();
    // Phrase files are optional so an incomplete upload cannot break the dictionary.
    const loadJson=async file=>{
      try {const res=await fetch(file,{cache:'no-store'});if(!res.ok)throw Error(`${file}: HTTP ${res.status}`);
        const data=await res.json();return Array.isArray(data)?data:[];}
      catch(error){console.warn('Could not load',file,error);return [];}
    };
    [phrasebook,patterns]=await Promise.all([loadJson('./phrasebook.json'),loadJson('./patterns.json')]);
    try {
      const res=await fetch('./synonyms.json',{cache:'no-store'});
      const payload=res.ok?await res.json():null;
      synonymGroups=Array.isArray(payload?.groups)?payload.groups:[];
    }catch(error){console.warn('Synonym index unavailable:',error);synonymGroups=[];}
    buildSynonymIndex();
    try {
      const cats=await fetch('./categories.json',{cache:'no-store'}).then(r=>r.ok?r.json():null);
      if(cats && cats.entries && cats.categories){
        dictionaryCategoryIndex=cats.entries;categoryNames=cats.categories;
      }
    }catch(e){console.warn('Dictionary theme index unavailable:',e);}
    themeFilter.innerHTML='<option value="">All themes</option>'+
      [...categoryNames,'General & other'].map(cat=>`<option value="${esc(cat)}">${esc(cat)}</option>`).join('');
    phrasebook=phrasebook.filter(x=>x&&typeof x.english==='string'&&typeof x.xrou==='string');
    patterns=patterns.filter(x=>x&&typeof x.example_en==='string'&&typeof x.example_xrou==='string');
    engine=XrouEngine.createTranslator(lexicon,phrasebook);
    fillCategory(pCategory,phrasebook);fillCategory(gCategory,patterns);
    renderPhrasebook();renderPatterns();
    typeFilter.innerHTML='<option value="">All word types</option>'+
      [...new Set(lexicon.map(item=>item.type).filter(Boolean))].sort()
        .map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');
    renderDictionary();renderFavorites();renderHistory();doTranslate();
  }
  loadLexicon().catch(error=>{
    console.error('Could not load lexicon:',error);
    status.textContent='Dictionary unavailable';
    output.textContent='Dictionary unavailable. Please check lexicon.json.';
    count.textContent='Dictionary unavailable';
    results.innerHTML='<div class="empty">Could not load lexicon.json. Check that the file is in the root and contains valid JSON.</div>';
  });
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
