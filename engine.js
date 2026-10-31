/* Dvandva Xrou-Haxa Translator v5 — deterministic, offline translation helpers.
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
    he:'vise', she:'vise', they:'vise', him:'vise', them:'vise',
    my:'adam-', your:'da-tumu', our:'da-Xcsadam', their:'da-vise', his:'da-vise', her:'da-vise', mine:'dar-adam', yours:'dar-tumu',
    not:'vai', no:'vai', will:'thanatei', shall:'thanatei',
    'will not':'vai thanatei', 'should not':'vai vakhra', 'must not':'vai vakhra',
    'did not':'xanathes vai', "didn't":'xanathes vai',
    can:'shakta', cannot:'vai shakta', "can't":'vai shakta',
    could:'shakta-tha', "couldn't":'vai-shakta-tha',
    "won't":'vai thanatei', "don't":'vai', "doesn't":'vai', "didn't":'vai',
    "isn't":'vai xce', "aren't":'vai xce', "wasn't":'vai xce-tha', "weren't":'vai xce-tha',
    "shouldn't":'vai vakhra', "mustn't":'vai vakhra',
    "wouldn't":'vai iccha-tha', "mightn't":'vai sambhavit',
    am:'xce', are:'xce', is:'xce', be:'xce',
    child:'puxa', love:'pixrit', know:'xypremanah', understand:'xypremanah',
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
    'adam-':'my', 'da-tumu':'to you', 'da-xcsadam':'our', 'da-vise':'their', 'dar-tumu':'yours',
    'dar-adam':'mine', 'adam-javitaran':'my husband',
    'adam-matar':'my mother', 'adam-pitar':'my father',
    punar:'again', bali:'sacrifice', tumys:'you', vise:'they',
    rast:'yes', kripa:'please', xera:'good',
  };
  const pronouns = new Set(['adam','adar','adas','tumu','tumys','xcsadam','vise']);
  const beFor = x => ['adam','adar','adas'].includes(x) ? 'am' : x === 'tumu' || x === 'tumys' || x === 'xcsadam' ? 'are' : 'is';
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
    // Version 5 morphology. Explicit dictionary entries always win over derived forms.
    // -ys is a PROPOSED regular count-noun plural, inspired by the attested tumys.
    // Some nouns (notably puxa) also have an established collective reading.
    const nounEntry = (key,lang) => {
      const entry=(indexes[lang].get(norm(key))||[]).find(e=>e.key===norm(key) && /noun|family|title|endearment/i.test(e.entry.type||''));
      return entry?.entry || null;
    };
    const verbEntry = key => {
      const direct=EN_CANON[norm(key)];
      if (direct && !['','xce','vai'].includes(direct)) {
        // Canonical action roots are preferred over lexicon homonyms.
        if(['love','know','understand','protect','save','say','speak','give','want','desire','do'].includes(norm(key))) return direct;
      }
      const match=(indexes.en.get(norm(key))||[]).find(e=>e.key===norm(key) && /verb/.test(e.entry.type||''));
      return match?.entry.drow || null;
    };
    const preferredNoun={child:'puxa',children:'puxa'};
    const singularEnglish={children:'child',men:'man',women:'woman',people:'person',feet:'foot',teeth:'tooth',mice:'mouse',geese:'goose'};
    const pluralEnglish={child:'children',man:'men',woman:'women',person:'people',foot:'feet',tooth:'teeth',mouse:'mice',goose:'geese'};
    const toEnglishPlural = raw => {
      const word=String(raw).trim(),key=norm(word);
      if(pluralEnglish[key]) return pluralEnglish[key];
      if(/[^aeiou]y$/i.test(word)) return word.slice(0,-1)+'ies';
      if(/(s|sh|ch|x|z)$/i.test(word)) return word+'es';
      return word+'s';
    };
    const pastEnglish = raw => {
      const word=String(raw).trim();
      const irregular={go:'went',leave:'left',see:'saw',hear:'heard',speak:'spoke',say:'said',do:'did',have:'had',make:'made',eat:'ate',drink:'drank',give:'gave',take:'took',know:'knew',understand:'understood',become:'became',think:'thought',come:'came',run:'ran',buy:'bought',teach:'taught',bring:'brought',write:'wrote',read:'read',feel:'felt',sleep:'slept',find:'found',lose:'lost',fight:'fought',hold:'held'};
      if(irregular[norm(word)]) return irregular[norm(word)];
      if(/e$/i.test(word)) return word+'d';
      if(/[^aeiou]y$/i.test(word)) return word.slice(0,-1)+'ied';
      return word+'ed';
    };
    const englishVerbStem = raw => {
      const s=norm(raw);
      const irregular={went:'go',left:'leave',saw:'see',heard:'hear',spoke:'speak',said:'say',did:'do',had:'have',made:'make',ate:'eat',drank:'drink',gave:'give',took:'take',knew:'know',understood:'understand',became:'become',thought:'think',came:'come',ran:'run',bought:'buy',taught:'teach',brought:'bring',wrote:'write',read:'read',felt:'feel',slept:'sleep',found:'find',lost:'lose',fought:'fight',held:'hold'};
      if(irregular[s] && verbEntry(irregular[s])) return {stem:irregular[s],past:true};
      if(/ied$/.test(s) && verbEntry(s.slice(0,-3)+'y')) return {stem:s.slice(0,-3)+'y',past:true};
      if(/ed$/.test(s)) {
        for(const option of [s.slice(0,-1),s.slice(0,-2)]) if(verbEntry(option)) return {stem:option,past:true};
      }
      if(/ies$/.test(s) && verbEntry(s.slice(0,-3)+'y')) return {stem:s.slice(0,-3)+'y',past:false};
      if(/es$/.test(s) && verbEntry(s.slice(0,-2))) return {stem:s.slice(0,-2),past:false};
      if(/s$/.test(s) && verbEntry(s.slice(0,-1))) return {stem:s.slice(0,-1),past:false};
      return null;
    };
    const enNounSingular = raw => {
      const s=norm(raw);
      if(singularEnglish[s]) return singularEnglish[s];
      if(/ies$/.test(s) && nounEntry(s.slice(0,-3)+'y','en')) return s.slice(0,-3)+'y';
      if(/es$/.test(s) && nounEntry(s.slice(0,-2),'en')) return s.slice(0,-2);
      if(/s$/.test(s) && nounEntry(s.slice(0,-1),'en')) return s.slice(0,-1);
      return null;
    };
    const xrouNounRoot = raw => {
      // The hyphen is optional in manually entered nouns: matarys / matar-ys.
      const s=norm(raw).replace(/-ys$/,'ys');
      if(!s.endsWith('ys') || s.length<5) return null;
      const root=s.slice(0,-2);
      return nounEntry(root,'xrou') ? root : null;
    };
    const xrouEnglishNoun = raw => {
      const root=xrouNounRoot(raw);
      if(!root) return null;
      const entry=nounEntry(root,'xrou');
      return toEnglishPlural(XROU_CANON[root] || splitAliases(entry.english)[0]);
    };
    const pluralizeXrou = drow => /ys$/i.test(drow) ? drow : drow+'ys';
    function derivedToken(token,source) {
      const raw=token.raw, s=token.norm;
      if(source==='en') {
        // Only nouns already in the dictionary can be inflected.
        const singular=enNounSingular(s);
        if(singular && nounEntry(singular,'en')) {
          const root=preferredNoun[singular] || nounEntry(singular,'en').drow;
          return {text:pluralizeXrou(root),kind:'plural'};
        }
        const v=englishVerbStem(s);
        if(v) return {text:(v.past?'xanathes ':'')+verbEntry(v.stem),kind:v.past?'past':'verb'};
      } else {
        if(s.startsWith('adam-') && s.length>5) {
          const root=s.slice(5);
          const plain=nounEntry(root,'xrou');
          if(plain) return {text:'my '+(XROU_CANON[root] || splitAliases(plain.english)[0]),kind:'possessive'};
          const plural=xrouEnglishNoun(root);
          if(plural) return {text:'my '+plural,kind:'possessive plural'};
        }
        const plural=xrouEnglishNoun(s);
        if(plural) return {text:plural,kind:'plural'};
        if(s.startsWith('vai-') && s.length>4) {
          const root=s.slice(4),base=nounEntry(root,'xrou');
          if(base) return {text:'without '+splitAliases(base.english)[0],kind:'negative compound'};
        }
      }
      return null;
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
    const isNounSrc = s => !!nounEntry(s,'xrou') || !!xrouNounRoot(s) || !!(s.startsWith('adam-') && nounEntry(s.slice(5),'xrou'));
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
        if(part.src==='xanathes' && next==='vai' && parts[i+2]) {
          out.push({...part,text:'did not',end:parts[i+1].end});i++;continue;
        }
        if(part.src==='xanathes' && next && parts[i+1]) {
          const verb=parts[i+1].text;
          out.push({...part,text:pastForms[verb] || pastEnglish(verb),end:parts[i+1].end});i++;continue;
        }
        let txt=part.text;
        if(part.src==='vai' && !['xce','thanatei'].includes(next)) txt=pronouns.has(prev)?'do not':'do not';
        if(part.src==='xce' && pronouns.has(prev)) txt=beFor(prev);
        if(['da-tumu','da-xcsadam','da-vise'].includes(part.src) && parts[i+1] && !parts[i+1].unknown && isNounSrc(parts[i+1].src)) txt=({'da-tumu':'your','da-xcsadam':'our','da-vise':'their'})[part.src];
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
        if(['do','does','did'].includes(p.src) && n?.src==='not') {out.push({...p,text:p.src==='did'?'xanathes vai':'vai',end:n.end});i++;continue;}
        if(p.src==='my' && n && !n.unknown && (isNounSrc(norm(n.text)) || !!nounEntry(n.src,'en') || !!enNounSingular(n.src))) {
          out.push({...p,text:'adam-'+n.text,end:n.end});i++;continue;
        }
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
        const irregularPlural=source==='en' && Object.hasOwn(singularEnglish,tokens[i].norm) ? derivedToken(tokens[i],source) : null;
        const prev=tokens[i-1]?.norm;
        const contextualPast=source==='en' && !['did','had'].includes(tokens[i].norm) && ['i','you','he','she','we','they','it'].includes(prev) && englishVerbStem(tokens[i].norm)?.past ? derivedToken(tokens[i],source) : null;
        const preferredDerived=irregularPlural || contextualPast;
        const match=preferredDerived ? null : matchAt(tokens,i,source);
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
          const derived=preferredDerived || derivedToken(token,source);
          if(derived) {
            parts.push({src:token.norm,text:derived.text,start:token.start,end:token.end,unknown:false});
            matches.push(`${token.raw} → ${derived.text} (${derived.kind})`);
          } else {
            const guesses=suggestions(token.raw,source);
            unknown.push({word:token.raw,suggestions:guesses});
            parts.push({src:token.norm,text:`⟦${token.raw}⟧`,start:token.start,end:token.end,unknown:true});
          }
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
