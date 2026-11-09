/* Run from the website's root folder: node test_grammar_v26.js */
'use strict';
const assert=require('assert');
const fs=require('fs');
const {createTranslator}=require('./engine.js');
const load=file=>JSON.parse(fs.readFileSync(__dirname+'/'+file,'utf8'));
const grammar=load('grammar_v26.json');
const t=createTranslator(load('lexicon.json'),load('phrasebook.json'));
let count=0;
const eq=(actual,want,label)=>{assert.strictEqual(actual,want,label);count++;};
// All 12 user-approved samples must translate faithfully Xrou -> English.
for(const [i,sample] of grammar.canonical_tests.entries()){
  const actual=t.translate(sample.xrou,'xrou',{vise:'she'});
  eq(actual.text,sample.english,`Approved sample ${i+1}`);
  eq(actual.unknown.length,0,`Approved sample ${i+1} has no unknown tokens`);
}
// Test chosen clause grammar and the PROVISIONAL yes/no question particle.
const examples=[
 ['en','Does she love you?','Vise pixrit tumu xek?'],
 ['en','Do you protect me?','Tumu raksha adam xek?'],
 ['en','Will you protect me?','Tumu thanatei raksha adam xek?'],
 ['en','I love you. Do you love me?','Adam pixrit tumu. Tumu pixrit adam xek?'],
 ['en','We love you all.','Adamys pixrit tumys.'],
 ['en','Let us dance.','Xce uta vash-het.'],
 ['xrou','Vise pixrit tumu xek?','Does she love you?'],
 ['xrou','Vise pixrit tumu xek','Does she love you?'],
 ['xrou','Vise pixrit tumu?','Does she love you?'],
 ['xrou','Adam pixrit tumu. Tumu pixrit adam xek?','I love you. Do you love me?'],
 ['xrou','Tumu pixrit adam xek?','Do you love me?'],
 ['xrou','Tumu thanatei raksha adam xek?','Will you protect me?'],
 ['xrou','Vise vai pixrit adam xek?','Does she not love me?'],
 ['xrou','Vise xanathes raksha adam xek?','Did she protect me?'],
 ['xrou','Tumu vai raksha adam.','You do not protect me.'],
 ['xrou','Xcsadam thanatei caxra.','We will leave.'],
 ['xrou','Vise xanathes pixrit adam.','She loved me.'],
 ['xrou','Adam vai thanatei caxra.','I will not leave.'],
 ['xrou','Vise pixrit tumu xek? Adam vai pixrit tumu.','Does she love you? I do not love you.'],
];
for(const [src,input,expected] of examples) eq(t.translate(input,src,{vise:'she'}).text,expected,input);
// Confirm the register toggle respects the subject/object equivalence in English.
eq(t.translate('I love you.','en',{mode:'formal',gender:'feminine'}).text,'Adar pixrit tumu.','Formal I');
eq(t.translate('You protect me.','en',{mode:'formal',gender:'feminine'}).text,'Tumu raksha adar.','Formal me');
eq(t.translate('We love you.','en',{mode:'formal'}).text,'Xcsadam pixrit tumu.','Formal we');
// Multi-sentence response should capitalize after punctuation.
eq(t.translate('I love you. Do you love me?','en').text,'Adam pixrit tumu. Tumu pixrit adam xek?','Sentence capitalization');
console.log(`PASS ${count} grammar, question, register, and regression checks`);
