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

// 11. With a backlog, the cap keeps the most overdue rather than a random sample.
// This is the whole point of triage: an item two hundred days late has already lost most
// of what it had, and every further day costs more than one due this morning.
const old = (d) => ({ interval: 1, repetition: 1, efactor: 2.5,
  nextDueDate: new Date(Date.now() - d * 86400000).toISOString() });
p = buildSession(mk({ verses: [
  ...Array.from({ length: 30 }, (_, i) =>
    ({ id: 'fresh' + i, ref: 'F' + i, text: 't', sm2: old(1), status: 'review', attempts: 1 })),
  { id: 'ancient', ref: 'Ancient', text: 't', sm2: old(200), status: 'review', attempts: 1 },
] }), { newChapters: 0, cap: 5, shuffle: noShuffle });
t('the most overdue item survives the cap', p.items.some(i => i.id === 'verse:ancient'));
t('the cap is still respected', p.items.length === 5);
t('the backlog is reported', p.heldBack === 26);

// 12. A chapter can never be both taught and cold-tested in the same plan.
//
// RECORD_CHAIN_PASS creates a progress record for a chapter that has never been graded,
// so a chain miss could nominate a chapter with attempts: 0 — exactly the set new
// material is drawn from. The chapter then appeared twice in one plan: once as a cold
// anchor test and once as an Introduce/anchor pair, producing two grades, two review
// events, duplicate React keys, and a chapter tested before it was ever taught.
p = buildSession(mk({chapterProgress:{
  // Touched, so Genesis is the book underway.
  'genesis:1': chap('genesis',1,{sm2:sm2(+9)}),
  // Nominated by a chain miss but never actually graded.
  'genesis:3': { bookId:'genesis', chapter:3,
    sm2:{interval:0,repetition:0,efactor:2.5,nextDueDate:new Date().toISOString()},
    status:'learning', attempts:0, lastScore:0, lastAttemptDate:'',
    readCount:0, lastReadDate:null,
    chainMisses:1, chainHits:0, lastChainDate:new Date().toISOString() },
}}), {newChapters:3, cap:20, shuffle:noShuffle});

const ids = p.items.map(i => i.id);
t('no item appears twice in one plan', new Set(ids).size === ids.length);
t('an ungraded chapter is not cold-tested before it is introduced',
  p.items.every((it, n) =>
    !(it.kind === 'anchor' && it.chapter === 3) ||
    (p.items[n-1] && p.items[n-1].kind === 'introduce' && p.items[n-1].chapter === 3)));

// 13. Naming a book narrows the day to it.
const twoBooks = mk({chapterProgress:{
  'genesis:2': chap('genesis',2),
  'exodus:3': chap('exodus',3),
}});
p = buildSession(twoBooks, {newChapters:0, cap:20, shuffle:noShuffle});
t('without a focus, every book that is due appears',
  new Set(p.items.map(i => i.bookId)).size === 2);

p = buildSession(twoBooks, {newChapters:0, cap:20, bookId:'genesis', shuffle:noShuffle});
t('naming a book excludes the others',
  p.items.length === 1 && p.items[0].bookId === 'genesis');

// Verses belong to no book in this sense and must not be filtered away.
p = buildSession(mk({
  verses: [{id:'a', ref:'John 3:16', text:'x', sm2:sm2(-1), status:'review', attempts:1}],
  chapterProgress: {'exodus:3': chap('exodus',3)},
}), {newChapters:0, cap:20, bookId:'genesis', shuffle:noShuffle});
t('a focus narrows the book layers without dropping due verses',
  p.items.length === 1 && p.items[0].kind === 'verse');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
