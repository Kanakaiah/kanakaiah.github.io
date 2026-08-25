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

// 5. Reviews are kept ahead of new material when trimming
p = buildSession(mk({
  verses: Array.from({length:5},(_,i)=>({id:'v'+i, ref:'R'+i, text:'t', sm2:sm2(-1), status:'review', attempts:1})),
  chapterProgress:{'habakkuk:1': chap('habakkuk',1,{sm2:sm2(+9)})},
}), {newChapters:3, cap:5, shuffle:noShuffle});
t('reviews win the cap over new material',
  p.items.length===5 && p.items.every(i=>i.kind==='verse') && p.heldBack===4);

// 6. A finished book does not keep offering new chapters
const allDone = {}; for (let c=1;c<=3;c++) allDone['habakkuk:'+c]=chap('habakkuk',c,{sm2:sm2(+9)});
t('finished book stops producing new material', currentBookId(allDone)===null);
t('unfinished book is the current one', currentBookId({'habakkuk:1':chap('habakkuk',1)})==='habakkuk');

// 7. Due chapter anchors are queued with their word
p = buildSession(mk({chapterProgress:{'habakkuk:2': chap('habakkuk',2)}}),
  {newChapters:0, cap:20, shuffle:noShuffle});
t('due anchor carries its word', p.items.length===1 && typeof p.items[0].word==='string' && p.items[0].word.length>0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
