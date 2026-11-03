# Android design audit — November 2, 2026

This is a findings inventory, not a redesign or implementation plan. No feature
is approved for removal by this document. Existing approvals do not cover new
design decisions raised here.

## Scope and evidence

Inventoried all 45 Kotlin files containing composable UI under `ui`, including
screens, modal sheets, dialogs, practice modes, shared components and apparently
unused surfaces. Traced the current entry point (`MainActivity` → `MainScaffold`),
reader overlays and practice entry points. Reviewed source declarations, layout,
styling and interactions, with deeper inspection of Reader, Immerse, themes and
practice. Earlier device screenshots and focused test results inform this report.

This pass did not visually exercise every state of every screen on the device.
Source-confirmed defects, design judgments and items needing device verification
are distinguished below. Passing the earlier layout tests does not establish
consistent design, good contrast or full accessibility.

## App-wide findings

1. **Typography is not governed by one effective system.** `Type.kt` uses default
   M3 typography, but 31 of the 45 UI files also declare literal text sizes. The
   scan found 25 distinct literal sizes from 9sp to 54sp, before calculated reader
   sizes. Different sizes alone are not defects; the problem is that equivalent
   titles, labels and buttons follow different rules. Serif, sans, all-caps,
   letter spacing, bold and extra-bold are mixed across the app.
2. **Theme adoption is incomplete.** Some screens use M3 semantic roles, others
   use legacy Remora roles, and some mix theme-aware text with fixed dark fills.
   Positive, negative and grading colors remain fixed across themes. Small muted
   text is sometimes further faded with opacity.
3. **Size settings have inconsistent scope.** The general UI multiplies system
   font scale by the app size setting. Scripture maps that setting to its reader
   size enum, while Immerse starts from its own local size index. These are
   different scaling paths for what appears to be one app preference.
4. **Spacing and density vary by feature.** New cards commonly use 20–24dp padding
   and large radii; older sheets use smaller radii and 10–14sp text. Fixed-height
   controls coexist with content-sized controls. Wide-window limits are 640dp,
   840dp, 1000dp or absent depending on the surface.
5. **Navigation changes its meaning.** Bible is a standalone branch that hides
   the normal navigation bar. Anchor practice exits through verse practice;
   theme practice returns to Today. “Back,” “Close,” “Exit,” “Done,” “Finish &
   Return,” and “Continue” are not a coherent navigation vocabulary.
6. **The same task has multiple entry points and presentations.** Book/chapter
   selection, adding a verse, choosing a collection and opening a definition each
   have several interfaces. “Collections,” “Groups,” and “Topics” describe related
   organization concepts inconsistently. “Chapter Themes” opens “Chapter anchors.”
7. **Most interface copy remains English.** Telugu book names and verse text can
   render correctly while headers, explanations, actions and settings stay English.
   This is mixed localization, not a fully localized experience.

## Confirmed contrast problems

Calculated from declared foreground/background RGB values, including opacity
where stated. These are source-based contrast calculations, not a claim that a
complete screenshot or accessibility audit has been performed.

| Element | Theme / pairing | Approximate contrast |
|---|---|---:|
| Scramble word-bank text | Paper text `#251A14` on fixed `#221F1B` | 1.04:1 |
| Scramble word-bank text | Sepia text `#362B1C` on fixed `#221F1B` | 1.19:1 |
| Same Scramble text | Midnight text `#F3E7DF` on fixed `#221F1B` | 13.52:1 |
| Speech microphone icon | White on Midnight accent `#FFB591` | 1.71:1 |
| Immerse gesture hint | Paper muted text at 60% opacity over Paper background | 2.70:1 |

The base Paper body pairing is approximately 16.16:1. The failure is therefore
often in component-level combinations, rather than the base palette alone.
Listen also retains fixed dark control panels while their text follows the active
theme. Other status, disabled, selected, error and highlighted-word states need
individual rendered checks. A dark rectangle or fixed color is not automatically
a defect; its actual foreground/background pairing matters.

## Reader and Immerse findings

### Main Bible Reader

- The reference occupies the first header row, followed by a separate button
  reading “<version> · Change translation or chapter.” A bottom “CH n” button opens
  the same navigator. This repeats navigation and consumes reading space.
- The current reference is plain text rather than a visibly selectable title.
  The user's suggestion of a same-line dropdown addresses a real hierarchy and
  space issue, but no replacement layout has been approved in this audit.
- Translation, chapter and verse selection are different operations. The current
  helper text says translation/chapter; it does not describe selecting an
  individual verse. The eventual design decision must preserve that distinction.
- Previous/next navigation, progress, settings, overflow actions and the extra
  navigator row compete with scripture. How much remains visible varies by state.
- Scripture uses full available width with horizontal padding; there is no
  equivalent reading-column cap to the practice screens. Unfolded reading can
  have substantially longer lines.
- Paragraph headings scale differently from body text; the first heading is
  enlarged more than later headings. The resulting hierarchy needs visual review
  with actual English and Telugu chapters.
- End-of-chapter recall introduces artwork and grading into the reading flow.
  This is a product-purpose conflict to discuss, not an automatic deletion.
- Verse selection opens Copy / Refs / Memorize and then a substantial memory form.
  That form retains older typography and fixed-height options.

### Immerse

- It is a **one-verse-at-a-time viewer**, not continuous chapter reading. Verse
  navigation in this entry path stops at the chapter boundaries.
- Entry from the main Reader explicitly starts at verse index zero; it does not
  use the verse currently being read on screen.
- Font size starts at local index 1 using `remember`. It is not the main Reader's
  saved size state and is not saved with `rememberSaveable`.
- The main Reader passes `serifTypography = false`. The chosen ReaderFontFamily
  and line-spacing setting are not passed through. Immerse uses a fixed 1.55
  line-height multiplier with its own 22sp base and multipliers.
- Text is vertically centered with 72dp top and 100dp bottom spacers, plus reference
  padding and another 24dp gap. Hiding controls does not remove those spacers.
- There is no maximum reading width, making short-versus-long verse layout and
  unfolded reading inconsistent.
- Position appears as a small top counter, a bottom progress line and navigation
  controls. The top overlay can cover the counter when controls are visible.
- Audio has a top stop control and a separate persistent stop pill. The pill can
  compete with bottom navigation and text.
- A single non-wrapping bottom row contains Previous, a gesture instruction and
  Next. It is a crowding risk at narrow widths and large font sizes.
- Several icon controls are explicitly 36–40dp and the size-reset control is 34dp
  high. Effective touch areas and overlap need device accessibility inspection.
- Tapping text hides controls; horizontal dragging changes verses; optional recall
  masking adds sentence taps. These interaction meanings overlap.
- Scroll state is remembered without a verse key, so long-verse-to-next-verse
  position restoration needs a specific behavioral check.
- Masking uses visual blur/alpha without corresponding hidden-text semantics:
  a screen reader may still expose the answer. This is a source-level accessibility
  concern requiring assistive-technology confirmation.
- Text cleanup removes entire `<b>…</b>` spans, not merely the tags. Whether any
  meaningful scripture is lost depends on the stored markup and must be checked
  against representative translations.

## Screen and surface inventory

“Concern” describes an observed implementation or a design judgment, not a removal
decision. Modal and empty/completion states belong to the same inventory as pages.

| Screen / surface | Gaps and simplification questions |
|---|---|
| Today header and daily-practice hero | Large greeting, explanatory copy, collection/order controls and practice CTA occupy much of the initial viewport. Reading and collections compete with the primary action. |
| Today reading card | Separate entry to reading is useful, but its priority relative to the practice hero is unresolved. |
| Collections section/cards | Mixes user collections with Book Themes and Chapter Themes. Card tap and Review have different entry meanings; older typography remains. |
| Collection contents sheet | Another Review/Add surface with its own title and row styling; overlaps collection actions elsewhere. |
| New collection dialog | Curated suggestions and custom creation are combined; “group” terminology elsewhere differs. |
| Add verses sheet: manual, search, collections | Multiple modes, assignment controls and import choices in one large sheet; fixed-size copy and dense group controls. |
| Verse detail sheet | Reading text, group editing, mastery percentage, repetition/interval data, context, practice and deletion compete. Scheduler detail is prominent for a simple-app goal. |
| Manage Groups and deletion dialogs | Third organizational vocabulary; older button/text sizing and semantic-color inconsistencies. |
| Chapter Themes book picker | Recently aligned, but the instruction, due status, learned count, progress track and action text repeat within a tall list. “Start practice” is based on secure count, so a previously practiced book with zero secure chapters can still say Start. |
| Bible Library | Large covers are an explicit user preference. Header explanation, search, testament filters, section control and count stack above the covers. Card metadata and action text add further vertical height. |
| Book Guide overview and structure | Large overview plus structure cards delays access to anchors; duplicates Read chapter 1 / Choose chapter / per-anchor Read actions. |
| Guide chapter anchors | Full artwork for many chapters creates a very long page; reveal-all, per-anchor reveal, collapse and chain controls create many simultaneous decisions. Preserve artwork preference when discussing this. |
| Guide key verses and memory sentence | Key verses follow all expanded anchor groups; easy to miss. Jump-to-memory helps one section, but other deep content remains distant. |
| Guide chapter and book dialogs | Different selector patterns from Reader and Chapter Themes; inconsistent search and navigation presentation. |
| Commentaries | Series selection, colored categories and strategy notes add visual layers; fixed colors and 12–15sp content do not fully match new cards. |
| Preachers / Theologians | Separate secondary reference surface with emoji heading and older typography; relevance to the simplest core journey remains a product question. |
| Lookup: verse and Strong's modes | Long search placeholders, dense custom tabs, multiple result actions; 11–15sp metadata and 10dp search radius differ from recent screens. |
| Main Reader | Duplicated navigator access, extra translation row, variable chrome and uncapped line width; detailed findings above. |
| Reader book/chapter/translation navigator | Two testament columns plus chapter grid in one sheet; labels reach 9–10sp. High density competes with touchability and large text. |
| Reading settings | Numerous simultaneous controls: size, typeface, spacing, palette, bionic mode/intensity and numbers. Partial overlap with app Settings. |
| Selected-verse actions and memory form | Copy, references and memorization branch into nested tasks; older 11–15sp labels and fixed-height choices. |
| Cross references | Directions, counts, expandable groups and same-word results make a dense secondary screen. Advanced study and basic navigation coexist. |
| Original words | Dense transliteration/definition/derivation/translation hierarchy, 9–12sp labels and additional occurrence navigation. |
| Strong's definition dialog | Overlaps information in Original Words and Lookup's Strong's results, with another presentation and exit pattern. |
| Strong's occurrences | Another results screen with Read Chapter actions and small metadata; language/version expectations need clarity. |
| End-of-chapter recall | Reading transitions into a memorization task with image and grading; purpose is not purely reading. |
| Verse practice / Recall | Newer shell but header, explanatory text, reference, mode picker, answer and grade guidance can stack heavily. |
| Typing | Cue, input, helper copy, comparison, accuracy and grading create several layers. Uses 10–17sp custom sizes within the newer shell. |
| First-letter practice | Word-level hints plus guidance and grading ceiling; small 10.5–12sp labels and independent interaction styling. |
| Eraser practice | Slider, hidden count, tap instructions, grading ceiling and recitation CTA compete; fixed hidden-word colors. |
| Scramble | Confirmed near-invisible word text in light themes. Fixed dark tiles, decorative placeholders, word bank, reset and feedback have their own visual system. |
| Listen | Fixed dark player surfaces; playback, speed, repeat, hide-text and auto-advance controls make a dense panel. Highlight colors are not consistently theme-paired. |
| Speech | Fixed feedback colors and white microphone icon; transcript, cue and accuracy states use a different hierarchy. Permission/error states need rendered inspection. |
| Standalone chapter-anchor practice | Newer M3 shell, but direction picker, entry, feedback, grading and exit-through-verse-practice differ from daily-session anchors. |
| Standalone book-theme practice | Cover, scope filters, global progress, queue progress, reveal, grades and skip make a tall screen. Grades differ from the daily theme's Continue action. |
| Chapter-chain drill | Older fullscreen dialog, tiny uppercase labels, fixed-height actions, distinct results styling and Missed/Had it vocabulary. |
| Mixed daily practice: introduction | Separate introduction treatment and “Got it — Start Drill” wording before practice; older scale and spacing. |
| Mixed daily practice: anchors and themes | Old card internals inside newer header; automatic scoring behind Continue differs from standalone explicit grades. Proposed visual alignment is not yet implemented. |
| Practice completion and quit states | Several different completion/exit vocabularies; verse completion offers five actions. Daily completion adds held-back-item continuation. |
| Immerse from reading/practice | Separate size, layout, navigation and control behavior; detailed findings above. |
| Retention | Large headline statistics, curve, calibration, layer breakdown, cold check, adherence and difficult items create an analytics destination rather than a simple reading flow. Technical language and fixed status colors remain. |
| Cold Check dialog | Yet another recall experience with input, reveal and results, independent of normal practice scoring. |
| App Settings | Appearance, reading behavior, translation, anchor reveal, backup/restore and destructive actions in one long list. Small custom typography; readers may not understand how global and reading-specific options interact. |
| Backup/restore dialogs and data-clear confirmation | Raw JSON and technical instructions are exposed directly. These are maintenance surfaces whose visibility belongs in the simplification discussion. |
| About dialog | Includes SQLite, entry counts, SM-2 and Compose implementation details; not aligned with a reader-focused product explanation. |
| Artwork loading/fallback states | Cover and chapter images use custom placeholder typography; loading/failure presentation is not a uniform system. The fixed chapter badge clipping was already corrected, but fallback semantics still need review. |

## Apparently unused or alternate surfaces

Repository call searches found only declarations for `BibleIndexModal`,
`BookSelectorSheet`, `BookRecallSection` and `ShapeMeter`. They appear outside the
current active UI path. The sample `MainScreen` is referenced by `MainNavigation`,
but `MainActivity` launches `MainScaffold` instead. These are candidates for a later
reachability/cleanup decision, not confirmed user-facing screens to redesign and
not authorization to delete them.

## Open evidence gaps

- Every screen/state has not been rendered in every palette, size and fold state.
- TalkBack reading order, effective touch targets, focus restoration and hidden
  answers need assistive-technology testing.
- TTS, microphone permissions, long passages, long translated labels, image-load
  failures and empty/error states need direct observation.
- Usage data and user preference are needed before calling a feature unwanted.
  Complexity, duplication and unused code are different findings.

The audit establishes inconsistent typography, concrete contrast defects, competing
navigation and information hierarchy, and a distinct, insufficiently integrated
Immerse experience. It does not select replacement designs or a removal list.
