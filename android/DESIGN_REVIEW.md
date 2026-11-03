# Complete Android design review — November 2, 2026

Status: the user approved the complete gallery on November 2, 2026. Implementation
and native verification are in progress; approval does not imply completion.

Preview: `C:/Users/etipa/.codex/visualizations/2026/10/30/01a18e2f-29a8-7aa1-b2c7-58f99f83952c/remora-complete-design.html`

This is the proposed visual target for the next coordinated update, superseding
the separate older mockups after approval. It contains 43 selectable views covering
all 46 audited surface IDs. Today combines S1–S3; original-word and definition
presentations combine S23–S24. State controls show representative variants; this
is not a claim that every native interaction or runtime state has been validated.

The user now wants the complete set shown before implementing all screens together.
After approval, implement in reviewable internal increments, integrate and validate
the whole set, then deliver one personal-app update. Do not deliver another small
foundation patch as though it matches the full preview. Keep a per-surface native
screenshot comparison and record any deviations before calling the update complete.

## Proposed product decisions included in the review

- D1: retain Today, Lookup, Practice, and Bible. Bible retains root navigation.
- D2: Bible Immerse becomes continuous chapter reading entered at the current
  passage/position. Focused single-verse practice remains a separate context.
  Reader and Immerse share typeface, size, spacing, and theme. Hide controls without
  reserving their blank space; keep an accessible show-controls action. Audio has
  a single visible controller and stop access.
- D3: chapter-end recall becomes an explicit secondary action; reading can continue
  directly. Viewing or dismissing a chapter end never grades an answer.
- D4: preserve existing scoring. Standalone review uses its existing grade choices
  and limits. Daily book-theme Continue records score 4 (Good); daily anchors retain
  correct=5, near=4, wrong=2. The example daily chapter answer is a correct answer.
  Chapter chains retain Missed / Had it. No scheduler migration is approved here.
- D5: use Collections for user organization; use Chapter Themes as the public name
  for chapter-anchor content. Preserve existing stored IDs and content.
- D6: retain advanced study, history, charts, authors, and data functions, reached
  through secondary sections. No user-facing feature or candidate C1–C5 removal
  is authorized by this design review.
- D7: interface typography follows one Material 3 role system and Android text
  scaling. Scripture preferences are explicitly labeled and shared by both readers.
  Standard target sizes: title 24sp, section 20sp, body 16sp, label 14sp; scripture
  uses the saved reading size. First and subsequent section headings share one role.
  Controls grow/wrap with text; effective touch targets remain at least 48dp.
- D8: retain English interface copy and existing Bible translation support in this
  release. English/Telugu Scripture specimens are preview aids, not authorization
  to substitute a translation or a claim of complete Telugu interface localization.

## Visual contract

Four fixed palettes: Paper, Sepia, Walnut, Midnight. Use semantic foreground /
background pairs for surfaces, buttons, selection, hints, audio, and errors. Review
at 100%, 150%, and 200% text. Product spacing follows 8/12/16/20/24dp, with one clear
primary action per task. Retain 4:3 library covers at their original large size.

Reader has one selectable passage/title line with a translation label and dropdown
affordance. Book, Chapter, Verse, and Translation are distinct selector stages.
Normal-size labels share a line; accessibility text may wrap without truncation.
Remove the redundant helper row and duplicate bottom chapter selector. Keep
previous/next navigation. Use a bounded reading column on larger displays.

Practice shares a compact session header, one progress indicator, a reference,
mode selection, task content, and appropriate result actions. Chapter artwork is
shown after checking text recall; image-cue mode shows it initially. Book covers
remain visible before recalling book themes. Hidden answers must be absent from
native accessibility semantics, not simply visually blurred.

## Coverage ledger

All rows are **approved, pending implementation and verification**. A named preview is not
an implemented or verified Android screen.

Implementation started: S18 has a compact passage selector in the header and no
duplicate bottom chapter button. The isolated build and ReaderDesignTest pass on
the connected device, including opening the selector and 150% English/Telugu text
in four palettes. S18 remains incomplete: the selector stages, Immerse, chapter-end
behavior, and the remaining full-design acceptance checks have not been completed.
The personal app has not been updated with this partial work.

Further progress: Bible reading now enters a continuous Immerse view using the
same paragraph renderer, saved appearance settings and in-memory scroll state.
Its controls can be hidden and restored, and chapter-end recall begins only after
an explicit action. The Bible root is now part of the main navigation scaffold.
The isolated build and unit suite passed for the Reader changes; after the Bible
navigation change, the isolated build and three device tests passed (Reader layout,
Today/Lookup/Bible navigation, and Immerse enter/hide/show/back). This does not yet
verify precise position across process death, speech lifecycle, every theme/state,
chapter-end grading, or the remaining screen families. Do not install this partial
candidate as the coordinated release.

Latest increment: S9 now uses a neutral practice label even when no chapter has
reached secure status. S10 removes repeated introductory/count copy and adds
separate Read and Book Guide actions while retaining the large 4:3 artwork and
the existing section filter. S19 now has separate book, chapter, verse and
translation choices. The isolated build and six focused device tests passed for
selector interaction, library/guide layouts and actions, Chapter Themes picker,
and Bible-to-guide navigation. These are partial implementations, not closure.

Subsequent increment: S19 can select a verse in another chapter in the same
selector, and the Reader scrolls to its rendered line after loading. The isolated
device test selected Genesis 2:20 and checked that its line was visible below the
Reader header. A transient verse-list race found during testing was fixed. S1 now
has a more compact Today heading and review card. S38 shows chapter art after text
recall (or initially for an image cue), keeps book covers visible, and describes
the existing Good score on daily book-theme Continue. Six combined device checks
passed for Today, daily scoring/reveal, passage selection and cross-chapter jump.
The full approved visual migration, wider accessibility/theme/state verification,
and process-restoration and audio checks remain open. No personal-app update was
made.

S8 increment: collection management now uses shared Material 3 typography and
semantic colors, offers accessible rename/create/delete controls, explains that
deletion also removes verses exclusive to that collection, and is reachable from
Today (the prior sheet had no active entry point). A first isolated device run
passed creation, rename, duplicate-name validation, delete/cancel, four palettes
at 150% text, and Today entry/exit. No personal data was used in the interaction
tests. S4 also now requires confirmation before deleting either a collection or a
saved verse, explicitly stating the scope; an isolated test covers cancel and
confirm for each action. Subsequent S4/S5 work replaced the collection contents
and New collection layouts with Material 3 components, preserves scroll state
while a verse detail is open, provides separate Practice/Add actions, validates
duplicate names, and retains curated options. Adding from a collection now
preselects that collection in the Add Verse sheet; its selected state is exposed
to accessibility services. Nine isolated device checks passed, covering the
collection and verse confirmations, actions, selected assignment, duplicate
names, suggestions, large text across four themes, Today and the management path.
The Add Verse sheet now condenses its header while the keyboard is open to make
room for the form. The assignment test enters a reference, scrolls to Add and
taps it with the keyboard open on the connected unfolded phone. This is one S6
keyboard path, not verification of every tab, font scale or viewport. The complete
S4/S5/S6 verification matrix, including process restoration and TalkBack, remains
open. Nine combined device checks pass after the latest changes.

S6 increment: the Add Verse sheet has a compact Material 3 header, wrapping mode
and collection controls, larger touch targets, and a simpler curated-import list.
Search range actions preserve separate and combined behavior. Selected extra
collections now receive the actual imported preset references (including already
saved passages), rather than an unrelated tail of the user's verse list. Search
requests are canceled/superseded when changed or cleared; unavailable reference
translations and invalid ranges are reported inside the sheet rather than silently
substituting another translation or adding invalid references. Keyword search is
identified as offline Bible text. Telugu and Tamil are available in the reference
translation selector. Manual entry rejects multiple references instead of
silently saving only the first.

The user explicitly chose to remove the manual custom-text and translation fields
because they were ignored by the old save path. Manual reference entry and the
search translation selector remain. Existing saved content was not migrated.
The picker now rejects blank or invalid chapter/verse numbers rather than silently
choosing 1. The full 183-test unit suite passes after this change; isolated device
checks cover the picker, keyboard-visible reference entry, selected collection,
range choices, translation selection and curated actions. The complete S6 matrix—
especially external interruptions, process restoration, all viewport/keyboard
combinations, and partial-import behavior—remains open.

S7 increment: the verse detail sheet now prioritizes scripture, Practice and Read
chapter; collection membership and expandable review details follow. Previous/
next, language selection and confirmed deletion remain accessible. The renderer
preserves words wrapped in bold markup and reports an unavailable selected language
instead of substituting the other displayed language. Fourteen isolated device
checks passed across verse detail, Add Verse and collection flows; the verse detail
test exercises four palettes at 150% text. This does not resolve the repository's
separate upstream translation fallback, or verify TalkBack, all scripts and all
device sizes. The complete 183-test unit suite passes with the S7 UI changes.

S11–S13 increment: Book Guide overview adds direct jumps to chapter themes, key
verses and the memory sentence; indexes account for collapsed groups. Chapter
art remains visible after a chapter has been graded. Isolated device tests cover
both expanded and collapsed jumps, Guide behavior and artwork, together with
the Add Verse and verse-detail checks. Full Guide state/restore/accessibility
verification remains open. Eighteen combined device checks passed after the
reference-only change, plus the separate invalid-number picker check.

S15–S16 increment: Commentary and Preachers & Theologians now use Material 3
surface colors, typography, selected filter chips and vertically scrollable content.
The commentary book filter and series content remain available. Preacher resource
links wrap and retain their original destinations. On the isolated phone, tests
passed for book filtering and era selection in all four palettes at 150% text,
resource URL dispatch, and dismissal (3 device tests). Series changes, full text
clipping/contrast, TalkBack and other accessibility settings remain to be checked.
S17 increment: Lookup has a visible Search action, Material 3 controls and result
cards, selected semantics, and an explicit error state. Edits or mode changes
cancel and invalidate prior searches; reference lookup scans the available chapter
verses rather than iterating an unbounded entered range. Two unit tests cover
queued search invalidation. An isolated device test covered sample verse actions,
empty Strong's results and mode selection across four palettes at 150% text.
Actual database search, Strong's content, IME, TalkBack, text clipping and error
recovery still need full device validation. Existing scripture markup treatment
has not been changed and requires a separate source-integrity review.
S20 increment: Reading settings distinguish scripture size from device interface
size, explain the shared app palette and reset scope, and disclose bionic options
under an expandable advanced section. One isolated device test exercises size,
advanced controls, reset and dismissal across four themes at 150% text. Process
restart, TalkBack and full contrast/layout validation remain open.

S21 increment: the selection action bar wraps and the memory form uses semantic
Material controls and scrolls with the keyboard. Disjoint references are displayed
accurately; combining retains gaps as separate passages. A new collection must
finish creating before Add is enabled. The save captures its original selection
and does not clear a later selection. Isolated tests cover the form at 150% in
four themes, a delayed collection callback and Reader layout. Full integration,
copy/reference order, cancellation, process restoration, TalkBack and failure
handling still require verification.

S22 increment: Cross References uses an accessible source header, a visible vote
filter, grouped Material 3 reference cards and separate read-in-context actions.
The original-word subsection retains occurrence expansion and attribution, with
stacked word details and larger controls. A history action returns within the sheet;
reading in context stores the originating chapter, selection and scroll position for
return. Request generation prevents obsolete loads from reopening a dismissed sheet
or replacing newer results. Isolated device tests cover filters, expansion, word
occurrences, theme changes at 150% text and an actual linked passage/selection
return (four tests). Reader unit tests cover latest-request and restoration behavior.
Exact scroll position, process death, TalkBack, contrast, all scripts and complete
nested-navigation paths remain open; the return history is currently in memory.

S23–S25 increment: Original Words uses a stacked script, phonetics, translation
and definition hierarchy. The Strong's dialog, Original Words and Lookup share
consistent definition and optional derivation/KJV details. Word occurrences use
Material 3 cards, explicit KJV context and a clear Read in context action.
Opening an occurrence records the source reading and word-study state; returning
restores the selected word, result list and its scroll state. New occurrence and
original-word requests are invalidated when superseded or dismissed. When tagged
KJV text is unavailable, Original Words now reports unavailable data instead of
guessing Strong's entries from English token searches. The 23 focused Reader unit
tests passed. Eleven combined isolated device checks covered these screens,
themes at 150% text, errors/empty states and source returns; an additional device
check confirmed list position restoration with 25 results. Remote service behavior,
Greek/Hebrew/Telugu accessibility, full contrast and process-death restoration
remain to be verified. Study return state is held in memory.

S26–S31 increment: Chapter-end recall is optional, hides its answer and image
until reveal, and explicitly describes the successful-recall write. Its UI guards
against repeated save taps and reports an unconfirmed save without inviting an
immediate repeat. Verse Recall has tighter spacing and a visible saving state.
Typing keeps the submitted answer and word comparison after checking. In First
Letters, the user explicitly approved counting every revealed word even if later
hidden; exposures are tracked per verse/language and stored with the session, with
restoration and grade-cap tests. Blanks uses semantic colors and accessible hidden
word controls; its count now updates when the same word is toggled repeatedly.
Puzzle has larger theme-aware tiles, compact placement feedback and preserves
punctuation visually while retaining its normalized matching and score formula.

Focused Reader and Practice unit tests passed (37 tests). Isolated phone checks
covered recall, typing/IME, hint cycling, Blanks toggle counts and Puzzle mistakes,
duplicate words and punctuation; selected layouts ran in four themes at 150% text.
These checks do not establish full TalkBack/contrast/viewport coverage, all failure
paths, process interruption at each write, or end-to-end grading for every mode.
Verse-practice grading now commits review and queue-position updates in one
transaction; chapter-anchor grading commits progress and its review log together.
Injected write-failure tests verify rollback; other practice types, abrupt process
interruption and real-device storage failures still require validation.
The approved First Letters exposure rule applies to that mode; other modes retain
their existing scoring rules.

The complete unit suite passed after the practice/save changes: 196 tests, no
failures or errors. The latest isolated phone run passed seven focused practice
and Reader checks; earlier component checks also exercised exact/partial/blank
Typing and four-theme 150% layouts. No coordinated personal-app update was made.

S32 increment: Listen now uses one speech request per playback/repetition, stops
on background or disposal, displays voice and playback failures, and advances only
after a successful utterance. The misleading estimated seek and word highlighting
were removed. Its word display, controls and listening options use Material roles;
stop/replay is described accurately because the platform has no pause support.
The shared speech manager now ignores stale callbacks, preserves Reader queue
playback after single utterances and reports unavailable voices instead of invoking
completion. Seven local speech-manager and Compose tests passed for repeats, automatic advance,
failed/unavailable speech, stop/background, hidden text and stale callbacks using
simulated engines. A real phone voice, audio interruption, actual engine behavior,
TalkBack and full device/theme/layout checks remain outstanding. The phone was not
reachable via ADB; the available ARM emulator cannot run on the x86_64 host. S33–S46 and all remaining integrated acceptance work remained
open; prior partial changes do not imply their completion.

| Audit IDs | Gallery view | Representative states |
|---|---|---|
| S1–S3 | Today | Ready, empty library, caught up, loading |
| S4 | Collection contents | Populated, empty |
| S5 | New collection | Ready, invalid, saved |
| S6 | Add verses | Reference, search, collections, invalid, saved |
| S7 | Verse details | Reading/actions, scheduling details |
| S8 | Manage collections | List, deletion confirmation |
| S9 | Chapter Themes book picker | Ready, no results |
| S10 | Bible Library | Ready, no results, loading, unavailable artwork |
| S11 | Book Guide overview | Overview, structure |
| S12 | Guide chapter themes | Collapsed, revealed, artwork unavailable |
| S13 | Guide key verses | Verses, memory sentence |
| S14 | Guide book & chapter picker | Books, chapters |
| S15 | Commentaries | Series/sections, reading, unavailable |
| S16 | Preachers & theologians | List, details |
| S17 | Lookup | Verse, Strong’s, no results, error |
| S18 | Bible Reader | Passage, selection, audio, loading, error |
| S19 | Passage selector | Book, chapter, verse, translation |
| S20 | Reading settings | Core controls, advanced |
| S21 | Verse actions & memorize | Actions, memory form, multiple selection |
| S22 | Cross references | List, expanded context, empty |
| S23–S24 | Original words & definition | List, definition, unavailable |
| S25 | Word occurrences | Results, loading, empty |
| S26 | Chapter end | Continue reading, recall prompt, answer |
| S27 | Verse recall | Prompt, answer, empty, saving |
| S28 | Typing | Prompt, feedback, invalid |
| S29 | First letters | Prompt, hint, answer |
| S30 | Eraser | Hidden words, answer |
| S31 | Scramble | Word placement, answer, incorrect order |
| S32 | Listen | Ready, playing, missing voice |
| S33 | Speak | Ready, listening, transcript, denied permission, no speech |
| S34 | Chapter-theme practice | Prompt, answer, image cue, reverse cue |
| S35 | Book-theme practice | Cover/prompt, answer/grades |
| S36 | Chapter chain | Prompt, answer, complete |
| S37 | Daily introduction | Study before practice |
| S38 | Mixed daily practice | Chapter prompt/answer, book prompt/answer |
| S39 | Finish & exit practice | Complete, quit, empty, saving |
| S40 | Immerse | Continuous reading, hidden controls, audio, focused practice |
| S41 | Retention | Summary, details, no history |
| S42 | Cold check | Prompt, answer, results |
| S43 | Settings | Appearance, reading, practice, data |
| S44 | Backup, restore & clear | Export, choose file, inspect, invalid, clear confirmation |
| S45 | About | Purpose/version, credits |
| S46 | Artwork states | Loading, unavailable, available |

S33–S37 local implementation increment: Recite now treats partial speech as a
preview and only grades a final transcript, with permission recovery, cancellation
and timeout states. Chapter-theme practice restores book selection and shows the
chapter image at the appropriate point. Book themes retain the existing large cover.
Chapter-chain and book-theme progress/log writes are transactional; chain completion
shows the interval returned by the completed save and blocks duplicate submissions.
The daily introduction uses chapter artwork and a single advance action; an extra
tap cannot skip its following exercise or create a review. Local Robolectric and
Compose tests use simulated speech, save failures and artwork. Real-device audio,
image loading, accessibility and screenshot comparisons remain outstanding, as do
the full acceptance matrix and remaining surfaces. The personal app was not updated.
S38–S39 increment: daily review actions show saving and disable repeat grading;
back/exit is blocked while saving. Verse review and log writes now share the
existing transaction. A failed review displays a conservative recovery message;
failed completion statistics cannot cause an already-saved review to be repeated.
The completion and quit copy now describes saved reviews and ungraded items, with
Finish as the primary action. First Letters keeps the words seen when changing modes
within the current daily session. This is not a claim of process-restored daily
sessions; the previous resume promise was removed. Real-device navigation, large
text and accessibility verification remain outstanding.
S40 practice Immerse increment: the focused reader uses saved type size, font and
line spacing, a bounded scrollable column, accessible reveal controls for masked
sentences, and explicit show/hide and playback controls. Daily Immerse stays on the
current review and returns to its prior state; stopping or leaving the reader stops
speech. Inline bold text is retained when preparing this view. Local tests cover
mask semantics, simulated themes, content and return behavior. This is a partial
S40 implementation: shared scripture rendering, precise position restoration,
real speech lifecycle, contrast, TalkBack, large-text visual review and device
journeys remain to be reconciled. Switching between practice modes after viewing an
answer also requires a broader exposure/scoring audit. No personal-app update.
S40 exposure follow-up: before an attempt is completed, showing unmasked text,
revealing a masked sentence, or playing the passage in Immerse records the exposed
words. Available review grades use the existing hint thresholds across practice
modes; saved cue levels reflect the assistance. Standalone practice restores this
exposure with its session, while daily practice retains it for the current session.
Viewing after a completed attempt does not change that attempt. Language fallback is
accounted for when the same verse text is reused. This addresses Immerse exposure;
other cross-mode exposures remain subject to the broader scoring audit. First Letters
and Immerse now share word positions for new exposures and merge them when totals
agree. Legacy session records with different totals retain the lower individual grade
ceiling rather than guessing a mapping. Source markup does not always unambiguously
distinguish headings from inline bold text; representative source/device checks remain
open. Device
accessibility, speech and full integration checks remain open.
S41 Retention increment: the overview keeps detailed interval, comparison, layer,
adherence and difficult-item information behind an expandable control. Interval
results include text counts and values and do not rely on color alone. Copy now
describes the actual low-cue review metric, its five-review threshold, and the
number of available cold-check candidates without claiming unmeasured certainty.
Existing analytics and interval scale calculations remain unchanged. Device visual,
contrast, TalkBack and high-history checks remain open; S42 Cold Check is separate.
S42 Cold Check increment: the check uses a scrollable Material layout with clear
prompt, answer, result and saving states. Saving is protected from duplicate taps
and incomplete submissions; failures do not claim a saved result. The matcher
still uses the existing 75% threshold, but repeated typed words can no longer
count more often than they occur in the answer, and blank answers do not match.
Tests verify that checks do not change review logs or due dates. Real-device keyboard,
accessibility and screenshots remain open; historical check results are not altered.
S43 Settings increment: Appearance, Reading, Practice and Data are grouped in
separate sections. Theme samples use the actual palettes; scripture size, typeface,
spacing and display options use the existing reader settings. The legacy Telugu
translation alias and font aliases remain selected without rewriting them. All prior
settings remain;
the saved text-to-speech and chapter-streak switches are labelled as not currently
applied, matching their actual usage. Quick writes are serialized and the complete
settings set is stored atomically; local tests cover recreation and failed writes.
The saved scripture size no longer scales the entire interface or compounds the
system scale twice in practice Immerse; interface text follows Android accessibility
settings.
The Data controls retain their existing implementation pending S44, including restore
preview and file-error handling. Physical theme, large-text, accessibility and
restart checks remain outstanding. No personal-app update has been made.
## Preview limitations and implementation acceptance

Preview QA: 43 views, 133 state selections, and exact S1–S46 coverage were checked.
The browser sweep exercised all states in four palettes at 736px/100% and
320px/200% (1,064 combinations); the final pass reported no runtime errors or
detected horizontal control/text overflow. Original-cover previews retain 4:3
proportions. Passage-selector navigation, recall reveal, and scramble place/remove
interactions passed. Twenty-eight declared text/surface color pairs measured at
least 4.96:1; this is not a complete native contrast audit. Reader, Today, Library,
Recall, Daily Practice, Immerse, and Settings captures are in the ignored
`app/build/design-qa/` folder alongside the machine-readable results.

- Example counts, passages, and results are sample content. English Scripture
  specimens use KJV; the preview does not require a change to the user's translation.
  Book-cover thumbnails use existing assets. Chapter-art blocks reserve existing
  art proportions; they are not replacement artwork.
- Buttons exercise representative local interactions. Search, grading, audio,
  permissions, backup, and persistence are not connected to the real app here.
- Daily scoring, collection-deletion scope, and restore semantics were checked in
  source. Existing collection deletion removes verses exclusive to that collection;
  confirmation must state that explicitly. Do not invent a collection-only deletion
  option without separate authorization and implementation.
- Restore is not a simple wholesale replacement: current code replaces matching
  verse/progress/topic records and adds/imports history/mappings. The native preview
  must describe actual effects and validate backup contents before applying changes.
  Do not silently change import semantics, introduce new schemas, or modify personal
  data while validating.
- Every old setting and advanced resource must retain a reachable destination.
  Representative preview copy does not replace actual Bible or reference content.
- Browser checks establish mockup behavior and measured layout bounds only.
  Native Compose, device screenshots, TalkBack, IME, English/Telugu source integrity,
  all themes, process restoration, audio, fold/unfold, and safe upgrade checks remain
  required under DESIGN_IMPLEMENTATION_PLAN.md after approval.
- Keep the existing local changes intact. Test using the isolated app. Update the
  regular app in place only after integrated validation; never uninstall, clear, or
  seed the user's personal application. Git commit/push status and phone installation
  status must be reported separately.
