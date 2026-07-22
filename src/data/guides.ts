import { PREACHERS_GUIDE } from './preachers';

export const NT_STUDY_GUIDES = [
  PREACHERS_GUIDE,

  // 1. ROMAN ROAD
  {
    id: "roman-road",
    title: "The Roman Road to Salvation",
    subtitle: "A step-by-step memory path through the Gospel in Romans",
    icon: "✝️",
    type: "reference",
    category: "Memory Chains",
    keyVerses: [
      { ref: "Romans 3:23", text: "For all have sinned and fall short of the glory of God.", theme: "Universal Need" },
      { ref: "Romans 6:23", text: "For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord.", theme: "The Choice" },
      { ref: "Romans 5:8", text: "But God demonstrates His own love toward us, in that while we were still sinners, Christ died for us.", theme: "Divine Grace" },
      { ref: "Romans 10:9", text: "If you confess with your mouth the Lord Jesus and believe in your heart that God has raised Him from the dead, you will be saved.", theme: "Response of Faith" },
      { ref: "Romans 5:1", text: "Therefore, having been justified by faith, we have peace with God through our Lord Jesus Christ.", theme: "Assurance" }
    ],
    memorySentence: "All have **SINNED** and earned **DEATH**, but God's **LOVE** sent Christ so that by **FAITH** we have eternal **PEACE**.",
    sections: [
      {
        heading: "1. Historical & Theological Overview",
        description: "The 'Roman Road' is a classic evangelistic memory chain compiled from the Apostle Paul's Epistle to the Romans (AD 57). It traces humanity's journey from helpless condemnation under sin to glorious justification, peace, and eternal life through Jesus Christ.",
        note: "Memorizing these 7 core verses enables you to clearly explain the Gospel to anyone at a moment's notice."
      },
      {
        heading: "2. The 5-Step Gospel Pathway Matrix",
        table: {
          headers: ["Step & Theme", "Scripture Reference", "Core Truth & Meaning", "Memory Anchor"],
          rows: [
            ["Step 1: Problem of Sin", "Romans 3:23 & 3:10", "All human beings are guilty of breaking God's holy law.", "ALL HAVE SINNED"],
            ["Step 2: Sin's Penalty & Gift", "Romans 6:23", "Sin pays a mandatory wage: spiritual death. God offers eternal life.", "WAGES vs. GIFT"],
            ["Step 3: Love Demonstrated", "Romans 5:8", "Christ died for us while we were active rebels against Him.", "WHILE STILL SINNERS"],
            ["Step 4: Response of Faith", "Romans 10:9 & 10:13", "Salvation is received by confessing Jesus as Lord and believing.", "CONFESS & BELIEVE"],
            ["Step 5: Peace & Assurance", "Romans 5:1 & 8:1", "Justification brings immediate, permanent peace with God.", "NO CONDEMNATION"]
          ]
        }
      },
      {
        heading: "3. Detailed Verse Breakdown & Commentary",
        entries: [
          { rank: "Step 1", person: "Romans 3:23", reference: "Romans 3:23", quote: "for all have sinned and fall short of the glory of God,", note: "Greek 'hamartano' means to miss the mark. The 'glory of God' is the divine standard of perfect holiness." },
          { rank: "Step 2", person: "Romans 6:23", reference: "Romans 6:23", quote: "For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord.", note: "'Wages' (opsonion) = earned pay. 'Gift' (charisma) = unmerited favor." },
          { rank: "Step 3", person: "Romans 5:8", reference: "Romans 5:8", quote: "But God demonstrates His own love toward us, in that while we were still sinners, Christ died for us.", note: "Divine agape love targets the unworthy while hostile." },
          { rank: "Step 4", person: "Romans 10:9", reference: "Romans 10:9", quote: "that if you confess with your mouth the Lord Jesus and believe in your heart...", note: "Confession of Jesus as YHWH combined with heart-faith in His resurrection." },
          { rank: "Step 5", person: "Romans 8:1", reference: "Romans 8:1", quote: "There is therefore now no condemnation to those who are in Christ Jesus,", note: "No judicial verdict of guilty remains for those in Christ." }
        ]
      }
    ]
  },

  // 2. INDUCTIVE BIBLE STUDY METHOD
  {
    id: "inductive-study",
    title: "Inductive Bible Study Method",
    subtitle: "Observation, Interpretation, Application (OIA Framework)",
    icon: "🔬",
    type: "reference",
    category: "Methodology",
    keyVerses: [
      { ref: "2 Timothy 2:15", text: "Be diligent to present yourself approved to God, a worker who does not need to be ashamed, rightly dividing the word of truth.", theme: "Exegesis" },
      { ref: "Psalm 119:18", text: "Open my eyes, that I may see wondrous things from Your law.", theme: "Illumination" }
    ],
    memorySentence: "First **OBSERVE** what the text says, then **INTERPRET** what it meant, so you can **APPLY** how to live it.",
    sections: [
      {
        heading: "1. The Inductive Philosophy",
        description: "Inductive study approaches Scripture as an open investigator, letting the text speak for itself through Observation, Interpretation, and Application without forcing outside biases.",
        note: "Never ask 'What does this verse mean to me?' until you first answer 'What did this verse mean to its original author and audience?'"
      },
      {
        heading: "2. Phase 1: Observation — What Does the Text Say?",
        table: {
          headers: ["Observation Focus", "What to Search For", "Key Questions to Ask", "Example Markings"],
          rows: [
            ["The 5 W's & H", "Who, What, Where, When, Why, How", "Who is speaker? Who is audience? Where are they?", "Underline names"],
            ["Repeated Keywords", "Nouns, verbs, themes appearing 3+ times", "What central subject keeps recurring?", "Yellow highlight"],
            ["Contrast Words", "'But', 'However', 'Instead', 'Not... but'", "What opposing concepts or fates are contrasted?", "Red circle"],
            ["Connecting Words", "'Therefore', 'Because', 'In order that'", "What is the logical cause-and-effect relationship?", "Green arrow"]
          ]
        }
      },
      {
        heading: "3. Phase 3: Application — The S.P.A.C.E.S. Checklist",
        table: {
          headers: ["Letter", "Checklist Category", "Reflection Prompt"],
          rows: [
            ["S", "Sin to confess", "Is there a sin exposed that I need to repent of today?"],
            ["P", "Promise to claim", "Is there a divine promise to anchor my faith in?"],
            ["A", "Attitude to change", "Is there a worldly mindset I must align with Christ?"],
            ["C", "Command to obey", "What explicit action or command is God calling me to carry out?"],
            ["E", "Example to follow", "Whose faith, humility, or courage should I model?"],
            ["S", "Prayer of Praise", "What aspect of God's character prompts worship?"]
          ]
        }
      }
    ]
  },

  // 3. GENESIS
  {
    id: "guide-genesis",
    title: "Genesis: Beginnings & Covenants",
    subtitle: "Creation, Fall, Patriarchs, & Covenant Promises",
    icon: "🌱",
    type: "reference",
    category: "Book Studies",
    keyVerses: [
      { ref: "Genesis 1:1", text: "In the beginning God created the heavens and the earth.", theme: "Creation" },
      { ref: "Genesis 3:15", text: "And I will put enmity between you and the woman, and between your seed and her Seed; He shall bruise your head, and you shall bruise His heel.", theme: "Protoevangelium" },
      { ref: "Genesis 50:20", text: "You meant evil against me; but God meant it for good...", theme: "Providence" }
    ],
    memorySentence: "God **CREATED** all things, man **FELL** into sin, but God made **COVENANTS** with Abraham and guided **JOSEPH**.",
    sections: [
      {
        heading: "1. Overview & Structure",
        description: "Genesis ('Origins') lays the foundation for all biblical theology. It splits into Primeval History (Ch 1-11: Creation, Fall, Flood, Babel) and Patriarchal History (Ch 12-50: Abraham, Isaac, Jacob, Joseph).",
        note: "Genesis explains why humanity needs a Savior and how God initiated His covenant plan."
      },
      {
        heading: "2. The 4 Major Covenants in Genesis",
        table: {
          headers: ["Covenant", "Scripture Anchor", "God's Promise", "Sign / Seal"],
          rows: [
            ["Edenic / Adamic", "Genesis 1:28, 2:16-17", "Dominion over creation; warning against tree of knowledge.", "Tree of Life"],
            ["Protoevangelium", "Genesis 3:15", "First Gospel promise: Seed of woman crushes serpent.", "Skins of sacrifice"],
            ["Noahic Covenant", "Genesis 8:21-9:17", "Unconditional promise never again to destroy earth by flood.", "Rainbow"],
            ["Abrahamic Covenant", "Genesis 12:1-3, 15:6", "Unconditional promise of Land, Seed, and Blessing to nations.", "Circumcision"]
          ]
        }
      }
    ]
  },

  // 4. GOSPEL OF JOHN
  {
    id: "guide-john-gospel",
    title: "Gospel of John: 7 Signs & 7 I AMs",
    subtitle: "High Christology & belief unto eternal life",
    icon: "🦅",
    type: "reference",
    category: "Book Studies",
    keyVerses: [
      { ref: "John 1:1, 14", text: "In the beginning was the Word... And the Word became flesh and dwelt among us.", theme: "Incarnation" },
      { ref: "John 14:6", text: "I am the way, the truth, and the life. No one comes to the Father except through Me.", theme: "Exclusive Savior" }
    ],
    memorySentence: "John records **7 SIGNS** and **7 I AM** declarations so that you may **BELIEVE** and have **LIFE**.",
    sections: [
      {
        heading: "1. Purpose & High Christology",
        description: "Written c. AD 85–90 by the Apostle John, it presents Jesus as the pre-existent Eternal Logos who became flesh, structured around 7 miraculous signs and 7 'I AM' disclosures.",
        note: "John exclusively uses 'sign' (semeion) because these events point beyond themselves to Jesus' identity."
      },
      {
        heading: "2. The 7 Miraculous Signs",
        table: {
          headers: ["Sign #", "Miracle Event", "Scripture", "Theological Reveal"],
          rows: [
            ["Sign 1", "Water to Wine at Cana", "John 2:1-11", "Surpasses Jewish ritual purification; Messianic wedding feast."],
            ["Sign 2", "Healing Royal Official's Son", "John 4:46-54", "Power over distance; faith in spoken Word."],
            ["Sign 3", "Healing Bethesda Paralytic", "John 5:1-15", "Authority over Sabbath; equal authority with Father."],
            ["Sign 4", "Feeding 5,000", "John 6:1-14", "True Manna from Heaven satisfying spiritual hunger."],
            ["Sign 5", "Walking on Sea", "John 6:16-21", "Divine Egō Eimi over creation chaos."],
            ["Sign 6", "Healing Blind Man", "John 9:1-7", "Light of the World granting spiritual illumination."],
            ["Sign 7", "Raising Lazarus", "John 11:1-44", "Ultimate power over physical death."]
          ]
        }
      },
      {
        heading: "3. The 7 'I AM' Declarations",
        table: {
          headers: ["#", "'I AM' Statement", "Scripture", "Meaning"],
          rows: [
            ["1", "I am the Bread of Life", "John 6:35", "Ultimate spiritual sustenance."],
            ["2", "I am the Light of the World", "John 8:12", "Dispels moral and spiritual darkness."],
            ["3", "I am the Door of the Sheep", "John 10:7", "Exclusive entrance into God's fold."],
            ["4", "I am the Good Shepherd", "John 10:11", "Lays down His life for His sheep."],
            ["5", "I am the Resurrection & Life", "John 11:25", "Victory over the grave."],
            ["6", "I am the Way, Truth, Life", "John 14:6", "Exclusive path to the Father."],
            ["7", "I am the True Vine", "John 15:1", "True Israel; believers abide in Him."]
          ]
        }
      }
    ]
  },

  // 5. ROMANS
  {
    id: "guide-romans",
    title: "Romans: Gospel Foundations",
    subtitle: "Systematic Paul's magnum opus on Salvation",
    icon: "🏛️",
    type: "reference",
    category: "Book Studies",
    keyVerses: [
      { ref: "Romans 1:16", text: "For I am not ashamed of the gospel of Christ...", theme: "Gospel Power" },
      { ref: "Romans 3:24", text: "being justified freely by His grace...", theme: "Justification" },
      { ref: "Romans 8:28", text: "And we know that all things work together for good...", theme: "Sovereign Good" }
    ],
    memorySentence: "Romans proves all under **CONDEMNATION**, granted **JUSTIFICATION** by faith, walking in **SANCTIFICATION**, secure in **ELECTION**, living in **APPLICATION**.",
    sections: [
      {
        heading: "1. Outline & Structure",
        description: "Paul presents the most thorough systematic exposition of the Gospel in Scripture.",
        note: "5 Movements: Condemnation (1-3), Justification (3-5), Sanctification (6-8), Election (9-11), Duty (12-16)."
      },
      {
        heading: "2. The 5 Movements",
        table: {
          headers: ["Movement", "Chapters", "Core Message", "Key Anchor Verse"],
          rows: [
            ["Condemnation", "1:18 - 3:20", "Pagan, Moralist, and Jew alike under sin.", "Rom 3:23"],
            ["Justification", "3:21 - 5:21", "Declared righteous by grace through faith.", "Rom 5:1"],
            ["Sanctification", "6:1 - 8:39", "Dead to sin, walking in Spirit victory.", "Rom 8:1"],
            ["Election", "9:1 - 11:36", "Covenant faithfulness to Israel & Gentiles.", "Rom 10:9"],
            ["Duty", "12:1 - 16:27", "Living sacrifices, mind renewal, love.", "Rom 12:1-2"]
          ]
        }
      }
    ]
  },

  // 6. REVELATION
  {
    id: "guide-revelation",
    title: "Revelation: Imagery & 7 Churches",
    subtitle: "Eschatological hope & Christ's final victory",
    icon: "🎺",
    type: "reference",
    category: "Book Studies",
    keyVerses: [
      { ref: "Revelation 1:3", text: "Blessed is he who reads and those who hear the words of this prophecy...", theme: "Blessing" },
      { ref: "Revelation 21:4", text: "And God will wipe away every tear from their eyes; there shall be no more death...", theme: "New Creation" }
    ],
    memorySentence: "Revelation unveils Christ as the **VICTORIOUS KING** over 7 churches, seals, trumpets, bowls, and establishing the **NEW JERUSALEM**.",
    sections: [
      {
        heading: "1. Apocalyptic Hope",
        description: "Revelation is an unveiling of Jesus Christ as the exalted King who makes all things new.",
        table: {
          headers: ["Section", "Reference", "Vision & Symbolism", "Believer's Hope"],
          rows: [
            ["7 Letters to Churches", "Rev 2-3", "Exhortation to Ephesus, Smyrna, Pergamum, etc.", "Overcoming through endurance"],
            ["Heavenly Throne Room", "Rev 4-5", "Lion of Judah who is Slain Lamb holding scroll", "Christ alone is worthy"],
            ["Judgments Unsealed", "Rev 6-16", "7 Seals, 7 Trumpets, 7 Bowls of wrath", "God's justice vindicates martyrs"],
            ["New Creation", "Rev 20-22", "New Heavens, New Earth, New Jerusalem", "No more tears, pain, or curse"]
          ]
        }
      }
    ]
  },

  // 7. JAMES
  {
    id: "guide-james",
    title: "James: Faith in Action",
    subtitle: "Practical wisdom & authentic Christian living",
    icon: "💎",
    type: "reference",
    category: "Book Studies",
    keyVerses: [
      { ref: "James 1:22", text: "But be doers of the word, and not hearers only, deceiving yourselves.", theme: "Doers of Word" },
      { ref: "James 2:17", text: "Thus also faith by itself, if it does not have works, is dead.", theme: "Active Faith" }
    ],
    memorySentence: "James tests authentic faith through **TRIALS**, obedience to the **WORD**, rejecting **PARTIALITY**, showing **WORKS**, and bridling the **TONGUE**.",
    sections: [
      {
        heading: "1. 5 Tests of Authentic Faith",
        table: {
          headers: ["Test", "Reference", "Core Exhortation", "Practical Application"],
          rows: [
            ["Test of Trials", "James 1:2-12", "Count trials as joy; let patience finish its work", "Ask God for wisdom"],
            ["Test of Word", "James 1:22-27", "Be doers of Word, not hearers only", "Care for orphans/widows; bridle tongue"],
            ["Test of Partiality", "James 2:1-13", "Do not show favoritism to wealthy", "Fulfill royal law of love"],
            ["Test of Works", "James 2:14-26", "Faith without works is dead", "Faith demonstrated by action"],
            ["Test of Speech", "James 3:1-12", "Tongue is small fire defiling whole body", "Seek wisdom from above"]
          ]
        }
      }
    ]
  },

  // 8. OVERCOMING ANXIETY
  {
    id: "guide-anxiety-peace",
    title: "Overcoming Anxiety & Finding Peace",
    subtitle: "Biblical emotional reframing in Philippians & Psalms",
    icon: "🕊️",
    type: "reference",
    category: "Topical Studies",
    keyVerses: [
      { ref: "Philippians 4:6-7", text: "Be anxious for nothing, but in everything by prayer... peace of God will guard your hearts.", theme: "Peace That Guards" },
      { ref: "Psalm 46:10", text: "Be still, and know that I am God.", theme: "Refuge & Stillness" }
    ],
    memorySentence: "Be **ANXIOUS FOR NOTHING**, turn worry to **PRAYER**, guard your **MIND**, and be **STILL**.",
    sections: [
      {
        heading: "1. 4-Step Prescription for Peace (Phil 4:4-9)",
        table: {
          headers: ["Step", "Scripture", "Mindset Shift", "Actionable Daily Habit"],
          rows: [
            ["Rejoice & Release", "Phil 4:4-5", "Shift attention to God's presence", "Daily gratitude & gentleness"],
            ["Worry to Prayer", "Phil 4:6", "Trade anxious thoughts for specific prayer", "Write down worries & pray"],
            ["Guard Your Mind", "Phil 4:8", "Dwell on true, honorable, pure things", "Filter media; memorize scripture"],
            ["Practice Obedience", "Phil 4:9", "Put into practice what you learned", "Take concrete step of faith"]
          ]
        }
      }
    ]
  },

  // 9. SPIRITUAL WARFARE
  {
    id: "guide-spiritual-warfare",
    title: "Spiritual Warfare & Standing Firm",
    subtitle: "Ephesians 6 & 1 Peter strategic spiritual defence",
    icon: "🗡️",
    type: "reference",
    category: "Topical Studies",
    keyVerses: [
      { ref: "Ephesians 6:11", text: "Put on the whole armor of God, that you may be able to stand...", theme: "Whole Armor" }
    ],
    memorySentence: "Put on the **ARMOR OF GOD**, stand firm in **TRUTH**, extinguish fiery **DARTS**, wield the **SWORD OF THE SPIRIT**.",
    sections: [
      {
        heading: "1. Armor of God Breakdown",
        table: {
          headers: ["Armor Piece", "Greek Term", "Spiritual Defense Reality"],
          rows: [
            ["Belt of Truth", "Alētheia", "Objective biblical truth protecting from lies."],
            ["Breastplate of Righteousness", "Dikaiosynē", "Imputed righteousness guarding heart from guilt."],
            ["Shoes of Gospel Peace", "Hetoimasia", "Firm footing to proclaim Gospel peace."],
            ["Shield of Faith", "Thyreos", "Active trust extinguishing fiery darts of doubt."],
            ["Helmet of Salvation", "Perikephalaia", "Assurance of salvation guarding mind from despair."],
            ["Sword of the Spirit", "Machaira", "Spoken Word of God (Rhēma) used offensively."]
          ]
        }
      }
    ]
  },

  // 10. SUFFERING & SOVEREIGNTY
  {
    id: "guide-suffering-sovereignty",
    title: "Suffering, Trial & God's Sovereignty",
    subtitle: "Job, 2 Corinthians 1, & Romans 8 comfort",
    icon: "🔥",
    type: "reference",
    category: "Topical Studies",
    keyVerses: [
      { ref: "Romans 8:28", text: "And we know that all things work together for good to those who love God...", theme: "Sovereign Good" }
    ],
    memorySentence: "God is **SOVEREIGN** over pain; He **COMFORTS** us in trials so our valleys yield eternal **GLORY**.",
    sections: [
      {
        heading: "1. 3 Lenses on Suffering",
        table: {
          headers: ["Book", "Key Revelation", "Anchor Verse", "Comfort Principle"],
          rows: [
            ["Job", "God's sovereignty transcends human understanding", "Job 42:2", "Trust God's character when you cannot trace His hand."],
            ["2 Corinthians 1", "Comfort received in trial equips you to comfort others", "2 Cor 1:3-4", "Your pain becomes your ministry to others."],
            ["Romans 8", "Present suffering cannot compare to future glory", "Rom 8:28", "God weaves all suffering into ultimate good."]
          ]
        }
      }
    ]
  },

  // 11. WISDOM FOR DAILY LIVING
  {
    id: "guide-wisdom-living",
    title: "Wisdom for Daily Living & Relationships",
    subtitle: "Proverbs & James practical life manual",
    icon: "🦉",
    type: "reference",
    category: "Topical Studies",
    keyVerses: [
      { ref: "Proverbs 3:5-6", text: "Trust in the LORD with all your heart, and lean not on your own understanding...", theme: "Trust YHWH" }
    ],
    memorySentence: "Live skillfully by trusting **GOD**, guarding your **SPEECH**, honoring Him with **FINANCES**, and walking with **WISE** friends.",
    sections: [
      {
        heading: "1. Life Domains in Proverbs",
        table: {
          headers: ["Domain", "Proverbs Ref", "Wisdom Instruction", "Foolish Alternative"],
          rows: [
            ["Speech", "Prov 15:1", "Soft answer turns away wrath; life & death in tongue", "Harsh words stir anger."],
            ["Trust", "Prov 3:5-6", "Trust in LORD with all heart; lean not on own understanding", "Self-sufficiency leads to ruin."],
            ["Finances", "Prov 3:9-10", "Honor LORD with wealth; generous giving", "Greed leads to poverty."],
            ["Friendships", "Prov 27:17", "Iron sharpens iron; walk with wise", "Companion of fools suffers harm."]
          ]
        }
      }
    ]
  },

  // 12. PRAYER & INTERCESSION
  {
    id: "guide-prayer-intercession",
    title: "Prayer & Intercession",
    subtitle: "The Lord's Prayer & Psalms of Ascent (120-134)",
    icon: "🙏",
    type: "reference",
    category: "Topical Studies",
    keyVerses: [
      { ref: "Matthew 6:9-13", text: "Our Father in heaven, hallowed be Your name...", theme: "Model Prayer" }
    ],
    memorySentence: "Pray with **ADORATION**, submit to God's **WILL**, ask for daily **BREAD**, receive **FORGIVENESS**, and seek **PROTECTION**.",
    sections: [
      {
        heading: "1. Lord's Prayer Matrix",
        table: {
          headers: ["Petition", "Focus Area", "Spiritual Alignment"],
          rows: [
            ["Hallowed be Your name", "Adoration", "Recognizing God's holiness & Fatherhood"],
            ["Your kingdom come", "Submission", "Surrendering personal agendas"],
            ["Give us daily bread", "Dependence", "Trusting God for physical/spiritual provision"],
            ["Forgive us our debts", "Confession", "Receiving grace & forgiving others"],
            ["Deliver us from evil", "Protection", "Seeking divine defense against spiritual traps"]
          ]
        }
      }
    ]
  },

  // 13. GOSPEL HARMONY
  {
    id: "guide-gospel-harmony",
    title: "Harmony of the Four Gospels Timeline",
    subtitle: "Chronological Life of Christ (Matt, Mark, Luke, John)",
    icon: "📜",
    type: "reference",
    category: "Historical Timelines",
    keyVerses: [
      { ref: "Galatians 4:4", text: "But when the fullness of the time had come, God sent forth His Son,", theme: "Fullness of Time" }
    ],
    memorySentence: "Christ's life moved from **PREPARATION** in Bethlehem, to **GALILEAN** ministry, to **PASSION WEEK** and **RESURRECTION**.",
    sections: [
      {
        heading: "1. 6 Phases of Christ's Ministry",
        table: {
          headers: ["Phase", "Period", "Key Events", "Location"],
          rows: [
            ["1. Preparation", "4 BC - AD 26", "Birth, Baptism, Wilderness Temptation", "Bethlehem, Nazareth, Jordan"],
            ["2. Early Judean", "AD 26 - 27", "Water to Wine, Cleansing Temple, Nicodemus", "Jerusalem, Samaria"],
            ["3. Galilean Ministry", "AD 27 - 29", "Sermon on Mount, Calling 12, Feeding 5,000", "Galilee, Capernaum"],
            ["4. Special Training", "AD 29", "Peter's Confession, Transfiguration", "Caesarea Philippi"],
            ["5. Judean/Peraean", "AD 29 - 30", "Raising Lazarus, Good Samaritan, Zacchaeus", "Judea, Jericho"],
            ["6. Passion & Victory", "AD 30", "Triumphal Entry, Upper Room, Cross, Resurrection", "Jerusalem, Tomb"]
          ]
        }
      }
    ]
  },

  // 14. KINGS & PROPHETS
  {
    id: "guide-kings-prophets",
    title: "Kings & Prophets Chronology Map",
    subtitle: "Divided Kingdom (Israel & Judah) & Prophetic Alignment",
    icon: "MAP",
    type: "reference",
    category: "Historical Timelines",
    keyVerses: [
      { ref: "1 Kings 11:31", text: "Behold, I will tear the kingdom out of the hand of Solomon and will give ten tribes to you...", theme: "Divided Kingdom" }
    ],
    memorySentence: "Solomon's kingdom split into **ISRAEL** (North - exiled to Assyria 722 BC) and **JUDAH** (South - exiled to Babylon 586 BC).",
    sections: [
      {
        heading: "1. Divided Kingdom Matrix",
        table: {
          headers: ["Kingdom", "Capital", "Key Kings", "Ministering Prophets", "Fate"],
          rows: [
            ["Israel (North - 10 tribes)", "Samaria", "Jeroboam I, Ahab, Jehu", "Elijah, Elisha, Amos, Hosea", "Conquered by Assyria (722 BC)"],
            ["Judah (South - 2 tribes)", "Jerusalem", "Rehoboam, Asa, Hezekiah, Josiah", "Isaiah, Jeremiah, Micah, Habakkuk", "Exiled to Babylon (586 BC)"],
            ["Exilic & Post-Exilic", "Babylon/Jerusalem", "Zerubbabel, Nehemiah", "Daniel, Ezekiel, Haggai, Malachi", "Temple Rebuilt (516 BC)"]
          ]
        }
      }
    ]
  },

  // 15. PAUL'S JOURNEYS
  {
    id: "guide-pauls-journeys",
    title: "Paul's Missionary Journeys & Epistles Map",
    subtitle: "Acts 13-28 timeline matching Paul's letters to locations",
    icon: "⛵",
    type: "reference",
    category: "Historical Timelines",
    keyVerses: [
      { ref: "Acts 1:8", text: "you shall be witnesses to Me in Jerusalem, and in all Judea and Samaria, and to the end of the earth.", theme: "Acts Mandate" }
    ],
    memorySentence: "Paul completed **3 MISSIONARY JOURNEYS** across Galatia, Greece, and Asia, writing **13 EPISTLES** ending in Roman imprisonment.",
    sections: [
      {
        heading: "1. Journeys & Letter Timeline",
        table: {
          headers: ["Phase", "Acts Ref", "Cities Visited", "Epistles Written"],
          rows: [
            ["1st Journey", "Acts 13-14", "Cyprus, Pisidian Antioch, Iconium, Lystra", "Galatians (c. AD 48)"],
            ["2nd Journey", "Acts 15:36-18:22", "Philippi, Thessalonica, Berea, Athens, Corinth", "1 & 2 Thessalonians (c. AD 51)"],
            ["3rd Journey", "Acts 18:23-21:17", "Ephesus (3 yrs), Macedonia, Corinth", "1 & 2 Corinthians, Romans (c. AD 57)"],
            ["1st Roman Imprisonment", "Acts 28:16-31", "Rome (house arrest)", "Ephesians, Philippians, Colossians, Philemon"],
            ["Final Travel & Dungeon", "Post-Acts", "Crete, Nicopolis, Rome", "1 & 2 Timothy, Titus (c. AD 64-67)"]
          ]
        }
      }
    ]
  },

  // 16. TABERNACLE SYMBOLISM
  {
    id: "guide-tabernacle-symbolism",
    title: "The Tabernacle & Temple Architecture Symbolism",
    subtitle: "Exodus 25-40 & Hebrews fulfillment matrix",
    icon: "⛺",
    type: "reference",
    category: "Historical Timelines",
    keyVerses: [
      { ref: "Hebrews 9:11-12", text: "But Christ came as High Priest... with His own blood He entered the Most Holy Place once for all...", theme: "Christ Fulfillment" }
    ],
    memorySentence: "The **TABERNACLE** furniture—Altar, Laver, Lampstand, Showbread, Incense, and Mercy Seat—was an earthly shadow fulfilled in **CHRIST**.",
    sections: [
      {
        heading: "1. Tabernacle Furniture Matrix",
        table: {
          headers: ["Location", "Item", "OT Function", "NT Christ Fulfillment"],
          rows: [
            ["Outer Court", "Brazen Altar", "Animal blood sacrifice for sin", "Christ's supreme sacrifice on Cross (Heb 9:12)"],
            ["Outer Court", "Bronze Laver", "Priestly cleansing", "Washing of regeneration & Word (Eph 5:26)"],
            ["Holy Place", "Golden Lampstand", "Continuous light in tent", "Jesus: 'I am Light of World' (John 8:12)"],
            ["Holy Place", "Showbread Table", "12 loaves before God", "Jesus: 'I am Bread of Life' (John 6:35)"],
            ["Holy Place", "Incense Altar", "Fragrant rising prayers", "Christ's perpetual intercession (Heb 7:25)"],
            ["Holy of Holies", "Ark & Mercy Seat", "Throne where blood sprinkled", "Jesus is our Mercy Seat/Propitiation (Rom 3:25)"]
          ]
        }
      }
    ]
  },

  // 17. H.E.A.R. METHOD
  {
    id: "hear-method",
    title: "The H.E.A.R. Journaling Method",
    subtitle: "Highlight, Explain, Apply, Respond (Robby Gallaty)",
    icon: "✍️",
    type: "reference",
    category: "Methodology",
    keyVerses: [
      { ref: "James 1:22", text: "Be doers of the word, and not hearers only...", theme: "Doers" }
    ],
    memorySentence: "**HIGHLIGHT** the verse, **EXPLAIN** its context, **APPLY** to your life, and **RESPOND** in prayer.",
    sections: [
      {
        heading: "1. The 4 Steps",
        table: {
          headers: ["Step", "Focus", "Action Required", "Guiding Question"],
          rows: [
            ["H — Highlight", "Scripture Selection", "Write down verse & title.", "Which verse stood out to you?"],
            ["E — Explain", "Context & Meaning", "Explain what text meant to original readers.", "Why was this written?"],
            ["A — Apply", "Personal Relevance", "Connect truth to daily life.", "How does this challenge me today?"],
            ["R — Respond", "Action & Prayer", "Write a specific prayer or action step.", "What will I do differently today?"]
          ]
        }
      }
    ]
  },

  // 18. JEN WILKIN 5 PS
  {
    id: "jen-wilkin-5ps",
    title: "Jen Wilkin’s 5 Ps of Bible Study",
    subtitle: "Purpose, Perspective, Patience, Process, Prayer",
    icon: "📚",
    type: "reference",
    category: "Methodology",
    keyVerses: [
      { ref: "Romans 12:2", text: "Be transformed by the renewing of your mind...", theme: "Renewed Mind" }
    ],
    memorySentence: "Study with **PURPOSE**, historical **PERSPECTIVE**, **PATIENCE**, inductive **PROCESS**, and humble **PRAYER**.",
    sections: [
      {
        heading: "1. The 5 Ps Breakdown",
        table: {
          headers: ["P Principle", "Core Concept", "Practical Execution"],
          rows: [
            ["1. Purpose", "Grand Narrative", "Keep big story of redemption in view (Creation, Fall, Redemption)."],
            ["2. Perspective", "Historical Context", "Who wrote it? Who received it? What era?"],
            ["3. Patience", "Long-term Commitment", "Stay in a single book over weeks rather than skipping."],
            ["4. Process", "Inductive Method", "Follow Observation -> Interpretation -> Application."],
            ["5. Prayer", "Spiritual Dependence", "Ask Holy Spirit for illumination and obedience."]
          ]
        }
      }
    ]
  },

  // 19. PRISCILLA SHIRER LISTENING
  {
    id: "priscilla-listening",
    title: "Priscilla Shirer's Listening Framework",
    subtitle: "Discerning God's Voice through Scripture",
    icon: "👂",
    type: "reference",
    category: "Methodology",
    keyVerses: [
      { ref: "1 Samuel 3:10", text: "Speak, LORD, for Your servant hears.", theme: "Listening Heart" }
    ],
    memorySentence: "Listen to God in **STILLNESS**, examine impressions against His **CHARACTER**, **SURRENDER** your will, and act in **OBEDIENCE**.",
    sections: [
      {
        heading: "1. 4 Listening Pillars",
        table: {
          headers: ["Pillar", "Description", "Heart Posture"],
          rows: [
            ["Position of Stillness", "Create quiet space free from distraction.", "Speak, Lord, your servant listens."],
            ["Examination of Character", "Compare impressions against God's Word.", "God's voice never contradicts His Word."],
            ["Surrender of Will", "Commit to obey before hearing instruction.", "Yieldedness precedes divine guidance."],
            ["Proactive Obedience", "Take immediate action on light received.", "Faithful in small promptings leads to clarity."]
          ]
        }
      }
    ]
  },

  // 20. MANUSCRIPT STUDY
  {
    id: "manuscript-study",
    title: "The Manuscript Bible Study Method",
    subtitle: "InterVarsity raw text inductive discovery",
    icon: "📄",
    type: "reference",
    category: "Methodology",
    keyVerses: [
      { ref: "Acts 17:11", text: "These were more fair-minded than those in Thessalonica, in that they received the word with all readiness, and searched the Scriptures daily...", theme: "Berea Search" }
    ],
    memorySentence: "Strip away chapter breaks and verse numbers to color-code **PEOPLE**, **KEYWORDS**, **CONTRASTS**, and **CONNECTORS**.",
    sections: [
      {
        heading: "1. Color-Coding System",
        table: {
          headers: ["Element", "Color / Mark", "Example Focus"],
          rows: [
            ["People & Pronouns", "Blue Highlight", "Tracking who is speaking and addressed."],
            ["Key Repeated Words", "Yellow Highlight", "Identifying central theological themes."],
            ["Contrasts & Comparisons", "Red Underline", "'Light vs Darkness', 'Flesh vs Spirit'."],
            ["Logical Connectors", "Green Circle & Arrow", "'Therefore', 'Because', 'So then'."],
            ["Commands & Verbs", "Orange Box", "Specific instructions given to believers."]
          ]
        }
      }
    ]
  },

  // 21. EXEGESIS CHECKLIST
  {
    id: "exegesis-checklist",
    title: "Historical-Grammatical Exegesis Checklist",
    subtitle: "Objective rules for contextual interpretation",
    icon: "🔍",
    type: "reference",
    category: "Methodology",
    keyVerses: [
      { ref: "2 Timothy 2:15", text: "rightly dividing the word of truth.", theme: "Rightly Divide" }
    ],
    memorySentence: "Exegesis draws OUT original meaning through **GENRE**, **HISTORICAL SETTING**, **IMMEDIATE CONTEXT**, and **CANONICAL HARMONY**.",
    sections: [
      {
        heading: "1. Exegesis Guardrail Checklist",
        table: {
          headers: ["Checklist Layer", "Key Test", "Pitfall to Avoid"],
          rows: [
            ["1. Genre Check", "Is this Narrative, Poetry, Prophetic, or Epistolary?", "Literalizing poetic metaphors."],
            ["2. Historical Setting", "What political/cultural factors were at play?", "Reading 21st-century concepts into ancient text."],
            ["3. Immediate Context", "What comes immediately before and after?", "Proof-texting a single verse isolated from paragraph."],
            ["4. Canonical Context", "How does this harmonize with all Scripture?", "Formulating doctrine on an isolated passage."]
          ]
        }
      }
    ]
  },

  // 22. ROOT WORD MAPPING
  {
    id: "root-word-mapping",
    title: "Strong's Root-Word & Etymology Mapping",
    subtitle: "Hebrew & Greek original language research",
    icon: "🔤",
    type: "reference",
    category: "Word Studies",
    keyVerses: [
      { ref: "Nehemiah 8:8", text: "So they read distinctly from the book in the Law of God; and they gave the sense, and helped them to understand the reading.", theme: "Give the Sense" }
    ],
    memorySentence: "Map English terms back to Hebrew & Greek roots to distinguish **AGAPE vs PHILEO**, **LOGOS vs RHEMA**, and **DUNAMIS vs EXOUSIA**.",
    sections: [
      {
        heading: "1. Original Language Comparisons",
        table: {
          headers: ["English Word", "Original Terms", "Key Distinction"],
          rows: [
            ["Love", "Agapē vs Phileo", "Agapē = unconditional covenant love; Phileo = brotherly affection."],
            ["Word", "Logos vs Rhēma", "Logos = total divine revelation/person; Rhēma = spoken utterance in action."],
            ["Life", "Bios vs Zoē", "Bios = physical biological life; Zoē = uncreated divine eternal life."],
            ["Power", "Dunamis vs Exousia", "Dunamis = inherent miracle power; Exousia = delegated authority."]
          ]
        }
      }
    ]
  },

  // 23. BIBLEPROJECT GENRES
  {
    id: "bibleproject-genres",
    title: "The BibleProject Literary Genres",
    subtitle: "Narrative (43%), Poetry (33%), Discourse (24%)",
    icon: "🎨",
    type: "reference",
    category: "Thematic Guides",
    keyVerses: [
      { ref: "Hebrews 1:1", text: "God, who at various times and in various ways spoke in time past to the fathers by the prophets...", theme: "Various Ways" }
    ],
    memorySentence: "Read **NARRATIVE** for pattern stories, **POETRY** for emotional imagery, and **DISCOURSE** for linear logical arguments.",
    sections: [
      {
        heading: "1. The 3 Primary Genres",
        table: {
          headers: ["Genre", "% of Bible", "Key Characteristics", "How to Read"],
          rows: [
            ["Narrative", "43%", "Historical stories, character arcs, setting, plot conflict", "Show, don't tell. Look for pattern repetition."],
            ["Poetry", "33%", "Metaphor, imagery, Hebrew parallelism", "Evokes emotion & imagination. Don't read like manual."],
            ["Discourse", "24%", "Logical arguments, speeches, letters, essays", "Track linear logic: Cause & Effect, Premises, Conclusions."]
          ]
        }
      }
    ]
  },

  // 24. REDEMPTIVE HISTORICAL
  {
    id: "redemptive-historical",
    title: "The Redemptive-Historical Reading Guide",
    subtitle: "Finding Christ in all 66 books (Luke 24:27)",
    icon: "✝️",
    type: "reference",
    category: "Thematic Guides",
    keyVerses: [
      { ref: "Luke 24:27", text: "And beginning with Moses and all the Prophets, he interpreted to them in all the Scriptures the things concerning himself.", theme: "Emmaus Road" }
    ],
    memorySentence: "Every book of the Bible points to **CHRIST**—in the Law, Historical books, Wisdom, and Prophets.",
    sections: [
      {
        heading: "1. Christ Across Biblical Eras",
        table: {
          headers: ["Era", "OT Shadow / Type", "New Testament Christ Fulfillment"],
          rows: [
            ["Law (Torah)", "Sacrificial Lamb & Tabernacle", "Jesus is Lamb of God and true Tabernacle."],
            ["Historical Books", "King David & Joshua (Deliverer)", "Jesus is true King of Kings and Captain of Salvation."],
            ["Wisdom & Psalms", "Personified Wisdom & Suffering King", "Jesus is Wisdom of God (1 Cor 1:30) and Risen Messiah."],
            ["Prophets", "Suffering Servant & Branch", "Jesus is wounded healer satisfying divine justice."]
          ]
        }
      }
    ]
  },

  // 25. SEVEN FEASTS
  {
    id: "seven-feasts",
    title: "The 7 Feasts of Israel & Prophetic Map",
    subtitle: "Leviticus 23 prophetic redemptive timeline",
    icon: "🌾",
    type: "reference",
    category: "Thematic Guides",
    keyVerses: [
      { ref: "1 Corinthians 5:7", text: "For indeed Christ, our Passover, was sacrificed for us.", theme: "Passover Fulfilled" }
    ],
    memorySentence: "Spring feasts (**PASSOVER**, **UNLEAVENED BREAD**, **FIRSTFRUITS**, **PENTECOST**) were fulfilled at Christ's 1st coming; Fall feasts (**TRUMPETS**, **ATONEMENT**, **TABERNACLES**) await His 2nd coming.",
    sections: [
      {
        heading: "1. The 7 Feasts Pairings",
        table: {
          headers: ["Feast", "Season", "OT Context", "NT Prophetic Fulfillment"],
          rows: [
            ["1. Passover", "Spring", "Lamb blood on doorposts in Egypt", "Fulfilled: Christ our Passover lamb slain (1 Cor 5:7)"],
            ["2. Unleavened Bread", "Spring", "Purging yeast/sin", "Fulfilled: Christ's sinless body in tomb"],
            ["3. Firstfruits", "Spring", "First sheaf of barley harvest", "Fulfilled: Christ's resurrection as firstfruits (1 Cor 15:20)"],
            ["4. Pentecost", "Spring", "Giving of Law at Sinai (50 days later)", "Fulfilled: Outpouring of Holy Spirit (Acts 2)"],
            ["5. Trumpets", "Fall", "Shofar blast, call to awakening", "Prophetic: Last Trumpet & Return of Christ (1 Thess 4:16)"],
            ["6. Day of Atonement", "Fall", "High Priest enters Holy of Holies", "Prophetic: Salvation of Israel & Final Judgment"],
            ["7. Tabernacles", "Fall", "Dwelling in booths, God's presence", "Prophetic: Eternal Kingdom & God dwelling with men (Rev 21:3)"]
          ]
        }
      }
    ]
  },

  // 26. FIVE SOLAS
  {
    id: "five-solas",
    title: "The 5 Solas of the Reformation",
    subtitle: "Foundational theological memory pillars",
    icon: "🏰",
    type: "reference",
    category: "Memory Chains",
    keyVerses: [
      { ref: "Ephesians 2:8-9", text: "For by grace you have been saved through faith, and that not of yourselves; it is the gift of God, not of works...", theme: "Grace & Faith" }
    ],
    memorySentence: "Salvation is by **SOLA SCRIPTURA** (Scripture alone), through **SOLA FIDE** (Faith alone), by **SOLA GRATIA** (Grace alone), in **SOLUS CHRISTUS** (Christ alone), to **SOLI DEO GLORIA** (God's glory alone).",
    sections: [
      {
        heading: "1. The 5 Solas Matrix",
        table: {
          headers: ["Sola Phrase", "Meaning", "Theological Anchor", "Scripture Anchor"],
          rows: [
            ["Sola Scriptura", "Scripture Alone", "Sole infallible rule of faith & practice", "2 Tim 3:16-17"],
            ["Sola Fide", "Faith Alone", "Justification received through faith without merit", "Rom 3:28"],
            ["Sola Gratia", "Grace Alone", "Salvation is entirely unearned gift of divine grace", "Eph 2:8-9"],
            ["Solus Christus", "Christ Alone", "Jesus is sole Mediator between God & humanity", "1 Tim 2:5"],
            ["Soli Deo Gloria", "Glory Alone", "All creation and salvation exists for God's glory", "1 Cor 10:31"]
          ]
        }
      }
    ]
  },

  // 27. NAVIGATORS WHEEL
  {
    id: "navigators-wheel",
    title: "The Navigators 2:7 Discipleship Wheel",
    subtitle: "Balanced Christian growth model (Colossians 2:7)",
    icon: "☸️",
    type: "reference",
    category: "Methodology",
    keyVerses: [
      { ref: "Colossians 2:6-7", text: "As you also received Christ Jesus the Lord, so walk in Him, rooted and built up in Him and established in the faith...", theme: "Rooted & Built Up" }
    ],
    memorySentence: "**CHRIST** is the center hub, driving **WORD**, **PRAYER**, **FELLOWSHIP**, and **WITNESSING**, rimmed by **OBEDIENCE**.",
    sections: [
      {
        heading: "1. Component Breakdown",
        table: {
          headers: ["Wheel Part", "Discipline", "Function", "Key Verse"],
          rows: [
            ["The Hub", "Christ Center", "Source of life and power driving entire wheel", "2 Cor 5:17"],
            ["Spoke 1", "The Word (Input)", "Feeding on scripture through reading, study, & memory", "2 Tim 3:16"],
            ["Spoke 2", "Prayer (Output)", "Communicating with God in worship & requests", "Phil 4:6-7"],
            ["Spoke 3", "Fellowship", "Mutual encouragement in the body of Christ", "Heb 10:24-25"],
            ["Spoke 4", "Witnessing", "Sharing the Gospel with the world", "Rom 1:16"],
            ["The Rim", "Obedience", "Translating faith into daily visible action", "John 14:21"]
          ]
        }
      }
    ]
  },

  // 28. NAMES OF GOD
  {
    id: "names-of-god",
    title: "The Names of God & Their Meanings",
    subtitle: "Hebrew & Greek titles revealing God's nature",
    icon: "👑",
    type: "reference",
    category: "Word Studies",
    keyVerses: [
      { ref: "Proverbs 18:10", text: "The name of the LORD is a strong tower; the righteous run to it and are safe.", theme: "Strong Tower" }
    ],
    memorySentence: "God reveals Himself as **ELOHIM** Creator, **YHWH** Self-Existent, **JIREH** Provider, **SHALOM** Peace, and **IMMANUEL** with us.",
    sections: [
      {
        heading: "1. 10 Primary Compound Names of YHWH",
        table: {
          headers: ["Name of God", "Hebrew Text", "English Meaning", "First Reveal Moment"],
          rows: [
            ["Elohim", "אֱלֹהִים", "Supreme Creator God of Power", "Gen 1:1 — Creation"],
            ["Yahweh (YHWH)", "יְהוָה", "I AM THAT I AM (Self-Existent Lord)", "Exod 3:14 — Burning Bush"],
            ["El Shaddai", "אֵל שַׁדַּי", "God Almighty / All-Sufficient One", "Gen 17:1 — Covenant to Abraham"],
            ["Yahweh Jireh", "יְהוָה יִרְאֶה", "The LORD Will Provide", "Gen 22:14 — Ram on Mt. Moriah"],
            ["Yahweh Nissi", "יְהוָה נִסִּי", "The LORD Is My Banner / Victory", "Exod 17:15 — Victory over Amalekites"],
            ["Yahweh Shalom", "יְהוָה שָׁלוֹם", "The LORD Is Peace", "Judg 6:24 — Gideon's altar"],
            ["Yahweh Rapha", "יְהוָה רֹפְאֶךָ", "The LORD Who Heals", "Exod 15:26 — Waters of Marah"],
            ["Yahweh Raah", "יְהוָה רֹעִי", "The LORD My Shepherd", "Ps 23:1 — David's psalm"],
            ["El Roi", "אֵל רֳאִי", "The God Who Sees Me", "Gen 16:13 — Hagar in desert"],
            ["Immanuel", "עִמָּנוּאֵל", "God With Us", "Isa 7:14 / Matt 1:23 — Incarnation"]
          ]
        }
      }
    ]
  },

  // 29. THE FIRST EVANGELISTS
  {
    id: "evangelists",
    title: "The First Evangelists",
    subtitle: "Who proclaimed Christ first?",
    icon: "📢",
    type: "reference",
    category: "Reference",
    keyVerses: [
      { ref: "Acts 21:8", text: "Philip the evangelist, who was one of the seven...", theme: "Evangelist Title" }
    ],
    memorySentence: "**ANDREW** first brought Peter, **PHILIP** brought Nathanael, the **SAMARITAN WOMAN** brought her town, and **MARY MAGDALENE** heralded the Risen Christ.",
    sections: [
      {
        heading: "1. Explicit NT Title: 'Evangelist' (εὐαγγελιστής)",
        description: "The Greek euangelistēs appears 3 times in the NT: Acts 21:8 (Philip), Eph 4:11 (gift to church), 2 Tim 4:5 (Timothy instructed). Philip is the only person explicitly titled 'the evangelist' in the NT.",
        table: {
          headers: ["Reference", "Person / Context", "Significance"],
          rows: [
            ["Acts 21:8", "Philip the Evangelist", "Only individual explicitly titled 'the evangelist' in NT."],
            ["Eph 4:11", "Evangelists as Ministry Gift", "Gifted office given to equip believers for ministry."],
            ["2 Tim 4:5", "Timothy Instructed", "Paul commands Timothy to 'do the work of an evangelist.'"]
          ]
        }
      },
      {
        heading: "2. First Proclaimers in Narrative Order",
        entries: [
          { rank: "First", person: "Andrew", reference: "John 1:40–42", quote: "We have found the Messiah. He brought him to Jesus.", note: "First act of personal evangelism recorded in the Gospels." },
          { rank: "Second", person: "Philip of Bethsaida", reference: "John 1:43–45", quote: "We have found him of whom Moses in the Law wrote... Come and see.", note: "Classic 'come and see' invitation to Nathanael." },
          { rank: "Third", person: "Samaritan Woman", reference: "John 4:28–30, 39", quote: "Come, see a man who told me all that I ever did. Can this be the Christ?", note: "First cross-cultural evangelist bringing an entire city." },
          { rank: "Special", person: "Mary Magdalene", reference: "John 20:18", quote: "I have seen the Lord!", note: "First herald of the Risen Christ — called 'apostle to the apostles' by church fathers." }
        ]
      }
    ]
  }
];
