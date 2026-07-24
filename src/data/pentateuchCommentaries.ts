export const PENTATEUCH_COMMENTARIES = {
  id: "pentateuch-commentaries",
  title: "Pentateuch/Torah Commentary Series",
  subtitle: "Critical-scholarly guides for Genesis through Deuteronomy",
  icon: "📜",
  type: "reference",
  category: "Reference",
  sections: [
    {
      heading: "Whole-Pentateuch / Introduction",
      entries: [
        { rank: "Intro", person: "Gordon Wenham, Exploring the Old Testament: The Pentateuch", quote: "Good bridge from lay to scholarly." },
        { rank: "Theology", person: "John Sailhamer, The Pentateuch as Narrative", quote: "Canonical-theological reading, complements your synthesis-oriented approach." }
      ]
    },
    {
      heading: "Genesis: Core Commentaries",
      description: "In order of depth/utility for your level.",
      entries: [
        { 
          rank: "WBC", 
          person: "Gordon Wenham, Genesis 1–15 & 16–50", 
          reference: "2 vols", 
          quote: "The essential critical-evangelical reference.", 
          note: "Wenham's structural analysis (chiasms, toledot formulas) and Hebrew philology are unmatched. His treatment of the primeval history (1–11) versus patriarchal narratives (12–50) as distinct literary units will sharpen how you read the seams." 
        },
        { 
          rank: "NAC", 
          person: "Kenneth Mathews, Genesis 1–11:26 & 11:27–50:26", 
          reference: "2 vols", 
          quote: "More accessible than Wenham, strong on syntax.", 
          note: "Good for sermon-prep cross-checking. Leans slightly more toward theological synthesis than pure critical apparatus." 
        },
        { 
          rank: "SINGLE", 
          person: "Bruce Waltke, Genesis: A Commentary", 
          quote: "Excellent at connecting exegesis to biblical theology.", 
          note: "Single volume, less technical, but excellent at connecting exegesis to biblical theology and narrative arc. Good fit given your interest in canonical-theological synthesis." 
        },
        { 
          rank: "NICOT", 
          person: "Victor Hamilton, Genesis 1–17 & 18–50", 
          reference: "2 vols", 
          quote: "Thorough philological work, evangelical-critical.", 
          note: "Comparable tier to Wenham but with more attention to ANE background material (Mesopotamian parallels, etc.)" 
        },
        { 
          rank: "CONT", 
          person: "Claus Westermann, Genesis", 
          reference: "3 vols", 
          quote: "The major non-evangelical critical treatment.", 
          note: "Source-critical (JEDP), form-critical method throughout. Worth having as a counterpoint even if you don't share his documentary-hypothesis assumptions — his tradition-history work on individual pericopes is rigorous." 
        }
      ]
    },
    {
      heading: "Genesis: Specialized Supplements",
      entries: [
        { 
          rank: "JEWISH", 
          person: "Umberto Cassuto, A Commentary on the Book of Genesis", 
          reference: "2 vols", 
          quote: "Jewish critical-literary scholarship.", 
          note: "Explicitly argues against source-critical fragmentation; useful methodological contrast to Westermann." 
        },
        { 
          rank: "EBC", 
          person: "John Sailhamer, Genesis (EBC rev. ed.)", 
          quote: "Canonical-narrative reading.", 
          note: "His canonical-narrative reading of Genesis as programmatic for the whole Pentateuch pairs well with your Johannine/canonical-arc interests." 
        }
      ],
      note: "Suggested reading strategy: Given how you've worked (Hebrew exegesis → sermon manuscript, e.g. Psalm 27), a good approach: Wenham or Hamilton for the primary exegetical pass, Waltke for theological synthesis, and Westermann as a critical foil to test your conclusions against."
    },
    {
      heading: "Exodus: Core Commentaries",
      entries: [
        { rank: "NAC", person: "Douglas Stuart, Exodus", quote: "Solid entry point for evangelical exegesis." },
        { rank: "JEWISH", person: "Umberto Cassuto, A Commentary on the Book of Exodus", quote: "Classic Jewish critical scholarship, valuable cross-tradition check." },
        { rank: "INTERP", person: "Terence Fretheim, Exodus", quote: "More theological/homiletical." }
      ]
    },
    {
      heading: "Leviticus: Core Commentaries",
      entries: [
        { rank: "NICOT", person: "Gordon Wenham, The Book of Leviticus", quote: "Clearest on sacrificial system logic." },
        { rank: "ANCHOR", person: "Jacob Milgrom, Leviticus 1–16, 17–22, 23–27", reference: "3 vols", quote: "The definitive critical-scholarly treatment, very deep on cultic/ritual detail." }
      ]
    },
    {
      heading: "Numbers: Core Commentaries",
      entries: [
        { rank: "TYNDALE", person: "Gordon Wenham, Numbers", quote: "Solid entry point." },
        { rank: "NICOT", person: "Timothy Ashley, The Book of Numbers", quote: "Better depth for exegesis." }
      ]
    },
    {
      heading: "Deuteronomy: Core Commentaries",
      entries: [
        { rank: "NICOT", person: "Peter Craigie, The Book of Deuteronomy", quote: "Strong evangelical critical baseline." },
        { rank: "NIVAC", person: "Daniel Block, Deuteronomy", quote: "Strong theological bridge to preaching." },
        { rank: "COMMENT", person: "Jack Lundbom, Deuteronomy: A Commentary", quote: "Rhetorical/structural analysis, useful complement to your existing work." }
      ]
    },
    {
      heading: "Series worth tracking across the whole Pentateuch",
      entries: [
        { rank: "NICOT", person: "New International Commentary on the Old Testament", quote: "Evangelical-critical, your Carson/Köstenberger tier." },
        { rank: "WBC", person: "Word Biblical Commentary", quote: "Heavier critical apparatus, Hebrew-forward." },
        { rank: "ANCHOR", person: "Anchor Bible / Anchor Yale", quote: "Most critical-scholarly of the bunch, less confessional." }
      ]
    }
  ]
};
