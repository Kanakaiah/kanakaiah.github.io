// Rules the session queue has to obey. Run: npx vite-node scripts/session.test.mjs
// Plain assertions, no framework — the project has no test runner configured and this
// did not seem worth adding one for.

import { buildSession, currentBookId } from '../src/utils/session.ts';

const mk = (over={}) => ({ verses: [], chapterProgress: {}, memorySentenceProgress: {}, themeProgress: {}, blockProgress: {},
  streak: 0, lastActiveDate: null, theme: 'black', sortOrder: 'smart', settings: {}, ...over });
const sm2 = (days) => ({ interval: 1, repetition: 1, efactor: 2.5,
  nextDueDate: new Date(Date.now() + days*86400000).toISOString() });
const chap = (bookId, chapter, over={}) => ({ bookId, chapter, sm2: sm2(-1), status:'review',
  attempts:1, lastScore:4, lastAttemptDate:new Date().toISOString(), readCount:0, lastReadDate:null, ...over });
const noShuffle = x => x;
let pass=0, fail=0;
const t=(name,cond)=>{ if(cond){pass++;console.log('  ok  '+name);} else {fail++;console.log('  FAIL '+name);} };

// 1. Nothing due, nothing started -> empty
let p = buildSession(mk(), {newChapters:3, cap:20, shuffle:noShuffle});
t('empty state yields no items', p.items.length===0 && p.heldBack===0);

// 2. Due verses become items; not-due ones don't
p = buildSession(mk({verses:[
  {id:'a', ref:'John 3:16', text:'x', sm2:sm2(-1), status:'review', attempts:1},
  {id:'b', ref:'John 1:1',  text:'y', sm2:sm2(+9), status:'review', attempts:1},
]}), {newChapters:0, cap:20, shuffle:noShuffle});
t('only overdue verses are queued', p.items.length===1 && p.items[0].id==='verse:a');

// 3. Introduce is always immediately followed by that chapter's retrieval
p = buildSession(mk({chapterProgress:{'habakkuk:1': chap('habakkuk',1,{sm2:sm2(+9)})}}),
  {newChapters:2, cap:20, shuffle:noShuffle});
const kinds = p.items.map(i=>i.kind+':'+(i.chapter??''));
t('introduce pairs with its own retrieval', JSON.stringify(kinds)===JSON.stringify(
  ['introduce:2','anchor:2','introduce:3','anchor:3']));

// 4. Cap never splits an introduce from its retrieval
p = buildSession(mk({chapterProgress:{'habakkuk:1': chap('habakkuk',1,{sm2:sm2(+9)})}}),
  {newChapters:2, cap:3, shuffle:noShuffle});
t('cap admits new pairs whole or not at all', p.items.length===2 && p.heldBack===2);

// 5. New material holds a reserved share of the session rather than taking leftovers.
//
// This test used to assert the opposite — that five due verses filled a cap of five and
// new material got nothing. That was the documented behaviour, and it was the bug: past
// roughly nineteen due items the leftover is always zero, so any real backlog silently
// stops a reader ever meeting a new chapter again. Reviews still take the larger share;
// they just can no longer take all of it.
p = buildSession(mk({
  verses: Array.from({length:5},(_,i)=>({id:'v'+i, ref:'R'+i, text:'t', sm2:sm2(-1), status:'review', attempts:1})),
  chapterProgress:{'habakkuk:1': chap('habakkuk',1,{sm2:sm2(+9)})},
}), {newChapters:3, cap:5, shuffle:noShuffle});
t('new material keeps a reserved share when reviews would fill the cap',
  p.items.length===5 &&
  p.items.filter(i=>i.kind==='verse').length===3 &&
  p.items.filter(i=>i.kind==='introduce').length===1 &&
  p.items.filter(i=>i.kind==='anchor').length===1);

// 5b. A heavy backlog can no longer starve new material to zero — the original defect.
// Genesis rather than Habakkuk: a three-chapter book cannot offer three new chapters, so
// it would pass this on a technicality without ever exercising the reserve.
p = buildSession(mk({
  verses: Array.from({length:60},(_,i)=>({id:'v'+i, ref:'R'+i, text:'t', sm2:sm2(-1), status:'review', attempts:1})),
  chapterProgress:{'genesis:1': chap('genesis',1,{sm2:sm2(+9)})},
}), {newChapters:3, cap:20, shuffle:noShuffle});
t('a large backlog still admits new chapters',
  p.items.filter(i=>i.kind==='introduce').length===3 && p.items.length===20);

// 5c. Every admitted Introduce still sits immediately before its own retrieval.
t('the reserve never splits a pair', p.items.every((it,i)=>
  it.kind!=='introduce' || (p.items[i+1] && p.items[i+1].kind==='anchor' && p.items[i+1].chapter===it.chapter)));

// 5d. New material that exceeds its reserved share is reported, not silently dropped.
p = buildSession(mk({
  chapterProgress:{'genesis:1': chap('genesis',1,{sm2:sm2(+9)})},
}), {newChapters:8, cap:10, shuffle:noShuffle});
t('new material beyond the reserve is reported as held back',
  p.items.filter(i=>i.kind==='introduce').length===1 && p.newHeldBack===14);

// 6. A finished book does not keep offering new chapters
const allDone = {}; for (let c=1;c<=3;c++) allDone['habakkuk:'+c]=chap('habakkuk',c,{sm2:sm2(+9)});
t('finished book stops producing new material', currentBookId(allDone)===null);
t('unfinished book is the current one', currentBookId({'habakkuk:1':chap('habakkuk',1)})==='habakkuk');

// 6b. Anchors carry the direction the scheduler chose and the book's other anchors.
p = buildSession(mk({chapterProgress:{'genesis:2': chap('genesis',2,{sm2:{interval:1,repetition:0,efactor:2.5,nextDueDate:new Date(Date.now()-86400000).toISOString()}})}}),
  {newChapters:0, cap:20, shuffle:noShuffle});
t('a still-learning anchor is asked number to word', p.items[0].direction==='n2w');
t('an anchor carries its siblings so a confusion can be named',
  p.items[0].siblings.length===50 && p.items[0].siblings.some(s=>s.ch===29 && s.word==='STONE'));

p = buildSession(mk({chapterProgress:{'genesis:2': chap('genesis',2,{sm2:{interval:40,repetition:5,efactor:2.5,nextDueDate:new Date(Date.now()-86400000).toISOString()}})}}),
  {newChapters:0, cap:20, shuffle:noShuffle});
t('a known anchor is asked another way round', p.items[0].direction!=='n2w');

// 7. Due chapter anchors are queued with their word
p = buildSession(mk({chapterProgress:{'habakkuk:2': chap('habakkuk',2)}}),
  {newChapters:0, cap:20, shuffle:noShuffle});
t('due anchor carries its word', p.items.length===1 && typeof p.items[0].word==='string' && p.items[0].word.length>0);

// 8. A chain miss nominates its chapter even when SM-2 says it isn't due yet.
p = buildSession(mk({chapterProgress:{
  'habakkuk:2': chap('habakkuk',2,{sm2:sm2(+9), chainMisses:1, chainHits:0,
                                   lastChainDate:new Date().toISOString()}),
}}), {newChapters:0, cap:20, shuffle:noShuffle});
t('a recent chain miss pulls its chapter forward',
  p.items.length===1 && p.items[0].kind==='anchor' && p.items[0].chapter===2);

// 9. A stale chain miss does not — the ordinary schedule has had time to cover it.
p = buildSession(mk({chapterProgress:{
  'habakkuk:2': chap('habakkuk',2,{sm2:sm2(+9), chainMisses:1,
                                   lastChainDate:new Date(Date.now()-40*86400000).toISOString()}),
}}), {newChapters:0, cap:20, shuffle:noShuffle});
t('an old chain miss is left alone', p.items.length===0);

// 10. A due chain becomes its own item, carrying its whole block.
p = buildSession(mk({blockProgress:{'genesis:0':{
  bookId:'genesis', blockIndex:0, label:'PRIMEVAL', sm2:sm2(-1), status:'review',
  attempts:1, lastScore:3, lastAccuracy:0.8, lastAttemptDate:new Date().toISOString(),
}}}), {newChapters:0, cap:20, shuffle:noShuffle});
t('a due chain is queued with its whole block',
  p.items.length===1 && p.items[0].kind==='chain' && p.items[0].anchors.length===11);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
