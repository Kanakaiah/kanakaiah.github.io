/**
 * Remora - Bible Verse Memorization App
 * Core Application Logic & State Controller
 */

// --- CURATED PRE-SEEDED TOPICS (For offline fast loading) ---
const CURATED_TOPICS = {
    peace: [
        { ref: "Philippians 4:6-7", text: "Be anxious for nothing, but in everything by prayer and petition with thanksgiving let your requests be made known to God. And the peace of God, which surpasses all comprehension, will guard your hearts and your minds in Christ Jesus.", translation: "LSB" },
        { ref: "Isaiah 26:3", text: "The steadfast of mind You will keep in perfect peace, Because he trusts in You.", translation: "LSB" },
        { ref: "John 14:27", text: "Peace I leave with you; My peace I give to you; not as the world gives do I give to you. Do not let your heart be troubled, nor let it be fearful.", translation: "LSB" }
    ],
    faith: [
        { ref: "Hebrews 11:1", text: "Now faith is the assurance of things hoped for, the conviction of things not seen.", translation: "LSB" },
        { ref: "Proverbs 3:5-6", text: "Trust in Yahweh with all your heart And do not lean on your own understanding. In all your ways acknowledge Him, And He will make your paths straight.", translation: "LSB" },
        { ref: "Romans 10:17", text: "So faith comes from hearing, and hearing by the word of Christ.", translation: "LSB" }
    ],
    strength: [
        { ref: "Isaiah 40:31", text: "Yet those who hope in Yahweh Will gain new strength; They will mount up with wings like eagles, They will run and not get tired, They will walk and not become weary.", translation: "LSB" },
        { ref: "Psalm 28:7", text: "Yahweh is my strength and my shield; My heart trusts in Him, and I am helped; Therefore my heart exults, And with my song I shall thank Him.", translation: "LSB" },
        { ref: "Joshua 1:9", text: "Have I not commanded you? Be strong and courageous! Do not be terrified or dismayed, for Yahweh your God is with you wherever you go.", translation: "LSB" }
    ],
    love: [
        { ref: "1 Corinthians 13:4-7", text: "Love is patient, love is kind and is not jealous; love does not brag and is not arrogant, does not act unbecomingly; it does not seek its own, is not provoked, does not take into account a wrong suffered, does not rejoice in unrighteousness, but rejoices with the truth; bears all things, believes all things, hopes all things, endures all things.", translation: "LSB" },
        { ref: "1 John 4:19", text: "We love, because He first loved us.", translation: "LSB" },
        { ref: "Romans 5:8", text: "But God demonstrates His own love toward us, in that while we were yet sinners, Christ died for us.", translation: "LSB" }
    ]
};

const SEED_VERSES = [
    {
        id: "seed-1",
        ref: "Psalm 23:1",
        text: "Yahweh is my shepherd, I shall not want.",
        translation: "LSB",
        addedDate: new Date().toISOString(),
        status: "learning",
        sm2: {
            interval: 0,
            repetition: 0,
            efactor: 2.5,
            nextDueDate: new Date().toISOString()
        },
        streak: 0,
        attempts: 0
    },
    {
        id: "seed-2",
        ref: "John 3:16",
        text: "For God so loved the world, that He gave His only begotten Son, that whoever believes in Him shall not perish, but have eternal life.",
        translation: "LSB",
        addedDate: new Date().toISOString(),
        status: "review",
        sm2: {
            interval: 0,
            repetition: 0,
            efactor: 2.5,
            nextDueDate: new Date().toISOString()
        },
        streak: 0,
        attempts: 0
    }
];

// --- BIBLE CANONICAL ORDER LIST & PARSER ---
const BIBLE_BOOKS_ORDER = [
    // Old Testament
    "genesis", "exodus", "leviticus", "numbers", "deuteronomy", "joshua", "judges", "ruth",
    "1 samuel", "2 samuel", "1 kings", "2 kings", "1 chronicles", "2 chronicles", "ezra", "nehemiah", "esther",
    "job", "psalms", "proverbs", "ecclesiastes", "song of solomon", "isaiah", "jeremiah", "lamentations",
    "ezekiel", "daniel", "hosea", "joel", "amos", "obadiah", "jonah", "micah", "nahum", "habakkuk", "zephaniah",
    "haggai", "zechariah", "malachi",
    // New Testament
    "matthew", "mark", "luke", "john", "acts", "romans", "1 corinthians", "2 corinthians", "galatians", "ephesians",
    "philippians", "colossians", "1 thessalonians", "2 thessalonians", "1 timothy", "2 timothy", "titus", "philemon",
    "hebrews", "james", "1 peter", "2 peter", "1 john", "2 john", "3 john", "jude", "revelation"
];

function getBookIndex(bookName) {
    const cleanName = bookName.toLowerCase()
        .replace(/\./g, "")
        .replace(/\s+/g, " ")
        .trim();
        
    let index = BIBLE_BOOKS_ORDER.indexOf(cleanName);
    if (index !== -1) return index;
    
    // Abbreviations / aliases mapping
    const aliases = {
        "1cor": "1 corinthians", "2cor": "2 corinthians",
        "1thess": "1 thessalonians", "2thess": "2 thessalonians",
        "1tim": "1 timothy", "2tim": "2 timothy",
        "1pet": "1 peter", "2pet": "2 peter",
        "1jn": "1 john", "2jn": "2 john", "3jn": "3 john",
        "rev": "revelation", "revelations": "revelation", "gen": "genesis", "ex": "exodus",
        "lev": "leviticus", "num": "numbers", "deut": "deuteronomy",
        "josh": "joshua", "judg": "judges", "est": "esther",
        "ps": "psalms", "psalm": "psalms", "prov": "proverbs", "eccles": "ecclesiastes",
        "song": "song of solomon", "isa": "isaiah", "jer": "jeremiah",
        "lam": "lamentations", "ezek": "ezekiel", "dan": "daniel",
        "hos": "hosea", "obad": "obadiah", "mic": "micah",
        "hab": "habakkuk", "zeph": "zephaniah", "hag": "haggai",
        "zech": "zechariah", "mal": "malachi",
        "matt": "matthew", "mk": "mark", "lk": "luke",
        "jn": "john", "rom": "romans", "gal": "galatians",
        "eph": "ephesians", "phil": "philippians", "col": "colossians",
        "tim": "1 timothy", "tit": "titus", "philem": "philemon",
        "heb": "hebrews", "jas": "james", "pet": "1 peter"
    };

    if (aliases[cleanName]) {
        return BIBLE_BOOKS_ORDER.indexOf(aliases[cleanName]);
    }

    for (let i = 0; i < BIBLE_BOOKS_ORDER.length; i++) {
        if (BIBLE_BOOKS_ORDER[i].startsWith(cleanName) || cleanName.startsWith(BIBLE_BOOKS_ORDER[i])) {
            return i;
        }
    }
    
    return 999;
}

function parseReference(refStr) {
    if (!refStr) return { bookIndex: 999, chapter: 999, verse: 999 };
    
    const match = refStr.trim().match(/(.+)\s+(\d+):?(\d+)?/);
    if (!match) {
        return { bookIndex: getBookIndex(refStr.trim()), chapter: 999, verse: 999 };
    }
    
    const bookName = match[1].trim();
    const chapter = parseInt(match[2], 10) || 0;
    const verse = parseInt(match[3], 10) || 0;
    
    return {
        bookIndex: getBookIndex(bookName),
        chapter,
        verse
    };
}

// --- APP STATE ---
const state = {
    verses: [],
    streak: 0,
    lastActiveDate: null,
    theme: "nebula",
    sortOrder: "smart", // "smart" | "bible-asc" | "bible-desc" | "random"
    hasSeeded100: false,
    settings: {
        ttsEnabled: false,
        notificationsEnabled: false,
        recallMasking: false
    },
    // Navigation / UI temporary states
    currentScreen: "dashboard",
    activeVerseId: null,
    activeMode: "read",
    autoPlayActive: false,
    autoPlayTimer: null,
    wakeLockInstance: null,
    // Eraser mode variables
    eraserIndices: [], // Indices of words currently hidden
    // Scramble mode variables
    scrambleTargetWords: [], // Cleaned source words in order
    scrambleAssembledWords: [], // Words placed in slots
    scramblePool: [], // Scrambled words pool with state
    // Typing mode variables
    typingRawText: "",
    // Speech Recognition
    recognitionInstance: null,
    speechWordsMatched: []
};

// --- TOAST NOTIFICATION SYSTEM ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-circle';
    if (type === 'info') iconName = 'info';
    
    toast.innerHTML = `
        <span class="toast-icon"><i data-lucide="${iconName}"></i></span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- CUSTOM CONFIRM MODAL ---
let confirmCallback = null;

function showConfirm(title, message, okLabel, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;
    document.getElementById('confirm-ok').innerText = okLabel || 'Confirm';
    confirmCallback = onConfirm;
    modal.classList.add('active');
}

function closeConfirm() {
    document.getElementById('confirm-modal').classList.remove('active');
    confirmCallback = null;
}

// --- ONBOARDING SYSTEM ---
const ONBOARDING_STEPS = [
    {
        title: 'Welcome to Remora',
        text: 'Memorize Bible verses using proven active-recall techniques and spaced repetition. Your progress is saved automatically.',
        icon: 'sparkles'
    },
    {
        title: 'Build Your Library',
        text: 'Start by loading 100 popular verses, or add your own. Search online or type them in manually — any translation works.',
        icon: 'library'
    },
    {
        title: 'Practice Daily',
        text: 'Use 6 different practice modes to lock scripture in memory. We\'ll schedule reviews automatically so you never forget.',
        icon: 'calendar-check'
    }
];

let onboardingStep = 0;

function showOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    onboardingStep = 0;
    renderOnboardingStep();
}

function renderOnboardingStep() {
    const step = ONBOARDING_STEPS[onboardingStep];
    document.getElementById('onboarding-title').innerText = step.title;
    document.getElementById('onboarding-text').innerText = step.text;
    
    // Update icon
    const iconContainer = document.querySelector('.onboarding-icon');
    iconContainer.innerHTML = `<i data-lucide="${step.icon}"></i>`;
    
    // Update dots
    document.querySelectorAll('.onboarding-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === onboardingStep);
    });
    
    // Update button text
    const nextBtn = document.getElementById('onboarding-next');
    nextBtn.innerText = onboardingStep === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Next';
    
    lucide.createIcons();
}

function advanceOnboarding() {
    onboardingStep++;
    if (onboardingStep >= ONBOARDING_STEPS.length) {
        dismissOnboarding();
    } else {
        renderOnboardingStep();
    }
}

function dismissOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.classList.add('hidden');
    localStorage.setItem('remora_onboarding_done', 'true');
}

// --- VERSE DETAIL BOTTOM SHEET ---
let detailVerseId = null;

function openVerseDetail(verseId) {
    const verse = state.verses.find(v => v.id === verseId);
    if (!verse) return;
    
    detailVerseId = verseId;
    
    // Populate view mode
    document.getElementById('detail-ref').innerText = verse.ref;
    document.getElementById('detail-translation').innerText = `${verse.translation || 'Custom'} Translation`;
    document.getElementById('detail-text').innerText = verse.text;
    
    const masteryPct = Math.min(100, Math.round((verse.sm2.repetition / 6) * 100));
    document.getElementById('detail-mastery').innerText = getMasteryLabel(masteryPct);
    document.getElementById('detail-attempts').innerText = verse.attempts || 0;
    
    const nextDue = new Date(verse.sm2.nextDueDate);
    const now = new Date();
    if (nextDue <= now) {
        document.getElementById('detail-next-review').innerText = 'Now';
    } else {
        const diffDays = Math.ceil((nextDue - now) / (1000 * 60 * 60 * 24));
        document.getElementById('detail-next-review').innerText = diffDays === 1 ? '1 day' : `${diffDays} days`;
    }
    
    // Show view mode, hide edit mode
    document.getElementById('verse-detail-view-mode').style.display = 'block';
    document.getElementById('verse-detail-edit-mode').style.display = 'none';
    
    // Show sheet
    document.getElementById('verse-detail-overlay').classList.add('active');
    document.getElementById('verse-detail-sheet').classList.add('active');
    lucide.createIcons();
}

function closeVerseDetail() {
    document.getElementById('verse-detail-overlay').classList.remove('active');
    document.getElementById('verse-detail-sheet').classList.remove('active');
    detailVerseId = null;
}

function openVerseEdit() {
    const verse = state.verses.find(v => v.id === detailVerseId);
    if (!verse) return;
    
    document.getElementById('detail-edit-ref').value = verse.ref;
    document.getElementById('detail-edit-text').value = verse.text;
    document.getElementById('detail-edit-translation').value = verse.translation || '';
    
    document.getElementById('verse-detail-view-mode').style.display = 'none';
    document.getElementById('verse-detail-edit-mode').style.display = 'block';
}

function saveVerseEdit() {
    const verse = state.verses.find(v => v.id === detailVerseId);
    if (!verse) return;
    
    const newRef = document.getElementById('detail-edit-ref').value.trim();
    const newText = document.getElementById('detail-edit-text').value.trim();
    const newTranslation = document.getElementById('detail-edit-translation').value.trim();
    
    if (!newRef || !newText) {
        showToast('Reference and verse text are required.', 'error');
        return;
    }
    
    verse.ref = newRef;
    verse.text = newText.replace(/\s+/g, ' ').trim();
    verse.translation = newTranslation || 'Custom';
    
    saveToLocalStorage();
    renderLibrary();
    closeVerseDetail();
    showToast(`${newRef} updated successfully.`, 'success');
}

function deleteVerse(verseId) {
    const verse = state.verses.find(v => v.id === verseId);
    if (!verse) return;
    
    showConfirm(
        'Delete Verse',
        `Remove "${verse.ref}" from your library? This cannot be undone.`,
        'Delete',
        () => {
            state.verses = state.verses.filter(v => v.id !== verseId);
            if (state.activeVerseId === verseId) {
                state.activeVerseId = null;
            }
            saveToLocalStorage();
            renderLibrary();
            updateStatsPills();
            closeVerseDetail();
            showToast(`${verse.ref} removed from library.`, 'info');
        }
    );
}

// --- FRIENDLY MASTERY LABELS ---
function getMasteryLabel(pct) {
    if (pct <= 0) return 'New';
    if (pct <= 33) return 'Getting Started';
    if (pct <= 66) return 'Making Progress';
    if (pct < 100) return 'Almost There';
    return 'Memorized 🎉';
}

function getMasteryClass(pct) {
    if (pct <= 0) return 'mastery-new';
    if (pct <= 33) return 'mastery-starting';
    if (pct <= 66) return 'mastery-progress';
    if (pct < 100) return 'mastery-almost';
    return 'mastery-done';
}

// --- MILESTONE CELEBRATIONS ---
const MILESTONES = [
    { count: 5, emoji: '⭐', title: '5 Verses!', text: 'You\'ve memorized your first 5 verses. Great start!' },
    { count: 10, emoji: '🔥', title: 'Double Digits!', text: '10 verses memorized. You\'re building a solid foundation!' },
    { count: 25, emoji: '🏆', title: 'Quarter Century!', text: '25 verses! You\'re carrying God\'s word in your heart.' },
    { count: 50, emoji: '👑', title: 'Scripture Scholar!', text: '50 verses memorized. What an incredible achievement!' },
    { count: 100, emoji: '🎯', title: 'Centurion!', text: '100 verses! You\'ve committed a treasure trove of scripture to memory.' }
];

function checkMilestone() {
    const memorizedCount = state.verses.filter(v => v.status === 'memorized').length;
    const shownMilestones = JSON.parse(localStorage.getItem('remora_milestones_shown') || '[]');
    
    for (const milestone of MILESTONES) {
        if (memorizedCount >= milestone.count && !shownMilestones.includes(milestone.count)) {
            shownMilestones.push(milestone.count);
            localStorage.setItem('remora_milestones_shown', JSON.stringify(shownMilestones));
            showMilestone(milestone);
            return;
        }
    }
}

function showMilestone(milestone) {
    document.getElementById('milestone-emoji').innerText = milestone.emoji;
    document.getElementById('milestone-title').innerText = milestone.title;
    document.getElementById('milestone-text').innerText = milestone.text;
    document.getElementById('milestone-modal').style.display = 'flex';
}

// --- PRACTICE ALL DUE BATCH MODE ---
let practiceQueue = [];
let practiceQueueIndex = 0;

function startPracticeAllDue() {
    const now = new Date();
    practiceQueue = state.verses
        .filter(v => new Date(v.sm2.nextDueDate) <= now)
        .sort((a, b) => new Date(a.sm2.nextDueDate) - new Date(b.sm2.nextDueDate));
    
    if (practiceQueue.length === 0) {
        showToast('No verses due for review!', 'info');
        return;
    }
    
    practiceQueueIndex = 0;
    state.activeVerseId = practiceQueue[0].id;
    navigateTo('practice');
    showToast(`Starting review of ${practiceQueue.length} due verse${practiceQueue.length > 1 ? 's' : ''}.`, 'info');
}

function advancePracticeQueue() {
    if (practiceQueue.length === 0) return false;
    
    practiceQueueIndex++;
    if (practiceQueueIndex < practiceQueue.length) {
        state.activeVerseId = practiceQueue[practiceQueueIndex].id;
        setupPracticeWorkspace();
        return true;
    } else {
        practiceQueue = [];
        practiceQueueIndex = 0;
        showToast('All due reviews completed! Great work! 🎉', 'success');
        return false;
    }
}

// --- WAKE LOCK API ---
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            state.wakeLockInstance = await navigator.wakeLock.request('screen');
            console.log('Wake Lock is active');
            
            // Listen for release
            state.wakeLockInstance.addEventListener('release', () => {
                console.log('Wake Lock was released');
            });
        } catch (err) {
            console.warn(`Wake Lock error: ${err.name}, ${err.message}`);
        }
    }
}

function releaseWakeLock() {
    if (state.wakeLockInstance !== null) {
        state.wakeLockInstance.release()
            .then(() => {
                state.wakeLockInstance = null;
            });
    }
}

// --- PRACTICE MODE LOGIC ---
async function runDataMigrationAsync() {
    let hasChanges = false;
    
    function getNormKey(ref) {
        const p = parseReference(ref);
        return `${p.bookIndex}-${p.chapter}-${p.verse}`;
    }
    
    // 1. Deduplicate verses based on reference
    const uniqueVerses = [];
    const seenRefs = new Set();
    const sorted = [...state.verses].sort((a, b) => new Date(a.addedDate) - new Date(b.addedDate));
    
    for (const v of sorted) {
        const key = getNormKey(v.ref);
        if (!seenRefs.has(key)) {
            seenRefs.add(key);
            uniqueVerses.push(v);
        } else {
            hasChanges = true;
        }
    }
    
    state.verses = uniqueVerses;

    // 2. Update to LSB
    const lsbDictionary = {};
    Object.values(CURATED_TOPICS).forEach(list => list.forEach(v => lsbDictionary[getNormKey(v.ref)] = v.text));
    
    try {
        const res = await fetch('verses_100.json');
        if (res.ok) {
            const data = await res.json();
            data.forEach(v => {
                if (v.translation === "LSB") lsbDictionary[getNormKey(v.ref)] = v.text;
            });
        }
    } catch (e) {
        console.warn("Migration could not load verses_100.json", e);
    }

    state.verses.forEach(v => {
        const key = getNormKey(v.ref);
        if (v.translation !== "LSB" && lsbDictionary[key]) {
            v.translation = "LSB";
            v.text = lsbDictionary[key];
            hasChanges = true;
        }
    });

    if (hasChanges) {
        saveToLocalStorage();
        if (state.currentScreen === 'dashboard') renderLibrary();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadFromLocalStorage();
    runDataMigrationAsync();
    setupEventListeners();
    applyTheme(state.theme);
    initSpeechRecognition();
    navigateTo(state.currentScreen);
    updateStatsPills();
    renderLibrary();
    checkDailyStreakReset();
    checkSpacedRepetitionPrompt();
    checkSeederBanner();
    lucide.createIcons();

    // Check if onboarding needed
    if (!localStorage.getItem('remora_onboarding_done')) {
        showOnboarding();
    }
    
    // Update topic badges
    updateTopicBadges();
});

// --- MIGRATION: WEB TO LSB ---
function migrateWebToLsb() {
    const hasWebVerses = state.verses.some(v => v.translation === "WEB");
    if (!hasWebVerses) return;

    fetch("verses_100.json")
        .then(res => {
            if (!res.ok) throw new Error("Could not load verses_100.json");
            return res.json();
        })
        .then(data => {
            if (!data || !Array.isArray(data)) return;
            let migrated = false;
            
            state.verses.forEach(v => {
                if (v.translation === "WEB") {
                    const match = data.find(item => item.ref.toLowerCase() === v.ref.toLowerCase());
                    if (match) {
                        v.text = match.text;
                        v.translation = "LSB";
                        migrated = true;
                    }
                }
            });

            if (migrated) {
                saveToLocalStorage();
                renderLibrary();
                updateStatsPills();
                console.log("Automatically migrated existing WEB verses in library to LSB version.");
            }
        })
        .catch(err => console.error("Migration to LSB failed:", err));
}

// --- STORAGE & SYNCS ---
function loadFromLocalStorage() {
    try {
        const storedVerses = localStorage.getItem("remora_verses");
        if (storedVerses) {
            state.verses = JSON.parse(storedVerses);
        } else {
            // Seed defaults
            state.verses = [...SEED_VERSES];
            saveToLocalStorage();
        }

        state.streak = parseInt(localStorage.getItem("remora_streak") || "0", 10);
        state.lastActiveDate = localStorage.getItem("remora_last_active");
        state.theme = localStorage.getItem("remora_theme") || "nebula";
        state.sortOrder = localStorage.getItem("remora_sort_order") || "smart";
        state.hasSeeded100 = localStorage.getItem("remora_has_seeded_100") === "true";

        const storedSettings = localStorage.getItem("remora_settings");
        if (storedSettings) {
            state.settings = JSON.parse(storedSettings);
        }
    } catch (e) {
        console.error("Failed to read from localStorage, using fresh state", e);
        state.verses = [...SEED_VERSES];
    }
}

function saveToLocalStorage() {
    try {
        localStorage.setItem("remora_verses", JSON.stringify(state.verses));
        localStorage.setItem("remora_streak", state.streak.toString());
        if (state.lastActiveDate) {
            localStorage.setItem("remora_last_active", state.lastActiveDate);
        }
        localStorage.setItem("remora_theme", state.theme);
        localStorage.setItem("remora_sort_order", state.sortOrder);
        localStorage.setItem("remora_has_seeded_100", state.hasSeeded100 ? "true" : "false");
        localStorage.setItem("remora_settings", JSON.stringify(state.settings));
    } catch (e) {
        console.error("Failed to save state to localStorage", e);
    }
}

// --- NAVIGATION CONTROLLER ---
function navigateTo(screenId) {
    if (screenId !== "practice") {
        clearAutoPlay();
    }
    state.currentScreen = screenId;
    
    // Toggle active screen visibility
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });
    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (targetScreen) targetScreen.classList.add("active");

    // Toggle nav bar indicator
    document.querySelectorAll(".nav-item").forEach(nav => {
        nav.classList.remove("active");
        if (nav.getAttribute("data-screen-link") === screenId) {
            nav.classList.add("active");
        }
    });

    // Special cleanups or refreshes per screen
    if (screenId === "dashboard") {
        renderLibrary();
        updateStatsPills();
        checkSpacedRepetitionPrompt();
        checkSeederBanner();
    } else if (screenId === "practice") {
        setupPracticeWorkspace();
    } else if (screenId === "settings") {
        loadSettingsInputs();
    }

    window.scrollTo(0, 0);
}

// --- UI THEMING ---
function applyTheme(themeId) {
    state.theme = themeId;
    document.documentElement.setAttribute("data-theme", themeId);
    
    // Highlight settings option
    document.querySelectorAll(".theme-btn").forEach(btn => {
        btn.classList.remove("active");
        if (btn.getAttribute("data-theme-id") === themeId) {
            btn.classList.add("active");
        }
    });
    saveToLocalStorage();
}

// --- DAILY STREAK MANAGEMENT ---
function checkDailyStreakReset() {
    if (!state.lastActiveDate) {
        state.streak = 0;
        updateStatsPills();
        return;
    }

    const todayStr = getLocalDateString(new Date());
    const lastActive = new Date(state.lastActiveDate);
    const today = new Date(todayStr);

    const diffTime = Math.abs(today - lastActive);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // If more than 1 day has passed without practice, reset streak
    if (diffDays > 1 && state.lastActiveDate !== todayStr) {
        state.streak = 0;
        saveToLocalStorage();
        updateStatsPills();
    }
}

function recordPracticeActivity() {
    const todayStr = getLocalDateString(new Date());
    
    if (state.lastActiveDate === todayStr) {
        // Already practiced today, streak is safe but doesn't increment
        return;
    }

    if (state.lastActiveDate) {
        const lastActive = new Date(state.lastActiveDate);
        const today = new Date(todayStr);
        const diffTime = Math.abs(today - lastActive);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            // Practiced yesterday, increment streak
            state.streak += 1;
        } else {
            // Broke the streak, reset to 1
            state.streak = 1;
        }
    } else {
        // First practice ever
        state.streak = 1;
    }

    state.lastActiveDate = todayStr;
    saveToLocalStorage();
    updateStatsPills();
}

function getLocalDateString(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset*60*1000));
    return localDate.toISOString().split('T')[0];
}

function updateStatsPills() {
    document.getElementById("header-streak-val").innerText = state.streak;
    
    // Calc library totals
    const memorized = state.verses.filter(v => v.status === "memorized").length;
    const learning = state.verses.filter(v => v.status === "learning" || v.status === "review").length;
    
    // Average accuracy simulated from recall scores
    let totalAttempts = 0;
    let highScores = 0;
    state.verses.forEach(v => {
        totalAttempts += v.attempts || 0;
        if (v.sm2 && v.sm2.repetition > 1) {
            highScores++;
        }
    });

    const accuracyRate = state.verses.length > 0 
        ? Math.round((highScores / state.verses.length) * 100) 
        : 0;

    document.getElementById("stat-memorized-count").innerText = memorized;
    document.getElementById("stat-learning-count").innerText = learning;
    document.getElementById("stat-accuracy-rate").innerText = `${accuracyRate}%`;
}

// --- SPACED REPETITION (SM-2) ENGINE ---
function evaluateSM2(verseId, score) {
    const verse = state.verses.find(v => v.id === verseId);
    if (!verse) return;

    // Initialize sm2 record if missing
    if (!verse.sm2) {
        verse.sm2 = { interval: 0, repetition: 0, efactor: 2.5, nextDueDate: new Date().toISOString() };
    }

    let { interval, repetition, efactor } = verse.sm2;

    // SM-2 Algorithm Implementation
    if (score < 3) {
        repetition = 0;
        interval = 1; // repeat tomorrow
    } else {
        if (repetition === 0) {
            interval = 1;
        } else if (repetition === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * efactor);
        }
        repetition += 1;
    }

    // Adjust Easiness Factor (EF)
    efactor = efactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02));
    if (efactor < 1.3) efactor = 1.3;

    // Assign status
    if (score >= 4 && repetition >= 3) {
        verse.status = "memorized";
    } else if (score < 3) {
        verse.status = "review";
    } else {
        verse.status = "learning";
    }

    // Calculate due date
    const now = new Date();
    const dueDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    verse.attempts = (verse.attempts || 0) + 1;
    verse.sm2 = {
        interval: interval,
        repetition: repetition,
        efactor: efactor,
        nextDueDate: dueDate.toISOString()
    };

    saveToLocalStorage();
    updateStatsPills();
    checkSpacedRepetitionPrompt();

    // Trigger daily streak increment if correct recall
    if (score >= 3) {
        recordPracticeActivity();
    }

    return interval;
}

function checkSpacedRepetitionPrompt() {
    const now = new Date();
    const dueVerses = state.verses.filter(v => new Date(v.sm2.nextDueDate) <= now);
    const suggestionCard = document.getElementById("practice-suggestion-card");

    if (dueVerses.length > 0 && suggestionCard) {
        // Find most urgent (oldest due date)
        dueVerses.sort((a, b) => new Date(a.sm2.nextDueDate) - new Date(b.sm2.nextDueDate));
        const suggested = dueVerses[0];

        document.getElementById("suggestion-ref").innerText = suggested.ref;
        if (suggested.sm2.repetition === 0) {
            document.getElementById("suggestion-meta").innerText = "Ready to learn!";
        } else {
            document.getElementById("suggestion-meta").innerText = `Overdue since ${new Date(suggested.sm2.nextDueDate).toLocaleDateString()}`;
        }
        suggestionCard.style.display = "flex";

        // Bind quick action
        document.getElementById("btn-start-suggestion").onclick = () => {
            state.activeVerseId = suggested.id;
            navigateTo("practice");
        };
    } else if (suggestionCard) {
        suggestionCard.style.display = "none";
    }

    // Update Practice All Due button
    const allDueBtn = document.getElementById('btn-practice-all-due');
    const allDueCount = document.getElementById('practice-all-due-count');
    if (allDueBtn && allDueCount) {
        const allDueVerses = state.verses.filter(v => new Date(v.sm2.nextDueDate) <= new Date());
        if (allDueVerses.length > 1) {
            allDueBtn.style.display = 'block';
            allDueCount.innerText = allDueVerses.length;
        } else {
            allDueBtn.style.display = 'none';
        }
    }
}

function checkSeederBanner() {
    const seederBanner = document.getElementById("seeder-banner");
    if (!seederBanner) return;

    if (!state.hasSeeded100 && state.verses.length <= 5) {
        seederBanner.style.display = "flex";
    } else {
        seederBanner.style.display = "none";
    }
}

function triggerSeed100(buttonElement) {
    // Show loading state
    const originalText = buttonElement.innerText;
    buttonElement.disabled = true;
    buttonElement.innerText = "Loading...";

    fetch("verses_100.json")
        .then(res => {
            if (!res.ok) throw new Error("verses_100.json could not be loaded. Please wait a few seconds and try again!");
            return res.json();
        })
        .then(data => {
            let addedCount = 0;
            data.forEach(item => {
                const exists = state.verses.some(v => v.ref.toLowerCase() === item.ref.toLowerCase());
                if (!exists) {
                    const newVerse = {
                        id: "v_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
                        ref: item.ref,
                        text: item.text,
                        translation: item.translation || "LSB",
                        addedDate: new Date().toISOString(),
                        status: "learning",
                        sm2: {
                            interval: 0,
                            repetition: 0,
                            efactor: 2.5,
                            nextDueDate: new Date().toISOString()
                        },
                        streak: 0,
                        attempts: 0
                    };
                    state.verses.push(newVerse);
                    addedCount++;
                }
            });
            
            state.hasSeeded100 = true;
            saveToLocalStorage();
            renderLibrary();
            updateStatsPills();
            checkSeederBanner();
            
            if (addedCount > 0) {
                showToast(`Added ${addedCount} popular verses to your library!`, 'success');
            } else {
                showToast('All popular verses are already in your library.', 'info');
            }
        })
        .catch(err => {
            console.error(err);
            showToast('Failed to load verses. Please try again.', 'error');
        })
        .finally(() => {
            buttonElement.disabled = false;
            buttonElement.innerText = originalText;
        });
}

function clearAutoPlay() {
    state.autoPlayActive = false;
    releaseWakeLock();
    if (state.autoPlayTimer) {
        clearTimeout(state.autoPlayTimer);
        state.autoPlayTimer = null;
    }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    updateAutoPlayUI();
}

function updateAutoPlayUI() {
    const btn = document.getElementById("btn-toggle-auto-play");
    const status = document.getElementById("auto-play-status");
    if (!btn || !status) return;

    if (state.autoPlayActive) {
        btn.innerHTML = `<i data-lucide="pause" style="width: 14px; height: 14px;"></i><span>Pause Audio</span>`;
        btn.classList.remove("btn-secondary");
        btn.classList.add("btn-primary");
        status.innerText = "Playing slideshow...";
        status.style.color = "var(--success)";
    } else {
        btn.innerHTML = `<i data-lucide="play" style="width: 14px; height: 14px;"></i><span>Auto Play (Audio)</span>`;
        btn.classList.remove("btn-primary");
        btn.classList.add("btn-secondary");
        status.innerText = "Off";
        status.style.color = "var(--text-muted)";
    }
    lucide.createIcons();
}

function runAutoPlayStep() {
    if (!state.autoPlayActive || state.currentScreen !== "practice" || state.activeMode !== "read") {
        clearAutoPlay();
        return;
    }

    const verse = state.verses.find(v => v.id === state.activeVerseId);
    if (!verse) return;

    if ('speechSynthesis' in window) {
        // Voice-based timing
        speakTextWithCallback(verse.text, () => {
            if (state.autoPlayActive) {
                state.autoPlayTimer = setTimeout(() => {
                    if (state.autoPlayActive) {
                        navigateVerse("next");
                    }
                }, 1500);
            }
        });
    } else {
        // Visual-based reading pace timing (350ms per word + 1.5s baseline, min 4s total)
        const words = verse.text.split(/\s+/).length;
        const delay = Math.max(4000, (words * 350) + 1500);
        state.autoPlayTimer = setTimeout(() => {
            if (state.autoPlayActive) {
                navigateVerse("next");
            }
        }, delay);
    }
}

function speakTextWithCallback(text, callback) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.onend = () => {
            if (callback) callback();
        };
        utterance.onerror = (e) => {
            console.error("TTS speech error", e);
            if (callback) callback();
        };
        window.speechSynthesis.speak(utterance);
    } else {
        if (callback) callback();
    }
}

// --- LIBRARY RENDERER (DASHBOARD) ---
function renderLibrary() {
    const listContainer = document.getElementById("dashboard-verse-list");
    if (!listContainer) return;

    // Check current filter
    const activeFilterChip = document.querySelector(".filter-chip.active");
    const filter = activeFilterChip ? activeFilterChip.getAttribute("data-filter") : "all";

    let filteredVerses = [...state.verses];
    const now = new Date();

    if (filter === "review") {
        filteredVerses = state.verses.filter(v => new Date(v.sm2.nextDueDate) <= now);
    } else if (filter === "learning") {
        filteredVerses = state.verses.filter(v => v.status === "learning" || v.status === "review");
    } else if (filter === "memorized") {
        filteredVerses = state.verses.filter(v => v.status === "memorized");
    }

    // Apply search filter
    const searchInput = document.getElementById("library-search-input");
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : "";
    if (searchQuery) {
        filteredVerses = filteredVerses.filter(v => 
            v.ref.toLowerCase().includes(searchQuery) || 
            v.text.toLowerCase().includes(searchQuery)
        );
    }

    if (filteredVerses.length === 0) {
        let msg = "No verses in this list.";
        if (filter === "review") msg = "🎉 You're all caught up on scheduled reviews!";
        else if (filter === "learning") msg = "You are not actively learning any new verses.";
        else if (filter === "memorized") msg = "No memorized scriptures yet. Keep practicing!";

        listContainer.innerHTML = `
            <div class="empty-state">
                <i data-lucide="book-open"></i>
                <p>${msg}</p>
                ${filter === "all" ? `<button class="btn btn-primary btn-sm" id="empty-state-add-btn">Add Your First Verse</button>` : ""}
            </div>
        `;
        
        const emptyAddBtn = document.getElementById("empty-state-add-btn");
        if (emptyAddBtn) {
            emptyAddBtn.onclick = () => navigateTo("add");
        }
        lucide.createIcons();
        return;
    }

    // Update sort label text and highlight active dropdown item
    const sortLabel = document.getElementById("sort-label");
    if (sortLabel) {
        if (state.sortOrder === "smart") sortLabel.innerText = "Default";
        else if (state.sortOrder === "bible-asc") sortLabel.innerText = "Bible (Asc)";
        else if (state.sortOrder === "bible-desc") sortLabel.innerText = "Bible (Desc)";
        else if (state.sortOrder === "random") sortLabel.innerText = "Shuffle";
    }

    document.querySelectorAll(".sort-option").forEach(opt => {
        opt.classList.remove("active");
        if (opt.getAttribute("data-sort") === state.sortOrder) {
            opt.classList.add("active");
        }
    });

    // Apply Sorting
    if (state.sortOrder === "smart") {
        // Sort: Review Due first, then descending added date
        filteredVerses.sort((a, b) => {
            const aDue = new Date(a.sm2.nextDueDate) <= now;
            const bDue = new Date(b.sm2.nextDueDate) <= now;
            if (aDue && !bDue) return -1;
            if (!aDue && bDue) return 1;
            return new Date(b.addedDate) - new Date(a.addedDate);
        });
    } else if (state.sortOrder === "bible-asc") {
        filteredVerses.sort((a, b) => {
            const parseA = parseReference(a.ref);
            const parseB = parseReference(b.ref);
            if (parseA.bookIndex !== parseB.bookIndex) {
                return parseA.bookIndex - parseB.bookIndex;
            }
            if (parseA.chapter !== parseB.chapter) {
                return parseA.chapter - parseB.chapter;
            }
            return parseA.verse - parseB.verse;
        });
    } else if (state.sortOrder === "bible-desc") {
        filteredVerses.sort((a, b) => {
            const parseA = parseReference(a.ref);
            const parseB = parseReference(b.ref);
            if (parseA.bookIndex !== parseB.bookIndex) {
                return parseB.bookIndex - parseA.bookIndex;
            }
            if (parseA.chapter !== parseB.chapter) {
                return parseB.chapter - parseA.chapter;
            }
            return parseB.verse - parseA.verse;
        });
    } else if (state.sortOrder === "random") {
        // Fisher-Yates shuffle
        for (let i = filteredVerses.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = filteredVerses[i];
            filteredVerses[i] = filteredVerses[j];
            filteredVerses[j] = temp;
        }
    }

    listContainer.innerHTML = "";
    filteredVerses.forEach(verse => {
        const isDue = new Date(verse.sm2.nextDueDate) <= now;
        const card = document.createElement("div");
        card.className = "glass-panel verse-card";
        
        // Progress percentage for status display
        const masteryPct = Math.min(100, Math.round((verse.sm2.repetition / 6) * 100));

        let statusClass = "status-learning";
        let statusText = verse.sm2.repetition === 0 ? "New" : "Learning";
        if (verse.status === "memorized") {
            statusClass = "status-memorized";
            statusText = "Memorized";
        } else if (isDue && verse.sm2.repetition > 0) {
            statusClass = "status-review";
            statusText = "Review Due";
        }

        card.innerHTML = `
            <div class="verse-card-header">
                <span class="verse-ref">${verse.ref}</span>
                <span class="verse-status-badge ${statusClass}">${statusText}</span>
            </div>
            <p class="verse-text-preview">${escapeHtml(verse.text)}</p>
            <div class="verse-card-footer">
                <span>Translation: ${verse.translation || "Custom"}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="mastery-label ${getMasteryClass(masteryPct)}">${getMasteryLabel(masteryPct)}</span>
                </div>
            </div>
        `;

        card.onclick = () => {
            openVerseDetail(verse.id);
        };

        listContainer.appendChild(card);
    });
}

// --- ADD VERSE EVENT HANDLERS ---
async function handleSearch() {
    const query = document.getElementById("search-input").value.trim();
    const translation = document.getElementById("search-translation").value;
    const resultsContainer = document.getElementById("search-results-list");

    if (!query) return;

    resultsContainer.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
            <div style="display: inline-block; animation: spin 1s linear infinite; margin-bottom: 8px;">
                <i data-lucide="refresh-cw" style="width: 24px; height: 24px;"></i>
            </div>
            <p>Searching Bible API...</p>
        </div>
    `;
    lucide.createIcons();

    try {
        // Call the free Bible API
        const response = await fetch(`https://bible-api.com/${encodeURIComponent(query)}?translation=${translation}`);
        if (!response.ok) {
            throw new Error("Verse reference not found. E.g. 'John 3:16' or 'Psalm 23:1-3'");
        }

        const data = await response.json();
        
        resultsContainer.innerHTML = `
            <div class="glass-panel search-result-card" style="display: flex; flex-direction: column; gap: 10px; border-color: var(--accent-glow-strong);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="verse-ref" style="color: var(--accent-light);">${data.reference}</span>
                    <span class="verse-status-badge" style="background: var(--accent-glow); color: var(--accent-light);">${data.translation_name}</span>
                </div>
                <p style="font-size: 14px; line-height: 1.6;">${escapeHtml(data.text.trim())}</p>
                <button class="btn btn-primary btn-sm" id="btn-add-search-result" style="align-self: flex-end; padding: 8px 16px;">
                    Add to Library
                </button>
            </div>
        `;

        document.getElementById("btn-add-search-result").onclick = () => {
            addNewVerse(data.reference, data.text.trim(), data.translation_name);
            document.getElementById("search-input").value = "";
            resultsContainer.innerHTML = "";
            navigateTo("dashboard");
        };

    } catch (err) {
        resultsContainer.innerHTML = `
            <div class="glass-panel" style="border-color: var(--danger-glow); text-align: center; color: var(--text-secondary); padding: 20px;">
                <i data-lucide="alert-circle" style="color: var(--danger); width: 32px; height: 32px; margin-bottom: 8px;"></i>
                <p style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Search Failed</p>
                <p style="font-size: 13px; margin-bottom: 12px;">${err.message}</p>
                <p style="font-size: 12px; opacity: 0.85; line-height: 1.4; color: var(--text-muted);">
                    💡 <strong>Tip:</strong> Modern copyrighted translations (like <strong>LSB</strong> or <strong>NASB 1998</strong>) are not available on free public APIs. Please use the <strong>Manual Entry</strong> tab above to add them!
                </p>
            </div>
        `;
    }
    lucide.createIcons();
}

function addCuratedTopic(topicName) {
    const verses = CURATED_TOPICS[topicName];
    if (!verses) return;

    let addedCount = 0;
    verses.forEach(v => {
        // Prevent duplicate adds of the same reference
        const exists = state.verses.some(item => item.ref.toLowerCase() === v.ref.toLowerCase());
        if (!exists) {
            addNewVerse(v.ref, v.text, v.translation, true);
            addedCount++;
        }
    });

    if (addedCount > 0) {
        showToast(`Added ${addedCount} verses from '${topicName}' collection!`, 'success');
        navigateTo("dashboard");
    } else {
        showToast('These verses are already in your library.', 'info');
    }
}

function addNewVerse(ref, text, translation = "Custom", silent = false) {
    const newVerse = {
        id: "verse-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
        ref: ref,
        text: text.replace(/\s+/g, ' ').trim(), // Clean excessive whitespaces
        translation: translation,
        addedDate: new Date().toISOString(),
        status: "learning",
        sm2: {
            interval: 0,
            repetition: 0,
            efactor: 2.5,
            nextDueDate: new Date().toISOString()
        },
        streak: 0,
        attempts: 0
    };

    state.verses.push(newVerse);
    saveToLocalStorage();
    updateStatsPills();
    if (!silent) showToast(`${ref} added to your library!`, 'success');
}

// --- PRACTICE WORKSPACE & GAMES CONTROLLER ---
function setupPracticeWorkspace() {
    const noVersePanel = document.getElementById("practice-no-verse-panel");
    const workspacePanel = document.getElementById("practice-workspace-panel");
    const navControls = document.getElementById("practice-nav-controls");

    if (!state.activeVerseId) {
        // Auto-select most overdue verse
        const now = new Date();
        const dueVerses = state.verses.filter(v => new Date(v.sm2.nextDueDate) <= now);
        if (dueVerses.length > 0) {
            dueVerses.sort((a, b) => new Date(a.sm2.nextDueDate) - new Date(b.sm2.nextDueDate));
            state.activeVerseId = dueVerses[0].id;
        } else if (state.verses.length > 0) {
            state.activeVerseId = state.verses[0].id;
        } else {
            noVersePanel.style.display = "flex";
            workspacePanel.style.display = "none";
            if (navControls) navControls.style.display = "none";
            return;
        }
    }

    const verse = state.verses.find(v => v.id === state.activeVerseId);
    if (!verse) {
        state.activeVerseId = null;
        noVersePanel.style.display = "flex";
        workspacePanel.style.display = "none";
        if (navControls) navControls.style.display = "none";
        return;
    }

    // Load active verse titles
    document.getElementById("practice-ref-title").innerText = verse.ref;
    const isDue = new Date(verse.sm2.nextDueDate) <= new Date();
    let subtitleStatus = `Mastery ${Math.min(100, Math.round((verse.sm2.repetition / 6) * 100))}%`;
    if (verse.sm2.repetition === 0) {
        subtitleStatus = "New";
    } else if (isDue) {
        subtitleStatus = "Review Due";
    }
    document.getElementById("practice-status-subtitle").innerText = `${verse.translation || 'Custom'} translation • ${subtitleStatus}`;

    // Update index indicator (e.g. 10 / 103)
    const currentIndex = state.verses.findIndex(v => v.id === state.activeVerseId);
    const indexIndicator = document.getElementById("practice-index-indicator");
    if (indexIndicator) {
        if (currentIndex !== -1) {
            indexIndicator.innerText = `${currentIndex + 1} / ${state.verses.length}`;
        } else {
            indexIndicator.innerText = `0 / 0`;
        }
    }

    // Set reference label inside the main display board
    const boardRef = document.getElementById("practice-board-ref");
    if (boardRef) {
        boardRef.innerText = `${verse.ref} (${verse.translation || 'Custom'})`;
    }

    noVersePanel.style.display = "none";
    workspacePanel.style.display = "flex";

    // Show/hide prev/next buttons based on library size
    if (navControls) {
        navControls.style.display = state.verses.length <= 1 ? "none" : "flex";
    }

    // Stop active speech recognition if navigating modes
    stopSpeechRecognition();

    // Setup active mode UI
    selectPracticeMode(state.activeMode);
}

function navigateVerse(direction) {
    if (state.verses.length <= 1) return;

    const currentIndex = state.verses.findIndex(v => v.id === state.activeVerseId);
    if (currentIndex === -1) return;

    let nextIndex;
    if (direction === "next") {
        nextIndex = (currentIndex + 1) % state.verses.length;
    } else {
        nextIndex = (currentIndex - 1 + state.verses.length) % state.verses.length;
    }

    state.activeVerseId = state.verses[nextIndex].id;
    setupPracticeWorkspace();
}

function selectPracticeMode(modeId) {
    state.activeMode = modeId;

    const screenPractice = document.getElementById("screen-practice");
    if (modeId === "immersed") {
        screenPractice.classList.add("immersed");
        document.body.classList.add("immersed-active");
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => console.log(err));
        }
    } else {
        screenPractice.classList.remove("immersed");
        document.body.classList.remove("immersed-active");
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.log(err));
        }
    }

    if (modeId !== "read") {
        clearAutoPlay();
    }

    // Highlight chips
    document.querySelectorAll(".mode-tab").forEach(tab => {
        tab.classList.remove("active");
        if (tab.getAttribute("data-mode") === modeId) {
            tab.classList.add("active");
        }
    });

    // Hide all practice mode control blocks
    document.getElementById("practice-read-controls").style.display = "none";
    document.getElementById("practice-eraser-controls").style.display = "none";
    document.getElementById("practice-scramble-controls").style.display = "none";
    document.getElementById("practice-typing-controls").style.display = "none";
    document.getElementById("practice-speech-controls").style.display = "none";

    // Standard show/hide options in footer
    document.getElementById("practice-default-footer").style.display = "flex";
    document.getElementById("practice-eval-footer").style.display = "none";
    document.getElementById("practice-show-hint-btn").style.display = "flex";

    const verse = state.verses.find(v => v.id === state.activeVerseId);
    if (!verse) return;

    // Clean up timers/intervals
    stopSpeechRecognition();

    // Trigger modes
    switch (modeId) {
        case "read":
            document.getElementById("practice-read-controls").style.display = "block";
            updateAutoPlayUI();
            renderReadMode(verse);
            break;
        case "immersed":
            renderReadMode(verse); // Renders the same as read but CSS hides UI
            break;
        case "eraser":
            document.getElementById("practice-eraser-controls").style.display = "block";
            renderEraserMode(verse);
            break;
        case "first-letter":
            renderFirstLettersMode(verse);
            break;
        case "scramble":
            document.getElementById("practice-scramble-controls").style.display = "flex";
            renderScrambleMode(verse);
            break;
        case "typing":
            document.getElementById("practice-typing-controls").style.display = "flex";
            document.getElementById("practice-show-hint-btn").style.display = "none";
            renderTypingMode(verse);
            break;
        case "speech":
            document.getElementById("practice-speech-controls").style.display = "flex";
            renderSpeechMode(verse);
            break;
    }

    // Dynamic button label per mode
    const doneBtn = document.getElementById("practice-done-btn");
    if (doneBtn) {
        if (modeId === "read") {
            doneBtn.innerHTML = '<i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i> Next Verse';
        } else {
            doneBtn.innerHTML = '<i data-lucide="check" style="width: 16px; height: 16px;"></i> Score My Recall';
        }
        lucide.createIcons();
    }
}

// 1. READ MODE
function renderReadMode(verse) {
    const boardText = document.getElementById("practice-board-text");
    
    let formattedText = escapeHtml(verse.text);
    // Wrap sentences/phrases in spans to allow block display in immersed mode
    const maskClass = state.settings.recallMasking ? " masked-sentence" : "";
    formattedText = formattedText.replace(/([.?!;:,]["']?)(\s+)/g, `$1</span><span class='sentence-wrap${maskClass}'>$2`);
    
    boardText.innerHTML = `<span style="font-size: 22px; line-height: 1.7; font-weight: 500;"><span class='sentence-wrap${maskClass}'>${formattedText}</span></span>`;

    // Clear any existing active timer to prevent overlaps
    if (state.autoPlayTimer) {
        clearTimeout(state.autoPlayTimer);
        state.autoPlayTimer = null;
    }

    if (state.autoPlayActive) {
        runAutoPlayStep();
    } else if (state.settings.ttsEnabled) {
        speakText(verse.text);
    }
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

// 2. ERASER MODE (Eraser word fade)
function renderEraserMode(verse) {
    const boardText = document.getElementById("practice-board-text");
    const slider = document.getElementById("eraser-slider");
    const sliderLbl = document.getElementById("eraser-slider-lbl");

    slider.value = 0;
    sliderLbl.innerText = "0%";
    state.eraserIndices = [];

    // Tokenize text into words, preserving spaces
    const words = verse.text.split(/(\s+)/);
    
    rebuildEraserHTML(words);

    // Slider Event handler
    slider.oninput = () => {
        const pct = parseInt(slider.value, 10);
        sliderLbl.innerText = `${pct}%`;
        
        // Filter out actual word indices (exclude whitespace strings)
        const wordIndices = [];
        words.forEach((w, i) => {
            if (w.trim().length > 0) wordIndices.push(i);
        });

        // Determine how many to hide
        const hideCount = Math.round((pct / 100) * wordIndices.length);
        
        // Shuffle and pick indices
        const shuffled = [...wordIndices].sort(() => 0.5 - Math.random());
        state.eraserIndices = shuffled.slice(0, hideCount);

        rebuildEraserHTML(words);
    };
}

function rebuildEraserHTML(words) {
    const boardText = document.getElementById("practice-board-text");
    boardText.innerHTML = "";

    words.forEach((word, idx) => {
        if (word.trim().length === 0) {
            // Text node for space
            boardText.appendChild(document.createTextNode(word));
        } else {
            const span = document.createElement("span");
            span.className = "eraser-word";
            span.innerText = word;
            
            if (state.eraserIndices.includes(idx)) {
                span.classList.add("hidden-word");
            }

            span.onclick = () => {
                if (span.classList.contains("hidden-word")) {
                    span.classList.remove("hidden-word");
                    state.eraserIndices = state.eraserIndices.filter(x => x !== idx);
                } else {
                    span.classList.add("hidden-word");
                    state.eraserIndices.push(idx);
                }
                
                // Update slider percent roughly
                const totalWords = words.filter(w => w.trim().length > 0).length;
                const hiddenCount = state.eraserIndices.length;
                const pct = Math.round((hiddenCount / totalWords) * 100);
                document.getElementById("eraser-slider").value = pct;
                document.getElementById("eraser-slider-lbl").innerText = `${pct}%`;
            };

            boardText.appendChild(span);
        }
    });
}

// 3. FIRST LETTERS MODE
function renderFirstLettersMode(verse) {
    const boardText = document.getElementById("practice-board-text");
    
    // Replace alphabetical characters inside words, keeping capitalization and punctuation
    const words = verse.text.split(/(\s+)/);
    const converted = words.map(chunk => {
        if (chunk.trim().length === 0) return chunk;
        
        return chunk.split("").map((char, index) => {
            // Keep first character if it's alphanumeric. Otherwise, replace alphabetic characters
            if (/^[a-zA-Z0-9]$/.test(char)) {
                // If it's the very first letter of the word, keep it
                // Otherwise replace with blank or underline.
                return index === 0 ? char : "_";
            }
            return char; // keep punctuations
        }).join("");
    }).join("");

    boardText.innerHTML = `<span style="font-size: 22px; line-height: 1.7; font-weight: 600; letter-spacing: 0.1em;">${escapeHtml(converted)}</span>`;
}

// 4. SCRAMBLE MODE (with chunking for long verses)
function renderScrambleMode(verse) {
    const slotsContainer = document.getElementById("scramble-slots-container");
    const poolContainer = document.getElementById("scramble-pool-container");
    const boardText = document.getElementById("practice-board-text");
    
    slotsContainer.innerHTML = "";
    poolContainer.innerHTML = "";
    state.scrambleAssembledWords = [];
    
    const cleanWordList = verse.text
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split(/\s+/)
        .filter(w => w.trim().length > 0);
    
    // Chunking for long verses
    const CHUNK_SIZE = 10;
    if (cleanWordList.length > 15) {
        state.scrambleChunks = [];
        for (let i = 0; i < cleanWordList.length; i += CHUNK_SIZE) {
            state.scrambleChunks.push(cleanWordList.slice(i, i + CHUNK_SIZE));
        }
        state.scrambleCurrentChunk = 0;
        boardText.innerHTML = `<span style="color: var(--text-muted); font-size: 15px; font-style: italic;">Part ${state.scrambleCurrentChunk + 1} of ${state.scrambleChunks.length} — Tap words in the correct order.</span>`;
        renderScrambleChunk(state.scrambleChunks[0]);
    } else {
        state.scrambleChunks = null;
        state.scrambleCurrentChunk = 0;
        boardText.innerHTML = `<span style="color: var(--text-muted); font-size: 15px; font-style: italic;">Reconstruct the verse by tapping the words in the correct order.</span>`;
        state.scrambleTargetWords = [...cleanWordList];
        renderScrambleChunk(cleanWordList);
    }
}

function renderScrambleChunk(wordList) {
    const slotsContainer = document.getElementById("scramble-slots-container");
    const poolContainer = document.getElementById("scramble-pool-container");
    const boardText = document.getElementById("practice-board-text");
    
    slotsContainer.innerHTML = "";
    poolContainer.innerHTML = "";
    state.scrambleAssembledWords = [];
    state.scrambleTargetWords = [...wordList];
    
    const poolData = wordList.map((word, idx) => ({
        id: `scramble-word-${idx}`,
        word: word,
        originalIndex: idx
    }));
    
    state.scramblePool = [...poolData].sort(() => 0.5 - Math.random());
    
    wordList.forEach(() => {
        const slot = document.createElement("div");
        slot.style.cssText = "min-width: 50px; height: 35px; border-bottom: 2px solid var(--glass-border); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; color: var(--accent-light); padding: 0 4px;";
        slotsContainer.appendChild(slot);
    });
    
    state.scramblePool.forEach(item => {
        const chip = document.createElement("button");
        chip.className = "word-chip";
        chip.id = item.id;
        chip.innerText = item.word;
        
        chip.onclick = () => {
            const nextIndexToMatch = state.scrambleAssembledWords.length;
            const targetWord = state.scrambleTargetWords[nextIndexToMatch];
            
            if (item.word.toLowerCase() === targetWord.toLowerCase()) {
                state.scrambleAssembledWords.push(item.word);
                chip.classList.add("selected");
                
                const slot = slotsContainer.children[nextIndexToMatch];
                slot.innerText = item.word;
                slot.style.borderBottom = "none";
                slot.style.color = "var(--text-primary)";
                
                if (state.scrambleAssembledWords.length === state.scrambleTargetWords.length) {
                    // Check if there are more chunks
                    if (state.scrambleChunks && state.scrambleCurrentChunk < state.scrambleChunks.length - 1) {
                        state.scrambleCurrentChunk++;
                        setTimeout(() => {
                            boardText.innerHTML = `<span style="color: var(--success); font-size: 15px;">✓ Part ${state.scrambleCurrentChunk} done! </span><span style="color: var(--text-muted); font-size: 15px; font-style: italic;">Part ${state.scrambleCurrentChunk + 1} of ${state.scrambleChunks.length}</span>`;
                            renderScrambleChunk(state.scrambleChunks[state.scrambleCurrentChunk]);
                        }, 600);
                    } else {
                        boardText.innerHTML = `<span style="color: var(--success); font-weight: 600; font-size: 16px;">Success! You completed the scrambled sequence.</span>`;
                    }
                }
            } else {
                chip.style.borderColor = "var(--danger)";
                chip.style.color = "var(--danger)";
                chip.style.boxShadow = "0 0 8px var(--danger-glow)";
                
                slotsContainer.style.transform = "translateX(5px)";
                setTimeout(() => slotsContainer.style.transform = "translateX(-5px)", 70);
                setTimeout(() => slotsContainer.style.transform = "translateX(5px)", 140);
                setTimeout(() => slotsContainer.style.transform = "translateX(0)", 210);
                
                setTimeout(() => {
                    chip.style.borderColor = "";
                    chip.style.color = "";
                    chip.style.boxShadow = "";
                }, 500);
            }
        };
        
        poolContainer.appendChild(chip);
    });
}

// 5. TYPING MODE (Typing practice with character diff engine)
function renderTypingMode(verse) {
    const boardText = document.getElementById("practice-board-text");
    const textInput = document.getElementById("typing-textarea");
    const feedbackBox = document.getElementById("typing-live-feedback");

    boardText.innerHTML = `<span style="color: var(--text-muted); font-size: 15px; font-style: italic;">Type the verse below. The app will validate accuracy character by character.</span>`;
    
    textInput.value = "";
    feedbackBox.innerHTML = `<span class="typing-char pending">${escapeHtml(verse.text)}</span>`;

    textInput.oninput = () => {
        const typed = textInput.value;
        const target = verse.text;
        
        let feedbackHTML = "";
        let i = 0;
        let isDone = true;

        for (i = 0; i < Math.max(typed.length, target.length); i++) {
            const charTyped = typed[i];
            const charTarget = target[i];

            if (charTyped === undefined) {
                // Pending characters
                feedbackHTML += `<span class="typing-char pending">${escapeHtml(charTarget)}</span>`;
                isDone = false;
            } else if (charTarget === undefined) {
                // Extra typed characters
                feedbackHTML += `<span class="typing-char extra">${escapeHtml(charTyped)}</span>`;
                isDone = false;
            } else if (charTyped.toLowerCase() === charTarget.toLowerCase()) {
                // Correct match (loose match ignore casing)
                feedbackHTML += `<span class="typing-char correct">${escapeHtml(charTarget)}</span>`;
            } else {
                // Typo error
                feedbackHTML += `<span class="typing-char incorrect">${escapeHtml(charTarget)}</span>`;
                isDone = false;
            }
        }

        feedbackBox.innerHTML = feedbackHTML;

        // Auto trigger complete when typing is correct
        if (isDone && typed.length === target.length) {
            boardText.innerHTML = `<span style="color: var(--success); font-weight: 600; font-size: 16px;">Perfect match! Press Done to log your recall score.</span>`;
        }
    };
}

// 6. SPEECH RECITAL MODE
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn("Web Speech API not supported in this browser.");
        return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
        document.getElementById("speech-mic-btn").classList.add("listening");
        document.getElementById("speech-status-indicator").innerText = "Listening... Speak the verse clearly.";
    };

    rec.onerror = (e) => {
        console.error("Speech Recognition Error", e);
        document.getElementById("speech-status-indicator").innerText = `Error: ${e.error}. Try again.`;
        stopSpeechRecognition();
    };

    rec.onend = () => {
        document.getElementById("speech-mic-btn").classList.remove("listening");
        document.getElementById("speech-status-indicator").innerText = "Recording stopped. Tap mic to resume.";
        document.getElementById("speech-interim-box").innerText = "";
    };

    rec.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        document.getElementById("speech-interim-box").innerText = interimTranscript;

        if (finalTranscript || interimTranscript) {
            matchSpeechText(finalTranscript + " " + interimTranscript);
        }
    };

    state.recognitionInstance = rec;
}

function stopSpeechRecognition() {
    if (state.recognitionInstance) {
        try {
            state.recognitionInstance.stop();
        } catch (e) {}
    }
}

function renderSpeechMode(verse) {
    const boardText = document.getElementById("practice-board-text");
    const micBtn = document.getElementById("speech-mic-btn");
    const statusText = document.getElementById("speech-status-indicator");

    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        statusText.innerHTML = `<span style="color: var(--danger);">Web Speech API not supported in this browser. Try Chrome/Safari.</span>`;
        micBtn.style.opacity = "0.5";
        micBtn.style.pointerEvents = "none";
    } else {
        statusText.innerText = "Ready to recite. Tap the microphone below.";
    }

    // Tokenize target words
    const words = verse.text.split(/(\s+)/);
    state.speechWordsMatched = new Array(words.length).fill(false);

    rebuildSpeechHTML(words);

    micBtn.onclick = () => {
        if (!state.recognitionInstance) return;

        if (micBtn.classList.contains("listening")) {
            stopSpeechRecognition();
        } else {
            state.recognitionInstance.start();
        }
    };
}

function matchSpeechText(speechBlob) {
    const verse = state.verses.find(v => v.id === state.activeVerseId);
    if (!verse) return;

    const words = verse.text.split(/(\s+)/);
    
    // Normalize speech blob: strip punctuation, lowercase
    const cleanSpeech = speechBlob.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    const spokenTokens = cleanSpeech.split(/\s+/).filter(t => t.length > 0);

    // Dynamic Programming or basic search alignment matching
    words.forEach((word, idx) => {
        if (word.trim().length === 0) return;
        
        const cleanWord = word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        
        // Simple search: check if word exists in spoken tokens
        if (spokenTokens.includes(cleanWord)) {
            state.speechWordsMatched[idx] = true;
        }
    });

    rebuildSpeechHTML(words);

    // If 90% of words matched, auto success
    const actualWordsIndices = words.map((w, i) => w.trim().length > 0 ? i : -1).filter(i => i !== -1);
    const matchedCount = actualWordsIndices.filter(i => state.speechWordsMatched[i]).length;
    
    if (matchedCount >= Math.round(actualWordsIndices.length * 0.9)) {
        stopSpeechRecognition();
        document.getElementById("speech-status-indicator").innerHTML = `<span style="color: var(--success); font-weight: bold;">Recital successful! All words matched.</span>`;
    }
}

function rebuildSpeechHTML(words) {
    const boardText = document.getElementById("practice-board-text");
    boardText.innerHTML = "";

    words.forEach((word, idx) => {
        if (word.trim().length === 0) {
            boardText.appendChild(document.createTextNode(word));
        } else {
            const span = document.createElement("span");
            span.className = "speech-word-match";
            span.innerText = word;
            
            if (state.speechWordsMatched[idx]) {
                span.classList.add("matched");
            } else {
                span.classList.add("unmatched");
            }

            boardText.appendChild(span);
        }
    });
}

// HINTS ENGINE
function triggerHint() {
    const verse = state.verses.find(v => v.id === state.activeVerseId);
    if (!verse) return;

    if (state.activeMode === "eraser") {
        // Reveal some random erased words
        if (state.eraserIndices.length > 0) {
            state.eraserIndices.splice(0, Math.ceil(state.eraserIndices.length * 0.3));
            
            const words = verse.text.split(/(\s+)/);
            rebuildEraserHTML(words);
        }
    } else if (state.activeMode === "scramble") {
        // Place next correct word automatically
        const nextIndex = state.scrambleAssembledWords.length;
        if (nextIndex < state.scrambleTargetWords.length) {
            const nextWordToFind = state.scrambleTargetWords[nextIndex];
            
            // Find in pool
            const chipData = state.scramblePool.find(item => item.word.toLowerCase() === nextWordToFind.toLowerCase() && !state.scrambleAssembledWords.includes(item.word));
            if (chipData) {
                const chipBtn = document.getElementById(chipData.id);
                if (chipBtn) chipBtn.click();
            }
        }
    } else if (state.activeMode === "speech") {
        // Toggle highlight of next unmatched word
        const words = verse.text.split(/(\s+)/);
        const firstUnmatchedIdx = words.findIndex((w, i) => w.trim().length > 0 && !state.speechWordsMatched[i]);
        if (firstUnmatchedIdx !== -1) {
            state.speechWordsMatched[firstUnmatchedIdx] = true;
            rebuildSpeechHTML(words);
        }
    } else {
        // Alert partial hint
        showToast(`Hint: "${verse.text.split(" ").slice(0, 5).join(" ")}..."`, 'info');
    }
}

// --- EVALUATION POPUP SCREEN TRIGGERS ---
function handlePracticeDone() {
    if (state.activeMode === "read") {
        // In read mode, just go to next verse
        navigateVerse("next");
        return;
    }
    // Show evaluation SM-2 scores with next-review previews
    document.getElementById("practice-default-footer").style.display = "none";
    document.getElementById("practice-eval-footer").style.display = "flex";
    
    // Update preview labels with predicted intervals
    const verse = state.verses.find(v => v.id === state.activeVerseId);
    if (verse) {
        const p1 = document.getElementById("eval-preview-1");
        if(p1) p1.innerText = "Review tomorrow";
        
        let interval3 = verse.sm2.repetition === 0 ? 1 : (verse.sm2.repetition === 1 ? 6 : Math.round(verse.sm2.interval * verse.sm2.efactor));
        const p3 = document.getElementById("eval-preview-3");
        if(p3) p3.innerText = `Review in ~${interval3} day${interval3 > 1 ? 's' : ''}`;
        
        let interval5 = verse.sm2.repetition === 0 ? 1 : (verse.sm2.repetition === 1 ? 6 : Math.round(verse.sm2.interval * verse.sm2.efactor));
        if (verse.sm2.repetition >= 1) interval5 = Math.round(interval5 * 1.3);
        const p5 = document.getElementById("eval-preview-5");
        if(p5) p5.innerText = `Review in ~${Math.max(1, interval5)} day${interval5 > 1 ? 's' : ''}`;
    }
}

function handleRecallRating(score) {
    const interval = evaluateSM2(state.activeVerseId, score);
    
    // Close practice state
    document.getElementById("practice-eval-footer").style.display = "none";
    document.getElementById("practice-default-footer").style.display = "flex";

    // Show custom confirmation success modal
    const overlay = document.getElementById("success-modal");
    document.getElementById("success-modal-title").innerText = score >= 3 ? "Great Job!" : "Keep Practicing";
    document.getElementById("success-modal-text").innerText = score >= 3 
        ? "Your memory retention was logged successfully." 
        : "Don't worry, we scheduled this verse for review tomorrow to reinforce it.";
    
    document.getElementById("success-modal-next-review").innerText = score >= 3 
        ? `Next review scheduled in ${interval} day${interval > 1 ? 's' : ''}.` 
        : `Next review scheduled for tomorrow.`;

    overlay.style.display = "flex";
    lucide.createIcons();
    
    // Check for milestones
    if (typeof checkMilestone === 'function') checkMilestone();
}

// --- SETTINGS VALUES SYNC ---
function loadSettingsInputs() {
    document.getElementById("settings-tts-enabled").checked = state.settings.ttsEnabled;
    document.getElementById("settings-notifications-enabled").checked = state.settings.notificationsEnabled;
    document.getElementById("settings-recall-masking").checked = state.settings.recallMasking || false;
}

function saveSettingsInputs() {
    state.settings.ttsEnabled = document.getElementById("settings-tts-enabled").checked;
    state.settings.notificationsEnabled = document.getElementById("settings-notifications-enabled").checked;
    state.settings.recallMasking = document.getElementById("settings-recall-masking").checked;
    saveToLocalStorage();
    
    // Instantly apply visual setting changes if in practice view
    if (state.currentScreen === "practice" && (state.activeMode === "read" || state.activeMode === "immersed")) {
        const verse = state.verses.find(v => v.id === state.activeVerseId);
        if (verse) renderReadMode(verse);
    }
}

// --- BACKUP / EXPORT / RESET LOGIC ---
function exportDatabase() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `remora_bible_verses_backup_${getLocalDateString(new Date())}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importDatabase(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedState = JSON.parse(e.target.result);
            if (Array.isArray(importedState.verses)) {
                state.verses = importedState.verses;
                state.streak = importedState.streak || 0;
                state.lastActiveDate = importedState.lastActiveDate || null;
                state.theme = importedState.theme || "nebula";
                state.settings = importedState.settings || state.settings;
                
                saveToLocalStorage();
                applyTheme(state.theme);
                showToast('Library restored successfully!', 'success');
                navigateTo("dashboard");
            } else {
                showToast('Invalid backup file.', 'error');
            }
        } catch (err) {
            showToast('Error reading backup file.', 'error');
        }
    };
    reader.readAsText(file);
}

function resetDatabase() {
    showConfirm(
        'Reset Everything',
        'Delete all verses, streaks, and progress? This cannot be undone.',
        'Reset All Data',
        () => {
            localStorage.clear();
            state.verses = [...SEED_VERSES];
            state.streak = 0;
            state.lastActiveDate = null;
            state.theme = 'nebula';
            state.hasSeeded100 = false;
            state.settings = { ttsEnabled: false, notificationsEnabled: false, recallMasking: false };
            
            saveToLocalStorage();
            applyTheme('nebula');
            navigateTo('dashboard');
            showToast('App reset to defaults.', 'info');
        }
    );
}

// --- EVENT ROUTERS & LISTENERS ---
function setupEventListeners() {
    // Immersed Mode Back Button
    const immersedBackBtn = document.getElementById("immersed-back-btn");
    if (immersedBackBtn) {
        immersedBackBtn.onclick = () => {
            selectPracticeMode("read");
        };
    }

    // Re-request wake lock if visibility changes while auto-play is active
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && state.autoPlayActive) {
            requestWakeLock();
        }
    });

    // Navigation bar routing
    document.querySelectorAll("[data-screen-link]").forEach(nav => {
        nav.onclick = () => {
            const screenId = nav.getAttribute("data-screen-link");
            navigateTo(screenId);
        };
    });

    // Add Verse Quick shortcuts
    const addShortcut = document.getElementById("btn-add-shortcut");
    if (addShortcut) {
        addShortcut.onclick = () => navigateTo("add");
    }

    // Add Verse Tabs
    document.getElementById("tab-search").onclick = () => {
        document.getElementById("tab-search").classList.add("active");
        document.getElementById("tab-manual").classList.remove("active");
        document.getElementById("add-search-content").style.display = "flex";
        document.getElementById("add-manual-content").style.display = "none";
    };

    document.getElementById("tab-manual").onclick = () => {
        document.getElementById("tab-manual").classList.add("active");
        document.getElementById("tab-search").classList.remove("active");
        document.getElementById("add-search-content").style.display = "none";
        document.getElementById("add-manual-content").style.display = "flex";
    };

    // Filter selector chips on Dashboard
    document.querySelectorAll(".filter-chip").forEach(chip => {
        chip.onclick = () => {
            document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            renderLibrary();
        };
    });

    // Sort Dropdown Toggle
    const sortToggle = document.getElementById("btn-sort-toggle");
    const sortDropdown = document.getElementById("sort-dropdown");
    if (sortToggle && sortDropdown) {
        sortToggle.onclick = (e) => {
            e.stopPropagation();
            const isClosed = sortDropdown.style.display === "none";
            sortDropdown.style.display = isClosed ? "flex" : "none";
        };

        // Close dropdown when clicking anywhere else
        document.addEventListener("click", () => {
            sortDropdown.style.display = "none";
        });
    }

    // Sort Option Selection
    document.querySelectorAll(".sort-option").forEach(opt => {
        opt.onclick = (e) => {
            e.stopPropagation();
            state.sortOrder = opt.getAttribute("data-sort");
            saveToLocalStorage();
            if (sortDropdown) sortDropdown.style.display = "none";
            renderLibrary();
        };
    });

    // Curated Topic Clicks
    document.querySelectorAll("[data-topic]").forEach(btn => {
        btn.onclick = () => {
            const topic = btn.getAttribute("data-topic");
            addCuratedTopic(topic);
        };
    });

    // API Search click
    document.getElementById("search-btn").onclick = handleSearch;
    document.getElementById("search-input").onkeydown = (e) => {
        if (e.key === "Enter") handleSearch();
    };

    // Manual Save click
    document.getElementById("btn-save-manual").onclick = () => {
        const ref = document.getElementById("manual-ref").value.trim();
        const text = document.getElementById("manual-text").value.trim();
        const translation = document.getElementById("manual-translation").value.trim() || "Custom";

        if (!ref || !text) {
            showToast('Reference and verse text are required.', 'error');
            return;
        }

        addNewVerse(ref, text, translation);
        
        // Reset manual inputs
        document.getElementById("manual-ref").value = "";
        document.getElementById("manual-text").value = "";
        document.getElementById("manual-translation").value = "";

        navigateTo("dashboard");
    };

    // Settings adjustments
    document.getElementById("settings-tts-enabled").onchange = saveSettingsInputs;
    document.getElementById("settings-notifications-enabled").onchange = saveSettingsInputs;
    document.getElementById("settings-recall-masking").onchange = saveSettingsInputs;

    // Theme Picker Clicks
    document.querySelectorAll("[data-theme-id]").forEach(btn => {
        btn.onclick = () => {
            const themeId = btn.getAttribute("data-theme-id");
            applyTheme(themeId);
        };
    });

    // Data backups & Reset
    document.getElementById("btn-export-data").onclick = exportDatabase;
    document.getElementById("btn-import-data-trigger").onclick = () => {
        document.getElementById("btn-import-data-file").click();
    };
    document.getElementById("btn-import-data-file").onchange = importDatabase;
    document.getElementById("btn-reset-database").onclick = resetDatabase;

    // Seed 100 popular verses seeder (Settings button & Dashboard banner button)
    const seed100Btn = document.getElementById("btn-seed-100-verses");
    if (seed100Btn) {
        seed100Btn.onclick = () => triggerSeed100(seed100Btn);
    }
    const dashboardSeedBtn = document.getElementById("btn-dashboard-seed-100");
    if (dashboardSeedBtn) {
        dashboardSeedBtn.onclick = () => triggerSeed100(dashboardSeedBtn);
    }

    // Practice Back Button
    document.getElementById("practice-back-btn").onclick = () => {
        navigateTo("dashboard");
    };

    // Practice Nav Buttons (Prev/Next)
    document.getElementById("practice-prev-btn").onclick = () => {
        navigateVerse("prev");
    };
    document.getElementById("practice-next-btn").onclick = () => {
        navigateVerse("next");
    };

    // Immersive Mode Toggle & Swipe Gestures
    const practiceBoard = document.getElementById("practice-board");
    const workspacePanel = document.getElementById("practice-workspace-panel");
    let touchstartX = 0;
    let touchendX = 0;

    if (workspacePanel) {
        workspacePanel.addEventListener('touchstart', e => {
            touchstartX = e.changedTouches[0].screenX;
        }, {passive: true});

        workspacePanel.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            if (touchendX < touchstartX - 50) {
                navigateVerse("next");
            }
            if (touchendX > touchstartX + 50) {
                navigateVerse("prev");
            }
        }, {passive: true});
    }

    if (practiceBoard) {
        practiceBoard.addEventListener('click', (e) => {
            // Edge tap navigation (left 30% / right 30%)
            const width = window.innerWidth;
            const x = e.clientX;
            
            // Don't trigger if clicking an interactive element
            const targetTag = e.target.tagName.toLowerCase();
            const isInteractive = ['button', 'a', 'i', 'svg', 'path'].includes(targetTag) || 
                                  e.target.closest('button') || 
                                  e.target.classList.contains('scramble-word') ||
                                  e.target.classList.contains('word-input');

            // Handle unmasking logic
            const maskedTarget = e.target.closest('.masked-sentence:not(.unmasked)');
            if (maskedTarget && state.activeMode === "immersed") {
                maskedTarget.classList.add('unmasked');
                return;
            }

            if (!isInteractive) {
                if (x < width * 0.25) {
                    navigateVerse("prev");
                    return;
                } else if (x > width * 0.75) {
                    navigateVerse("next");
                    return;
                }
            }

            // Middle area click: toggle immersed mode UI if active
            if (state.activeMode === "immersed" && !isInteractive) {
                document.getElementById("screen-practice").classList.toggle("immersed");
            }
        });
    }

    // Empty selector redirects
    document.getElementById("practice-select-btn").onclick = () => {
        navigateTo("dashboard");
    };

    // Practice Mode chips
    document.querySelectorAll(".mode-tab").forEach(tab => {
        tab.onclick = () => {
            const mode = tab.getAttribute("data-mode");
            selectPracticeMode(mode);
        };
    });

    // Toggle Auto Play Click
    const autoPlayBtn = document.getElementById("btn-toggle-auto-play");
    if (autoPlayBtn) {
        autoPlayBtn.onclick = () => {
            state.autoPlayActive = !state.autoPlayActive;
            updateAutoPlayUI();
            if (state.autoPlayActive) {
                requestWakeLock();
                runAutoPlayStep();
            } else {
                releaseWakeLock();
                if (state.autoPlayTimer) {
                    clearTimeout(state.autoPlayTimer);
                    state.autoPlayTimer = null;
                }
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                }
            }
        };
    }

    // Show Hint Click
    document.getElementById("practice-show-hint-btn").onclick = triggerHint;

    // Done practice recital Click
    document.getElementById("practice-done-btn").onclick = handlePracticeDone;

    // SM-2 evaluation clicks
    document.querySelectorAll(".eval-btn").forEach(btn => {
        btn.onclick = () => {
            const score = parseInt(btn.getAttribute("data-score"), 10);
            handleRecallRating(score);
        };
    });

    // Close success overlay
    document.getElementById("success-modal-close").onclick = () => {
        document.getElementById("success-modal").style.display = "none";
        // If in practice-all-due mode, advance to next
        if (typeof practiceQueue !== 'undefined' && practiceQueue && practiceQueue.length > 0) {
            if (!advancePracticeQueue()) {
                navigateTo("dashboard");
            }
        } else {
            navigateTo("dashboard");
        }
    };

    // Onboarding
    const onboardingNext = document.getElementById("onboarding-next");
    if (onboardingNext && typeof advanceOnboarding === 'function') onboardingNext.onclick = advanceOnboarding;
    const onboardingSkip = document.getElementById("onboarding-skip");
    if (onboardingSkip && typeof dismissOnboarding === 'function') onboardingSkip.onclick = dismissOnboarding;
    
    // Verse Detail Sheet
    const vdo = document.getElementById("verse-detail-overlay");
    if(vdo && typeof closeVerseDetail === 'function') vdo.onclick = closeVerseDetail;
    const dpb = document.getElementById("detail-practice-btn");
    if(dpb) dpb.onclick = () => {
        state.activeVerseId = detailVerseId;
        if (typeof closeVerseDetail === 'function') closeVerseDetail();
        navigateTo("practice");
    };
    const deb = document.getElementById("detail-edit-btn");
    if(deb && typeof openVerseEdit === 'function') deb.onclick = openVerseEdit;
    const ddb = document.getElementById("detail-delete-btn");
    if(ddb && typeof deleteVerse === 'function') ddb.onclick = () => deleteVerse(detailVerseId);
    const dec = document.getElementById("detail-edit-cancel");
    if(dec) dec.onclick = () => {
        document.getElementById("verse-detail-view-mode").style.display = "block";
        document.getElementById("verse-detail-edit-mode").style.display = "none";
    };
    const des = document.getElementById("detail-edit-save");
    if(des && typeof saveVerseEdit === 'function') des.onclick = saveVerseEdit;
    
    // Confirm modal
    const cc = document.getElementById("confirm-cancel");
    if(cc && typeof closeConfirm === 'function') cc.onclick = closeConfirm;
    const cok = document.getElementById("confirm-ok");
    if(cok) cok.onclick = () => {
        if (typeof confirmCallback === 'function' && confirmCallback) confirmCallback();
        if (typeof closeConfirm === 'function') closeConfirm();
    };
    
    // Milestone modal
    const mc = document.getElementById("milestone-close");
    if(mc) mc.onclick = () => {
        document.getElementById("milestone-modal").style.display = "none";
    };
    
    // Library search
    const libSearch = document.getElementById("library-search-input");
    if (libSearch) {
        libSearch.oninput = () => renderLibrary();
    }
    
    // Practice All Due
    const practiceAllDueBtn = document.getElementById("btn-practice-all-due");
    if (practiceAllDueBtn && typeof startPracticeAllDue === 'function') {
        practiceAllDueBtn.onclick = startPracticeAllDue;
    }
    
    // Streak tooltip
    const streakPill = document.getElementById("header-streak-pill");
    if (streakPill) {
        streakPill.style.cursor = "pointer";
        streakPill.onclick = (e) => {
            e.stopPropagation();
            // Remove existing tooltip
            const existing = document.querySelector(".streak-tooltip");
            if (existing) { existing.remove(); return; }
            
            const tooltip = document.createElement("div");
            tooltip.className = "streak-tooltip";
            tooltip.innerText = state.streak > 0 
                ? `🔥 ${state.streak} day streak! Practice daily to keep it.`
                : "🔥 Start practicing to begin your streak!";
            streakPill.parentElement.appendChild(tooltip);
            
            setTimeout(() => tooltip.remove(), 3000);
        };
        
        document.addEventListener("click", () => {
            const existing = document.querySelector(".streak-tooltip");
            if (existing) existing.remove();
        });
    }
}

// Helper to escape HTML tags in strings
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- SCROLL TO HIDE MENU ---
let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
    const bottomNav = document.querySelector('.bottom-nav');
    if (!bottomNav) return;
    
    // Check if we are immersed (we completely hide the nav in immersed mode already)
    if (document.body.classList.contains("immersed-active")) return;

    if (window.scrollY <= 50) {
        // At the top of the page, always show
        bottomNav.classList.remove('nav-hidden');
    } else if (window.scrollY > lastScrollY) {
        // Scrolling down
        bottomNav.classList.add('nav-hidden');
    } else {
        // Scrolling up
        bottomNav.classList.remove('nav-hidden');
    }
    lastScrollY = window.scrollY;
});
