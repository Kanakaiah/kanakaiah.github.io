package com.example.telugubible.data.commentary

import com.example.telugubible.data.model.CommentaryEntry
import com.example.telugubible.data.model.CommentaryResource
import com.example.telugubible.data.model.CommentarySection
import com.example.telugubible.data.model.CommentarySeries

object CommentaryData {

    val PENTATEUCH = CommentarySeries(
        id = "pentateuch-commentaries",
        title = "Pentateuch / Torah Commentary Series",
        subtitle = "Critical-scholarly guides for Genesis through Deuteronomy",
        icon = "📜",
        category = "Old Testament",
        bookIds = (1..5).toList(),
        sections = listOf(
            CommentarySection(
                heading = "Whole-Pentateuch / Introduction",
                entries = listOf(
                    CommentaryEntry(rank = "Intro", person = "Gordon Wenham, Exploring the Old Testament: The Pentateuch", quote = "Good bridge from lay to scholarly."),
                    CommentaryEntry(rank = "THEOL", person = "John Sailhamer, The Pentateuch as Narrative", quote = "Canonical-theological reading, complements your synthesis-oriented approach.")
                )
            ),
            CommentarySection(
                heading = "Genesis: Core Commentaries",
                description = "In order of depth/utility for your level.",
                entries = listOf(
                    CommentaryEntry(rank = "WBC", person = "Gordon Wenham, Genesis 1–15 & 16–50", reference = "2 vols", quote = "The essential critical-evangelical reference.", note = "Wenham's structural analysis (chiasms, toledot formulas) and Hebrew philology are unmatched. His treatment of the primeval history (1–11) versus patriarchal narratives (12–50) as distinct literary units will sharpen how you read the seams."),
                    CommentaryEntry(rank = "NAC", person = "Kenneth Mathews, Genesis 1–11:26 & 11:27–50:26", reference = "2 vols", quote = "More accessible than Wenham, strong on syntax.", note = "Good for sermon-prep cross-checking. Leans slightly more toward theological synthesis than pure critical apparatus."),
                    CommentaryEntry(rank = "SINGLE", person = "Bruce Waltke, Genesis: A Commentary", quote = "Excellent at connecting exegesis to biblical theology.", note = "Single volume, less technical, but excellent at connecting exegesis to biblical theology and narrative arc."),
                    CommentaryEntry(rank = "NICOT", person = "Victor Hamilton, Genesis 1–17 & 18–50", reference = "2 vols", quote = "Thorough philological work, evangelical-critical.", note = "Comparable tier to Wenham but with more attention to ANE background material."),
                    CommentaryEntry(rank = "CONT", person = "Claus Westermann, Genesis", reference = "3 vols", quote = "The major non-evangelical critical treatment.", note = "Source-critical (JEDP), form-critical method throughout. Useful critical foil.")
                )
            ),
            CommentarySection(
                heading = "Genesis: Specialized Supplements",
                entries = listOf(
                    CommentaryEntry(rank = "JEWISH", person = "Umberto Cassuto, A Commentary on the Book of Genesis", reference = "2 vols", quote = "Jewish critical-literary scholarship.", note = "Explicitly argues against source-critical fragmentation; useful methodological contrast."),
                    CommentaryEntry(rank = "EBC", person = "John Sailhamer, Genesis (EBC rev. ed.)", quote = "Canonical-narrative reading.", note = "His canonical-narrative reading of Genesis as programmatic for the whole Pentateuch.")
                ),
                note = "Suggested strategy: Wenham or Hamilton for primary exegesis, Waltke for theological synthesis, and Westermann as a critical foil."
            ),
            CommentarySection(
                heading = "Exodus: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NAC", person = "Douglas Stuart, Exodus", quote = "Solid entry point for evangelical exegesis."),
                    CommentaryEntry(rank = "JEWISH", person = "Umberto Cassuto, A Commentary on the Book of Exodus", quote = "Classic Jewish critical scholarship, valuable cross-tradition check."),
                    CommentaryEntry(rank = "INTERP", person = "Terence Fretheim, Exodus", quote = "More theological/homiletical.")
                )
            ),
            CommentarySection(
                heading = "Leviticus: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NICOT", person = "Gordon Wenham, The Book of Leviticus", quote = "Clearest on sacrificial system logic."),
                    CommentaryEntry(rank = "ANCHOR", person = "Jacob Milgrom, Leviticus 1–16, 17–22, 23–27", reference = "3 vols", quote = "The definitive critical-scholarly treatment, very deep on cultic/ritual detail.")
                )
            ),
            CommentarySection(
                heading = "Numbers: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "TYNDALE", person = "Gordon Wenham, Numbers", quote = "Solid entry point."),
                    CommentaryEntry(rank = "NICOT", person = "Timothy Ashley, The Book of Numbers", quote = "Better depth for exegesis.")
                )
            ),
            CommentarySection(
                heading = "Deuteronomy: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NICOT", person = "Peter Craigie, The Book of Deuteronomy", quote = "Strong evangelical critical baseline."),
                    CommentaryEntry(rank = "NIVAC", person = "Daniel Block, Deuteronomy", quote = "Strong theological bridge to preaching."),
                    CommentaryEntry(rank = "SPECIAL", person = "Jack Lundbom, Deuteronomy: A Commentary", quote = "Rhetorical/structural analysis, useful complement.")
                )
            ),
            CommentarySection(
                heading = "Series worth tracking across the whole Pentateuch",
                entries = listOf(
                    CommentaryEntry(rank = "NICOT", person = "New International Commentary on the Old Testament", quote = "Evangelical-critical, top-tier scholarship."),
                    CommentaryEntry(rank = "WBC", person = "Word Biblical Commentary", quote = "Heavier critical apparatus, Hebrew-forward."),
                    CommentaryEntry(rank = "ANCHOR", person = "Anchor Bible / Anchor Yale", quote = "Most critical-scholarly of the bunch, less confessional.")
                )
            )
        )
    )

    val HISTORICAL = CommentarySeries(
        id = "historical-commentaries",
        title = "Historical Books Commentary Series",
        subtitle = "Critical-scholarly guides for Joshua through Esther",
        icon = "⚔️",
        category = "Old Testament",
        bookIds = (6..17).toList(),
        sections = listOf(
            CommentarySection(
                heading = "Whole Historical Books / Introduction",
                entries = listOf(
                    CommentaryEntry(rank = "Intro", person = "David Howard, An Introduction to the Old Testament Historical Books", quote = "The best single-volume introduction to the genre and each book."),
                    CommentaryEntry(rank = "THEOL", person = "Iain Provan, V. Philips Long & Tremper Longman III, A Biblical History of Israel", quote = "Defends historical reliability while engaging critical scholarship rigorously.")
                )
            ),
            CommentarySection(
                heading = "Joshua: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NAC", person = "David M. Howard Jr., Joshua", quote = "The essential evangelical-critical reference.", note = "Strong on Hebrew philology and the theology of holy war. Excellent treatment of Deuteronomistic connections."),
                    CommentaryEntry(rank = "WBC", person = "Trent Butler, Joshua", reference = "2 vols", quote = "Heavier critical apparatus, good on form-critical and redaction issues."),
                    CommentaryEntry(rank = "TYNDALE", person = "Richard Hess, Joshua", quote = "Compact and reliable; excellent on ANE parallels to conquest accounts.")
                )
            ),
            CommentarySection(
                heading = "Judges: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NAC", person = "Daniel Block, Judges, Ruth", quote = "The gold standard for evangelical exegesis of Judges.", note = "Block's sensitivity to narrative art and rhetorical structure is exceptional."),
                    CommentaryEntry(rank = "WBC", person = "Trent Butler, Judges", quote = "Comprehensive critical treatment; good counterpoint to Block.")
                )
            ),
            CommentarySection(
                heading = "Ruth: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "WBC", person = "Frederic Bush, Ruth/Esther", quote = "The most technically rigorous Hebrew treatment; indispensable.", note = "Bush's linguistic analysis of the Hebrew is unrivaled. Highest recommendation for technical work."),
                    CommentaryEntry(rank = "NAC", person = "Daniel Block, Judges, Ruth", quote = "Block's Ruth section is among the finest short treatments of any book.")
                )
            ),
            CommentarySection(
                heading = "1–2 Samuel: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NICOT", person = "David Tsumura, The First Book of Samuel", quote = "The best Hebrew-philological treatment of 1 Samuel.", note = "Tsumura is essential for any serious Hebrew work on Samuel."),
                    CommentaryEntry(rank = "NICOT", person = "Robert Bergen, 1–2 Samuel", quote = "Solid evangelical synthesis across both volumes."),
                    CommentaryEntry(rank = "ANCHOR", person = "P. Kyle McCarter, I Samuel & II Samuel", reference = "2 vols", quote = "The definitive critical treatment. Strong on textual criticism and source analysis.")
                )
            ),
            CommentarySection(
                heading = "1–2 Kings: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NAC", person = "Paul House, 1 & 2 Kings", quote = "Strong theological synthesis; good canonical connections."),
                    CommentaryEntry(rank = "NCBC", person = "Gwilym Jones, 1 and 2 Kings", reference = "2 vols", quote = "Major critical treatment; strong on redaction and historical questions.")
                )
            ),
            CommentarySection(
                heading = "1–2 Chronicles: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "WBC", person = "Raymond Dillard, 2 Chronicles", reference = "vol. 15", quote = "Exceptional on 2 Chronicles.", note = "Chronicles as theological interpretation of Samuel-Kings is Dillard's great contribution."),
                    CommentaryEntry(rank = "TOTC", person = "Martin Selman, 1–2 Chronicles", reference = "2 vols", quote = "Solid across both volumes.")
                )
            ),
            CommentarySection(
                heading = "Ezra-Nehemiah: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "OTL", person = "Joseph Blenkinsopp, Ezra-Nehemiah", quote = "The premier critical-scholarly treatment."),
                    CommentaryEntry(rank = "NAC", person = "Mervin Breneman, Ezra, Nehemiah, Esther", quote = "Solid evangelical synthesis, preachable."),
                    CommentaryEntry(rank = "TYNDALE", person = "Derek Kidner, Ezra & Nehemiah", quote = "Compact, theologically rich, and excellent for sermon prep.")
                )
            ),
            CommentarySection(
                heading = "Esther: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "WBC", person = "Frederic Bush, Ruth/Esther", quote = "Best technical Hebrew treatment; essential."),
                    CommentaryEntry(rank = "NIVAC", person = "Karen Jobes, Esther", quote = "Outstanding evangelical exegesis of Esther; highly recommended.", note = "Jobes engages historical and literary questions with great skill.")
                )
            )
        )
    )

    val WISDOM = CommentarySeries(
        id = "wisdom-commentaries",
        title = "Wisdom & Poetry Commentary Series",
        subtitle = "Critical-scholarly guides for Job through Song of Solomon",
        icon = "🎵",
        category = "Old Testament",
        bookIds = (18..22).toList(),
        sections = listOf(
            CommentarySection(
                heading = "Whole Wisdom Literature / Introduction",
                entries = listOf(
                    CommentaryEntry(rank = "Intro", person = "Tremper Longman III, Introducing the Old Testament", quote = "Excellent framing of Wisdom as a canonical category."),
                    CommentaryEntry(rank = "THEOL", person = "Craig Bartholomew & Ryan O'Dowd, Old Testament Wisdom", quote = "Best theological synthesis of the Wisdom tradition.")
                )
            ),
            CommentarySection(
                heading = "Job: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "WBC", person = "David Clines, Job 1–20, 21–37, 38–42", reference = "3 vols", quote = "The definitive critical-scholarly treatment of Job.", note = "Clines' literary sensitivity and philological rigor are unmatched."),
                    CommentaryEntry(rank = "NICOT", person = "John Hartley, The Book of Job", quote = "Best single-volume evangelical-critical treatment."),
                    CommentaryEntry(rank = "ANCHOR", person = "Marvin Pope, Job", quote = "Classic critical commentary; strong on ANE (Ugaritic) parallels.")
                )
            ),
            CommentarySection(
                heading = "Psalms: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "WBC", person = "Peter Craigie, Marvin Tate, Leslie Allen, Psalms", reference = "3 vols", quote = "The standard critical-evangelical trilogy on Psalms.", note = "Craigie on ANE parallels and form-criticism, Tate on textual matters, Allen on the final form of the Psalter."),
                    CommentaryEntry(rank = "BCOTWP", person = "John Goldingay, Psalms", reference = "3 vols", quote = "Theologically rich and literarily sensitive."),
                    CommentaryEntry(rank = "TYNDALE", person = "Derek Kidner, Psalms", reference = "2 vols", quote = "The best brief treatment for sermon prep and theological reading.")
                )
            ),
            CommentarySection(
                heading = "Proverbs: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NICOT", person = "Bruce Waltke, Proverbs 1–15 & 15–31", reference = "2 vols", quote = "The definitive evangelical-critical treatment. Essential.", note = "Waltke's work on Wisdom personified in Proverbs 1–9 is magisterial."),
                    CommentaryEntry(rank = "BCOTWP", person = "Tremper Longman III, Proverbs", quote = "More accessible than Waltke; strong on ANE wisdom parallels.")
                )
            ),
            CommentarySection(
                heading = "Ecclesiastes: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NICOT", person = "Tremper Longman III, The Book of Ecclesiastes", quote = "The most thorough evangelical treatment; engages critical questions directly.", note = "Longman's framing of Qohelet's voice versus the epilogist's frame is essential."),
                    CommentaryEntry(rank = "BST", person = "Derek Kidner, A Time to Mourn and a Time to Dance", quote = "Short, superb, and immediately useful for preaching.")
                )
            ),
            CommentarySection(
                heading = "Song of Solomon: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NICOT", person = "Tremper Longman III, Song of Songs", quote = "Best evangelical-critical treatment; engages all major interpretive options.", note = "Longman carefully charts literal/erotic, typological, and canonical connections."),
                    CommentaryEntry(rank = "SPECIAL", person = "Ariel Bloch & Chana Bloch, The Song of Songs", quote = "Outstanding literary translation and commentary; essential for the poetry.")
                )
            )
        )
    )

    val MAJOR_PROPHETS = CommentarySeries(
        id = "major-prophets-commentaries",
        title = "Major Prophets Commentary Series",
        subtitle = "Critical-scholarly guides for Isaiah through Daniel",
        icon = "🔥",
        category = "Old Testament",
        bookIds = (23..27).toList(),
        sections = listOf(
            CommentarySection(
                heading = "Isaiah: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NICOT", person = "John Oswalt, Isaiah 1–39 & 40–66", reference = "2 vols", quote = "The definitive evangelical-critical treatment. Essential for both halves.", note = "Oswalt defends Isaianic unity while engaging critical arguments rigorously. Exegesis of the Servant Songs is magisterial."),
                    CommentaryEntry(rank = "TYNDALE", person = "J. Alec Motyer, The Prophecy of Isaiah", quote = "Single-volume evangelical treatment; outstanding theological synthesis."),
                    CommentaryEntry(rank = "ANCHOR", person = "Joseph Blenkinsopp, Isaiah 1–39, 40–55, 56–66", reference = "3 vols", quote = "The major non-evangelical critical treatment.")
                )
            ),
            CommentarySection(
                heading = "Jeremiah: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "ANCHOR", person = "Jack Lundbom, Jeremiah 1–20, 21–36, 37–52", reference = "3 vols", quote = "The most thorough critical treatment; indispensable for rhetorical analysis.", note = "Lundbom's work on literary structure and Deuteronomistic editing is the best available."),
                    CommentaryEntry(rank = "INTERP", person = "Walter Brueggemann, A Commentary on Jeremiah", quote = "Theologically and rhetorically stimulating; excellent for preaching.")
                )
            ),
            CommentarySection(
                heading = "Lamentations: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "WBC", person = "Duane Garrett & Paul House, Song of Songs/Lamentations", quote = "House's section on Lamentations is the best evangelical treatment."),
                    CommentaryEntry(rank = "OTL", person = "Adele Berlin, Lamentations", quote = "Superb literary and poetic analysis; essential for understanding acrostic structure.")
                )
            ),
            CommentarySection(
                heading = "Ezekiel: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NICOT", person = "Daniel Block, The Book of Ezekiel 1–24 & 25–48", reference = "2 vols", quote = "The gold standard for evangelical exegesis of Ezekiel. Essential.", note = "Block's handling of the Glory departure/return visions and the new heart oracle (36:26) is outstanding."),
                    CommentaryEntry(rank = "HERMENEIA", person = "Walther Zimmerli, Ezekiel", reference = "2 vols", quote = "The major critical treatment. Deep and demanding.")
                )
            ),
            CommentarySection(
                heading = "Daniel: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "AOTC", person = "Ernest Lucas, Daniel", quote = "Best single evangelical treatment engaging critical questions squarely."),
                    CommentaryEntry(rank = "WBC", person = "John Goldingay, Daniel", quote = "Critical treatment; excellent on the Aramaic and apocalyptic genre.")
                )
            )
        )
    )

    val MINOR_PROPHETS = CommentarySeries(
        id = "minor-prophets-commentaries",
        title = "Minor Prophets (The Twelve) Commentary Series",
        subtitle = "Critical-scholarly guides for Hosea through Malachi",
        icon = "📯",
        category = "Old Testament",
        bookIds = (28..39).toList(),
        sections = listOf(
            CommentarySection(
                heading = "The Twelve as a Canonical Unit / Introduction",
                entries = listOf(
                    CommentaryEntry(rank = "Intro", person = "James Nogalski, The Book of the Twelve", reference = "2 vols", quote = "Leading treatment of the Twelve as a redactional and canonical unit."),
                    CommentaryEntry(rank = "BAKER", person = "Thomas McComiskey, ed., The Minor Prophets", reference = "3 vols", quote = "Comprehensive evangelical treatment of all twelve books. Essential reference set.")
                )
            ),
            CommentarySection(
                heading = "Hosea: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "WBC", person = "Douglas Stuart, Hosea–Jonah", quote = "Outstanding evangelical treatment covering five books.", note = "Stuart's linguistic work is superb and covenant connections are sharp."),
                    CommentaryEntry(rank = "HERMENEIA", person = "Hans Walter Wolff, Hosea", quote = "The definitive critical form-critical treatment.")
                )
            ),
            CommentarySection(
                heading = "Joel, Amos, Obadiah, Jonah, Micah: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "WBC", person = "Douglas Stuart, Hosea–Jonah", quote = "Best single volume for Hosea, Joel, Amos, Obadiah, and Jonah."),
                    CommentaryEntry(rank = "HERMENEIA", person = "Hans Walter Wolff, Joel and Amos", quote = "Indispensable for scholarly form-critical work.")
                )
            ),
            CommentarySection(
                heading = "Nahum, Habakkuk, Zephaniah: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NICOT", person = "O. Palmer Robertson, The Books of Nahum, Habakkuk, and Zephaniah", quote = "The single best treatment of all three books.", note = "Robertson's treatment of Habakkuk 2:4 ('just shall live by faith') is essential for Pauline connections.")
                )
            ),
            CommentarySection(
                heading = "Haggai, Zechariah, Malachi: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "TYNDALE", person = "Joyce Baldwin, Haggai, Zechariah, Malachi", quote = "The best compact evangelical treatment.", note = "Baldwin's handling of Zechariah's night visions and Messianic passages is lucid."),
                    CommentaryEntry(rank = "ANCHOR", person = "Carol Meyers & Eric Meyers, Haggai, Zechariah", reference = "2 vols", quote = "The definitive critical treatment.")
                )
            )
        )
    )

    val GOSPELS = CommentarySeries(
        id = "gospels-commentaries",
        title = "Gospels Commentary Series",
        subtitle = "Critical-scholarly guides for Matthew, Mark, Luke & John",
        icon = "✝️",
        category = "New Testament",
        bookIds = (40..43).toList(),
        sections = listOf(
            CommentarySection(
                heading = "Matthew: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "WBC", person = "Donald Hagner, Matthew 1–13 & 14–28", reference = "2 vols", quote = "The definitive evangelical-critical treatment of Matthew. Essential.", note = "Hagner's exegesis of the Sermon on the Mount and Olivet Discourse is meticulous."),
                    CommentaryEntry(rank = "NICNT", person = "R. T. France, The Gospel of Matthew", quote = "Excellent single-volume treatment; strong canonical and Christological reading."),
                    CommentaryEntry(rank = "ICC", person = "W. D. Davies & Dale Allison, Matthew", reference = "3 vols", quote = "The most comprehensive critical commentary. Encyclopedic.")
                )
            ),
            CommentarySection(
                heading = "Mark: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NIGTC", person = "R. T. France, The Gospel of Mark", quote = "The single best evangelical treatment of Mark. Exceptional.", note = "France's handling of Mark's Christology and Messianic Secret is outstanding."),
                    CommentaryEntry(rank = "WBC", person = "Robert Guelich & Craig Evans, Mark", reference = "2 vols", quote = "Strong critical-evangelical treatment; excellent on form criticism.")
                )
            ),
            CommentarySection(
                heading = "Luke: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "BECNT", person = "Darrell Bock, Luke 1:1–9:50 & 9:51–24:53", reference = "2 vols", quote = "The gold standard evangelical treatment of Luke. Essential.", note = "Bock's interaction with Jewish background and the parables is exceptional."),
                    CommentaryEntry(rank = "NIGTC", person = "I. Howard Marshall, The Gospel of Luke", quote = "Outstanding historical and theological synthesis.")
                )
            ),
            CommentarySection(
                heading = "John: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "PNTC", person = "D. A. Carson, The Gospel According to John", quote = "The best single-volume treatment of John. Essential.", note = "Carson's theological depth and handling of the 'I AM' sayings and prologue (1:1–18) are unrivaled."),
                    CommentaryEntry(rank = "ANCHOR", person = "Raymond Brown, The Gospel According to John", reference = "2 vols", quote = "The major critical treatment. Masterful on the farewell discourse."),
                    CommentaryEntry(rank = "SPECIAL", person = "Craig Keener, The Gospel of John: A Commentary", reference = "2 vols", quote = "The most exhaustive commentary on John ever written.")
                ),
                note = "Suggested strategy for John: Carson for primary pass and theological synthesis, Brown as critical counterpoint, Keener for exhaustive background."
            )
        )
    )

    val ACTS = CommentarySeries(
        id = "acts-commentaries",
        title = "Acts of the Apostles Commentary Series",
        subtitle = "Critical-scholarly guides for the Book of Acts",
        icon = "🕊️",
        category = "New Testament",
        bookIds = listOf(44),
        sections = listOf(
            CommentarySection(
                heading = "Acts / Introduction",
                entries = listOf(
                    CommentaryEntry(rank = "Intro", person = "I. Howard Marshall, Luke: Historian and Theologian", quote = "Essential for understanding Lukan theology before diving into Acts.")
                )
            ),
            CommentarySection(
                heading = "Acts: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "SPECIAL", person = "Craig Keener, Acts: An Exegetical Commentary", reference = "4 vols", quote = "The most exhaustive commentary on Acts ever written. Indispensable for historical background.", note = "Keener's documentation of Greco-Roman, Jewish, and early Christian parallels is unrivaled. Landmark defense of Acts' historical reliability."),
                    CommentaryEntry(rank = "BECNT", person = "Darrell Bock, Acts", quote = "The best single-volume evangelical-critical treatment. Start here.", note = "Bock's handling of the major speeches (Peter at Pentecost, Paul at Athens, Paul at Miletus) is outstanding."),
                    CommentaryEntry(rank = "NICNT", person = "F. F. Bruce, The Book of Acts (revised)", quote = "A classic evangelical treatment; historically strong and warmly written.")
                )
            ),
            CommentarySection(
                heading = "Acts: Specialized Supplements",
                entries = listOf(
                    CommentaryEntry(rank = "KEK", person = "Ernst Haenchen, The Acts of the Apostles", quote = "The major critical treatment. Strong redaction-critical analysis."),
                    CommentaryEntry(rank = "ANCHOR", person = "Joseph Fitzmyer, The Acts of the Apostles", quote = "Rigorous critical treatment; essential for philological work.")
                ),
                note = "Suggested strategy: Bock for primary pass, Keener for background, Haenchen as critical foil."
            )
        )
    )

    val PAULINE = CommentarySeries(
        id = "pauline-commentaries",
        title = "Pauline Epistles Commentary Series",
        subtitle = "Critical-scholarly guides for Romans through Philemon",
        icon = "✉️",
        category = "New Testament",
        bookIds = (45..57).toList(),
        sections = listOf(
            CommentarySection(
                heading = "Romans: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NICNT", person = "Douglas Moo, The Epistle to the Romans", quote = "The single best evangelical-critical treatment of Romans. Essential.", note = "Moo's handling of justification, Romans 5–8, and Romans 9–11 is outstanding. The standard reference."),
                    CommentaryEntry(rank = "BECNT", person = "Thomas Schreiner, Romans", quote = "Excellent evangelical alternative; strong Old Perspective synthesis."),
                    CommentaryEntry(rank = "WBC", person = "James Dunn, Romans 1–8 & 9–16", reference = "2 vols", quote = "The major New Perspective treatment; rigorous Greek work.")
                )
            ),
            CommentarySection(
                heading = "1–2 Corinthians: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NICNT", person = "Gordon Fee, The First Epistle to the Corinthians", quote = "The definitive evangelical-critical treatment of 1 Corinthians. Essential.", note = "Fee's exegesis of spiritual gifts (ch. 12–14) and resurrection (ch. 15) is magisterial."),
                    CommentaryEntry(rank = "WBC", person = "Ralph Martin, 2 Corinthians", quote = "The best treatment of 2 Corinthians.")
                )
            ),
            CommentarySection(
                heading = "Galatians: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NIGTC", person = "F. F. Bruce, The Epistle to the Galatians", quote = "Classic evangelical critical treatment."),
                    CommentaryEntry(rank = "WBC", person = "Richard Longenecker, Galatians", quote = "The most thorough critical-evangelical treatment; excellent on Jewish background.")
                )
            ),
            CommentarySection(
                heading = "Prison Epistles (Ephesians, Philippians, Colossians, Philemon)",
                entries = listOf(
                    CommentaryEntry(rank = "PNTC", person = "Peter O'Brien, The Letter to the Ephesians", quote = "The best treatment of Ephesians. O'Brien on armor of God (6:10–20) is outstanding."),
                    CommentaryEntry(rank = "SPECIAL", person = "Harold Hoehner, Ephesians: An Exegetical Commentary", quote = "The most exhaustive Greek treatment of Ephesians ever written."),
                    CommentaryEntry(rank = "NICNT", person = "Gordon Fee, Paul's Letter to the Philippians", quote = "Fee's work on the Christ-hymn (2:5–11) is essential."),
                    CommentaryEntry(rank = "WBC", person = "Peter O'Brien, Colossians, Philemon", quote = "Best treatment of Colossians; strong on Colossian hymn (1:15–20).")
                )
            ),
            CommentarySection(
                heading = "Pastoral Epistles (1–2 Timothy, Titus)",
                entries = listOf(
                    CommentaryEntry(rank = "WBC", person = "William Mounce, Pastoral Epistles", quote = "The definitive evangelical treatment. Comprehensive on Greek and authorship."),
                    CommentaryEntry(rank = "NIGTC", person = "George Knight III, The Pastoral Epistles", quote = "Rigorous Greek commentary.")
                )
            )
        )
    )

    val GENERAL_EPISTLES = CommentarySeries(
        id = "general-epistles-commentaries",
        title = "General Epistles Commentary Series",
        subtitle = "Critical-scholarly guides for Hebrews through Jude",
        icon = "📖",
        category = "New Testament",
        bookIds = (58..65).toList(),
        sections = listOf(
            CommentarySection(
                heading = "Hebrews: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "WBC", person = "William Lane, Hebrews 1–8 & 9–13", reference = "2 vols", quote = "The definitive evangelical-critical treatment of Hebrews. Essential.", note = "Lane's handling of Levitical typology, 4:12–13, and the Hall of Faith (ch. 11) is outstanding."),
                    CommentaryEntry(rank = "NIGTC", person = "Paul Ellingworth, The Epistle to the Hebrews", quote = "The most technically rigorous Greek treatment; indispensable for philological work."),
                    CommentaryEntry(rank = "NICNT", person = "F. F. Bruce, The Epistle to the Hebrews", quote = "Classic treatment; historically reliable and theologically rich.")
                )
            ),
            CommentarySection(
                heading = "James: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "PNTC", person = "Douglas Moo, The Letter of James", quote = "The best evangelical-critical treatment of James. Essential.", note = "Moo's handling of faith-and-works (2:14–26) in relation to Paul is balanced and rigorous."),
                    CommentaryEntry(rank = "NICNT", person = "Scot McKnight, The Letter of James", quote = "Rich socio-rhetorical and theological treatment.")
                )
            ),
            CommentarySection(
                heading = "1–2 Peter & Jude: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "BECNT", person = "Karen Jobes, 1 Peter", quote = "The single best treatment of 1 Peter. Essential.", note = "Jobes' exegesis of Diaspora theology and 'living hope' is outstanding."),
                    CommentaryEntry(rank = "WBC", person = "Richard Bauckham, Jude, 2 Peter", quote = "The definitive treatment of both letters; Bauckham on pseudepigraphy and Jewish apocalyptic is essential.")
                )
            ),
            CommentarySection(
                heading = "1–3 John: Core Commentaries",
                entries = listOf(
                    CommentaryEntry(rank = "NICNT", person = "I. Howard Marshall, The Epistles of John", quote = "Classic evangelical treatment; strong on the Johannine community context."),
                    CommentaryEntry(rank = "ANCHOR", person = "Raymond Brown, The Epistles of John", quote = "The major critical treatment; Brown on the secessionists is magisterial.")
                )
            )
        )
    )

    val REVELATION = CommentarySeries(
        id = "revelation-commentaries",
        title = "Revelation Commentary Series",
        subtitle = "Critical-scholarly guides for the Book of Revelation",
        icon = "👁️",
        category = "New Testament",
        bookIds = listOf(66),
        sections = listOf(
            CommentarySection(
                heading = "Revelation: Core Commentaries — Amillennial / Idealist",
                entries = listOf(
                    CommentaryEntry(rank = "NIGTC", person = "G. K. Beale, The Book of Revelation", quote = "The definitive amillennial-evangelical treatment. Essential.", note = "Beale's intertextual method — tracing Revelation's use of Daniel, Ezekiel, Isaiah, and Zechariah — is the most rigorous and theologically productive treatment of the book at any level."),
                    CommentaryEntry(rank = "INTERP", person = "Eugene Boring, Revelation", quote = "Solid idealist reading; accessible.")
                )
            ),
            CommentarySection(
                heading = "Revelation: Core Commentaries — Historic Premillennial",
                entries = listOf(
                    CommentaryEntry(rank = "NICNT", person = "Robert Mounce, The Book of Revelation", quote = "Best single-volume historic premillennial treatment. Essential.", note = "Mounce's discussion of the letters to the seven churches is outstanding."),
                    CommentaryEntry(rank = "BECNT", person = "Grant Osborne, Revelation", quote = "The most thorough evangelical treatment at any millennial position; engages all views.")
                )
            ),
            CommentarySection(
                heading = "Revelation: Core Commentaries — Critical-Scholarly",
                entries = listOf(
                    CommentaryEntry(rank = "WBC", person = "David Aune, Revelation 1–5, 6–16, 17–22", reference = "3 vols", quote = "The major critical treatment. Most thorough on Greco-Roman background.")
                )
            ),
            CommentarySection(
                heading = "Revelation: Specialized Supplements",
                entries = listOf(
                    CommentaryEntry(rank = "THEOL", person = "Richard Bauckham, The Theology of the Book of Revelation", quote = "The single best short theological treatment. Essential supplementary reading.", note = "Bauckham's work on the theology of Revelation is perhaps the most illuminating work on the book in 50 years.")
                ),
                note = "Suggested strategy: Start with Mounce for a reliable base, Beale for intertextual depth, and Bauckham's short theology alongside."
            )
        )
    )

    val ALL_SERIES: List<CommentarySeries> = listOf(
        PENTATEUCH,
        HISTORICAL,
        WISDOM,
        MAJOR_PROPHETS,
        MINOR_PROPHETS,
        GOSPELS,
        ACTS,
        PAULINE,
        GENERAL_EPISTLES,
        REVELATION
    )

    fun getSeriesForBook(bookId: Int): CommentarySeries? {
        return ALL_SERIES.firstOrNull { it.bookIds.contains(bookId) }
    }

    fun getSectionsForBook(bookId: Int, bookNameEn: String): List<CommentarySection> {
        val series = getSeriesForBook(bookId) ?: return emptyList()
        val normalizedBook = bookNameEn.trim().lowercase()

        val filtered = series.sections.filter { section ->
            val h = section.heading.lowercase()
            h.contains(normalizedBook) ||
            h.contains("whole") ||
            h.contains("introduction") ||
            h.contains("series worth tracking")
        }

        return if (filtered.isNotEmpty()) filtered else series.sections
    }
}
