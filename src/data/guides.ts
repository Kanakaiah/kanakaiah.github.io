import { PREACHERS_GUIDE } from './preachers';

export const NT_STUDY_GUIDES = [
  // =============================
  // REFERENCE GUIDES
  // =============================
  PREACHERS_GUIDE,

  // -------------------------------------------------------------
  // 1. THE ROMAN ROAD TO SALVATION
  // -------------------------------------------------------------
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
        description: "The 'Roman Road' is a classic, universally-used evangelistic memory chain compiled from the Apostle Paul's Epistle to the Romans. Written around AD 57 from Corinth, Romans presents the most systematic explanation of the Gospel in all of Scripture. The Roman Road traces the spiritual journey of humanity from helpless condemnation under sin to glorious justification, peace, and eternal life through Jesus Christ.",
        note: "Memorizing these 7 core verses enables you to clearly explain the Gospel to anyone at a moment's notice."
      },
      {
        heading: "2. The 5-Step Gospel Pathway Matrix",
        description: "Each step along the Roman Road addresses a fundamental question of human existence and spiritual reality.",
        table: {
          headers: ["Step & Theme", "Scripture Reference", "Core Truth & Meaning", "Memory Anchor"],
          rows: [
            ["Step 1: The Problem of Sin", "Romans 3:23 & 3:10", "All human beings are guilty of breaking God's holy law. No one can claim sinless perfection.", "ALL HAVE SINNED"],
            ["Step 2: Sin's Penalty & God's Gift", "Romans 6:23", "Sin pays a mandatory wage: spiritual and physical death. But God offers eternal life as an unearned gift.", "WAGES vs. GIFT"],
            ["Step 3: God's Love Demonstrated", "Romans 5:8", "God did not wait for us to reform ourselves. Christ died for us while we were active rebels against Him.", "WHILE STILL SINNERS"],
            ["Step 4: The Response of Faith", "Romans 10:9 & 10:13", "Salvation is received not by good works, but by confessing Jesus as Lord and believing in His resurrection.", "CONFESS & BELIEVE"],
            ["Step 5: Peace & No Condemnation", "Romans 5:1 & 8:1", "Justification by faith brings immediate, permanent peace with God and complete freedom from divine wrath.", "NO CONDEMNATION"]
          ]
        }
      },
      {
        heading: "3. Detailed Verse-by-Verse Breakdown & Commentary",
        entries: [
          {
            rank: "Step 1",
            person: "Romans 3:23 — Universal Human Need",
            reference: "Romans 3:23",
            quote: "for all have sinned and fall short of the glory of God,",
            note: "Greek 'hamartano' means to miss the mark. The 'glory of God' is the divine standard of perfect holiness. Everyone—regardless of morality or status—fails this standard."
          },
          {
            rank: "Step 2",
            person: "Romans 6:23 — The Great Contrast",
            reference: "Romans 6:23",
            quote: "For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord.",
            note: "'Wages' (opsonion) is what a soldier earns. 'Gift' (charisma) is a free, unmerited favor. Sin pays what we deserve (death); God gives what we cannot earn (life)."
          },
          {
            rank: "Step 3",
            person: "Romans 5:8 — Unconditional Sacrifice",
            reference: "Romans 5:8",
            quote: "But God demonstrates His own love toward us, in that while we were still sinners, Christ died for us.",
            note: "Human love targets the attractive or worthy; divine love (agape) targets the unworthy while still hostile. Christ's death is the supreme proof of God's heart."
          },
          {
            rank: "Step 4",
            person: "Romans 10:9–10 — The Dual Mandate of Faith",
            reference: "Romans 10:9–10",
            quote: "that if you confess with your mouth the Lord Jesus and believe in your heart that God has raised Him from the dead, you will be saved.",
            note: "Confession with the mouth (public allegiance to Jesus as YHWH) combined with heart-faith in His bodily resurrection results in full justification."
          },
          {
            rank: "Step 5",
            person: "Romans 8:1 — Permanent Assurance",
            reference: "Romans 8:1",
            quote: "There is therefore now no condemnation to those who are in Christ Jesus,",
            note: "No judicial verdict of guilty remains for those united to Christ. The law's demands have been satisfied completely at the cross."
          }
        ]
      }
    ]
  },

  // -------------------------------------------------------------
  // 2. INDUCTIVE BIBLE STUDY METHOD
  // -------------------------------------------------------------
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
        heading: "1. The Inductive Philosophy vs. Deductive Bias",
        description: "Deductive study approaches the Bible with a pre-existing theory or bias and searches for proof-texts to support it. Inductive study reverses this: it comes to Scripture as an open investigator, letting the text dictate the conclusions through careful Observation, rigorous Interpretation, and personal Application.",
        note: "Never ask 'What does this verse mean to me?' until you have first answered 'What did this verse mean to its original author and audience?'"
      },
      {
        heading: "2. Phase 1: Observation — What Does the Text Say?",
        description: "Observation requires slowing down to read like a detective. You are looking for facts, structures, and literary patterns without jumping to conclusions.",
        table: {
          headers: ["Observation Focus", "What to Search For", "Key Questions to Ask", "Example Markings"],
          rows: [
            ["The 5 W's & H", "Who, What, Where, When, Why, How", "Who is the speaker? Who is the audience? Where are they?", "Underline names and locations"],
            ["Repeated Keywords", "Nouns, verbs, or themes appearing 3+ times", "What is the central subject the author keeps coming back to?", "Yellow highlight"],
            ["Contrast Words", "'But', 'However', 'Instead', 'Not... but'", "What two opposing concepts, fates, or mindsets are contrasted?", "Red circle / slash"],
            ["Connecting Words", "'Therefore', 'Because', 'In order that', 'So then'", "What is the logical cause-and-effect relationship?", "Green arrow connecting lines"],
            ["Atmosphere & Tone", "Urgency, joy, sorrow, rebuke, warning", "What emotion or spiritual tone is the author expressing?", "Margin symbol (!, ?, 💔)"]
          ]
        }
      },
      {
        heading: "3. Phase 2: Interpretation — What Does the Text Mean?",
        description: "Interpretation discovers the single original meaning intended by the divine and human authors. Scripture cannot mean today what it never meant to its original hearers.",
        table: {
          headers: ["Hermeneutical Rule", "Description", "Golden Rule / Principle"],
          rows: [
            ["Literary Context", "Examine surrounding verses, paragraphs, and chapters.", "Context is King. Never detach a verse from its paragraph."],
            ["Historical-Cultural Setting", "Investigate the author's era, politics, geography, and culture.", "What cultural idioms or historical events influenced this statement?"],
            ["Grammatical Nuance", "Look at original word meanings (Hebrew/Greek) and verb tenses.", "Track subjects, objects, and conditional clauses ('if... then')."],
            ["Analogy of Faith", "Harmonize interpretation with the rest of clear Scripture.", "Scripture interprets Scripture. Clear passages clarify obscure ones."]
          ]
        }
      },
      {
        heading: "4. Phase 3: Application — The S.P.A.C.E.S. Checklist",
        description: "Truth demands transformation. Application translates biblical interpretation into concrete personal change.",
        table: {
          headers: ["Letter", "Checklist Category", "Application Reflection Prompt"],
          rows: [
            ["S", "Sin to confess", "Is there a sin exposed in this text that I need to repent of today?"],
            ["P", "Promise to claim", "Is there a divine promise I should anchor my faith in during trials?"],
            ["A", "Attitude to change", "Is there a worldly mindset or heart attitude I must align with Christ?"],
            ["C", "Command to obey", "What explicit action or command is God calling me to carry out?"],
            ["E", "Example to follow", "Whose faith, humility, or courage should I model in my life?"],
            ["S", "Prayer of Praise", "What aspect of God's character revealed here prompts heartfelt worship?"]
          ]
        }
      }
    ]
  },

  // -------------------------------------------------------------
  // 3. GENESIS: BEGINNINGS & COVENANTS
  // -------------------------------------------------------------
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
      { ref: "Genesis 12:2–3", text: "I will make you a great nation... and in you all the families of the earth shall be blessed.", theme: "Abrahamic Covenant" },
      { ref: "Genesis 50:20", text: "But as for you, you meant evil against me; but God meant it for good, in order to bring it about as it is this day, to save many people alive.", theme: "Providence" }
    ],
    memorySentence: "God **CREATED** all things, man **FELL** into sin, but God made **COVENANTS** with Abraham and guided **JOSEPH** for redemption.",
    sections: [
      {
        heading: "1. Book Structure & Overview",
        description: "Genesis ('Bereshit' — 'In the beginning') is the seedbed of all biblical theology. It splits neatly into two major divisions: Primeval History (Chapters 1–11: Creation, Fall, Flood, Babel) and Patriarchal History (Chapters 12–50: Abraham, Isaac, Jacob, Joseph).",
        note: "Without Genesis, the rest of the Bible is incomprehensible—Genesis explains why humanity needs a Savior and how God initiated His covenant plan."
      },
      {
        heading: "2. The 4 Major Covenants in Genesis",
        table: {
          headers: ["Covenant", "Scripture Anchor", "God's Promise", "Sign / Seal"],
          rows: [
            ["Edenic / Adamic", "Genesis 1:28, 2:16-17", "Dominion over creation; warning against eating from tree of knowledge.", "Tree of Life"],
            ["Redemptive Promise (Protoevangelium)", "Genesis 3:15", "First Gospel promise: Seed of the woman will crush the serpent's head.", "Skins of sacrifice"],
            ["Noahic Covenant", "Genesis 8:21–9:17", "Unconditional promise never again to destroy the earth by flood.", "Rainbow in the clouds"],
            ["Abrahamic Covenant", "Genesis 12:1-3, 15:6, 17:1-8", "Unconditional promise of Land, Seed (descendants), and Universal Blessing.", "Circumcision & Cut Animals"]
          ]
        }
      },
      {
        heading: "3. Messianic Shadows & Types in Genesis",
        entries: [
          {
            rank: "Type 1",
            person: "Adam — The First Man",
            reference: "Genesis 2:7 / Romans 5:14",
            quote: "Adam was a type of Him who was to come.",
            note: "First Adam brought sin and death to all; Christ (the Last Adam) brought righteousness and resurrection life."
          },
          {
            rank: "Type 2",
            person: "Isaac — The Beloved Son Offered",
            reference: "Genesis 22:1–14",
            quote: "God will provide for Himself the lamb for a burnt offering, my son.",
            note: "Isaac carried the wood up Mt. Moriah; Abraham willingly offered his only son; God provided the ram substitute—foreshadowing Golgotha."
          },
          {
            rank: "Type 3",
            person: "Joseph — The Rejected Savior",
            reference: "Genesis 50:20",
            quote: "You meant evil against me; but God meant it for good.",
            note: "Joseph was beloved of his father, rejected by brothers, sold for silver, falsely accused, exalted to supreme ruler, and saved his betrayers from death."
          }
        ]
      }
    ]
  },

  // -------------------------------------------------------------
  // 4. GOSPEL OF JOHN: 7 SIGNS & 7 I AMS
  // -------------------------------------------------------------
  {
    id: "guide-john-gospel",
    title: "Gospel of John: 7 Signs & 7 I AMs",
    subtitle: "High Christology & belief unto eternal life",
    icon: "🦅",
    type: "reference",
    category: "Book Studies",
    keyVerses: [
      { ref: "John 1:1, 14", text: "In the beginning was the Word, and the Word was with God, and the Word was God... And the Word became flesh and dwelt among us.", theme: "Incarnation" },
      { ref: "John 14:6", text: "Jesus said to him, 'I am the way, the truth, and the life. No one comes to the Father except through Me.'", theme: "Exclusive Savior" },
      { ref: "John 20:31", text: "but these are written that you may believe that Jesus is the Christ, the Son of God, and that believing you may have life in His name.", theme: "Purpose of John" }
    ],
    memorySentence: "John records **7 SIGNS** and **7 I AM** declarations so that you may **BELIEVE** and have eternal **LIFE**.",
    sections: [
      {
        heading: "1. Purpose & High Christology",
        description: "John's Gospel (the 'Eagle Gospel') is distinct from the Synoptics (Matthew, Mark, Luke). Written c. AD 85–90 by the Apostle John, it presents Jesus as the pre-existent Eternal Logos (Word) who became flesh. John structures his Gospel around 7 specific miraculous signs (semeia) and 7 divine self-disclosures ('I AM' sayings) that point to Christ's deity.",
        note: "John never uses the Greek word for 'miracle' (dynamis). He exclusively uses 'sign' (semeion) because these events point beyond themselves to Jesus' identity."
      },
      {
        heading: "2. The 7 Miraculous Signs & Their Theological Revelations",
        table: {
          headers: ["Sign #", "Miracle Event", "Scripture", "Theological Reveal"],
          rows: [
            ["Sign 1", "Water into Wine at Cana", "John 2:1–11", "Jesus surpasses Old Covenant ritual purification; inaugurates Messianic wedding feast."],
            ["Sign 2", "Healing Royal Official's Son", "John 4:46–54", "Sovereign power over distance; faith in Christ's spoken Word without physical sight."],
            ["Sign 3", "Healing Bethesda Paralytic", "John 5:1–15", "Authority over Sabbath; Jesus works in divine unity with the Father."],
            ["Sign 4", "Feeding the 5,000", "John 6:1–14", "Jesus is the True Manna from Heaven satisfying human spiritual starvation."],
            ["Sign 5", "Walking on the Sea", "John 6:16–21", "Divine 'Egō Eimi' (I AM) over creation chaos; echoes Exodus pillar of cloud/fire."],
            ["Sign 6", "Healing Man Born Blind", "John 9:1–7", "Jesus is the Light of the World; grants physical sight and spiritual illumination."],
            ["Sign 7", "Raising Lazarus from Death", "John 11:1–44", "Climactic sign proving Jesus possesses ultimate power over physical death."]
          ]
        }
      },
      {
        heading: "3. The 7 'I AM' (Egō Eimi) Declarations",
        table: {
          headers: ["#", "'I AM' Statement", "Scripture Reference", "OT Exodus 3:14 Echo & Meaning"],
          rows: [
            ["1", "I am the Bread of Life", "John 6:35, 48", "Manna in wilderness; Jesus is the ultimate spiritual sustenance."],
            ["2", "I am the Light of the World", "John 8:12, 9:5", "Pillar of fire in Wilderness; dispels moral and spiritual darkness."],
            ["3", "I am the Door / Gate of the Sheep", "John 10:7, 9", "The exclusive entrance into God's fold and eternal salvation."],
            ["4", "I am the Good Shepherd", "John 10:11, 14", "Ezekiel 34 shepherd; lays down His life willingly for His sheep."],
            ["5", "I am the Resurrection and the Life", "John 11:25", "Spoken to Martha before raising Lazarus; victory over the grave."],
            ["6", "I am the Way, the Truth, and the Life", "John 14:6", "Exclusive claim; the only path, reality, and life with the Father."],
            ["7", "I am the True Vine", "John 15:1, 5", "Israel was failed vine (Isa. 5); Jesus is true vine; believers abide."]
          ]
        }
      }
    ]
  },

  // -------------------------------------------------------------
  // 5. ROMANS: GOSPEL FOUNDATIONS
  // -------------------------------------------------------------
  {
    id: "guide-romans",
    title: "Romans: Gospel Foundations",
    subtitle: "Systematic Paul's magnum opus on Salvation",
    icon: "🏛️",
    type: "reference",
    category: "Book Studies",
    keyVerses: [
      { ref: "Romans 1:16", text: "For I am not ashamed of the gospel of Christ, for it is the power of God to salvation for everyone who believes,", theme: "The Gospel Power" },
      { ref: "Romans 3:24", text: "being justified freely by His grace through the redemption that is in Christ Jesus,", theme: "Justification" },
      { ref: "Romans 8:28", text: "And we know that all things work together for good to those who love God, to those who are the called according to His purpose.", theme: "Sovereign Good" },
      { ref: "Romans 12:1", text: "I beseech you therefore, brethren, by the mercies of God, that you present your bodies a living sacrifice, holy, acceptable to God,", theme: "Living Sacrifice" }
    ],
    memorySentence: "Romans proves all are under **CONDEMNATION**, granted **JUSTIFICATION** by faith, walking in **SANCTIFICATION**, secure in **ELECTION**, and living in **APPLICATION**.",
    sections: [
      {
        heading: "1. Overview & Theological Supremacy",
        description: "Romans is Paul's magnum opus—written AD 57 from Corinth to a mixed Jewish-Gentile church in Rome. It provides the most comprehensive, logical exposition of salvation in history. Martin Luther called Romans 'the chief part of the New Testament and the purest gospel.'",
        note: "Romans is structured around 5 major theological movements: Condemnation (1–3), Justification (3–5), Sanctification (6–8), Sovereign Election (9–11), and Practical Application (12–16)."
      },
      {
        heading: "2. The 5 Theological Movements of Romans",
        table: {
          headers: ["Movement", "Chapters", "Core Message", "Key Anchor Verses"],
          rows: [
            ["1. Condemnation", "Rom. 1:18 – 3:20", "Pagan, Moralist, and Jew alike are under sin and without excuse before God's law.", "Rom. 3:23"],
            ["2. Justification", "Rom. 3:21 – 5:21", "God declares sinners righteous by grace alone through faith in Christ's propitiatory blood.", "Rom. 3:24, 5:1, 5:8"],
            ["3. Sanctification", "Rom. 6:1 – 8:39", "Believers are dead to sin, alive to God, walking in Spirit victory with no condemnation.", "Rom. 6:23, 8:1, 8:28"],
            ["4. Sovereign Election", "Rom. 9:1 – 11:36", "God's covenant faithfulness to Israel and Gentiles; Mystery of divine sovereignty.", "Rom. 10:9, 11:33"],
            ["5. Practical Duty", "Rom. 12:1 – 16:27", "Living sacrifices, renewing the mind, submission to authority, loving one another.", "Rom. 12:1–2, 13:14"]
          ]
        }
      },
      {
        heading: "3. Essential Theological Terms Defined in Romans",
        table: {
          headers: ["Term", "Greek Word", "Biblical Definition"],
          rows: [
            ["Justification", "Dikaiōsis", "Legal verdict: God declaring a guilty sinner righteous based on Christ's righteousness."],
            ["Propitiation", "Hilastērion", "Sacrifice that turns away divine wrath by satisfying divine justice."],
            ["Redemption", "Apolytrosis", "Setting a slave free by paying a ransom price (Christ's blood)."],
            ["Sanctification", "Hagiasmos", "Progressive work of the Spirit conforming a justified believer into Christlikeness."],
            ["Glorification", "Doxazō", "Final physical & spiritual transformation of believers at Christ's return."]
          ]
        }
      }
    ]
  },

  // -------------------------------------------------------------
  // 6. OVERCOMING ANXIETY & FINDING PEACE
  // -------------------------------------------------------------
  {
    id: "guide-anxiety-peace",
    title: "Overcoming Anxiety & Finding Peace",
    subtitle: "Biblical emotional reframing in Philippians & Psalms",
    icon: "🕊️",
    type: "reference",
    category: "Topical Studies",
    keyVerses: [
      { ref: "Philippians 4:6–7", text: "Be anxious for nothing, but in everything by prayer and supplication, with thanksgiving, let your requests be made known to God; and the peace of God... will guard your hearts.", theme: "Peace That Guards" },
      { ref: "Psalm 46:1, 10", text: "God is our refuge and strength, a very present help in trouble... Be still, and know that I am God.", theme: "Refuge & Stillness" },
      { ref: "1 Peter 5:7", text: "casting all your care upon Him, for He cares for you.", theme: "Casting Cares" }
    ],
    memorySentence: "Be **ANXIOUS FOR NOTHING**, turn every worry to **PRAYER**, guard your **MIND**, and be **STILL** knowing God is your refuge.",
    sections: [
      {
        heading: "1. The Biblical Roadmap from Distress to Peace",
        description: "Scripture does not shame believers for feeling anxiety; instead, it provides a compassionate, practical blueprint to transition from mental distress to supernatural peace. Paul wrote Philippians 4 from Roman chains, proving that divine peace is independent of external circumstances.",
        note: "Greek 'merimnao' (anxiety) literally means 'to be pulled in opposite directions / divided mind.' Prayer reunifies the mind in God's presence."
      },
      {
        heading: "2. The 4-Step Prescription for Peace (Philippians 4:4–9)",
        table: {
          headers: ["Step", "Scripture", "Mindset Shift", "Actionable Daily Habit"],
          rows: [
            ["Step 1: Rejoice & Release", "Phil. 4:4–5", "Shift attention from temporary problems to God's eternal presence.", "Begin prayers by praising God for 3 specific attributes."],
            ["Step 2: Turn Worry to Prayer", "Phil. 4:6", "Trade anxious rumination for specific petition with thanksgiving.", "Write down worries and transform each into a prayer request."],
            ["Step 3: Guard Your Mind", "Phil. 4:8", "Filter out toxic thoughts; dwell on what is true, honorable, pure, & lovely.", "Audit media consumption; memorize true scripture promises."],
            ["Step 4: Practice Obedience", "Phil. 4:9", "Put into practice what you have learned and heard.", "Take one concrete step of obedience despite feeling fearful."]
          ]
        }
      },
      {
        heading: "3. Psalms of Sanctuary for Anxious Moments",
        table: {
          headers: ["Psalm", "Key Verse Anchor", "Comfort Truth"],
          rows: [
            ["Psalm 23", "Ps. 23:4 — 'I will fear no evil, for You are with me'", "The Shepherd leads through the valley; you are never alone."],
            ["Psalm 27", "Ps. 27:1 — 'The LORD is my light... whom shall I fear?'", "God is an impenetrable fortress protecting your life."],
            ["Psalm 46", "Ps. 46:10 — 'Be still, and know that I am God'", "Cease striving; God is sovereign over all global and personal storms."],
            ["Psalm 91", "Ps. 91:1–2 — 'He who dwells in the secret place of the Most High'", "Abiding under the shadow of the Almighty shields from panic."],
            ["Psalm 139", "Ps. 139:23–24 — 'Search me, O God, and know my heart'", "God knows your thoughts completely and leads you in the way everlasting."]
          ]
        }
      }
    ]
  },

  // -------------------------------------------------------------
  // 7. SPIRITUAL WARFARE & STANDING FIRM
  // -------------------------------------------------------------
  {
    id: "guide-spiritual-warfare",
    title: "Spiritual Warfare & Standing Firm",
    subtitle: "Ephesians 6 & 1 Peter strategic spiritual defence",
    icon: "🗡️",
    type: "reference",
    category: "Topical Studies",
    keyVerses: [
      { ref: "Ephesians 6:11", text: "Put on the whole armor of God, that you may be able to stand against the wiles of the devil.", theme: "Whole Armor" },
      { ref: "2 Corinthians 10:4", text: "For the weapons of our warfare are not carnal but mighty in God for pulling down strongholds,", theme: "Mighty Weapons" },
      { ref: "1 Peter 5:8–9", text: "Be sober, be vigilant; because your adversary the devil walks about like a roaring lion... Resist him, steadfast in the faith.", theme: "Vigilance" }
    ],
    memorySentence: "Put on the **ARMOR OF GOD**, stand firm in **TRUTH**, extinguish fiery **DARTS** with faith, and wield the **SWORD OF THE SPIRIT**.",
    sections: [
      {
        heading: "1. Unseen Realm Reality",
        description: "Paul warns in Ephesians 6:12 that believers do not wrestle against flesh and blood, but against spiritual principalities and powers. Spiritual warfare is not fought with physical weapons, but by taking your stand in Christ's completed victory through divine armor and prayer.",
        note: "The Greek word for 'stand' (stēnai) appears 4 times in Ephesians 6:10–14. You are not called to invade satanic territory, but to HOLD the ground Christ already won."
      },
      {
        heading: "2. The Exhaustive Armor of God Breakdown",
        table: {
          headers: ["Armor Piece", "Greek Term", "Roman Soldier Function", "Spiritual Defense Reality"],
          rows: [
            ["Belt of Truth", "Alētheia", "Leather belt holding tunic together & carrying sword sheath.", "Objective biblical truth that protects from satanic lies & deception."],
            ["Breastplate of Righteousness", "Dikaiosynē", "Iron plate guarding heart and vital organs from fatal stabs.", "Imputed righteousness of Christ guarding heart from guilt & accusation."],
            ["Shoes of Gospel Peace", "Hetoimasia", "Studded sandals providing firm traction on slippery terrain.", "Firm footing and readiness to proclaim Gospel peace wherever sent."],
            ["Shield of Faith", "Thyreos", "4x2.5ft wooden/leather door-shield soaked in water to douse arrows.", "Active trust in God that extinguishes flaming darts of doubt & temptation."],
            ["Helmet of Salvation", "Perikephalaia", "Bronze helmet guarding head from crushing broadsword blows.", "Assurance of final salvation guarding the mind from despair & doubt."],
            ["Sword of the Spirit", "Machaira", "Short 18-inch thrusting dagger for close-up tactical combat.", "The spoken Word of God (Rhēma) used offensively to repel temptation."]
          ]
        }
      }
    ]
  },

  // -------------------------------------------------------------
  // 8. SUFFERING, TRIAL & GOD'S SOVEREIGNTY
  // -------------------------------------------------------------
  {
    id: "guide-suffering-sovereignty",
    title: "Suffering, Trial & God's Sovereignty",
    subtitle: "Job, 2 Corinthians 1, & Romans 8 comfort",
    icon: "🔥",
    type: "reference",
    category: "Topical Studies",
    keyVerses: [
      { ref: "Romans 8:28", text: "And we know that all things work together for good to those who love God, to those who are the called according to His purpose.", theme: "Sovereign Good" },
      { ref: "2 Corinthians 1:3–4", text: "the Father of mercies and God of all comfort, who comforts us in all our tribulation, that we may be able to comfort those who are in any trouble,", theme: "Comfort Minstry" },
      { ref: "Job 42:2", text: "I know that You can do everything, and that no purpose of Yours can be withheld from You.", theme: "Sovereignty" }
    ],
    memorySentence: "God is **SOVEREIGN** over pain; He **COMFORTS** us in trials so that our valleys yield eternal **GLORY**.",
    sections: [
      {
        heading: "1. A Theology of the Furnace",
        description: "Scripture never paints suffering as evidence of God's abandonment. Rather, trials are God's refining furnace—purifying faith, destroying pride, and producing unshakable hope. Through Job, Paul, and Christ, we learn that suffering is temporary, under divine sovereignty, and working out an eternal weight of glory.",
        note: "C.S. Lewis: 'God whispers to us in our pleasures, speaks in our conscience, but shouts in our pains: it is His megaphone to rouse a deaf world.'"
      },
      {
        heading: "2. 3 Biblical Lenses on Suffering",
        table: {
          headers: ["Book", "Key Revelation", "Core Anchor Verse", "Pastoral Comfort Takeaway"],
          rows: [
            ["Job", "God's sovereignty transcends human understanding; Satan is on a leash.", "Job 42:2", "Trust God's character when you cannot trace His hand."],
            ["2 Corinthians 1", "Comfort received in deep trial equips you to minister to others.", "2 Cor. 1:3–4", "Your pain is never wasted; it becomes your testimony and ministry."],
            ["Romans 8", "Present suffering cannot compare to the glory to be revealed.", "Rom. 8:18, 28", "God weaves all suffering into ultimate good for His called ones."]
          ]
        }
      }
    ]
  },

  // -------------------------------------------------------------
  // 9. HARMONY OF THE FOUR GOSPELS TIMELINE
  // -------------------------------------------------------------
  {
    id: "guide-gospel-harmony",
    title: "Harmony of the Four Gospels Timeline",
    subtitle: "Chronological Life of Christ (Matt, Mark, Luke, John)",
    icon: "📜",
    type: "reference",
    category: "Historical Timelines",
    keyVerses: [
      { ref: "Luke 1:1–3", text: "it seemed good to me also... to write to you an orderly account,", theme: "Orderly Account" },
      { ref: "Galatians 4:4", text: "But when the fullness of the time had come, God sent forth His Son,", theme: "Fullness of Time" }
    ],
    memorySentence: "Christ's life moved from **PREPARATION** in Bethlehem, to **GALILEAN** ministry, to **PASSION WEEK** and **RESURRECTION** victory.",
    sections: [
      {
        heading: "1. Four Witnesses, One Savior",
        description: "Matthew presents Jesus as the Promised Jewish Messiah (King); Mark as the Suffering Servant (Action); Luke as the Perfect Son of Man (Savior of all); John as the Eternal Son of God (Deity). Synchronizing them provides a 3D chronological portrait of Christ's earthly life.",
        note: "Over 90% of John's material is unique and does not appear in the Synoptics (Matthew, Mark, Luke)."
      },
      {
        heading: "2. The 6 Chronological Eras of Christ's Ministry",
        table: {
          headers: ["Phase", "Period", "Key Historical Events", "Primary Location"],
          rows: [
            ["1. Preparation", "4 BC – AD 26", "Birth in Bethlehem, Flight to Egypt, Baptism by John, Wilderness Temptation", "Bethlehem, Nazareth, Jordan"],
            ["2. Early Ministry", "AD 26 – 27", "Water to Wine, Cleansing Temple, Nicodemus, Woman at Well", "Cana, Jerusalem, Samaria"],
            ["3. Galilean Ministry", "AD 27 – 29", "Sermon on Mount, Calling 12, Parables, Feeding 5,000, Walking on Water", "Capernaum, Sea of Galilee"],
            ["4. Special Training", "AD 29", "Peter's Confession, Transfiguration, Healing Syrophoenician's daughter", "Caesarea Philippi, Hermon"],
            ["5. Judean & Peraean", "AD 29 – 30", "Raising Lazarus, Good Samaritan, Prodigal Son, Zacchaeus", "Bethany, Peraea, Jericho"],
            ["6. Passion & Victory", "AD 30 (Spring)", "Triumphal Entry, Upper Room, Gethsemane, Trial, Cross, Resurrection", "Jerusalem, Golgotha, Tomb"]
          ]
        }
      }
    ]
  },

  // -------------------------------------------------------------
  // 10. THE NAMES OF GOD & THEIR MEANINGS
  // -------------------------------------------------------------
  {
    id: "names-of-god",
    title: "The Names of God & Their Meanings",
    subtitle: "Hebrew & Greek titles revealing God's nature",
    icon: "👑",
    type: "reference",
    category: "Word Studies",
    keyVerses: [
      { ref: "Proverbs 18:10", text: "The name of the LORD is a strong tower; the righteous run to it and are safe.", theme: "Strong Tower" },
      { ref: "Exodus 3:14", text: "And God said to Moses, 'I AM WHO I AM.'", theme: "Self-Existent YHWH" }
    ],
    memorySentence: "God reveals Himself as **ELOHIM** Creator, **YHWH** Self-Existent, **JIREH** Provider, **SHALOM** Peace, and **IMMANUEL** with us.",
    sections: [
      {
        heading: "1. The Power of Divine Names",
        description: "In Hebrew thought, a name was not merely a label—it revealed essential character, reputation, and authority. Each compound name of God in the Old Testament was unveiled during a critical moment of human crisis, revealing how God meets human need.",
        note: "Whenever you see 'LORD' in all capital letters in your English Bible, it translates the covenant name YHWH (Yahweh)."
      },
      {
        heading: "2. The 10 Primary Compound Names of YHWH",
        table: {
          headers: ["Name of God", "Hebrew Text", "English Meaning", "First Reveal Moment & Scripture"],
          rows: [
            ["Elohim", "אֱלֹהִים", "The Supreme Creator God of Power", "Genesis 1:1 — Creation of universe"],
            ["Yahweh (YHWH)", "יְהוָה", "I AM THAT I AM (Self-Existent Covenant Lord)", "Exodus 3:14 — Burning Bush with Moses"],
            ["El Shaddai", "אֵל שַׁדַּי", "God Almighty / All-Sufficient One", "Genesis 17:1 — Covenant promise to elderly Abraham"],
            ["Yahweh Jireh", "יְהוָה יִרְאֶה", "The LORD Will Provide", "Genesis 22:14 — Ram provided on Mt. Moriah"],
            ["Yahweh Nissi", "יְהוָה נִסִּי", "The LORD Is My Banner / Victory", "Exodus 17:15 — Defeat of Amalekites"],
            ["Yahweh Shalom", "יְהוָה שָׁלוֹם", "The LORD Is Peace", "Judges 6:24 — Gideon's altar in fear"],
            ["Yahweh Rapha", "יְהוָה רֹפְאֶךָ", "The LORD Who Heals", "Exodus 15:26 — Healing bitter waters of Marah"],
            ["Yahweh Raah", "יְהוָה רֹעִי", "The LORD My Shepherd", "Psalm 23:1 — David watching his flock"],
            ["El Roi", "אֵל רֳאִי", "The God Who Sees Me", "Genesis 16:13 — Hagar crying out in desert desolation"],
            ["Immanuel", "עִמָּנוּאֵל", "God With Us", "Isaiah 7:14 / Matthew 1:23 — Incarnation of Christ"]
          ]
        }
      }
    ]
  }
];
