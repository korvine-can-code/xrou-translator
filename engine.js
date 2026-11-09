/* Dvandva Xrou-Haxa Translator v26 — clause-aware, deterministic, offline translation helpers.
   This is a starter grammar engine, not a complete model of Xrou grammar. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.XrouEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const norm = s => String(s ?? '').replace(/[’‘]/g, "'").toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const lexWords = text => (String(text).match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu) || []);
  // Resolve familiar English contractions BEFORE word/phrase matching.
  // Do not generically expand apostrophe-s: "the sailor's" is possessive, not "the sailor is".
  // English apostrophe-d is ambiguous (had / would); choose would as a conservative default.
  const CONTRACTIONS = {
    "i'm":"I am", "you're":"you are", "we're":"we are", "they're":"they are",
    "he's":"he is", "she's":"she is", "it's":"it is", "that's":"that is",
    "this's":"this is", "there's":"there is", "here's":"here is",
    "what's":"what is", "who's":"who is", "where's":"where is", "when's":"when is",
    "why's":"why is", "how's":"how is",
    "i've":"I have", "you've":"you have", "we've":"we have", "they've":"they have",
    "could've":"could have", "would've":"would have", "should've":"should have", "might've":"might have", "must've":"must have",
    "i'll":"I will", "you'll":"you will", "he'll":"he will", "she'll":"she will", "it'll":"it will",
    "we'll":"we will", "they'll":"they will", "that'll":"that will", "there'll":"there will",
    "i'd":"I would", "you'd":"you would", "he'd":"he would", "she'd":"she would",
    "we'd":"we would", "they'd":"they would", "it'd":"it would", "that'd":"that would",
    "isn't":"is not", "aren't":"are not", "wasn't":"was not", "weren't":"were not",
    "can't":"cannot", "cannot":"cannot", "won't":"will not", "shan't":"shall not",
    "don't":"do not", "doesn't":"does not", "didn't":"did not",
    "couldn't":"could not", "wouldn't":"would not", "shouldn't":"should not",
    "mustn't":"must not", "mightn't":"might not", "needn't":"need not",
    "hasn't":"has not", "haven't":"have not", "hadn't":"had not",
    "let's":"let us", "ain't":"is not", "y'all":"you all",
    "how'd":"how did", "where'd":"where did", "who'd":"who did", "what'd":"what did", "why'd":"why did",
    "that'd":"that would", "there'd":"there would",
    "who'll":"who will", "what'll":"what will", "where'll":"where will",
    "couldn't've":"could not have", "wouldn't've":"would not have", "shouldn't've":"should not have",
    "i'd've":"I would have", "you'd've":"you would have", "we'd've":"we would have", "they'd've":"they would have"
  };
  // Surrounding boundaries prevent replacement inside longer words or possessives.
  const contractionRe = /(^|[^\p{L}\p{N}])([\p{L}]+(?:['’‘][\p{L}]+)+)(?=$|[^\p{L}\p{N}])/gu;
  function expandEnglishContractions(text) {
    return String(text).replace(contractionRe,(matched,prefix,word,offset,whole) => {
      let expansion=CONTRACTIONS[norm(word)];
      if(!expansion) return matched;
      // Apostrophe-s/d may be a perfect construction, not a copula/conditional.
      // For example: "she's eaten" = "she has eaten"; "I'd gone" = "I had gone".
      const tail=String(whole).slice(offset+matched.length).trimStart();
      const following=tail.match(/^[\p{L}]+/u)?.[0]?.toLowerCase() || '';
      if (['he\'s','she\'s','it\'s','that\'s','who\'s','there\'s'].includes(norm(word))
          && ['been','gone','seen','done','eaten','drunk','written','taken','given','spoken','known','found','lost','made','broken','left','come','had','read','heard','felt','bought','taught','brought','slept','run'].includes(following)) {
        expansion=expansion.replace(/ is$/, ' has');
      }
      if (['i\'d','you\'d','he\'d','she\'d','we\'d','they\'d','it\'d'].includes(norm(word))
          && ['been','gone','seen','done','eaten','drunk','written','taken','given','spoken','known','found','lost','made','broken','left','come','had','read','heard','felt','bought','taught','brought','slept','run'].includes(following)) {
        expansion=expansion.replace(/ would$/, ' had');
      }
      const adjusted=/^[A-Z]/.test(word) ? expansion[0].toUpperCase()+expansion.slice(1) : expansion;
      return prefix+adjusted;
    });
  }
  const splitAliases = english => String(english || '').split(/\s*;\s*|\s+\/\s+/)
    .map(s => s.replace(/\s*\([^)]*\)/g,'').trim())
    .filter(Boolean);
  const EN_CANON = {
    'fuck':'xha', 'fucking':'xha', 'damn':'vekh', 'shit':'vekh',
    // Cultural roots and element analogues (Version 14)
    // Version 15 — Astralith professions and resources. Root words remain consistent.
    magic:'jadugari', mage:'jadugar', wizard:'jadugar',
    user:'prayokta', wielder:'prayokta',
    caster:'mantra-prayokta', spellcaster:'mantra-prayokta',
    'magic user':'jadugari-prayokta', 'magic-user':'jadugari-prayokta',
    mana:'mantra-bal', anima:'jiva-sara', 'life essence':'jiva-sara',
    alchemy:'rasayan', blacksmithing:'lohar-kaam',
    kill:'xamarjivre', death:'thanata',
    alchemist:'rasayanik', blacksmith:'lohar', medic:'vaidya',
    knight:'pratijna-yoddha', fighter:'ladaka', warrior:'yoddha',
    potion:'rasayan-peya', potions:'rasayan-peyays',
    doing:'kara', delusion:'Bhranti', astralith:'shapa-dharaka-burj',
    metal:'dhatu', wind:'vayu', fire:'agni', ice:'baraf', water:'jal',
    lightning:'yhadhatu-agni', thunder:'upari-pratidhvaniys',
    sky:'upari', above:'upari', earth:'bhumi', dirt:'mitti', soil:'mitti',
    agreement:'sahamati', pact:'sandhi', blood:'xun', bone:'asthi',
    magma:'bhumi-agni', fate:'niyati', red:'xun',
    silver:'yhadhatu', holy:'yha', sacred:'yha', hallowed:'yha', speech:'haxa',
    'holy spider':'yhamakari', 'sacred spider':'yhamakari', crown:'shikhara', pinnacle:'shikhara',
    spider:'Makari', web:'Makari-jala', desert:'vai-jal',
    tree:'paudha-stambha', trees:'paudha-stambhays', forest:'paudha-stambhays',
    meadow:'vai-paudha-stambhays',
    demon:'Naefrazata', demons:'Naefrazata', neverborn:'Naefrazata',
    soul:'Viv', cut:'kpva', severed:'Viv-kpva',
    elf:'Sama-xun', elves:'Sama-xun', 'high elf':'Ucca-xun', 'high elves':'Ucca-xun',
    draconian:'Skar-xrou', draconians:'Skar-xrou',
    wildkin:'ardha-rax', human:'Ozzen-xrou', humans:'Ozzen-xrou',
    'skin-changer':'tvaka-parnaxcsapxcal',
    drow:'xrou', xrou:'xrou', people:'xrou',
    master:'natha', lord:'natha',
    wolf:'bhediya', wolves:'bhediyays',
    werewolf:'tvaka-parnaxcsapxcal', werewolves:'tvaka-parnaxcsapxcal',
    'skin-changer':'tvaka-parnaxcsapxcal', 'skin-changers':'tvaka-parnaxcsapxcal',
    moon:'ratri-mani', moons:'ratri-maniys',
    star:'ratri-kingari', stars:'ratri-kingariys',
    moonlight:'ratri-mani-prakasha',
    sunlander:'Ozzen-xrou', sunlanders:'Ozzen-xrou',
    'surface-dweller':'Ozzen-xrou', 'surface-dwellers':'Ozzen-xrou',
    'surface dweller':'Ozzen-xrou', 'surface dwellers':'Ozzen-xrou',
    'sun folk':'Ozzen-xrou', 'sun-folk':'Ozzen-xrou',
    // Register-specific first-person pronouns are selected after translating.
    i:'adam', me:'adam', you:'tumu', 'you all':'tumys', "y'all":'tumys', we:'Xcsadam', us:'Xcsadam',
    truth:'mitr', lie:'vai-mitr', untruth:'vai-mitr', falsehood:'vai-mitr',
    frog:'bizaza', big:'vaz', large:'vaz', theft:'kori', stealing:'kori',
    lord:'Xatra', lady:'Xatrani',
    he:'vise', she:'vise', they:'vise', him:'vise', them:'vise',
    my:'adam-', your:'da-tumu', our:'da-Xcsadam', their:'da-vise', his:'da-vise', her:'da-vise', mine:'dar-adam', yours:'dar-tumu',
    not:'vai', no:'vai', will:'thanatei', shall:'thanatei',
    'will not':'vai thanatei', 'should not':'vai vakhra', 'must not':'vai vakhra',
    go:'caxra', leave:'caxra', stop:'vasa',
    what:'kim', where:'kutra', why:'kasma', how:'katham', who:'kaun', when:'yadau',
    for:'da', to:'prati', 'for me':'da-adam', 'for you':'da-tumu', 'for us':'da-Xcsadam', 'for them':'da-vise',
    'to me':'da-adam', 'to you':'da-tumu', 'to us':'da-Xcsadam', 'to them':'da-vise',
    'did not':'xanathes vai', "didn't":'xanathes vai',
    can:'shakta', cannot:'vai shakta', "can't":'vai shakta',
    could:'shakta-tha', "couldn't":'vai-shakta-tha',
    "won't":'vai thanatei', "don't":'vai', "doesn't":'vai', "didn't":'vai',
    "isn't":'vai xce', "aren't":'vai xce', "wasn't":'vai xce-tha', "weren't":'vai xce-tha',
    "shouldn't":'vai vakhra', "mustn't":'vai vakhra',
    "wouldn't":'vai iccha-tha', "mightn't":'vai sambhavit',
    am:'xce', are:'xce', is:'xce', be:'xce', was:'xanathes xce', were:'xanathes xce',
    child:'puxa', love:'pixrit', know:'xypremanah', understand:'xypremanah',
    protect:'raksha', save:'raksha', good:'xera',
    say:'haxa', speak:'haxa', give:'yhanam',
    want:'kama', desire:'kama', please:'kripa',
    yes:'rast', again:'punar', do:'kara', does:'kara', did:'kara',
    the:'', a:'', an:'',
  };
  const XROU_CANON = {
    xha:'fuck', vekh:'damn', 'xha-vekh':'fucking hell',
    // Canonical cultural vocabulary, with explicit reverse forms.
    // Preferred reverse meanings for new Xrou-derived terms.
    jadugari:'magic', jadugar:'mage', prayokta:'user',
    'jadugari-prayokta':'magic user', 'mantra-prayokta':'caster',
    'mantra-bal':'mana', 'jiva-sara':'anima',
    rasayan:'alchemy', 'lohar-kaam':'blacksmithing',
    xamarjivre:'kill', thanata:'death',
    rasayanik:'alchemist', lohar:'blacksmith', vaidya:'medic',
    'pratijna-yoddha':'knight', ladaka:'fighter', yoddha:'warrior',
    'rasayan-peya':'potion',
    xrou:'Drow', 'ozzen-xrou':'sunlander',
    viv:'soul', kpva:'cut', 'viv-kpva':'severed',
    naefrazata:'demon', 'naefraza-bhogya':"demon's pactee", ipuhry:'magicless Drow',
    'ucca-xun':'high elf', 'sama-xun':'elf', dvar:'dwarf',
    'skar-xrou':'draconian', 'ardha-rax':'wildkin',
    xun:'blood',
    'shapa-dharaka-burj':'Astralith',
    'yhadhatu':'silver', 'yhadhatu-agni':'lightning', yha:'holy',
    'upari-pratidhvaniys':'thunder', 'bhumi-agni':'magma',
    niyati:'fate', 'makari-jala':'web',
    'vai-jal':'desert', 'paudha-stambha':'tree',
    'paudha-stambhays':'forest', 'vai-paudha-stambhays':'meadow',
    shikhara:'crown',
    'ozzendaihyu-priya':'Solstice', 'yhadhatu-haxa':'Faesong',
    agraha:'Delusion', 'eka-saha-prakriti':'Heartwood',
    'pustaka-dharaka':'Mnemosyne', 'vai-drishti-krita':'Unseeing',
    natha:'master', 'adam-natha':'my master',
    bhediya:'wolf', bhediyays:'wolves',
    'tvaka-parnaxcsapxcal':'werewolf',
    'ratri-mani':'moon', 'ratri-maniys':'moons',
    'ratri-kingari':'star', 'ratri-kingariys':'stars',
    'ratri-mani-prakasha':'moonlight',
    // Accept either speech register in Xrou → English, regardless of toggle.
    adam:'I', adar:'I', adal:'I', adamys:'we', tumu:'you', xcsadam:'we',
    mitr:'truth', 'vai-mitr':'lie', bizaza:'frog', xatra:'Lord', xatrani:'Lady',
    vaz:'big', kori:'theft',
    vai:'not', thanatei:'will', xanathes:'', xce:'is',
    shakta:'can', 'vai shakta':'cannot', 'vai-shakta':'unable',
    'shakta-tha':'could', 'vai-shakta-tha':'could not',
    'vai thanatei':'will not',
    pixrit:'love', xypremanah:'understand', raksha:'protect',
    kama:'want', haxa:'speak', kara:'do', bhava:'become',
    'adam-':'my', 'da-tumu':'to you', 'da-xcsadam':'our', 'da-adamys':'our', 'da-vise':'their', 'dar-tumu':'yours',
    'dar-adam':'mine', 'adam-javitaran':'my husband',
    'adam-matar':'my mother', 'adam-pitar':'my father',
    punar:'again', bali:'sacrifice', tumys:'you all', vise:'they',
    da:'for', prati:'to', saha:'with', upari:'above', adhas:'under', antar:'in', bahir:'out',
    uta:'and', athva:'or', lekin:'but', kyunki:'because', idias:'if', kintu:'although', paryanta:'until',
    'vai-saha':'without', 'karana-da':'because of', 'vishaya-da':'about', 'antara-madhye':'between',
    rast:'yes', kripa:'please', xera:'good',
  };
  const pronouns = new Set(['adam','adar','adal','adamys','tumu','tumys','xcsadam','vise']);
  const beFor = x => ['adam','adar','adal'].includes(x) ? 'am' : ['tumu','tumys','xcsadam','adamys'].includes(x) ? 'are' : 'is';
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
  // Xrou register is a surface form, not a different lexicon or grammar.
  // Apply only to standalone first-person pronouns. Never change compounds
  // like adam-matar (my mother), da-Xcsadam (our), or proper names.
  // A deliberate exception: Xcsadam ⇄ adamys may appear in standalone phrases.
  function applyXrouRegister(text,mode='casual',gender='neutral') {
    const current=mode==='formal'?'formal':'casual';
    const form=['masculine','feminine','neutral'].includes(gender)?gender:'neutral';
    const first=current==='casual'?'adam':({masculine:'adam',feminine:'adar',neutral:'adal'}[form]);
    const plural=current==='casual'?'adamys':'Xcsadam';
    // Preserve user-facing unknown markers as-is.
    return String(text).split(/(⟦[^⟧]*⟧)/g).map(chunk=>{
      if(chunk.startsWith('⟦'))return chunk;
      const withOur=chunk.replace(/(?<![\p{L}\p{N}-])(da-xcsadam|da-adamys)(?![\p{L}\p{N}-])/giu,original=>{
        const possessive=current==='casual'?'da-adamys':'da-Xcsadam';
        return /^[A-Z]/.test(original)?possessive[0].toUpperCase()+possessive.slice(1):possessive;
      });
      return withOur.replace(/(?<![\p{L}\p{N}-])(xcsadam|adamys|adam|adar|adal|adas)(?![\p{L}\p{N}-])/giu,original=>{
        const v=norm(original);
        const replacement=['xcsadam','adamys'].includes(v)?plural:first;
        return /^[A-Z]/.test(original)?replacement[0].toUpperCase()+replacement.slice(1):replacement;
      });
    }).join('');
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
    // Dictionary words for motion and benefaction are handled by the contextual English postprocessor.
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
        if(['love','know','understand','protect','save','say','speak','give','want','desire','do','go','leave','stop'].includes(norm(key))) return direct;
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
      const irregular={go:'went',leave:'left',see:'saw',hear:'heard',speak:'spoke',say:'said',do:'did',have:'had',make:'made',eat:'ate',drink:'drank',give:'gave',take:'took',know:'knew',understand:'understood',become:'became',think:'thought',come:'came',run:'ran',buy:'bought',teach:'taught',bring:'brought',write:'wrote',read:'read',feel:'felt',sleep:'slept',find:'found',lose:'lost',fight:'fought',hold:'held',swim:'swam',break:'broke',choose:'chose',drive:'drove',fly:'flew',stand:'stood',sit:'sat',meet:'met',keep:'kept',send:'sent',begin:'began',sing:'sang',fall:'fell',pay:'paid',sell:'sold',tell:'told',wear:'wore',grow:'grew',cut:'cut',put:'put',hit:'hit'};
      if(irregular[norm(word)]) return irregular[norm(word)];
      if(/e$/i.test(word)) return word+'d';
      if(/[^aeiou]y$/i.test(word)) return word.slice(0,-1)+'ied';
      return word+'ed';
    };
    // English inflection: generate candidates, then accept only established Xrou verb roots.
    // No new Xrou stems are invented. Handle -ing, -s, -ed and common irregular forms.
    const irregularVerbForms={
      went:'go', gone:'go', ran:'run', left:'leave', came:'come', saw:'see', seen:'see',
      heard:'hear', spoke:'speak', spoken:'speak', said:'say', did:'do', done:'do',
      had:'have', has:'have', made:'make', ate:'eat', eaten:'eat',
      drank:'drink', drunk:'drink', gave:'give', given:'give',
      took:'take', taken:'take', knew:'know', known:'know',
      understood:'understand', became:'become', thought:'think',
      bought:'buy', taught:'teach', brought:'bring', wrote:'write', written:'write',
      felt:'feel', slept:'sleep', found:'find', lost:'lose', fought:'fight',
      held:'hold', broke:'break', broken:'break', chose:'choose', chosen:'choose',
      drove:'drive', driven:'drive', flew:'fly', flown:'fly',
      stood:'stand', sat:'sit', met:'meet', kept:'keep', sent:'send',
      began:'begin', begun:'begin', sang:'sing', sung:'sing',
      fell:'fall', fallen:'fall', swam:'swim', swum:'swim',
      paid:'pay', sold:'sell', told:'tell', wore:'wear', worn:'wear',
      grew:'grow', grown:'grow', cut:'cut', put:'put', hit:'hit', read:'read'
    };
    function englishVerbStem(raw) {
      const s=norm(raw);
      if (irregularVerbForms[s] && verbEntry(irregularVerbForms[s])) {
        const present = ['has'].includes(s);
        return {stem:irregularVerbForms[s],tense:present?'present':'past',past:!present};
      }
      let candidates=[],tense='present';
      if(s.endsWith('ing') && s.length>5) {
        tense='progressive';
        const base=s.slice(0,-3);
        candidates=[base,base+'e'];
        // running -> run; swimming -> swim; stopping -> stop.
        if(base.length>=2 && base.at(-1)===base.at(-2)) candidates.push(base.slice(0,-1));
        // lying/dying/tying -> lie/die/tie.
        if(base.endsWith('y')) candidates.push(base.slice(0,-1)+'ie');
      } else if(s.endsWith('ied') && s.length>4) {
        tense='past';candidates=[s.slice(0,-3)+'y'];
      } else if(s.endsWith('ed') && s.length>3) {
        tense='past';
        const base=s.slice(0,-2);
        candidates=[s.slice(0,-1),base];
        if(base.length>=2 && base.at(-1)===base.at(-2)) candidates.push(base.slice(0,-1));
      } else if(s.endsWith('ies') && s.length>4) {
        candidates=[s.slice(0,-3)+'y',s.slice(0,-1)];
      } else if(s.endsWith('es') && s.length>3) {
        candidates=[s.slice(0,-1),s.slice(0,-2)];
      } else if(s.endsWith('s') && s.length>2) {
        candidates=[s.slice(0,-1)];
      }
      for(const stem of [...new Set(candidates)]) if(verbEntry(stem)) return {stem,tense,past:tense==='past'};
      return null;
    }
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
        if(v) return {text:(v.past?'xanathes ':'')+verbEntry(v.stem),kind:v.past?'past':v.tense==='progressive'?'progressive':'verb'};
      } else {
        if(s.startsWith('adam-') && s.length>5) {
          const root=s.slice(5);
          const plain=nounEntry(root,'xrou');
          if(plain) return {text:'my '+(XROU_CANON[root] || splitAliases(plain.english)[0]),kind:'possessive'};
          const plural=xrouEnglishNoun(root);
          if(plural) return {text:'my '+plural,kind:'possessive plural'};
        }
        // Productive sacred prefix; e.g. yhabhediya => holy wolf.
        // Prefer exact lexicon headwords (handled by matchAt) over this fallback.
        if(s.startsWith('yha') && s.length>3) {
          const root=s.slice(3);
          const base=indexes.xrou.get(root)?.find(e=>e.key===root);
          if(base) return {text:'holy '+(XROU_CANON[root] || splitAliases(base.entry.english)[0]),kind:'sacred compound'};
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
    const pastForms={love:'loved',want:'wanted',protect:'protected',understand:'understood',know:'knew',give:'gave',do:'did',speak:'spoke',go:'went',become:'became',see:'saw',eat:'ate',hear:'heard',make:'made',run:'ran',write:'wrote',drink:'drank',sleep:'slept',fight:'fought',buy:'bought',take:'took',find:'found',leave:'left',come:'came'};
    function englishForXrou(segment) {
      const d=norm(segment.drow);
      if (Object.hasOwn(XROU_CANON,d)) return XROU_CANON[d];
      if (d.startsWith('adam-')) {
        const rest=d.slice(5);
        const lookup=indexes.xrou.get(rest)?.find(x=>x.key===rest);
        if(lookup) return 'my '+(XROU_CANON[rest]||splitAliases(lookup.entry.english)[0]);
      }
      return (splitAliases(segment.english)[0] || segment.english).replace(/[.!?]+$/,'');
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
        if(part.src==='vai' && !['xce','thanatei'].includes(next)) {
          // Negative particle modifies the following verb; English needs an auxiliary.
          // Avoid attaching 'do not' to an adjective/noun without grammatical evidence.
          const nextVerb=next && isXrouAction(next);
          txt=nextVerb && pronouns.has(prev) ? 'do not' : 'not';
        }
        if(part.src==='xce' && pronouns.has(prev)) txt=beFor(prev);
        if(['da-tumu','da-xcsadam','da-adamys','da-vise'].includes(part.src) && parts[i+1] && !parts[i+1].unknown && isNounSrc(parts[i+1].src)) txt=({'da-tumu':'your','da-xcsadam':'our','da-adamys':'our','da-vise':'their'})[part.src];
        if(part.src==='bali' && (prev==='xce'||out[out.length-1]?.text?.endsWith(' not'))) {
          txt='a sacrifice';
        }
        out.push({...part,text:txt});
      }
      return out;
    }
    // V25: Realize simple Xrou clauses rather than blindly replacing each word.
    // Xrou's attested examples use S-V-O order, subject -> tense/negative -> verb.
    // This is deliberately conservative: no unattested syntactic morphology is invented.
    const xrouActionRoots=new Set(['pixrit','kama','kara','khad','raksha','caxra',
      'xypremanah','haxa','yhanam','bhava','xamarjivre','draugov','vasa']);
    function isXrouAction(root) {
      const key=norm(root);
      if(xrouActionRoots.has(key))return true;
      const entries=indexes.xrou.get(key)||[];
      return entries.some(item=>item.key===key && /(^|[\s\/])verb($|[\s\/])/i.test(item.entry.type||''));
    }
    const subjectPronouns=new Set(['adam','adar','adal','adamys','xcsadam','tumu','tumys','vise']);
    const objectPronouns={adam:'me',adar:'me',adal:'me',adamys:'us',xcsadam:'us',tumu:'you',tumys:'you'};
    const singularThirdPronouns=new Set(['he','she','it','this','that']);
    function conjugateEnglishPresent(verb) {
      const irregular={be:'is',have:'has',do:'does',go:'goes',say:'says'};
      const word=String(verb);
      if(irregular[norm(word)])return irregular[norm(word)];
      if(/[^aeiou]y$/i.test(word))return word.slice(0,-1)+'ies';
      if(/(s|sh|ch|x|z|o)$/i.test(word))return word+'es';
      return word+'s';
    }
    function realizeXrouClause(parts, options={}) {
      // Keep earlier morphology and phrase recognition, but resolve English case,
      // tense agreement and do-support using the entire clause.
      const out=englishAdjust(parts).map(item=>({...item}));
      if(!out.length)return out;
      const viseReading=['he','she','they'].includes(options.vise)?options.vise:'they';
      const originalFirst=parts[0]?.src;
      const hasSubject=subjectPronouns.has(originalFirst)||originalFirst==='etha';
      const subjectEnglish=originalFirst==='vise'?viseReading:
        ['adam','adar','adal'].includes(originalFirst)?'I':
        ['adamys','xcsadam'].includes(originalFirst)?'we':
        ['tumu','tumys'].includes(originalFirst)?'you':
        originalFirst==='etha'?'this':null;
      const thirdSingular=singularThirdPronouns.has(subjectEnglish);
      let hasAuxiliary=false,finiteVerbSeen=false;
      for(let i=0;i<out.length;i++) {
        const p=out[i],root=p.src;
        if(subjectPronouns.has(root)) {
          const isSubject=i===0 && hasSubject;
          if(root==='vise') p.text=isSubject?viseReading:({he:'him',she:'her',they:'them'}[viseReading]);
          else if(!isSubject && Object.hasOwn(objectPronouns,root)) p.text=objectPronouns[root];
          else if(isSubject && ['adam','adar','adal'].includes(root))p.text='I';
          else if(isSubject && ['adamys','xcsadam'].includes(root))p.text='we';
          else if(root==='tumys')p.text='you all';
        }
        // English copulas must agree with the subject, even when Xrou uses
        // the same grammatical root xce for everyone.
        if(root==='xce' && hasSubject) p.text=subjectEnglish==='I'?'am':
          thirdSingular?'is':'are';
        if(root==='vai' && /^(do|does) not$/.test(p.text)) {
          // 'vai yatha' is NOT an established English action verb; it is a
          // relational expression. Don't hallucinate a do-support construction.
          if(!hasSubject || !isXrouAction(parts[i+1]?.src))p.text='not';
          else p.text=thirdSingular?'does not':'do not';
        }
        if(root==='vai' && /^(am|are|is) not$/.test(p.text))
          p.text=(subjectEnglish==='I'?'am':thirdSingular?'is':'are')+' not';
        if(/^(will( not)?|did not|do not|does not|can( not)?|could( not)?|would( not)?)$/.test(p.text))hasAuxiliary=true;
        // Present-tense verb agreement: only for an identified action verb in
        // an ordinary main clause. Never conjugate past/future or nouns.
        if(hasSubject && i>0 && isXrouAction(root) && !finiteVerbSeen) {
          if(thirdSingular && !hasAuxiliary)p.text=conjugateEnglishPresent(p.text);
          finiteVerbSeen=true;
        }
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
        if(['can','cannot','could','would','should','must','might','shall','have','has','had','need'].includes(p.src) && n?.src==='not') {
          const negative={can:'vai shakta',cannot:'vai shakta',could:'vai-shakta-tha',would:'vai iccha-tha',should:'vai vakhra',must:'vai vakhra',might:'vai sambhavit',shall:'vai thanatei',have:'vai hav',has:'vai hav',had:'xanathes vai hav',need:'vai apares'};
          out.push({...p,text:negative[p.src],end:n.end});i++;continue;
        }
        // Sacred/holy + an established Xrou headword => yha<root>.
        // Only concatenate when both parts are known; do not invent roots.
        if(['holy','sacred','hallowed'].includes(p.src) && n && !n.unknown &&
           /^[\p{L}][\p{L}\p{N}-]*$/u.test(n.text) &&
           !/^yha/i.test(n.text) &&
           /^\s+$/.test(currentText.slice(p.end,n.start))) {
          out.push({...p,text:'yha'+n.text.toLowerCase(),end:n.end});i++;continue;
        }
        // English 'to' before an action verb is an infinitive marker, not a destination.
        // e.g. 'want to go' -> 'kama caxra'; 'go to town' keeps 'prati'.
        if(p.src==='to' && n && !n.unknown && (verbEntry(n.src) || (['go','leave','come','see','help','make','give','protect','speak','do','take','say','understand','eat','drink','read','write','walk','run','sleep','wait','be','have'].includes(n.src)))) {
          out.push({...p,text:''});continue;
        }
        // Benefactive 'for' + pronoun combines into a relational expression.
        if(p.src==='for' && n && !n.unknown && ['me','you','us','them','him','her'].includes(n.src)) {
          const poss={me:'da-adam',you:'da-tumu',us:'da-Xcsadam',them:'da-vise',him:'da-vise',her:'da-vise'};
          out.push({...p,text:poss[n.src],end:n.end});i++;continue;
        }
        if(p.src==='my' && n && !n.unknown && (isNounSrc(norm(n.text)) || !!nounEntry(n.src,'en') || !!enNounSingular(n.src))) {
          out.push({...p,text:'adam-'+n.text,end:n.end});i++;continue;
        }
        if(p.src==='did' && n && !n.unknown && (verbEntry(n.src) || englishVerbStem(n.src))) {out.push({...p,text:'xanathes'});continue;}
        if(['a','an','the'].includes(p.src)) {out.push({...p,text:''});continue;}
        out.push(p);
      }
      return out;
    }
    // Xrou currently marks past without an English perfect aspect distinction.
    // For clear auxiliary + participle constructions, express the same event using
    // the established xanathes past marker rather than translating an extra "have".
    function simplifyEnglishPerfect(line) {
      const m=line.match(/^(\s*)(I|you|he|she|we|they|it)\s+(have|has|had)\s+(not\s+)?([\p{L}]+)(.*)$/iu);
      if(!m) return line;
      const participle=m[5].toLowerCase();
      const accepted=new Set(['been','gone','seen','done','eaten','drunk','written','taken','given',
        'spoken','known','found','lost','made','broken','left','come','had','read','heard','felt',
        'bought','taught','brought','slept','run','swum','flown','grown','worn','begun','sung']);
      const v=englishVerbStem(participle);
      if(!v || (!v.past && !accepted.has(participle))) return line;
      // We cannot preserve English perfect aspect exactly in the current Xrou grammar.
      return m[1]+m[2]+(m[4]?' did not '+v.stem:' '+pastEnglish(v.stem))+m[6];
    }
    // Turn common inverted English questions into simple Xrou clause order.
    // The proposed Xrou question particle xek is added during realization.
    // Only rewrites clear question patterns; other inputs retain dictionary matching.
    function rewriteEnglishQuestion(line) {
      const leading=line.match(/^\s*/)?.[0] || '';
      const s=line.trim();
      const word=s.match(/^(who|what|where|when|why|how|which|whose)(?:\s+|$)/i);
      const wh=word ? word[0].trim() : '';
      let body=word ? s.slice(word[0].length).trimStart() : s;
      const aux=body.match(/^(am|is|are|was|were|do|does|did|can|could|will|would|should|must|shall|have|has|had)\s+(not\s+)?(.*)$/i);
      if(!aux) return line;
      const mode=aux[1].toLowerCase(),negative=!!aux[2], remaining=aux[3];
      // Invert only subject-first questions. Simple pronoun subjects and names are supported.
      const subject=remaining.match(/^(i|you|he|she|we|they|it|[A-Z][\p{L}\-']+)(?=\s|$)/iu);
      if(!subject) return line;
      const who=subject[0],rest=remaining.slice(subject[0].length).trimStart();
      if(!rest && ['do','does','did'].includes(mode)) return line;
      let rewritten='';
      if(['do','does','did'].includes(mode)) {
        if(negative) rewritten=who+' '+mode+' not '+rest;
        else if(mode==='did') {
          const verb=rest.match(/^[\p{L}]+/u)?.[0];
          if(verb && (verbEntry(verb)||englishVerbStem(verb))) {
            const stem=englishVerbStem(verb)?.stem || verb.toLowerCase();
            rewritten=who+' '+pastEnglish(stem)+rest.slice(verb.length);
          } else rewritten=who+' did '+rest;
        } else rewritten=who+' '+rest;
      } else rewritten=who+' '+mode+(negative?' not':'')+(rest?' '+rest:'');
      return leading+(wh?wh+' ':'')+rewritten;
    }
    function polishEnglishQuestion(sentence) {
      const trimmed=sentence.trim();
      if(!trimmed.endsWith('?')) return sentence;
      const wh='(?:Who|What|Where|When|Why|How|Which)';
      // Where you are? -> Where are you?
      let m=trimmed.match(new RegExp('^('+wh+')\\s+(I|you|he|she|we|they|it)\\s+(am|are|is|was|were)\\s*\\?$','i'));
      if(m) return `${m[1]} ${m[3].toLowerCase()} ${m[2]==='I'?'I':m[2].toLowerCase()}?`.replace(/^([A-Za-z])/,c=>c.toUpperCase());
      // You can see? / You are ready? -> Can you see? / Are you ready?
      m=trimmed.match(/^(I|you|he|she|we|they|it)\s+(can|could|will|would|should|must|shall|am|are|is|was|were|have|has|had)\s+(.+?)\?$/i);
      if(m) return `${m[2]} ${m[1]==='I'?'I':m[1].toLowerCase()} ${m[3]}?`.replace(/^([A-Za-z])/,c=>c.toUpperCase());
      // Negative auxiliary questions: "She does not love you?" -> "Does she not love you?"
      m=trimmed.match(/^(I|you|he|she|we|they|it)\s+(do|does|did|will|would|can|could|should|must|shall|am|are|is|was|were)\s+not(?:\s+(.+?))?\?$/i);
      if(m)return `${m[2]} ${m[1]==='I'?'I':m[1].toLowerCase()} not${m[3]?' '+m[3]:''}?`.replace(/^([A-Za-z])/,c=>c.toUpperCase());
      // You ran? -> Did you run? / You walked? -> Did you walk?
      m=trimmed.match(/^(I|you|we|they|he|she|it)\s+([A-Za-z]+)(?:\s+(.+?))?\?$/i);
      if(m) {
        const pastToBase={ran:'run',went:'go',left:'leave',ate:'eat',drank:'drink',wrote:'write',
          spoke:'speak',saw:'see',heard:'hear',gave:'give',took:'take',found:'find',slept:'sleep',
          fought:'fight',bought:'buy',made:'make',understood:'understand',knew:'know',came:'come',
          brought:'bring',felt:'feel',said:'say',did:'do'};
        const past=m[2].toLowerCase();
        let base=pastToBase[past]||null;
        if(!base && past.endsWith('ed')) {
          base=past.endsWith('ied')?past.slice(0,-3)+'y':past.endsWith('eed')?past.slice(0,-1):past.slice(0,-2);
          if(!verbEntry(base) && verbEntry(base+'e')) base+='e';
        }
        if(base && verbEntry(base)) return `Did ${m[1]==='I'?'I':m[1].toLowerCase()} ${base}${m[3]?' '+m[3]:''}?`;
      }
      // You know? -> Do you know? (best-effort; avoids guessing on longer clauses).
      m=trimmed.match(/^(I|you|we|they|he|she|it)\s+([A-Za-z]+)(?:\s+(.+?))?\?$/i);
      if(m && !['not','is','are','can','will','could','would','am','must','should'].includes(m[2].toLowerCase())) {
        const singular=['he','she','it'].includes(m[1].toLowerCase());
        const aux=singular?'Does':'Do';
        let verb=m[2];
        // English after does uses the uninflected verb: "Does she love?",
        // not "Does she loves?". Only strip endings for known verbs.
        if(singular && !verbEntry(verb)) {
          const stems=verb.endsWith('ies')?[verb.slice(0,-3)+'y']:
            verb.endsWith('es')?[verb.slice(0,-2),verb.slice(0,-1)]:
            verb.endsWith('s')?[verb.slice(0,-1)]:[];
          const known=stems.find(x=>verbEntry(x));
          if(known)verb=known;
        }
        return `${aux} ${m[1]==='I'?'I':m[1].toLowerCase()} ${verb}${m[3]?' '+m[3]:''}?`;
      }
      return sentence;
    }
    function translateLine(line,source,isQuestion=false,translatorOptions={}) {
      const originalStartsUpper=/^[A-Z]/.test(line.trim());
      const leadingWhitespace=(line.match(/^\s*/)||[''])[0];
      const trailingWhitespace=(line.match(/\s*$/)||[''])[0];
      // Proposed standalone polar-question marker: xek at the END of the clause.
      // Bare punctuation-only questions remain accepted for the approved legacy sample.
      // Strip it before word matching so it cannot become a false unknown word.
      const hasPolarParticle=source==='xrou' && /(?:^|\s)xek\s*$/iu.test(line);
      if(hasPolarParticle) line=line.replace(/\s+xek(?=\s*$)/iu,'');
      currentText=line;
      const full=fullPhrases[source].get(phraseKey(line));
      if(full && !(source==='xrou' && tokenize(line).length===1 && indexes.xrou.has(norm(phraseKey(line))))) {
        const translation=(source==='en'?full.xrou:full.english).replace(/[.!?]+$/,'');
        const leading=(line.match(/^\s*/)||[''])[0];
        const trailing=(line.match(/\s*$/)||[''])[0];
        const label=source==='en'?full.english:full.xrou;
        return {text:leading+translation+trailing,matches:[`Phrasebook: ${label.trim()} → ${translation}`],unknown:[],segments:[],question:hasPolarParticle};
      }
      if(source==='en' && isQuestion) line=rewriteEnglishQuestion(line);
      if(source==='en') line=simplifyEnglishPerfect(line);
      const tokens=tokenize(line);
      if(!tokens.length) return {text:line,matches:[],unknown:[],segments:[],question:hasPolarParticle};
      const parts=[],matches=[],unknown=[];
      const titleMagic={
        Astralith:'shapa-dharaka-burj', Solstice:'Ozzendaihyu-priya',
        Faesong:'yhadhatu-haxa', Delusion:'Agraha',
        Heartwood:'Eka-saha-prakriti', Mnemosyne:'Pustaka-dharaka',
        Unseeing:'Vai-drishti-krita'
      };
      for(let i=0;i<tokens.length;) {
        // In English, "a lie" is vai-mitr (a falsehood) but "I lie" / "don't lie"
        // is the established verb draugov (to lie or deceive).
        if(source==='en' && tokens[i].norm==='lie' &&
          ['i','you','he','she','we','they','it','to','not','never','can','cannot','will','do','does','did','dont','please'].includes(tokens[i-1]?.norm)) {
          const token=tokens[i];
          parts.push({src:'lie',text:'draugov',start:token.start,end:token.end,unknown:false});
          matches.push(`${token.raw} → draugov (verb)`);
          i++;continue;
        }
        if(source==='en' && Object.hasOwn(titleMagic,tokens[i].raw)) {
          const token=tokens[i]; const output=titleMagic[token.raw];
          parts.push({src:token.norm,text:output,start:token.start,end:token.end,unknown:false});
          matches.push(`${token.raw} → ${output} (proper name)`);
          i++;continue;
        }
        // "people" is both a conventional plural and an established collective Xrou root:
        // never invent xrouys for this standalone headword.
        const irregularPlural=source==='en' && tokens[i].norm!=='people' && Object.hasOwn(singularEnglish,tokens[i].norm) ? derivedToken(tokens[i],source) : null;
        const prev=tokens[i-1]?.norm;
        const verbalForm=source==='en' ? englishVerbStem(tokens[i].norm) : null;
        const subjectContext=['i','you','he','she','we','they','it'].includes(prev);
        const auxContext=['am','is','are','was','were','have','has','had'].includes(prev);
        const contextualVerb=source==='en' && verbalForm && ((verbalForm.past && (subjectContext || auxContext)) ||
          (verbalForm.tense==='progressive' && (subjectContext || auxContext))) ? derivedToken(tokens[i],source) : null;
        const preferredDerived=irregularPlural || contextualVerb;
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
      const processed=source==='xrou'?realizeXrouClause(parts,translatorOptions):englishToXrou(parts);
      let out='',pos=0;
      for(const p of processed) {
        // preserve all original punctuation, but normalize whitespace after skipped grammar particles.
        out += line.slice(pos,p.start) + (p.text||'');
        pos=p.end;
      }
      out+=line.slice(pos);
      out=out.replace(/[ \t]{2,}/g,' ').replace(/\s+([,;:.!?])/g,'$1').trim();
      // translateLine may trim a sentence fragment; preserve original boundary
      // whitespace so punctuation and the next translated sentence never fuse.
      out=leadingWhitespace+out+trailingWhitespace;
      // Standard Xrou yes/no question: S-V-O (+ modifiers) xek?
      // WH questions use kim/kutra/etc., not the polar particle by default.
      if(source==='en' && isQuestion && !/^(?:who|what|where|when|why|how|which|whose)\b/i.test(line.trim())) {
        out=out.replace(/\s*$/,'')+' xek'+trailingWhitespace;
        matches.push('Question → xek (provisional polar particle)');
      }
      if(source==='en' && originalStartsUpper) out=out.replace(/^(\s*)([\p{L}])/u,(_,w,c)=>w+c.toUpperCase());
      if(source==='xrou' && /[\p{L}]/u.test(out)) out=out.replace(/^(\s*)([\p{L}])/u,(_,w,c)=>w+c.toUpperCase());
      if(hasPolarParticle)matches.push('xek → yes/no question (provisional particle)');
      return {text:out,matches,unknown,segments:processed,question:hasPolarParticle};
    }
    function translate(text,source='en',options={}) {
      if(source!=='en' && source!=='xrou') throw new Error('Invalid source language');
      if(!String(text).trim()) return {text:'—',matches:[],unknown:[]};
      // Only English input is expanded; Xrou has its own vocabulary and morphology.
      const normalizedText=source==='en'?expandEnglishContractions(text):String(text);
      const lines=normalizedText.split(/(\n+)/);
      const translated=[];const matches=[],unknown=[];
      for(let i=0;i<lines.length;i++) {
        if(/^\n+$/.test(lines[i])) { translated.push(lines[i]); continue; }
        const sentences=lines[i].split(/([.!?]+(?=\s|$|[\p{L}⟦]))/u);
        for(let j=0;j<sentences.length;j++) {
          const sentence=sentences[j];
          if(/^[.!?]+$/.test(sentence)) {translated.push(sentence);continue;}
          const isQuestion=source==='en' && /^\?+/.test(sentences[j+1]||'');
          const res=translateLine(sentence,source,isQuestion,options);
          // A question particle indicates interrogation even without written '?'.
          const hasFollowingQuestion=/^\?+/.test(sentences[j+1]||'');
          translated.push(res.text + (source==='xrou' && res.question && !hasFollowingQuestion ? '?' : ''));
          matches.push(...res.matches);unknown.push(...res.unknown);
        }
      }
      let output=translated.join('').replace(/ +\n/g,'\n');
      // A period/question mark/exclamation point starts a new sentence even
      // when the source omitted a space (e.g. 'Eat this.This will do').
      // Don't modify decimals such as 3.14 or ellipses.
      output=output.replace(/([.!?])([\p{L}⟦])/gu,'$1 $2');
      // English retains sentence capitalization after punctuation, even for multi-sentence text.
      if(source==='xrou') {
        output=output.replace(/([.!?]\s+)([a-z])/g,(_,a,b)=>a+b.toUpperCase());
        output=output.replace(/(^|[.!?]+\s+)([^.!?]*\?)/gu,(_,prefix,clause)=>prefix+polishEnglishQuestion(clause));
      }
      if(source==='en') {
        output=applyXrouRegister(output, options.mode, options.gender);
        // Display matching Xrou values in the selected register as well.
        for(let i=0;i<matches.length;i++) {
          const marker=matches[i].indexOf(' → ');
          if(marker>=0)matches[i]=matches[i].slice(0,marker+3)+applyXrouRegister(matches[i].slice(marker+3),options.mode,options.gender);
        }
      }
      return {text:output,matches,unknown};
    }
    return {translate,suggestions,norm};
  }
  return {createTranslator,norm,expandEnglishContractions,applyXrouRegister};
});
