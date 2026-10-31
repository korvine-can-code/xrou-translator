/* Dvandva Xrou-Haxa Translator v4 — deterministic, offline translation helpers.
   This is a starter grammar engine, not a complete model of Xrou grammar. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.XrouEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const norm = s => String(s ?? '').replace(/[’‘]/g, "'").toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const lexWords = text => (String(text).match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu) || []);
  const splitAliases = english => String(english || '').split(/\s*;\s*|\s+\/\s+/)
    .map(s => s.replace(/\s*\([^)]*\)/g,'').trim())
    .filter(Boolean);
  const EN_CANON = {
    i:'adam', me:'adam', you:'tumu', we:'Xcsadam', us:'Xcsadam',
    my:'adam-', your:'da-tumu', mine:'dar-adam', yours:'dar-tumu',
    not:'vai', no:'vai', will:'thanatei', shall:'thanatei',
    'will not':'vai thanatei', 'should not':'vai vakhra', 'must not':'vai vakhra',
    can:'shakta', cannot:'vai shakta', "can't":'vai shakta',
    could:'shakta-tha', "couldn't":'vai-shakta-tha',
    "won't":'vai thanatei', "don't":'vai', "doesn't":'vai', "didn't":'vai',
    "isn't":'vai xce', "aren't":'vai xce', "wasn't":'vai xce-tha', "weren't":'vai xce-tha',
    "shouldn't":'vai vakhra', "mustn't":'vai vakhra',
    "wouldn't":'vai iccha-tha', "mightn't":'vai sambhavit',
    am:'xce', are:'xce', is:'xce', be:'xce',
    love:'pixrit', know:'xypremanah', understand:'xypremanah',
    protect:'raksha', save:'raksha', good:'xera',
    say:'haxa', speak:'haxa', give:'yhanam',
    want:'kama', desire:'kama', please:'kripa',
    yes:'rast', again:'punar', do:'kara', does:'kara', did:'kara',
    the:'', a:'', an:'',
  };
  const XROU_CANON = {
    adam:'I', adar:'I', adas:'I', tumu:'you', xcsadam:'we',
    vai:'not', thanatei:'will', xanathes:'', xce:'is',
    shakta:'can', 'vai shakta':'cannot', 'vai-shakta':'unable',
    'shakta-tha':'could', 'vai-shakta-tha':'could not',
    'vai thanatei':'will not',
    pixrit:'love', xypremanah:'understand', raksha:'protect',
    kama:'want', haxa:'speak', kara:'do', bhava:'become',
    'adam-':'my', 'da-tumu':'to you', 'dar-tumu':'yours',
    'dar-adam':'mine', 'adam-javitaran':'my husband',
    'adam-matar':'my mother', 'adam-pitar':'my father',
    punar:'again', bali:'sacrifice', puxa:'child',
    rast:'yes', kripa:'please', xera:'good',
  };
  const pronouns = new Set(['adam','adar','adas','tumu','xcsadam','vise']);
  const beFor = x => ['adam','adar','adas'].includes(x) ? 'am' : x === 'tumu' || x === 'xcsadam' ? 'are' : 'is';
  const tokenize = s => {
    const re = /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu;
    const words=[]; let match;
    while((match=re.exec(s)) !== null) words.push({raw:match[0],norm:norm(match[0]),start:match.index,end:re.lastIndex});
    return words;
  };
  function levenshtein(a,b) {
    const row=Array.from({length:b.length+1}, (_,i)=>i);
    for(let i=1;i<=a.length;i++) {
      let previous=row[0];row[0]=i;
      for(let j=1;j<=b.length;j++) {
        const old=row[j];
        row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(a[i-1]===b[j-1]?0:1));
        previous=old;
      }
    }
    return row[b.length];
  }
  function createTranslator(lexicon, phrasebook=[]) {
    if (!Array.isArray(lexicon)) throw new TypeError('Lexicon must be an array');
    const indexes={en:new Map(),xrou:new Map()};
    // Exact phrase translations are curated independently of word-by-word grammar.
    // The longest common phrases have explicit context rather than guessing the sense of a root.
    const phraseKey = s => norm(s).replace(/[^\p{L}\p{N}'’\-]+/gu,' ').replace(/\s+/g,' ').trim();
    const fullPhrases={en:new Map(),xrou:new Map()};
    for(const phrase of phrasebook) {
      if(!phrase || !phrase.english || !phrase.xrou) continue;
      const en=phraseKey(phrase.english),xrou=phraseKey(phrase.xrou);
      if(en && !fullPhrases.en.has(en)) fullPhrases.en.set(en,phrase);
      if(xrou && !fullPhrases.xrou.has(xrou)) fullPhrases.xrou.set(xrou,phrase);
    }
    function add(lang,key,entry,override=false) {
      const word=norm(key), toks=lexWords(word).map(norm);
      if (!word || !toks.length) return;
      const base=toks[0];
      if (!indexes[lang].has(base)) indexes[lang].set(base,[]);
      const list=indexes[lang].get(base);
      if (!list.some(x=>x.key===word)) list.push({key:word,toks,entry,override});
    }
    // Prioritize a few known grammatical words over ambiguous ordinary dictionary senses.
    for(const [en,drow] of Object.entries(EN_CANON)) {
      if (drow) add('en',en,{drow,english:en,type:'grammar'},true);
    }
    for(const [drow,en] of Object.entries(XROU_CANON)) add('xrou',drow,{drow,english:en,type:'grammar'},true);
    for(const entry of lexicon) {
      if (!entry || !entry.drow || !entry.english) continue;
      add('xrou',entry.drow,entry);
      for(const en of splitAliases(entry.english)) add('en',en,entry);
    }
    for(const lang of ['en','xrou']) {
      for(const list of indexes[lang].values()) list.sort((a,b)=>b.toks.length-a.toks.length || Number(b.override)-Number(a.override));
    }
    const vocab={en:[...indexes.en.keys()],xrou:[...indexes.xrou.keys()]};
    function suggestions(input,lang,max=3) {
      const target=norm(input), options=[];
      if(target.length<3) return [];
      for(const key of vocab[lang]) {
        if(!key || Math.abs(key.length-target.length)>3 || key.includes(' ')) continue;
        const dist=levenshtein(target,key);
        if (dist<=Math.max(1,Math.min(3,Math.floor(target.length*.30))) || key.startsWith(target)) options.push({key,dist});
      }
      return options.sort((a,b)=>a.dist-b.dist || a.key.length-b.key.length).slice(0,max).map(x=>x.key);
    }
    function matchAt(tokens,i,source) {
      const candidates=indexes[source].get(tokens[i].norm)||[];
      for(const entry of candidates) {
        if (i+entry.toks.length>tokens.length) continue;
        let good=true;
        for(let j=0;j<entry.toks.length;j++) {
          if (tokens[i+j].norm!==entry.toks[j]) {good=false;break;}
          if (j && tokens[i+j-1].end<tokens[i+j].start) {
            const between=currentText.slice(tokens[i+j-1].end,tokens[i+j].start);
            if(!/^\s+$/.test(between)) {good=false;break;}
          }
        }
        if(good) return {entry, count:entry.toks.length};
      }
      return null;
    }
    let currentText='';
    const pastForms={love:'loved',want:'wanted',protect:'protected',understand:'understood',know:'knew',give:'gave',do:'did',speak:'spoke',go:'went',become:'became',see:'saw',eat:'ate',hear:'heard',make:'made'};
    function englishForXrou(segment) {
      const d=norm(segment.drow);
      if (Object.hasOwn(XROU_CANON,d)) return XROU_CANON[d];
      if (d.startsWith('adam-')) {
        const rest=d.slice(5);
        const lookup=indexes.xrou.get(rest)?.find(x=>x.key===rest);
        if(lookup) return 'my '+(XROU_CANON[rest]||splitAliases(lookup.entry.english)[0]);
      }
      return splitAliases(segment.english)[0] || segment.english;
    }
    function englishAdjust(parts) {
      const out=[];
      for(let i=0;i<parts.length;i++) {
        const part=parts[i], prev=parts[i-1]?.src, prev1=parts[i-2]?.src, next=parts[i+1]?.src;
        if(part.src==='vai' && next==='thanatei') {
          out.push({...part,text:'will not',end:parts[i+1].end});i++;continue;
        }
        if(part.src==='vai' && next==='xce' && pronouns.has(prev)) {
          out.push({...part,text:beFor(prev)+' not',end:parts[i+1].end});i++;continue;
        }
        if(part.src==='xanathes' && next && parts[i+1]) {
          const verb=parts[i+1].text;
          out.push({...part,text:pastForms[verb] || ('previously '+verb),end:parts[i+1].end});i++;continue;
        }
        let txt=part.text;
        if(part.src==='vai' && !['xce','thanatei'].includes(next)) txt=pronouns.has(prev)?'do not':'do not';
        if(part.src==='xce' && pronouns.has(prev)) txt=beFor(prev);
        if(part.src==='bali' && (prev==='xce'||out[out.length-1]?.text?.endsWith(' not'))) {
          txt='a sacrifice';
        }
        out.push({...part,text:txt});
      }
      return out;
    }
    function englishToXrou(parts) {
      const out=[];
      for(let i=0;i<parts.length;i++) {
        const p=parts[i],n=parts[i+1];
        if(['am','are','is'].includes(p.src) && n?.src==='not') {
          out.push({...p,text:'vai xce',end:n.end}); i++; continue;
        }
        if(p.src==='will' && n?.src==='not') {out.push({...p,text:'vai thanatei',end:n.end});i++;continue;}
        if(['do','does','did'].includes(p.src) && n?.src==='not') {out.push({...p,text:'vai',end:n.end});i++;continue;}
        if(['a','an','the'].includes(p.src)) {out.push({...p,text:''});continue;}
        out.push(p);
      }
      return out;
    }
    function translateLine(line,source) {
      currentText=line;
      const full=fullPhrases[source].get(phraseKey(line));
      if(full) {
        const translation=(source==='en'?full.xrou:full.english).replace(/[.!?]+$/,'');
        const leading=(line.match(/^\s*/)||[''])[0];
        const trailing=(line.match(/\s*$/)||[''])[0];
        const label=source==='en'?full.english:full.xrou;
        return {text:leading+translation+trailing,matches:[`Phrasebook: ${label.trim()} → ${translation}`],unknown:[],segments:[]};
      }
      const tokens=tokenize(line);
      if(!tokens.length) return {text:line,matches:[],unknown:[],segments:[]};
      const parts=[],matches=[],unknown=[];
      for(let i=0;i<tokens.length;) {
        const match=matchAt(tokens,i,source);
        if(match) {
          const {entry,count}=match, phrase=tokens.slice(i,i+count).map(w=>w.raw).join(' ');
          const drow=entry.entry.drow;
          const en=entry.entry.english;
          const target=source==='en'?drow:englishForXrou({drow,english:en});
          parts.push({src:norm(phrase),text:target,start:tokens[i].start,end:tokens[i+count-1].end,unknown:false});
          matches.push(`${phrase} → ${target}`);
          i+=count;
        } else {
          const token=tokens[i];
          const guesses=suggestions(token.raw,source);
          unknown.push({word:token.raw,suggestions:guesses});
          parts.push({src:token.norm,text:`⟦${token.raw}⟧`,start:token.start,end:token.end,unknown:true});
          i++;
        }
      }
      const processed=source==='xrou'?englishAdjust(parts):englishToXrou(parts);
      let out='',pos=0;
      for(const p of processed) {
        // preserve all original punctuation, but normalize whitespace after skipped grammar particles.
        out += line.slice(pos,p.start) + (p.text||'');
        pos=p.end;
      }
      out+=line.slice(pos);
      out=out.replace(/[ \t]{2,}/g,' ').replace(/\s+([,;:.!?])/g,'$1').trim();
      if(source==='en' && /^[A-Z]/.test(line.trim())) out=out.replace(/^([\p{L}])/u,s=>s.toUpperCase());
      if(source==='xrou' && /[\p{L}]/u.test(out)) out=out.replace(/^([\p{L}])/u,s=>s.toUpperCase());
      return {text:out,matches,unknown,segments:processed};
    }
    function translate(text,source='en') {
      if(source!=='en' && source!=='xrou') throw new Error('Invalid source language');
      if(!String(text).trim()) return {text:'—',matches:[],unknown:[]};
      const lines=String(text).split(/(\n+)/);
      const translated=[];const matches=[],unknown=[];
      for(let i=0;i<lines.length;i++) {
        if(/^\n+$/.test(lines[i])) { translated.push(lines[i]); continue; }
        const sentences=lines[i].split(/([.!?]+(?=\s|$))/);
        for(const sentence of sentences) {
          if(/^[.!?]+$/.test(sentence)) {translated.push(sentence);continue;}
          const res=translateLine(sentence,source);
          translated.push(res.text);matches.push(...res.matches);unknown.push(...res.unknown);
        }
      }
      let output=translated.join('').replace(/ +\n/g,'\n');
      // English retains sentence capitalization after punctuation, even for multi-sentence text.
      if(source==='xrou') output=output.replace(/([.!?]\s+)([a-z])/g,(_,a,b)=>a+b.toUpperCase());
      return {text:output,matches,unknown};
    }
    return {translate,suggestions,norm};
  }
  return {createTranslator,norm};
});
