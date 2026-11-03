# Remora Android — complete design implementation plan

Prepared November 2, 2026. Status: proposed; no implementation authorized by this
document. Source: [DESIGN_AUDIT.md](DESIGN_AUDIT.md).

## Outcome and scope

Make reading, finding scripture and practicing recall simple, consistent and
accessible. Reduce repeated controls, explanations and decorative space, while
preserving scripture, progress, user collections and the large 4:3 library covers.
Simplicity means fewer competing decisions, not smaller text or smaller targets.

This plan covers all 46 entries in the audit's screen/surface inventory, its seven
cross-cutting findings, Reader/Immerse defects, alternate code paths and evidence
gaps. It is complete against that inventory; newly discovered states must be
registered and assigned before a phase can close. A source inventory cannot prove
that no runtime defect remains.

## Working agreement and approval gates

**November 2 consolidated-review update:** the user's latest request replaces the
per-family approval/delivery cadence below with one review of the complete UI set,
followed by coordinated implementation and one validated app update. The review
gallery and S1–S46 mapping are recorded in [DESIGN_REVIEW.md](DESIGN_REVIEW.md).
Approval is still pending for that complete set. Internal implementation remains
incremental and reviewable; do not ship a partial foundation slice as the full design.

1. Complete the read-only evidence inventory first. Record every active route,
   modal, state and caller. Use the isolated `.uitest` app and synthetic fixtures.
2. Present one coherent foundation and Reader/Immerse prototype for approval,
   including narrow, large-text and light/dark examples. No app redesign before
   approval. The approved foundation then governs all subsequent previews.
3. For each screen family, show proposed normal, revealed/selected, empty/error,
   and large-text states before implementation. Approval covers the displayed
   behavior and named changes, not unrelated feature removals.
4. Implement the approved family, review it against the shared foundation, verify
   it on-device, and present the result before advancing to the next family.
5. Treat the earlier prototypes as design input. The latest simplicity and
   consistency requirements supersede assumptions that those prototypes are final.
6. Separate proposals to hide, merge or remove features from routine visual fixes.
   Obtain an explicit decision before removing a user-facing capability or changing
   scheduling, scoring, persistence or defaults that affect user behavior.
7. Work incrementally with rollback-sized changes. Preserve all existing workspace
   edits; do not reset the working tree or clear the personal app's database.

## Decisions to settle with the relevant preview

These decisions do not block evidence collection. Each blocks its dependent
implementation until resolved; elapsed time is not approval.

| ID | Decision | Recommended proposal for review | Dependency |
|---|---|---|---|
| D1 | Main destinations | Compare the current four destinations with Today / Bible / Practice and Lookup as an explicit search action. Do not silently remove Lookup. | Global navigation and home |
| D2 | Meaning of Immerse | Continuous chapter reading from the current position for Bible reading; preserve focused single-verse reading as a distinct practice context using the same renderer. | Reader/Immerse |
| D3 | Reading versus memorization | Make chapter recall an explicit secondary action rather than an unavoidable reading interruption. Keep the capability. | Reader end state |
| D4 | Practice scoring | Preserve current scores during visual migration. Separately decide whether daily and standalone practice should share explicit grading. Explain current automatic scoring in the preview. | Practice behavior |
| D5 | Naming | Use Collections consistently for user organization; choose one public term for chapter themes/anchors. Stored IDs and schema need not change. | Copy and navigation |
| D6 | Advanced tools | Keep advanced study, analytics and maintenance accessible but secondary. Review each candidate before removing anything. | Study, retention, settings |
| D7 | Appearance settings | System text scale always respected; saved reading size/typeface/spacing shared by Reader and Immerse. Decide the visible distinction between interface size and reading size. | Typography and settings |
| D8 | Language scope | Inventory all supported Bible translations separately from UI languages. Approve English/Telugu interface coverage and any additional language scope; never silently substitute another language. | Localization and reader |

## Implementation order and phase exit criteria

| Phase | Work | Dependency | Exit evidence |
|---|---|---|---|
| P0 — evidence | Route/state inventory, all-screen captures, contrast table, text/copy and data-flow inventory, device matrix | None | Every audited surface has a route or documented unused status and an evidence checklist |
| P1 — common foundation | F1–F8 below; known contrast defects included | P0 and foundation approval | Shared components demonstrated and tested in four themes; approved typography/density contract |
| P2 — reading | S18–S21, S26, S40; shared selectors needed by these | P1, D2/D3/D7/D8 | Reader → Immerse → Reader preserves passage, style and location; accessibility and long-text checks pass |
| P3 — finding and guides | S9–S17, S22–S25 | P1 and approved selectors; P2 navigation model | Find → read → study → back preserves origin and selections |
| P4 — home and memory organization | S1–S8 | P1, D1/D5; established reading entry | One clear daily entry, reliable collections and memory creation with preserved data |
| P5 — practice | S27–S39 plus the practice use of S40 | P1, D4; shared reading and artwork components | Every mode and item type passes the same prompt/answer/progress/exit contract |
| P6 — secondary surfaces | S41–S46 and Settings integration | P1, D6/D7/D8; earlier feature families | Settings and maintenance changes preserve preferences and data; secondary flows remain findable |
| P7 — cleanup and release | C1–C5, complete matrix, route and coverage reconciliation | All implemented phases | No unassigned audit findings; explicit disposition for deferred work; approved release candidate |

Dependencies can be developed behind the scenes, but screen-family reviews remain
sequential. No speculative duration is promised before P0 identifies fixture,
translation, device and data-migration requirements.

## Common foundation: required in every screen family

| ID | Implementation | Acceptance |
|---|---|---|
| F1 Typography | Define semantic roles in `theme/Type.kt` and a shared scripture style. Proposed preview baseline: interface body 16sp, secondary 14sp, supplemental 12sp; title and scripture sizes demonstrated rather than assigned independently in files. Replace arbitrary caps, letter spacing and extra-bold. Permit documented exceptions for scripture, original scripts and meaningful numeric displays. | Equivalent roles use the same tokens. All remaining literal sizes have a documented purpose. English/Telugu shaping, fallback fonts and line heights verified with real passages. |
| F2 Colors and contrast | Complete semantic surface/content, selection, focus, hint, success, warning, error and grade roles for all palettes. Remove fixed-dark/fixed-light pairings in drills. Audit alpha compositing and overlays, not just base tokens. | Normal text target ≥4.5:1; qualifying large text ≥3:1; essential non-text controls/indicators ≥3:1 against adjacent colors. Document exceptions such as inactive controls. Meaning never conveyed by color alone. |
| F3 Density and layout | Define spacing/radii/elevation and content-width classes: reading column, task form, browse grid. Replace fixed blank spacers with insets and actual content. Use content-driven control heights. | No clipped/overlapping content at 320dp or 200% text. No empty reserved chrome gap when hidden. Approved compact and expanded examples; long rows reflow without shrinking labels. |
| F4 Components | Shared header, selectable reference, search field, filter group, list/card, button hierarchy, progress, empty/error/loading states, sheets and dialogs. Use a single interactive target per card unless two distinct actions are required. | Each component has normal/pressed/focused/selected/disabled/error states in the review gallery. Consuming screens do not recreate equivalent controls. |
| F5 Navigation/state | Record origin and back destination; define behavior for tabs, modal dismissals, full-screen tasks and practice exits. Preserve route, filters, current passage and appropriate scroll positions. Handle Back and predictive back where supported. | Entry/exit matrix passes; no detour through an unrelated practice mode. Activity recreation and process restoration checked separately. |
| F6 Settings/localization | Centralize persistent reading preferences and theme mapping. Extract UI strings and plurals. Preserve stored preference keys or provide backward-compatible migration. Separate translation choice from UI language. | One size change has documented effects across UI/Reader/Immerse. Restart restores settings. No mixed-language fallback silently changes scripture. Human review of localized copy. |
| F7 Accessibility | Semantic headings, labels, selected states and progress; sensible focus order; announcements for results/errors; keyboard/switch alternatives to gestures; hidden recall answers absent from accessibility semantics. | Effective touch targets ≥48×48dp without overlap. TalkBack can complete critical flows. Large-text, keyboard, reduced-animation and focus restoration pass. |
| F8 Data/content integrity | Preserve scheduler, collection membership, verse IDs, review history and reading positions. Validate text formatting against source data. Share safe rendering instead of broad destructive regex cleanup. | Existing users upgrade without lost progress. Representative formatted verses retain all meaningful words. Duplicate tap and interrupted-save tests pass where state is written. |

Targets reference [Android Compose accessibility defaults](https://developer.android.com/develop/ui/compose/accessibility/api-defaults),
[W3C text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum),
and [WCAG 2.2](https://www.w3.org/TR/WCAG22/). These are acceptance targets,
not a claim of present compliance or a substitute for rendered inspection.

## Screen-by-screen work and acceptance

All rows inherit F1–F8 and the verification matrix below. The checks listed here
are additional behavior-specific checks. No row is complete on compilation alone.

| ID / audited surface | Proposed implementation work | Screen-specific acceptance |
|---|---|---|
| S1 Today header and daily-practice hero | Reduce greeting/helper repetition; give one primary daily action; move collection/order configuration behind a compact control. Decide reading/practice priority with D1. | Primary task and reading entry are identifiable in the narrow first viewport; due/empty/loading/error states remain accurate. |
| S2 Today reading card | Use a concise current passage and one Continue reading action; align with the Reader reference component. | Opens the saved passage, including after restart; correct first-use label with no saved position. |
| S3 Collections section/cards | Distinguish user collections from practice categories. Align card hierarchy and make open-versus-practice actions unambiguous. | Card/action semantics are distinct; counts and membership unchanged; long names and zero counts fit. |
| S4 Collection contents sheet | One title/action hierarchy, readable verse rows and secondary collection management. Retain selection/scroll on returning from verse detail. | Open verse, practice collection, add verse and return work; deletion cannot remove verses unexpectedly. |
| S5 New collection dialog | Separate custom-name entry from optional curated suggestions; adopt approved terminology and inline validation. | Blank/duplicate/long names handled; cancel leaves data unchanged; creation updates the invoking screen. |
| S6 Add verses sheet: manual, search, collections | Use a clear default adding path with secondary manual/import methods; share collection assignment and passage preview. Simplify combined-versus-individual import explanation. | Single/range, combined/individual, duplicates, invalid refs, cancellation, offline search and partial import errors verified; no unintended bulk additions. |
| S7 Verse detail sheet | Prioritize passage and Practice; place scheduling statistics and organization in secondary sections; share context/read actions. | Correct passage/version displayed; collection updates persist; destructive action explicit; statistics still accessible. |
| S8 Manage Groups and deletion dialogs | Use Collections naming after D5; shared management rows and confirmation component; distinguish deleting collection from deleting verses. | Membership behavior documented and preserved; cancel/back safe; long names and empty state fit. |
| S9 Chapter Themes book picker | Tighten repeated metadata/action copy without reducing touch sizes; use actual practice history or neutral Practice wording rather than zero-secure meaning unstarted. Keep search/filter conventions shared. | Previously practiced but non-secure book never misleadingly treated as new; counts match repository; clear-search/filter restoration and Telugu search pass. |
| S10 Bible Library | Preserve large original 4:3 covers; compress stacked introductory/metadata controls and harmonize filters. Keep adaptive browse layout. | Artwork proportions unchanged; empty/loading/offline states usable; book search/filter/scroll restore; folded/unfolded cards verified. |
| S11 Book Guide overview and structure | Shorter overview, one clear read entry, concise structure navigation; avoid repeated chapter actions in the same context. | All original structure/content retained; correct chapter opened; overview does not obstruct main guide sections. |
| S12 Guide chapter anchors | Group lengthy content with clear section access; reveal/collapse/practice controls use one hierarchy. Retain chapter art and its proportions; progressive disclosure requires preview approval. | All chapters reachable; reveal/collapse state retained appropriately; practice uses correct group; no eager loading of all large images. |
| S13 Guide key verses and memory sentence | Direct access to both sections without traversing every anchor; share scripture card and copy/add actions. | Jump lands at correct section under collapsed/expanded states; saved verses recognized; memory formatting/copy preserved. |
| S14 Guide chapter and book dialogs | Reuse shared selector primitives with context-appropriate presentation; consistent search, selected state and dismiss behavior. | First/last book and chapter, search no-results, long titles and return position pass. |
| S15 Commentaries | Clear series/section hierarchy; common reading typography; semantic accent treatment instead of unrelated category colors. | Existing series/content, section selection and links remain available; long commentary scroll and offline/empty states tested. |
| S16 Preachers / Theologians | Align reference-list/details presentation; reduce decorative heading clutter; placement subject to D6, content retained meanwhile. | List/details accessible with clear close/back; no accidental loss of reference content. |
| S17 Lookup: verse and Strong's modes | Concise search prompt; accessible mode control; shared result rows and primary read action; contextual add/definition actions. | Reference/keyword/English/Telugu/Strong's queries, no results, errors, keyboard submission and return from Reader preserve search. |
| S18 Main Reader | Put passage selection in the chapter/title line with a dropdown affordance; integrate compact translation access, remove the duplicate helper row, reduce repeated bottom selection controls. Apply a measured reading column and consistent paragraph hierarchy. | Book/chapter/translation remain distinct and accessible. Actual verse jump, if included, is explicitly designed rather than implied by translation control. Scripture retains viewport space and readability at all sizes. |
| S19 Reader book/chapter/translation navigator | Shared selector model with clear Book / Chapter / Translation roles and optional Verse jump; avoid tiny two-column labels. Preserve current choices while moving between selection stages. | Correct reference bounds, version availability, selected item focus and return-to-passage behavior; large labels never truncated to ambiguity. |
| S20 Reading settings | Essential reading controls first; advanced bionic options disclosed secondarily. Share preferences with Immerse and clearly separate interface versus scripture size. | Live preview matches both readers; reset scope explicit; changes survive process restart; UI language does not change translation. |
| S21 Selected-verse actions and memory form | Compact contextual actions; shared memory-add flow with optional collection/keyword detail; avoid stacking redundant dialogs. | Single, multiple and noncontiguous selection, copy/reference order, combined passage and cancel verified; selection preserved until operation completes. |
| S22 Cross references | Readable grouped references with secondary relationship/word details; common link and expandable-row treatment. | Original/current reference clear; expand and read-context work; nested return preserves the source passage and selected verse. |
| S23 Original words | Clear word/transliteration/gloss hierarchy; advanced derivation and translations secondary; share definition renderer. | Unicode Hebrew/Greek and Telugu/English text render; long definitions and missing data handled; occurrence links use correct word ID. |
| S24 Strong's definition dialog | Reuse the same definition content/hierarchy as Original Words and Lookup; choose sheet/dialog presentation consistently. | Entry from every caller produces equivalent content and a correct return path; no duplicate nested definition windows. |
| S25 Strong's occurrences | Shared result rows, explicit translation/reference context, concise read action and loading/no-result states. | All available occurrences remain accessible; selected result opens correct passage; back restores list and query. |
| S26 End-of-chapter recall | Apply D3: reading completion remains calm, with an explicit route into recall. Keep progress-write behavior separate from merely viewing content. | Reaching chapter end or dismissing recall does not grade; reveal/grade occur only through intentional actions. |
| S27 Verse practice / Recall | Shared compact session header, reference and mode control; prompt → answer → grades with only relevant guidance. | Recall, reveal, grade limits, queue progress, no-items and grading-save states pass; no answer leakage before reveal. |
| S28 Typing | Remove duplicate cue/explanation layers; shared field, check and answer-diff presentation; keyboard-aware single scroll owner. | Check stays reachable with IME; input/focus survives relevant transitions; exact/partial/blank attempts and accuracy preserved. |
| S29 First-letter practice | Consistent cue typography and touchable reveal affordances; concise contextual hint guidance. | Peeking changes hint/grade ceiling exactly as before; reset between items; hidden text not exposed through semantics. |
| S30 Eraser practice | Consolidate erase amount/count controls, remove fixed colors, use common completion/feedback actions. | Hidden words, slider bounds, word taps and grade ceiling correct; theme contrast and long passage wrapping pass. |
| S31 Scramble | Replace fixed dark word chips and feedback colors with semantic pairs; simplify placed/available word hierarchy and reset feedback. | All themes legible; duplicates/punctuation/order validation correct; full word bank reachable with large text; completion still requires intended grading. |
| S32 Listen | Shared reader text and compact audio controls; speed/repeat/hide/auto-advance grouped as secondary options; remove fixed dark panels. | Start/pause/stop, interruption, TTS unavailable, lifecycle cleanup and highlighting synchronization verified; controls visible in every theme. |
| S33 Speech | Semantic microphone/listening/error/accuracy states; consistent transcript and feedback hierarchy; explicit permission recovery. | Denied/permanently denied permission, unsupported recognition, partial/final transcript, stop/background and no-speech cases pass; no color-only feedback. |
| S34 Standalone chapter-anchor practice | Shared prompt/answer shell and return behavior; illustration after checking for text recall, visible initially only for image-based prompts. Preserve directions and judging. | Number→word, word→number, image cue, near/wrong/confused answers, hints, explicit grades and chosen-book scope pass. |
| S35 Standalone book-theme practice | Keep cover visible; align answer card and grades with shared practice components; reduce redundant global/queue progress. | Scope changes, reveal, grades and ungraded skip retain behavior; cover proportions preserved; no theme text leaked by cue semantics. |
| S36 Chapter-chain drill | Shared practice typography/actions/results; content-sized controls and simplified progress. Preserve Missed/Had it meaning unless D4 approves alternatives. | Each link scored once, final callback correct, restart/exit/no-items safe; large-text completion and long chain verified. |
| S37 Mixed daily practice: introduction | Concise introduction card with shared artwork/text hierarchy and one advance action; no duplicate drill instructions. | Introduction itself is not graded; advancing presents correct item; image loading/error does not block learning. |
| S38 Mixed daily practice: anchors and themes | Use approved aligned cards: chapter image after answer in text recall; book cover before reveal. Show current scoring meaning honestly; explicit-grade migration only after D4. | Every item type, direction and transition preserves current scheduler results; no double saves; input and scroll reset correctly between items. |
| S39 Practice completion and quit states | Shared completion summary and one clear finish action; optional continuation/restart secondary; consistent exit language and saved-progress statement. | Early exit, save in flight, empty queue, held-back items, full completion and restart accurately describe what was saved and what remains. |
| S40 Immerse from reading/practice | Implement the detailed contract below using the shared scripture renderer/preferences. Preserve focused practice context separately from continuous reading. | Entry position, content integrity, audio, hidden chrome, language, large text and restart rules all pass the Reader/Immerse journey tests. |
| S41 Retention | Concise overview with detailed charts/calibration/adherence/difficult items secondary. Replace jargon where possible without changing metric meaning; semantic chart colors. | No-data/limited-data/long-history states honest; formulas unchanged; accessible chart descriptions; never imply recall certainty from practice counts. |
| S42 Cold Check dialog | Use shared recall presentation with an explicit explanation that this does not alter scheduling; compact results. | No practice-review or interval writes; incomplete check, restart and finish correct; result text accurately reports sample size. |
| S43 App Settings | Group Appearance, Reading, Practice and Data; reduce duplicate controls using shared preferences and contextual links. Update palette swatches to actual colors. | Every old setting has a retained/migrated/approved-removed disposition; dependent settings and resets behave predictably; restart confirms persistence. |
| S44 Backup/restore dialogs and data-clear confirmation | File-based backup/restore as primary presentation; raw JSON secondary. Preview scope/results and clearly distinguish restore from destructive clear. | Export/import round trip, malformed/older/newer schema, missing permissions, cancellation and failed write tested on fixtures; no personal-data clear during QA. |
| S45 About dialog | Concise reader-facing purpose, version and relevant attribution; technical architecture secondary or omitted after copy approval. | Version accurate; required attribution/license information preserved; links accessible. |
| S46 Artwork loading/fallback states | Shared stable aspect ratios, loading/error/fallback semantics and retry policy; no answer-bearing descriptions on hidden recall cues. | Offline/missing/slow/corrupt artwork, memory pressure, rapid scrolling and theme changes do not shift layout or crash; no scripture information depends solely on artwork. |

## Reader / Immerse implementation contract

The following is proposed for the P2 preview and makes the work in S18–S21/S40
testable. It is not permission to implement before design approval.

1. **One reading model:** passage ID, translation, verse anchor/offset, reading
   preferences and playback state. Separate continuous Bible reading and focused
   practice context explicitly rather than overloading a boolean language flag.
2. **Shared rendering:** scripture text, paragraph/poetry breaks, verse numbers,
   typeface, spacing and selected palette use one rendering path. All section
   headings, including the first, use the same font size, weight, family and line
   height. Remove the existing first-paragraph 1.6x sizing exception; chapter titles
   and Psalm superscriptions remain explicitly separate semantic roles. Retain meaningful
   inline text while processing supported markup; compare against stored source.
3. **Position:** enter Immerse from the currently visible/selected verse; exit to
   the equivalent main-reader position. Save durable book/chapter/verse position;
   restore transient offsets safely after viewport/font changes.
4. **Chrome:** compact reference dropdown on one line when it fits; adaptive
   fallback at large text. No persistent instructional row. Hidden chrome releases
   its occupied space. No invisible controls intercept reading gestures.
5. **Reading measure:** center a bounded text column on expanded displays;
   preserve natural top flow for long text. Approve actual English/Telugu long and
   short samples, not only an attractive single-verse mockup.
6. **Navigation:** chapter-boundary behavior explicit; continuous chapter changes
   in Bible context, queue-bounded changes in practice context. Buttons and
   accessibility actions provide alternatives to swiping.
7. **Audio:** one coherent playback control surface, including stop access with
   chrome hidden. Track the spoken verse, respect manual navigation, prevent
   multiple players, stop/release on intended exit and handle interruptions.
8. **Gestures:** separate selection, scrolling, chrome toggle and recall reveal;
   no gesture-only action. Respect system back/edge gestures and reduced motion.
9. **Preferences:** one persistent size/typeface/spacing/palette contract;
   background/recreation does not reset to a default. No forced sans-serif path.
10. **Masking:** used only in the applicable practice context; masked answers are
    removed from accessibility content until revealed. Test assisted interaction.
11. **Long content:** no fixed 72/100dp blank spacers; scroll position keyed to
    passage/context and restored intentionally. No stale offset on the next item.
12. **Lifecycle:** restore position after process recreation; do not auto-resume
    audible playback unexpectedly; release screen-on flags when leaving the mode.

## Alternate/dead-code disposition

| ID | Candidate | Required investigation and action | Acceptance |
|---|---|---|---|
| C1 | `BibleIndexModal` | Verify call sites, previews, variants and reflective/navigation use. Migrate any caller to approved selector; otherwise propose removal. | All books still reachable through active routes; build/test after approved deletion. |
| C2 | `BookSelectorSheet` | Same reachability check; reconcile with active reader navigator before cleanup. | No orphaned route or missing chapter-selection capability. |
| C3 | `BookRecallSection` | Confirm whether replaced by current Today collections/practice categories; preserve any unique behavior. | Every unique entry/action mapped before approved removal. |
| C4 | `ShapeMeter` | Confirm data/visual usage; decide whether retained as secondary retention content or unused. | No data-model/scheduler deletion merely because the UI is unused. |
| C5 | `MainScreen` / `MainNavigation` sample path | Verify all manifests, build variants and tests; remove unused sample UI only after confirmation. | MainActivity launches intended flow in supported variants; no sample greeting remains in release UI. |

Do not remove a live feature because it looks complex or lacks recent use in tests.
Record keep / relocate / merge / remove decisions separately, with user approval
and migration/rollback notes where applicable.

## Verification matrix — mandatory coverage, not blanket claims

Maintain a ledger per S-ID with status: not started, previewed, approved,
implemented, verified, blocked or explicitly deferred. Record the build/commit,
fixture, device, theme, language, font scale, state, result and evidence path.

| Dimension | Required coverage |
|---|---|
| Themes | Paper, Sepia, Walnut, Midnight; normal, selected, focused, disabled, error, success, hint and highlighted-text states. Measure actual foreground/background pairs including opacity. |
| Text | System scale 100%, 150%, 200%; supported app/reader sizes and their worst-case combinations. Long titles, references, numbers, translated copy and passages. |
| Viewports | 320dp compact fixture; actual folded and unfolded phone; portrait/landscape; split-window where supported. Folding/resizing while a screen, picker, keyboard or audio session is active. |
| Languages | English and Telugu content/UI as approved by D8; all additionally supported translations get script/fallback integrity checks. RTL original-language words tested where displayed. |
| State | Initial/loading/content/empty/error/offline; partially loaded art; selected/multi-selected; expanded/collapsed; prompt/answer/graded; permission denied; save in flight. Mark genuine N/A cases with reasons. |
| Input | Touch, software keyboard visible, hardware keyboard navigation where supported, TalkBack, switch/accessible actions; focus restore after dialogs. |
| Lifecycle | Back, outside-tap dismiss, rotation, fold, background/foreground, activity recreation, force-stop/relaunch, process recreation and interrupted operation. |
| Data | Fresh install, upgraded settings/progress fixture, empty library, long collection names, many verses, duplicate content, history-rich practice; real source text compared with rendering. |
| Media | TTS installed/missing language, audio interruption, stop/exit, speech permission and recognition failures, no network and slow/missing artwork. |

Use automated pairwise coverage for broad combinations plus explicit worst-case
combinations (for example 320dp + 200% + long Telugu text + keyboard) for each
applicable family. All four palettes must be checked on every active surface;
pairwise sampling is not an excuse to omit a theme or an untested popup.

Verification layers:

- **Unit tests:** parsing/content preservation, filtering, state restoration,
  preference migration, navigation decisions, score/duplicate-save guards and
  data round trips. Do not add tests that merely mirror trivial styling code.
- **Compose tests:** interactions, semantics, bounds/text clipping, filters,
  reveal/grade behavior and adaptive reflow. Test actual dialogs/windows too.
- **Visual review:** screenshot comparison for every surface/state family;
  compare approved prototype to app in all themes. The reviewer checks hierarchy
  and density, not merely pixel differences.
- **Device checks:** real Reader/Immerse, Today/practice, search/guide and
  collection journeys; audio/permissions/keyboard/folding on actual hardware.
- **Accessibility:** TalkBack task completion, hidden-answer semantics, focus,
  effective target size, contrast and non-color communication.
- **Engineering review:** verify shared components, saved state, cancellation,
  lifecycle, image memory behavior, cold-start/scroll responsiveness and database
  compatibility. Obtain independent review if requested/assigned; do not imply
  review occurred without evidence.

Previous 178-unit-test results are a baseline, not proof of future changes. Run
targeted checks after each relevant change and a full regression suite for each
release candidate. Do not repeat unrelated tests without a new reason.

## Delivery, safety and completion

- Keep database and scheduler changes out of purely visual work. Where behavior
  or schema changes are approved, document compatibility and rollback first.
- Use the isolated application ID for installation and test fixtures. Never
  clear or seed the personal app. Back up fixtures before restore/upgrade tests.
- Keep screenshots/logs in ignored build reports; source controls and tests in
  the repository. Update the audit disposition and redesign notes after each family.
- For every completed family deliver: before/after evidence, changed behaviors,
  verification results and honest remaining limitations. Do not call it verified
  because an APK compiled or because the screen worked in one palette.
- Final release requires full ledger reconciliation: all S1–S46, F1–F8, C1–C5,
  D1–D8 and open audit evidence gaps have a recorded outcome. No silent exclusions.
- User-facing feature removal, changed grading and defaults have explicit approval.
  Remaining deferred work is named and accepted; it is not called “complete.”
- Release/personal-app installation happens only under the user's applicable
  authorization after the concrete candidate is reviewable. Rollback must preserve
  user content and review history.

## Coverage reconciliation

The S1–S46 table preserves the audit inventory order and maps each row one-to-one.
Audit global findings 1–7 map respectively to F1, F2, F6, F3/F4, F5, F4/F5/D5,
and F6/D8. All calculated contrast defects map to F2 and S31/S32/S33/S40.
The detailed Reader/Immerse findings map to S18–S21/S26/S40 and the twelve-point
contract above. Alternate surfaces map to C1–C5. Every open evidence gap maps to
P0 and the verification matrix. Runtime discoveries extend this ledger before
implementation or release claims are made.
