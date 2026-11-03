# Material 3 redesign

## Sequence

1. Establish a build, test and screenshot baseline of the active application.
2. Define navigation restoration and app/reader theme precedence.
3. Review Today, Reader and Practice mockups, including the four palettes,
   Telugu text and large text, before rolling out visual changes.
4. Consolidate theme ownership and validate Today → Reader → return.
5. Apply approved components to the remaining screens and adaptive layouts.
6. Validate existing data, accessibility, offline use and speech/review flows.

## Baseline — October 30, 2026

- Standard debug APK builds successfully.
- A forced rerun of all 162 unit tests passes (28 suites, no failures/errors).
- The active entry point is `MainActivity` → `MainScaffold`. The existing
  `MainScreenTest` exercises the unused sample screen.
- `AppBaselineTest` exercises actual app navigation and settings-screen
  restoration after Activity recreation, and saves reference screenshots.
- The isolated app and instrumentation APK both compile. Both smoke tests pass
  on the connected Samsung SM-F971U1 (API 37). Reference captures of Today,
  Lookup, Bible and Settings are in `app/build/reports/baseline/`.
- The installed Windows emulator binary rejects the available ARM64 AVD as
  incompatible with its reported x86_64 host. Device UI validation uses a
  separate test application ID instead.

## Navigation and appearance contract

Foundation validation (October 30, 2026): app and instrumentation APK builds
pass; all 166 unit tests pass; all four navigation/theme UI tests pass on the
isolated Samsung device install. Full process-death restoration, reader/drill
continuation, contrast, and adaptive layouts remain later acceptance checks.

The four top-level destinations remain Today, Lookup, Practice and Bible.
Back closes the visible reader, guide, settings or retention screen before
changing the selected tab. At a non-Today root, Back returns to Today; at Today,
Android handles exit. An in-app Back button and system Back must agree about
the destination they reveal. Settings opened from Lookup returns to Lookup.
A reader opened from a guide returns to that guide, preserving the parent book.

The M3 shell will keep global navigation visible at all four root destinations
(bar on compact windows, rail on wider windows). Active reading and drills
use focused layouts. The mockup is approved; the current Bible and Practice
layouts remain intact until their respective implementation stages.
Tab scroll positions, selected book/chapter, search queries and drill progress
need explicit restoration tests as those screens migrate. Activity recreation
is tested separately from process-death restoration; passing one does not prove
the other.

There is one saved palette choice: `black`, `dark`, `sepia` or `white`. Choosing
it from either Settings or the reader updates the same preference. Reader
typography and its existing palette rendering remain deliberate reading styles,
not independent global theme state. Existing aliases stay accepted. Dynamic
color is deferred until the mockups establish its interaction with fixed palettes.

`MainScaffold` owns the app's theme. Legacy color tokens read its composition
scope instead of mutable global state, so nested themes cannot overwrite parent
colors. View models save preferences, then publish a settings revision for the
other screen to reload. Reloading settings does not publish another revision;
this avoids a synchronization loop and the former read-before-save race.

System font scaling remains enabled. The app text-size preference is applied
once to app chrome, while the reader applies its own existing scale to Scripture.
The M3 typography pass must verify large-text and Telugu layouts before changing
that behavior. Contrast corrections and full M3 role mapping are part of the
visual foundation step, not established by these state-management changes.

## Mockup review — Daily focus approved

The user approved Daily focus on October 30, 2026.

Two interactive home-screen alternatives share the same reader and practice
screens: **Daily focus** puts the next review first; **Library first** leads with
collections. Daily focus is the recommended starting point for the daily habit.

The preview includes Paper, Midnight, Walnut and Sepia palettes, English and
Telugu Scripture specimens, and text scaling from 100–150%. Progress and library
counts are illustrative. The prototype explores appearance and transitions; it
does not run the Android scheduler or write application data.

Browser QA covered the recall/reveal/grade/completion sequence, switching
palettes and variants, and the reader and Library first layout at 320px with
150% text. No horizontal overflow was found in those tested states. This is
visual-prototype QA, not native Android accessibility certification.

Approval applies to the chosen hierarchy, palette direction, typography and
component treatment. Implementation should retain existing drills, saved
preferences and scheduling behavior, then validate the native screens on device.

## Implementation — Today and visual foundation

The first approved visual slice implements the four fixed palettes as M3 semantic
roles, the standard M3 UI type scale, the navigation bar treatment, and the Today
hierarchy: daily review, reading, then collections. Content is capped at 640dp on
wide windows. Controls wrap or grow with text; collection actions use M3 buttons.
Existing collection inspection, add/create actions, review scope and order remain
available. Review scope and order now sit under Review options.

The hero reports real **verse** counts and retains the existing verse scheduler.
Chapter and book-theme practice remain separate collection actions in this slice.
Empty libraries offer Add verses; zero-due libraries offer optional practice.
The reading card starts at the current reader chapter and follows chapter changes
within the running app. The subsequent Reader stage adds persistence across
process restarts, as described below.

Collections now show learned progress only: the former fallback incorrectly used
due verses as learned progress. The default streak is zero when no saved value exists; the former repository
fallback fabricated a 14-day streak. Hard-coded labels on accent-filled buttons were updated to onPrimary so
legacy screens remain legible with the new palette. The Reader stage follows
below; practice layouts, navigation at Bible/Practice roots and the wide-window
rail remain subsequent stages.

Validation includes unit checks for semantic text contrast in every palette and
native checks for empty-library actions, collection/order selection, 320dp layout
at 150% text, Telugu book labels, and Today → Reader → Today navigation. Native
screenshots are written to the isolated app's baseline folder. On October 30,
2026, both APKs built, all 166 unit tests passed, and all seven native tests passed
on the isolated Samsung install (API 37). The compact text check measures visible
line bounds with one pixel of raster-rounding tolerance and rejects ellipsis.
This does not establish full accessibility compliance.

## Implementation — Reader and saved chapter

The reader now shares the app's four palettes. Its header has Back, a wrapping
chapter title, reading settings, and an overflow menu for listening, immersed
reading, and commentary. Translation/chapter selection remains available below
the title and from the bottom chapter control. Header and footer are measured so
Scripture has sufficient padding at larger text sizes. Reading settings now use
M3 filter chips, switches, tonal surfaces and a live typography preview.

Scripture retains the saved typeface and size. Section headings preserve source
casing. Line spacing now uses the selected font size and spacing multiplier once;
the former calculation multiplied an already expanded line height a second time.
Verse selection, references, recall grading and the existing study sheets remain.

The last successfully loaded chapter is stored atomically as book:chapter under
reader_position in the existing session_state table. This adds no schema migration
and uses a separate key from practice sessions. Startup validates the book, clamps
the chapter to the book's range, and falls back to Genesis 1 for invalid data.
Today shows Continue reading only when there is a saved reference. Restoration is
at chapter granularity; precise scroll/verse position is not saved.

Newer chapter requests cancel previous loads. A mutex serializes database commits
even if an older SQLite write completes after cancellation. This prevents an older
request or startup load from replacing the latest selection. Checks cover
saved-chapter restoration in a new view model, invalid saved data, rapid requests,
palette consistency, reader activity recreation, large-text English/Telugu layouts,
and a separate force-stop/relaunch validation on the isolated install.

Validation on October 30, 2026: the full 170-test unit suite passed; all 18 Reader
unit tests were rerun and passed after the final persistence safeguard. Both APKs
build. Eight navigation/theme/layout tests pass on the isolated Samsung install,
plus one separate test after force-stopping the app confirms Genesis 2 restores
from the saved database value. Reader and settings screenshots are in
app/build/reports/baseline. Full unit reports are preserved under
app/build/reports/reader-full-unit-suite.

## Practice — focused verse review

Verse Practice now uses a Material 3 header, queue progress, a compact mode menu,
serif reference, tonal answer card and a two-by-two Again / Hard / Good / Easy
grade group. Recall is the initial mode for new sessions; saved mode identifiers
remain compatible. Existing drills stay available. Puzzle completion now waits
for an explicit grade rather than recording Good automatically. Listening keeps
its existing audio completion behavior.

The grade buttons use the existing view-model ceiling for hints and measured
attempts. No scheduler thresholds were changed. Both practice view models reject
duplicate grade submissions while saving, with regression tests that verify a
single review/outcome. The mixed daily player shares the header, mode menu and
verse grade controls; its specialized anchor/theme cards are a later design pass.

The verse screen scrolls for large text and keyboard use, limits reading width
on larger windows, resets drill composition between verses, and provides an
explicit exit to Today. Completion describes the reviewed queue rather than
claiming all material is mastered. Existing drill surfaces use theme roles.

Validation on October 30, 2026: the full 172-test unit suite passes. Eight existing
navigation, theme, Today and Reader device checks pass. All four Practice device
tests pass on the final build: Recall reveal/grade/completion, hint-limited grades,
typed-answer review with measured-accuracy logging, and compact 320 dp
English/Telugu review layouts at 150% text across all four palettes. Fixtures create and remove
only their own verses and collection in the isolated test app. Screenshots are
under app/build/reports/baseline/practice-*.png.

Remaining acceptance coverage includes microphone/TTS behavior, every drill at
large text, process restoration of hint/attempt details, and full accessibility.

## Chapter-anchor and book-theme practice

The standalone anchor and theme drills now share the focused Material 3 header,
scrolling 640 dp maximum content width, tonal answer cards, minimum 48 dp action
buttons, and explicit Again / Hard / Good / Easy grades. Theme scope chips wrap
and retain their whole-Bible, Old Testament and New Testament filters. Skipping
is labeled as ungraded. Completion describes reaching the end of the queue,
without claiming every item is mastered or that nothing is due.

Anchor number-to-word, word-to-number and numeric-plate cues remain available.
The answer form dismisses the keyboard on Check or Show, displays existing
correct/near/confused-chapter feedback, and retains the supplied answer. System
Back now follows the anchor screen's exit action into verse practice. Theme Back
returns to Today. The existing numeric plate placeholder remains; this stage
does not add downloaded artwork or localize the anchor/theme content database.

Both view models reject repeated grades while saving. Theme skip/filter/restart
actions cannot change the queue mid-save. A selected anchor book cancels the
initial queue load so startup cannot replace that selection. The scheduler and
answer-judging thresholds are unchanged. Shared cards inside the separate mixed
daily session player remain a later pass.

The full unit suite passes (175 tests). Device regression testing also identified
a keyboard/scroll issue in the prior verse typing screen: nested scroll areas
could leave Check beneath the keyboard. The focused verse form now uses its
parent scroll container, and submission clears keyboard focus. The typing test
uses a compact 400 dp by 700 dp fixture, waits for keyboard visibility before
entering text, captures the keyboard-open screen, and asserts that tapping Check
reveals the submitted answer. This avoids passing only on the unfolded display
with its keyboard hidden and avoids injecting text during keyboard startup.

Device validation on October 30, 2026: all 17 distinct checks pass across the stage.
The initial 17-check run passed 16 and exposed the typing keyboard issue; all four
verse-practice checks were rerun successfully on the final build after its fix.
The new coverage includes anchor directions and answer feedback, theme filters,
ungraded skipping, explicit grades, completion and next-item scroll restoration,
real Today-to-anchor/theme navigation and Back behavior, plus 320 dp layouts at
150% text size across four palettes with English and Telugu content samples.
These samples test rendering, not a new database translation feature.
The two APKs build successfully. Device logs are in
app/build/reports/study-practice-device-tests.txt and
app/build/reports/practice-keyboard-regression.txt; screenshots are under
app/build/reports/baseline/anchors-*.png and themes-*.png.

## Bible library

The library retains the large 4:3 covers and adds testament and section filters,
whole-Bible search, responsive columns, and restoration of the library's scroll
position when returning from a book guide. Clearing a search restores the chosen
testament and section.

Validation on November 2, 2026: both isolated APKs built and all 177 unit tests
passed. Two focused checks passed on the isolated Samsung app, covering navigation,
testament filtering, whole-Bible search, and return from a guide. A screenshot is
at app/build/reports/baseline/bible-library.png. Additional compact layout coverage
is described below; unfolded library layout coverage remains open.

## Book Guide

The approved guide design adds direct chapter and book selection, chapter anchor
controls, and refreshed structure, key verse, memory sentence and resource sections.
Returning from the reader retains the guide's scroll position and reveal state.
The isolated APKs build and 178 unit tests pass. Three focused phone checks pass
for library navigation, search, selecting Genesis 2 and returning through the guide.
The guide screenshot is at app/build/reports/baseline/book-guide.png.

LibraryGuideDesignTest passes both device tests on November 2, 2026. The layout
matrix covers 320 dp width at 150% font scale, all four themes, and English/Telugu
book titles for both screens, checking text layout at overview, card, key-verse,
and memory-sentence positions. It caught a clipped chapter-artwork badge: that
badge now has minimum dimensions and padding instead of a fixed 28 dp size.
The second test covers guide anchor reveal, entering chain practice, correct and
missed answers, the resulting callback values, and exiting back to the guide.
Fixtures do not write practice progress. Both isolated APKs build. Accessibility
coverage here is limited to selected semantic labels, actions, disabled states,
and text clipping; TalkBack navigation, contrast measurement and a full touch-target
audit remain open. Chain practice at enlarged text remains a separate check.

## Chapter Themes book picker

The picker uses wrapping testament filters, whole-Bible name search and tappable
Material 3 book cards. Due and learned counts use the existing mastery data;
clearing search restores the selected testament. The isolated APKs build and two
focused device checks pass for filtering, cross-testament search, progress values,
selection and Today-to-anchor-practice navigation. A device screenshot is at
app/build/reports/baseline/chapter-picker.png. Large-text, theme and accessibility
coverage for this picker remains open.

## Shared foundation follow-up

The approved foundation now defines explicit interface typography roles. Reader
section headings use the same size and line height regardless of paragraph index.
Scramble and Listen surfaces/highlights, Eraser placeholders, and the Speech
microphone use semantic surface/content pairs instead of the problematic fixed
dark/light combinations. This is the first foundation increment, not completion
of the full screen migration; other literal styles and feedback colors remain.

Both isolated APKs build and all 178 unit tests pass, including palette contrast
checks. Eight device checks pass on the isolated phone across Reader, nested theme
scope, Today, Practice, Bible Library, Book Guide and Chapter Themes picker.
ReaderDesignTest compares first and subsequent heading font size, line height and
weight at 150% text across four palettes and English/Telugu samples. Its fixture
screenshot is at app/build/reports/baseline/reader-compact-white-en-150.png.
These checks do not establish full contrast coverage for every practice state,
TalkBack behavior or the separately planned Reader/Immerse redesign.

### Repeat the checks

Run from this directory:

```powershell
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest --console=plain
# Force test execution rather than accepting Gradle's up-to-date result:
.\gradlew.bat :app:testDebugUnitTest --rerun --console=plain

# Build an isolated copy; ordinary debug/release application IDs stay unchanged.
.\gradlew.bat -PisolatedUiTests=true :app:assembleDebug :app:assembleDebugAndroidTest --console=plain
```

Use an explicit device serial for installation and execution:

```powershell
adb -s DEVICE_SERIAL install -r app/build/outputs/apk/debug/app-debug.apk
adb -s DEVICE_SERIAL install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb -s DEVICE_SERIAL shell am instrument -w -e class com.example.telugubible.AppBaselineTest com.example.telugubible.uitest.test/androidx.test.runner.AndroidJUnitRunner
adb -s DEVICE_SERIAL pull /sdcard/Android/data/com.example.telugubible.uitest/files/baseline app/build/reports/baseline
```

For the navigation/theme foundation regression suite, select both
`com.example.telugubible.AppBaselineTest,com.example.telugubible.ThemeScopeTest,com.example.telugubible.TodayDesignTest,com.example.telugubible.ReaderDesignTest`
as the instrumentation `class` argument. This adds Lookup → Settings → Lookup
→ Today navigation and verifies nested theme isolation and theme recomposition.

The UI suite requires the `com.example.telugubible.uitest` install. It does not
clear databases or seed personal progress. Screenshots belong under ignored
build output, not in the bundled application assets. Full accessibility and
upgrade migration remain separate acceptance checks. Run PracticeFlowTest and
PracticeDesignTest for the isolated review fixtures and compact layout checks.
StudyPracticeDesignTest adds the anchor/theme interaction and large-text fixtures;
AppBaselineTest also checks both drills through real application navigation.

To verify chapter persistence, run the suite above (it ends the real-reader test
at Genesis 2), force-stop only com.example.telugubible.uitest, then run
com.example.telugubible.ReaderResumeTest in a separate instrumentation invocation.
This is separate from the Activity recreation test and does not clear user data.
