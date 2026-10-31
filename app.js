/* Dvandva Xrou-Haxa Translator v2 — UI and dictionary browser */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const norm=XrouEngine.norm;
  let lexicon=[], phrasebook=[], patterns=[], engine=null, liveTimer=null;
  let phraseVisible=48;
  const sourceLang=byId('sourceLang'),targetLang=byId('targetLang');
  const sourceText=byId('sourceText'), output=byId('translation');
  const details=byId('translationDetails'), suggestionsBox=byId('suggestions');
  const status=byId('translationStatus'), search=byId('search'),typeFilter=byId('typeFilter');
  const results=byId('results'),count=byId('count');

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
    output.innerHTML=esc(result.text).replace(/⟦([^⟧]+)⟧/g,'<span class="unknown">⟦$1⟧</span>');
    details.innerHTML='';
    suggestionsBox.replaceChildren();
    if(!text.trim()) {status.textContent='Ready to translate';return;}
    status.textContent=result.unknown.length?`${result.unknown.length} unknown word${result.unknown.length===1?'':'s'} · ${result.matches.length} matched segment${result.matches.length===1?'':'s'}`:`${result.matches.length} matched segment${result.matches.length===1?'':'s'} · no unknown words`;
    details.innerHTML=result.matches.slice(0,10).map(x=>`<span class="chip">${esc(x)}</span>`).join('');
    for(const item of result.unknown.slice(0,6)) {
      if(!item.suggestions.length) continue;
      const row=document.createElement('div');row.className='suggestionRow';
      const label=document.createElement('span');label.textContent=`${item.word} → Did you mean:`;row.append(label);
      for(const suggestion of item.suggestions) {
        const btn=document.createElement('button');btn.type='button';btn.className='suggestButton';btn.textContent=suggestion;
        btn.title=`Replace ${item.word} with ${suggestion}`;
        btn.addEventListener('click',()=>{
          const escaped=item.word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
          sourceText.value=sourceText.value.replace(new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped})(?=$|[^\\p{L}\\p{N}])`,'iu'),(_,pre)=>pre+suggestion);
          doTranslate();sourceText.focus();
        });row.append(btn);
      }
      suggestionsBox.append(row);
    }
  }
  sourceText.addEventListener('input',()=>{
    clearTimeout(liveTimer);
    liveTimer=setTimeout(doTranslate,170);
  });
  sourceText.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){clearTimeout(liveTimer);doTranslate();}});
  byId('translateBtn').addEventListener('click',doTranslate);
  byId('clearTranslate').addEventListener('click',()=>{sourceText.value='';doTranslate();sourceText.focus();});
  byId('copyTranslation').addEventListener('click',()=>{
    const value=output.textContent;
    if(value && value!=='—') copyText(value);
  });
  function renderDictionary() {
    const q=norm(search.value),type=typeFilter.value;
    const filtered=lexicon.filter(item=>{
      if(type && item.type!==type) return false;
      return !q || norm(item.drow).includes(q) || norm(item.english).includes(q) || norm(item.type).includes(q);
    });
    count.textContent=`${filtered.length} of ${lexicon.length} entries`;
    if(!filtered.length){results.innerHTML='<div class="empty">No matches found.</div>';return;}
    // Avoid injecting any field as raw HTML; the public dictionary is user-maintained.
    results.innerHTML=filtered.map((entry,i)=>`<article class="card">
      <div class="cardTop"><div class="word">${esc(entry.drow)}</div>${entry.type?`<div class="badge">${esc(entry.type)}</div>`:''}</div>
      <div class="eng">${esc(entry.english)}</div>
      <div class="actions"><button type="button" data-item="${i}">Copy Xrou</button></div>
    </article>`).join('');
    results.querySelectorAll('[data-item]').forEach(button=>button.addEventListener('click',async()=>{
      const word=filtered[Number(button.dataset.item)]?.drow;
      if(word && await copyText(word)){
        button.textContent='Copied!';setTimeout(()=>{button.textContent='Copy Xrou';},900);
      }
    }));
  }
  search.addEventListener('input',renderDictionary);
  typeFilter.addEventListener('change',renderDictionary);
  byId('clearSearch').addEventListener('click',()=>{search.value='';typeFilter.value='';renderDictionary();search.focus();});
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
      <div class="phraseXrou">${esc(entry.xrou)}</div>
      <div class="actions">
        <button type="button" data-pcopy="${i}">Copy Xrou</button>
        <button type="button" data-ptry="${i}" class="primary">Try in translator</button>
      </div>
    </article>`).join(''):'<div class="empty">No phrases match your search.</div>';
    const more=byId('phraseMore');more.hidden=filtered.length<=phraseVisible;
    more.textContent=`Show more phrases (${Math.max(0,filtered.length-phraseVisible)} remaining)`;
    pResults.onclick=async event=>{
      const button=event.target.closest('button[data-pcopy],button[data-ptry]');
      if(!button) return;
      const idx=Number(button.dataset.pcopy??button.dataset.ptry);
      const entry=shown[idx];if(!entry) return;
      if(button.hasAttribute('data-ptry')) useInTranslator(entry.english);
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
    // Phrase files are optional so an incomplete upload cannot break the dictionary.
    const loadJson=async file=>{
      try {const res=await fetch(file,{cache:'no-store'});if(!res.ok)throw Error(`${file}: HTTP ${res.status}`);
        const data=await res.json();return Array.isArray(data)?data:[];}
      catch(error){console.warn('Could not load',file,error);return [];}
    };
    [phrasebook,patterns]=await Promise.all([loadJson('./phrasebook.json'),loadJson('./patterns.json')]);
    phrasebook=phrasebook.filter(x=>x&&typeof x.english==='string'&&typeof x.xrou==='string');
    patterns=patterns.filter(x=>x&&typeof x.example_en==='string'&&typeof x.example_xrou==='string');
    engine=XrouEngine.createTranslator(lexicon,phrasebook);
    fillCategory(pCategory,phrasebook);fillCategory(gCategory,patterns);
    renderPhrasebook();renderPatterns();
    typeFilter.innerHTML='<option value="">All word types</option>'+
      [...new Set(lexicon.map(item=>item.type).filter(Boolean))].sort()
        .map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');
    renderDictionary();doTranslate();
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
