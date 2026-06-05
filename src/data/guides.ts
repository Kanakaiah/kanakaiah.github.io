import { PREACHERS_GUIDE } from './preachers';

export const NT_STUDY_GUIDES = [
  // =============================
  // REFERENCE GUIDES
  // =============================
  PREACHERS_GUIDE,
  {
    id: "evangelists",
    title: "The First Evangelists",
    subtitle: "Who proclaimed Christ first?",
    icon: "📢",
    type: "reference",
    category: "Reference",
    sections: [
      {
        heading: "Explicit NT Title: 'Evangelist' (εὐαγγελιστής)",
        description: "The Greek euangelistēs appears only 3 times in the NT:",
        table: {
          headers: ["Reference", "Person/Context"],
          rows: [
            ["Acts 21:8", "Philip — 'Philip the evangelist'"],
            ["Eph. 4:11", "Evangelists as a gift to the church"],
            ["2 Tim. 4:5", "Timothy told to 'do the work of an evangelist'"]
          ]
        },
        note: "So Philip is the only person explicitly titled 'the evangelist' in the NT."
      },
      {
        heading: "First to Proclaim Christ (Narrative Order)",
        description: "Who first went and told others about Jesus:",
        entries: [
          {
            rank: "🥇 First",
            person: "Andrew",
            reference: "John 1:40–42",
            quote: "He first found his own brother Simon and said to him, 'We have found the Messiah' … He brought him to Jesus.",
            note: "Andrew heard John the Baptist's testimony about Jesus, believed, and immediately went to bring his brother Peter — the very first act of personal evangelism in the Gospels."
          },
          {
            rank: "🥈 Second",
            person: "Philip",
            reference: "John 1:43–45",
            quote: "Philip found Nathanael and said to him, 'We have found him of whom Moses in the Law and also the prophets wrote, Jesus of Nazareth.'",
            note: "The very next day, Philip sought out Nathanael — a beautiful picture of the 'come and see' invitation."
          },
          {
            rank: "🥉 Third",
            person: "The Samaritan Woman",
            reference: "John 4:28–30, 39",
            quote: "So the woman left her water jar and went away into town and said to the people, 'Come, see a man who told me all that I ever did. Can this be the Christ?' Many Samaritans from that town believed in him because of the woman's testimony.",
            note: "She is often called the first cross-cultural evangelist — proclaiming Christ to an entire town. Note the irony: a Samaritan woman becomes a herald before most of the twelve disciples do."
          }
        ]
      },
      {
        heading: "Post-Resurrection: First to Proclaim the Risen Christ",
        entries: [
          {
            rank: "✝️ Special",
            person: "Mary Magdalene",
            reference: "John 20:18",
            quote: "Mary Magdalene went and announced to the disciples, 'I have seen the Lord.'",
            note: "This led the early church fathers (Hippolytus, etc.) to call her apostola apostolorum — 'apostle to the apostles.'"
          }
        ]
      },
      {
        heading: "Summary",
        description: "Andrew → Philip → Samaritan Woman is the classic narrative sequence for the first evangelists in action, while Philip of Caesarea holds the only formal NT title."
      }
    ]
  },
  {
    id: "john-signs-iams",
    title: "Seven Signs & Seven I AMs",
    subtitle: "The theological skeleton of John's Gospel",
    icon: "✦",
    type: "reference",
    category: "Reference",
    sections: [
      {
        heading: "The Seven Signs (σημεῖα)",
        description: "John never calls these 'miracles' (dynameis) — always sēmeia (signs), because they point beyond themselves to who Jesus is.",
        table: {
          headers: ["#", "Sign", "Reference", "Theological Significance"],
          rows: [
            ["1", "Water into Wine at Cana", "John 2:1–11", "Jesus transforms and surpasses the old covenant order; reveals His glory"],
            ["2", "Healing the Royal Official's Son", "John 4:46–54", "Sovereign word from a distance — faith without sight"],
            ["3", "Healing the Paralyzed Man at Bethesda", "John 5:1–15", "Jesus works on the Sabbath — equal authority with the Father"],
            ["4", "Feeding the 5,000", "John 6:1–14", "The true Bread from heaven; anticipates Eucharist and Exodus manna"],
            ["5", "Walking on Water", "John 6:16–21", "Divine egō eimi over chaos; echoes Job 9:8 and Ps. 107:29"],
            ["6", "Healing the Man Born Blind", "John 9:1–7", "Jesus as Light of the World — physical and spiritual sight"],
            ["7", "Raising Lazarus", "John 11:1–44", "The climactic sign — Jesus as Resurrection and Life; triggers the Passion"]
          ]
        },
        keyVerse: { ref: "John 20:30–31", text: "These are written so that you may believe that Jesus is the Christ, the Son of God, and that by believing you may have life in his name." }
      },
      {
        heading: "The Seven 'I AM' Statements (egō eimi + predicate)",
        description: "Each statement is a self-disclosure tied to a specific human need — and together they form a complete portrait of Christ.",
        table: {
          headers: ["#", "Statement", "Reference", "OT Background"],
          rows: [
            ["1", "I am the Bread of Life", "John 6:35, 48", "Manna in the wilderness (Ex. 16); Wisdom's table (Prov. 9:5)"],
            ["2", "I am the Light of the World", "John 8:12; 9:5", "Pillar of fire (Ex. 13); God as light (Ps. 27:1; Isa. 42:6)"],
            ["3", "I am the Door / Gate", "John 10:7, 9", "Access and protection — the only entry to salvation"],
            ["4", "I am the Good Shepherd", "John 10:11, 14", "Ezek. 34 (God as Shepherd); Ps. 23"],
            ["5", "I am the Resurrection and the Life", "John 11:25", "Linked to Sign #7 — spoken before Lazarus is raised"],
            ["6", "I am the Way, the Truth, and the Life", "John 14:6", "Exclusive claim — the only path to the Father"],
            ["7", "I am the True Vine", "John 15:1, 5", "Israel as failed vine (Ps. 80; Isa. 5); Jesus as the true Israel"]
          ]
        }
      },
      {
        heading: "The Absolute 'I AM' Sayings (egō eimi — no predicate)",
        description: "Beyond the seven, John also records absolute egō eimi declarations that echo Exodus 3:14 and Isaiah 43:10 most directly:",
        table: {
          headers: ["Statement", "Reference"],
          rows: [
            ["Before Abraham was, I AM", "John 8:58"],
            ["I AM — to the soldiers in Gethsemane (they fell back)", "John 18:5–6"],
            ["I AM — to the woman at the well", "John 4:26"]
          ]
        },
        note: "These are among the strongest divine identity claims in the NT. The crowd's reaction in John 8:59 (taking up stones) and the soldiers falling in 18:6 confirm the audience understood exactly what was being claimed."
      },
      {
        heading: "Summary: Signs ↔ I AMs",
        description: "The signs and 'I AM' statements work together — the signs demonstrate the claims, and the claims interpret the signs. This is John's evangelistic strategy: show then tell.",
        table: {
          headers: ["Signs (What He Does)", "I AMs (Who He Is)"],
          rows: [
            ["Water → Wine", "Bread of Life"],
            ["Healing at distance", "Light of the World"],
            ["Paralyzed man healed", "The Door / Gate"],
            ["5,000 fed", "The Good Shepherd"],
            ["Walks on water", "Resurrection & Life"],
            ["Blind man sees", "The Way, Truth & Life"],
            ["Lazarus raised", "The True Vine"]
          ]
        }
      }
    ]
  },

  // =============================
  // TIER 1 — CORE BOOK GUIDES
  // =============================
  {
    id: "john",
    title: "John",
    subtitle: "21 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 1,
    category: "Tier 1 — Core",
    chapters: 21,
    structureFormula: "1 → 11 → 5 → 4",
    blocks: [
      { chapters: "1", label: "PROLOGUE", description: "The Word" },
      { chapters: "2–12", label: "SIGNS", description: "Public Ministry — 7 signs" },
      { chapters: "13–17", label: "UPPER ROOM", description: "Private Teaching" },
      { chapters: "18–21", label: "GLORY", description: "Cross & Resurrection" }
    ],
    anchors: [
      { ch: 1, word: "WORD", scene: "'In the beginning was the Word'" },
      { ch: 2, word: "WINE", scene: "Water jars at Cana" },
      { ch: 3, word: "NIGHT", scene: "Nicodemus sneaks in at night" },
      { ch: 4, word: "WELL", scene: "Woman at the well" },
      { ch: 5, word: "MAT", scene: "Paralyzed man — 'Take up your mat'" },
      { ch: 6, word: "BREAD", scene: "5,000 fed + Bread of Life" },
      { ch: 7, word: "FEAST", scene: "Feast of Tabernacles — crowds divided" },
      { ch: 8, word: "GROUND", scene: "Woman thrown to the ground + 'I AM the Light'" },
      { ch: 9, word: "MUD", scene: "Mud on the blind man's eyes" },
      { ch: 10, word: "SHEEP", scene: "Good Shepherd + 'my sheep hear my voice'" },
      { ch: 11, word: "TOMB", scene: "Lazarus — stone rolled away" },
      { ch: 12, word: "DONKEY", scene: "Triumphal entry into Jerusalem" },
      { ch: 13, word: "TOWEL", scene: "Jesus washes feet" },
      { ch: 14, word: "HOUSE", scene: "'My Father's house has many rooms'" },
      { ch: 15, word: "VINE", scene: "'I am the True Vine'" },
      { ch: 16, word: "WIND", scene: "Holy Spirit promised — the Helper comes" },
      { ch: 17, word: "PRAYER", scene: "High Priestly Prayer — Jesus prays for us" },
      { ch: 18, word: "TORCH", scene: "Soldiers with torches — arrest in the garden" },
      { ch: 19, word: "CROSS", scene: "Crucifixion — 'It is finished'" },
      { ch: 20, word: "LINEN", scene: "Empty tomb — linen cloth left behind" },
      { ch: 21, word: "FIRE", scene: "Charcoal fire on the beach — Peter restored" }
    ],
    memorySentence: "The WORD turned WINE, visited by NIGHT at a WELL, healed a man on a MAT, became our BREAD at the FEAST, stooped to the GROUND, put MUD on blind eyes, called His SHEEP out of a TOMB on a DONKEY, grabbed a TOWEL, showed us the HOUSE, became the VINE, sent the WIND, prayed as PRAYER, was arrested by TORCH, hung on the CROSS, left only LINEN, and cooked FIRE for breakfast.",
    keyVerses: [
      { ref: "John 1:1", theme: "'In the beginning was the Word' (The opening)" },
      { ref: "John 3:16", theme: "'For God so loved the world' (The gospel in one verse)" },
      { ref: "John 20:31", theme: "'These are written so that you may believe' (Purpose statement)" }
    ]
  },
  {
    id: "romans",
    title: "Romans",
    subtitle: "16 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 1,
    category: "Tier 1 — Core",
    chapters: 16,
    structureFormula: "3 → 5 → 3 → 5",
    blocks: [
      { chapters: "1–3", label: "CONDEMNATION", description: "All are guilty — Jew & Gentile" },
      { chapters: "4–8", label: "JUSTIFICATION", description: "Righteousness by faith alone" },
      { chapters: "9–11", label: "ISRAEL", description: "God's sovereign plan for His people" },
      { chapters: "12–16", label: "APPLICATION", description: "The gospel lived out" }
    ],
    anchors: [
      { ch: 1, word: "WRATH", scene: "God's wrath revealed — creation without excuse" },
      { ch: 2, word: "JUDGE", scene: "You who judge do the same things" },
      { ch: 3, word: "ALL", scene: "'All have sinned' — Jews and Gentiles alike" },
      { ch: 4, word: "ABRAHAM", scene: "Faith credited as righteousness — before circumcision" },
      { ch: 5, word: "ADAM", scene: "One man's sin vs. one Man's gift" },
      { ch: 6, word: "DEAD", scene: "Dead to sin — buried with Christ in baptism" },
      { ch: 7, word: "WAR", scene: "'The good I want to do, I do not do'" },
      { ch: 8, word: "SPIRIT", scene: "No condemnation — Spirit of life + nothing separates us" },
      { ch: 9, word: "POTTER", scene: "God's sovereign election — clay in the Potter's hand" },
      { ch: 10, word: "MOUTH", scene: "'Confess with your mouth' — feet of those who bring good news" },
      { ch: 11, word: "OLIVE", scene: "Wild branches grafted in — mystery of Israel" },
      { ch: 12, word: "BODY", scene: "Living sacrifice — members of one body" },
      { ch: 13, word: "SWORD", scene: "Governing authorities — love fulfills the law" },
      { ch: 14, word: "TABLE", scene: "Strong and weak — don't judge at the dinner table" },
      { ch: 15, word: "WALL", scene: "Christ breaks the dividing wall — Paul's mission to Gentiles" },
      { ch: 16, word: "GREET", scene: "29 people greeted by name — the gospel community" }
    ],
    memorySentence: "God's WRATH falls on the self-righteous JUDGE because ALL fall short — even ABRAHAM was saved like ADAM was lost, by one act. So be DEAD to sin, end the inner WAR, walk in the SPIRIT, rest in the POTTER'S hand, open your MOUTH, don't cut the OLIVE branch, offer your BODY, respect the SWORD, eat at the TABLE in peace, tear down the WALL, and go GREET your brothers.",
    keyVerses: [
      { ref: "Romans 1:16-17", theme: "'I am not ashamed of the gospel — the righteous shall live by faith' (The thesis)" },
      { ref: "Romans 8:1", theme: "'There is therefore now no condemnation' (The climax of doctrine)" },
      { ref: "Romans 12:1", theme: "'Present your bodies as a living sacrifice' (The turn to life)" }
    ]
  },
  {
    id: "galatians",
    title: "Galatians",
    subtitle: "6 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 1,
    category: "Tier 1 — Core",
    chapters: 6,
    structureFormula: "2 → 2 → 2",
    blocks: [
      { chapters: "1–2", label: "PERSONAL", description: "Paul defends his apostleship" },
      { chapters: "3–4", label: "DOCTRINAL", description: "Faith vs. Law argued from Scripture" },
      { chapters: "5–6", label: "PRACTICAL", description: "Freedom lived out in the Spirit" }
    ],
    anchors: [
      { ch: 1, word: "CURSE", scene: "Any gospel other than Paul's — 'let him be accursed'" },
      { ch: 2, word: "FACE", scene: "Paul opposed Peter to his face at Antioch" },
      { ch: 3, word: "ABRAHAM", scene: "Were you justified by faith or works? Ask Abraham" },
      { ch: 4, word: "HAGAR", scene: "Two covenants — Hagar (Sinai) vs. Sarah (promise)" },
      { ch: 5, word: "FRUIT", scene: "Fruit of the Spirit vs. works of the flesh" },
      { ch: 6, word: "CROSS", scene: "'May I never boast except in the cross'" }
    ],
    memorySentence: "Paul pronounces a CURSE, stands toe to toe FACE to face, calls ABRAHAM as his witness, contrasts HAGAR and Sarah, lists the FRUIT of the Spirit, and boasts only in the CROSS.",
    keyVerses: [
      { ref: "Galatians 1:8", theme: "'Even if we or an angel — let him be accursed' (Gospel non-negotiable)" },
      { ref: "Galatians 2:20", theme: "'I have been crucified with Christ' (Union with Christ)" },
      { ref: "Galatians 5:1", theme: "'For freedom Christ has set us free' (The thesis of chapters 5-6)" }
    ]
  },
  {
    id: "ephesians",
    title: "Ephesians",
    subtitle: "6 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 1,
    category: "Tier 1 — Core",
    chapters: 6,
    structureFormula: "3 → 3",
    blocks: [
      { chapters: "1–3", label: "DOCTRINE", description: "Who you ARE in Christ — seated" },
      { chapters: "4–6", label: "DUTY", description: "How you WALK in Christ — standing" }
    ],
    anchors: [
      { ch: 1, word: "HEAVENLY", scene: "Every spiritual blessing in the heavenly places" },
      { ch: 2, word: "WALL", scene: "The dividing wall of hostility — demolished" },
      { ch: 3, word: "MYSTERY", scene: "The mystery hidden for ages — Gentiles as co-heirs" },
      { ch: 4, word: "WALK", scene: "'Walk worthy' — unity, gifts, putting off the old self" },
      { ch: 5, word: "LIGHT", scene: "Walk as children of light — marriage as gospel picture" },
      { ch: 6, word: "ARMOR", scene: "Full armor of God — stand firm" }
    ],
    memorySentence: "Blessed with every HEAVENLY gift, the WALL between us torn down, the MYSTERY revealed — therefore WALK as children of LIGHT and put on the full ARMOR.",
    keyVerses: [
      { ref: "Ephesians 1:3", theme: "'Every spiritual blessing in the heavenly places' (The foundation)" },
      { ref: "Ephesians 2:8-9", theme: "'By grace through faith — not of works' (The heart)" },
      { ref: "Ephesians 4:1", theme: "'Walk worthy of the calling' (The great hinge)" }
    ]
  },
  {
    id: "acts",
    title: "Acts",
    subtitle: "28 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 1,
    category: "Tier 1 — Core",
    chapters: 28,
    structureFormula: "7 → 5 → 9 → 7",
    blocks: [
      { chapters: "1–7", label: "JERUSALEM", description: "Church born — Peter leads" },
      { chapters: "8–12", label: "JUDEA/SAMARIA", description: "Gospel scatters" },
      { chapters: "13–21", label: "ENDS OF EARTH", description: "Paul's 3 missionary journeys" },
      { chapters: "22–28", label: "ROME", description: "Paul arrested — gospel reaches Caesar's house" }
    ],
    anchors: [
      { ch: 1, word: "CLOUD", scene: "Jesus ascends into a cloud" },
      { ch: 2, word: "FIRE", scene: "Tongues of fire — 3,000 saved at Pentecost" },
      { ch: 3, word: "GATE", scene: "Lame man healed at the Beautiful Gate" },
      { ch: 4, word: "PRISON", scene: "Peter and John arrested and imprisoned" },
      { ch: 5, word: "FEET", scene: "Ananias and Sapphira fall dead at the apostles' feet" },
      { ch: 6, word: "TABLE", scene: "Seven deacons chosen to serve tables" },
      { ch: 7, word: "STONES", scene: "Stephen stoned — first martyr" },
      { ch: 8, word: "ROAD", scene: "Philip on the desert road — Ethiopian eunuch baptized" },
      { ch: 9, word: "LIGHT", scene: "Saul blinded by light on the Damascus road" },
      { ch: 10, word: "SHEET", scene: "Peter's vision — sheet of unclean animals" },
      { ch: 11, word: "ANTIOCH", scene: "First called 'Christians' at Antioch" },
      { ch: 12, word: "CHAINS", scene: "Peter in chains — angel frees him" },
      { ch: 13, word: "SAIL", scene: "First missionary journey begins — Paul and Barnabas sail" },
      { ch: 14, word: "GODS", scene: "Crowd tries to worship Paul and Barnabas as gods" },
      { ch: 15, word: "COUNCIL", scene: "Jerusalem Council — circumcision debate settled" },
      { ch: 16, word: "EARTHQUAKE", scene: "Philippian jailer — midnight earthquake" },
      { ch: 17, word: "ALTAR", scene: "Athens — 'To the Unknown God' altar" },
      { ch: 18, word: "TENT", scene: "Corinth — Paul the tentmaker with Aquila and Priscilla" },
      { ch: 19, word: "RIOT", scene: "Ephesus riot — 'Great is Artemis!'" },
      { ch: 20, word: "WINDOW", scene: "Eutychus falls from a window — Paul raises him" },
      { ch: 21, word: "BOUND", scene: "Agabus binds Paul's hands — prophecy of arrest" },
      { ch: 22, word: "CROWD", scene: "Paul's defense to the Jerusalem crowd" },
      { ch: 23, word: "PLOT", scene: "40 men plot to kill Paul — nephew uncovers it" },
      { ch: 24, word: "FELIX", scene: "Paul before Governor Felix" },
      { ch: 25, word: "CAESAR", scene: "'I appeal to Caesar!' — Paul before Festus" },
      { ch: 26, word: "KING", scene: "Paul before King Agrippa" },
      { ch: 27, word: "SHIPWRECK", scene: "Storm and shipwreck on the way to Rome" },
      { ch: 28, word: "HOUSE", scene: "Paul under house arrest in Rome — preaching freely" }
    ],
    memorySentence: "Jesus ascends through a CLOUD, FIRE falls at Pentecost, a lame man walks through a GATE, Peter lands in PRISON, two drop dead at the apostles' FEET, seven men are chosen to serve TABLES, Stephen dies under STONES, Philip runs down a ROAD, Saul is blinded by LIGHT, Peter sees a SHEET, believers are named in ANTIOCH, Peter breaks his CHAINS, Paul and Barnabas SAIL, nearly worshiped as GODS, the Jerusalem COUNCIL settles everything, an EARTHQUAKE frees a jailer, Paul preaches beside an ALTAR, makes TENTS in Corinth, survives a RIOT, raises a man from a WINDOW, gets BOUND by prophecy, defends to a CROWD, survives a PLOT, stands before FELIX, appeals to CAESAR, addresses a KING, survives a SHIPWRECK, and preaches from a HOUSE in Rome.",
    keyVerses: [
      { ref: "Acts 1:8", theme: "'You will be my witnesses' (The outline key)" },
      { ref: "Acts 2:42", theme: "'They devoted themselves to the apostles' teaching' (The church pattern)" },
      { ref: "Acts 28:31", theme: "'He proclaimed the kingdom of God' (The unhindered gospel)" }
    ]
  },
  {
    id: "hebrews",
    title: "Hebrews",
    subtitle: "13 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 1,
    category: "Tier 1 — Core",
    chapters: 13,
    structureFormula: "2 → 2 → 3 → 3 → 1 → 2",
    blocks: [
      { chapters: "1–2", label: "SUPERIOR TO ANGELS", description: "The Son enthroned" },
      { chapters: "3–4", label: "SUPERIOR TO MOSES", description: "Enter His rest" },
      { chapters: "5–7", label: "THE HIGH PRIEST", description: "Melchizedek order" },
      { chapters: "8–10", label: "THE NEW COVENANT", description: "Better sacrifice, once for all" },
      { chapters: "11", label: "FAITH", description: "The great cloud of witnesses" },
      { chapters: "12–13", label: "ENDURANCE", description: "Run the race" }
    ],
    anchors: [
      { ch: 1, word: "SON", scene: "'In these last days He has spoken to us by His Son'" },
      { ch: 2, word: "TASTE", scene: "Jesus tasted death for everyone" },
      { ch: 3, word: "HOUSE", scene: "Moses faithful as a servant in God's house — Jesus as Son over the house" },
      { ch: 4, word: "REST", scene: "A Sabbath rest remains for the people of God" },
      { ch: 5, word: "MILK", scene: "You need milk not solid food" },
      { ch: 6, word: "ANCHOR", scene: "Hope as an anchor for the soul — firm and secure" },
      { ch: 7, word: "MELCHIZEDEK", scene: "Priest forever — greater than Abraham and Levi" },
      { ch: 8, word: "COPY", scene: "Earthly tabernacle is a shadow and copy of the heavenly" },
      { ch: 9, word: "BLOOD", scene: "Without the shedding of blood there is no forgiveness" },
      { ch: 10, word: "ONCE", scene: "Christ offered once for all — sit down, work is finished" },
      { ch: 11, word: "FAITH", scene: "Faith Hall of Fame — Abel to the prophets" },
      { ch: 12, word: "RACE", scene: "Run with endurance — fix your eyes on Jesus" },
      { ch: 13, word: "GATE", scene: "Jesus suffered outside the gate — go to him there" }
    ],
    memorySentence: "The SON TASTED death, is greater than Moses in His HOUSE, offers eternal REST, warns those still on MILK, is our ANCHOR as the eternal MELCHIZEDEK, not a COPY but the reality — His BLOOD offered ONCE for all, through FAITH we RACE to meet Him outside the GATE.",
    keyVerses: [
      { ref: "Hebrews 1:1-2", theme: "'In these last days He has spoken by His Son' (The thesis)" },
      { ref: "Hebrews 4:12", theme: "'The word of God is living and active' (The sword)" },
      { ref: "Hebrews 12:2", theme: "'Fix your eyes on Jesus' (The climax)" }
    ]
  },
  {
    id: "revelation",
    title: "Revelation",
    subtitle: "22 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 1,
    category: "Tier 1 — Core",
    chapters: 22,
    structureFormula: "1 → 2 → 2 → 2 → 4 → 3 → 2 → 3 → 3",
    blocks: [
      { chapters: "1", label: "VISION OF CHRIST", description: "" },
      { chapters: "2–3", label: "SEVEN CHURCHES", description: "" },
      { chapters: "4–5", label: "THRONE ROOM", description: "" },
      { chapters: "6–7", label: "SEVEN SEALS", description: "" },
      { chapters: "8–11", label: "SEVEN TRUMPETS", description: "" },
      { chapters: "12–14", label: "COSMIC CONFLICT", description: "" },
      { chapters: "15–16", label: "SEVEN BOWLS", description: "" },
      { chapters: "17–19", label: "FALL OF BABYLON", description: "" },
      { chapters: "20–22", label: "NEW CREATION", description: "" }
    ],
    anchors: [
      { ch: 1, word: "ROBE", scene: "Christ in a long robe — eyes like fire" },
      { ch: 2, word: "LETTERS", scene: "Four letters — Ephesus, Smyrna, Pergamum, Thyatira" },
      { ch: 3, word: "DOOR", scene: "Three letters — 'Behold I stand at the door and knock'" },
      { ch: 4, word: "THRONE", scene: "Throne room — four living creatures, 24 elders" },
      { ch: 5, word: "LAMB", scene: "The slain Lamb takes the scroll — worthy to open it" },
      { ch: 6, word: "HORSE", scene: "Four horsemen — white, red, black, pale" },
      { ch: 7, word: "SEALED", scene: "144,000 sealed — great multitude no one can number" },
      { ch: 8, word: "INCENSE", scene: "Golden censer of incense — silence in heaven" },
      { ch: 9, word: "LOCUSTS", scene: "Demonic locusts from the abyss" },
      { ch: 10, word: "SCROLL", scene: "Little scroll — sweet in the mouth, bitter in the stomach" },
      { ch: 11, word: "WITNESSES", scene: "Two witnesses — killed, raised, ascend" },
      { ch: 12, word: "DRAGON", scene: "Red dragon pursues the woman and her child" },
      { ch: 13, word: "BEAST", scene: "Beast from the sea — 666, mark of the beast" },
      { ch: 14, word: "HARVEST", scene: "The Lamb on Mount Zion — the great harvest" },
      { ch: 15, word: "SONG", scene: "Song of Moses and the Lamb" },
      { ch: 16, word: "ARMAGEDDON", scene: "Seven bowls poured — kings gathered at Armageddon" },
      { ch: 17, word: "HARLOT", scene: "Harlot Babylon riding the scarlet beast" },
      { ch: 18, word: "SMOKE", scene: "Babylon falls — merchants weep, smoke rises" },
      { ch: 19, word: "SWORD", scene: "Rider on a white horse — sword from His mouth" },
      { ch: 20, word: "CHAINS", scene: "Satan bound in chains — great white throne judgment" },
      { ch: 21, word: "CITY", scene: "New Jerusalem descends — no more tears, no more death" },
      { ch: 22, word: "RIVER", scene: "River of life — tree of life — 'Come, Lord Jesus'" }
    ],
    memorySentence: "Christ in His ROBE sends LETTERS and knocks at the DOOR, the THRONE room erupts as the LAMB takes the scroll, four HORSES ride, the SEALED multitude sings, INCENSE rises as LOCUSTS swarm, a little SCROLL is eaten, two WITNESSES rise, a DRAGON chases the woman, the BEAST marks his own, the great HARVEST comes, the SONG of Moses rings as ARMAGEDDON gathers, the HARLOT falls in SMOKE, the rider with a SWORD conquers, Satan is put in CHAINS, the holy CITY descends, and the RIVER of life flows forever.",
    keyVerses: [
      { ref: "Revelation 1:19", theme: "'Write what you have seen' (The outline key)" },
      { ref: "Revelation 5:9", theme: "'Worthy is the Lamb who was slain' (The theological center)" },
      { ref: "Revelation 21:5", theme: "'Behold, I am making all things new' (The final answer)" }
    ]
  },

  // =============================
  // TIER 2 — IMPORTANT BOOK GUIDES
  // =============================
  {
    id: "matthew",
    title: "Matthew",
    subtitle: "28 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 2,
    category: "Tier 2 — Important",
    chapters: 28,
    structureFormula: "4 → 3 → 3 → 3 → 5 → 7 → 3",
    blocks: [
      { chapters: "1–4", label: "ARRIVAL", description: "Birth, baptism, temptation" },
      { chapters: "5–7", label: "SERMON 1", description: "Sermon on the Mount" },
      { chapters: "8–10", label: "POWER", description: "Miracles + Sermon 2: Mission" },
      { chapters: "11–13", label: "CONFLICT", description: "Opposition rises + Sermon 3: Parables" },
      { chapters: "14–18", label: "IDENTITY", description: "Who is Jesus? + Sermon 4: Community" },
      { chapters: "19–25", label: "JERUSALEM", description: "Entry, clashes + Sermon 5: End Times" },
      { chapters: "26–28", label: "PASSION", description: "Death and Resurrection" }
    ],
    anchors: [
      { ch: 1, word: "GENEALOGY", scene: "'Son of David, Son of Abraham' — the royal line" },
      { ch: 2, word: "STAR", scene: "Magi follow the star — Herod slaughters the innocents" },
      { ch: 3, word: "DOVE", scene: "Baptism — Spirit descends like a dove" },
      { ch: 4, word: "DESERT", scene: "Temptation in the desert — 'It is written' three times" },
      { ch: 5, word: "BEATITUDES", scene: "Blessed are the poor in spirit — salt and light" },
      { ch: 6, word: "PRAYER", scene: "The Lord's Prayer — treasures in heaven" },
      { ch: 7, word: "ROCK", scene: "Build on the rock — two gates, two trees, two builders" },
      { ch: 8, word: "CENTURION", scene: "'I have not found such faith in Israel'" },
      { ch: 9, word: "HARVEST", scene: "'The harvest is plentiful but workers are few'" },
      { ch: 10, word: "SWORD", scene: "'I came not to bring peace but a sword' — mission discourse" },
      { ch: 11, word: "YOKE", scene: "'Come to me… my yoke is easy, my burden is light'" },
      { ch: 12, word: "SIGN", scene: "No sign given except the sign of Jonah" },
      { ch: 13, word: "SOWER", scene: "Sower, wheat and tares, mustard seed — seven parables" },
      { ch: 14, word: "WAVES", scene: "Peter walks on water — then sinks" },
      { ch: 15, word: "CRUMBS", scene: "Canaanite woman — 'even dogs eat the crumbs'" },
      { ch: 16, word: "KEYS", scene: "'You are Peter… I will give you the keys of the kingdom'" },
      { ch: 17, word: "CLOUD", scene: "Transfiguration — voice from the cloud: 'Listen to Him'" },
      { ch: 18, word: "CHILD", scene: "'Unless you become like a child' — community discourse" },
      { ch: 19, word: "CAMEL", scene: "Camel through the eye of a needle — rich young ruler" },
      { ch: 20, word: "LAST", scene: "'The last shall be first' — workers in the vineyard" },
      { ch: 21, word: "DONKEY", scene: "Triumphal entry — temple cleansed, fig tree cursed" },
      { ch: 22, word: "WEDDING", scene: "Wedding banquet parable — 'Many called, few chosen'" },
      { ch: 23, word: "WOES", scene: "Seven woes to the Pharisees — 'Blind guides!'" },
      { ch: 24, word: "EAGLES", scene: "Olivet Discourse — signs of the end" },
      { ch: 25, word: "OIL", scene: "Ten virgins — five with oil, five without" },
      { ch: 26, word: "JAR", scene: "Woman breaks alabaster jar — Last Supper, Gethsemane" },
      { ch: 27, word: "CURTAIN", scene: "Curtain torn — darkness, earthquake, 'Son of God!'" },
      { ch: 28, word: "MOUNTAIN", scene: "Great Commission on the mountain — 'Go therefore'" }
    ],
    memorySentence: "A GENEALOGY leads to a STAR, a DOVE descends in the DESERT, the BEATITUDES open the PRAYER on the ROCK, a CENTURION believes, the HARVEST needs workers, a SWORD divides, wear His YOKE, ask for no SIGN, hear the SOWER — Peter walks on WAVES, a woman begs for CRUMBS, receives the KEYS, hears the voice in the CLOUD, becomes like a CHILD, the CAMEL cannot fit, the LAST go first, Jesus enters on a DONKEY, tells the WEDDING parable, pronounces seven WOES, points to EAGLES circling, warns about OIL, a JAR is broken, the CURTAIN tears, and a MOUNTAIN becomes the launch of the Great Commission.",
    keyVerses: [
      { ref: "Matthew 1:23", theme: "'Immanuel — God with us' (The thesis)" },
      { ref: "Matthew 16:18", theme: "'On this rock I will build my church' (The pivot)" },
      { ref: "Matthew 28:19-20", theme: "'Go therefore and make disciples' (The commission)" }
    ]
  },
  {
    id: "luke",
    title: "Luke",
    subtitle: "24 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 2,
    category: "Tier 2 — Important",
    chapters: 24,
    structureFormula: "4 → 5 → 10 → 4 → 1",
    blocks: [
      { chapters: "1–4", label: "BEGINNINGS", description: "Birth narratives + launch" },
      { chapters: "5–9", label: "GALILEAN", description: "Ministry in Galilee" },
      { chapters: "10–19", label: "JOURNEY", description: "The long road to Jerusalem — 10 chapters!" },
      { chapters: "20–23", label: "JERUSALEM", description: "Temple conflict, Passion" },
      { chapters: "24", label: "RESURRECTION", description: "Emmaus + Ascension" }
    ],
    anchors: [
      { ch: 1, word: "SONG", scene: "Mary's Magnificat + Zechariah's Benedictus" },
      { ch: 2, word: "MANGER", scene: "Birth in a manger — shepherds and angels" },
      { ch: 3, word: "GENEALOGY", scene: "Baptism + Luke's genealogy traced back to Adam" },
      { ch: 4, word: "SCROLL", scene: "Jesus reads Isaiah in Nazareth — 'Today this is fulfilled'" },
      { ch: 5, word: "NET", scene: "Peter's miraculous catch — 'I am a sinful man'" },
      { ch: 6, word: "PLAIN", scene: "Sermon on the Plain — Beatitudes and woes" },
      { ch: 7, word: "TEARS", scene: "Sinful woman washes feet with tears and hair" },
      { ch: 8, word: "LAMP", scene: "Lamp on a stand — don't hide the light" },
      { ch: 9, word: "FACE", scene: "Transfiguration — Jesus' face changed; 'set his face toward Jerusalem'" },
      { ch: 10, word: "FEET", scene: "Mary sits at Jesus' feet — Martha bustles around" },
      { ch: 11, word: "KNOCK", scene: "'Ask, seek, knock' — friend at midnight" },
      { ch: 12, word: "BARNS", scene: "Rich fool builds bigger barns" },
      { ch: 13, word: "FIG", scene: "Parable of the barren fig tree — one more year" },
      { ch: 14, word: "TABLE", scene: "Great Banquet — 'Come, for everything is ready'" },
      { ch: 15, word: "COIN", scene: "Lost sheep, lost coin, lost son — three parables of lostness" },
      { ch: 16, word: "RICH", scene: "Rich man and Lazarus — great chasm fixed" },
      { ch: 17, word: "TEN", scene: "Ten lepers healed — only one returns" },
      { ch: 18, word: "WIDOW", scene: "Persistent widow — Pharisee and tax collector" },
      { ch: 19, word: "TREE", scene: "Zacchaeus climbs a sycamore tree" },
      { ch: 20, word: "STONE", scene: "Cornerstone rejected" },
      { ch: 21, word: "WIDOW", scene: "Widow's mite — signs of the end" },
      { ch: 22, word: "CUP", scene: "Last Supper — 'This cup is the new covenant in my blood'" },
      { ch: 23, word: "PARADISE", scene: "'Today you will be with me in Paradise' — thief on the cross" },
      { ch: 24, word: "ROAD", scene: "Emmaus road — 'Did not our hearts burn within us?'" }
    ],
    memorySentence: "Mary's SONG over a MANGER, a GENEALOGY back to Adam, Jesus reads a SCROLL, Peter drops his NET, the Sermon on the PLAIN, a woman's TEARS fall, a LAMP burns, Jesus sets His FACE, Mary sits at His FEET, a friend comes to KNOCK, the rich fool fills his BARNS, a FIG tree gets one more year, a TABLE is prepared, a COIN is found, a RICH man ignores Lazarus, TEN lepers walk away, a WIDOW keeps knocking, Zacchaeus climbs a TREE, the STONE is rejected, a WIDOW gives her mite, Jesus lifts the CUP, promises PARADISE, and walks the ROAD to Emmaus.",
    keyVerses: [
      { ref: "Luke 1:46-47", theme: "'My soul magnifies the Lord' (The keynote)" },
      { ref: "Luke 15:20", theme: "'While he was still a long way off, his father ran' (The heart)" },
      { ref: "Luke 19:10", theme: "'The Son of Man came to seek and save the lost' (The mission)" }
    ]
  },
  {
    id: "1corinthians",
    title: "1 Corinthians",
    subtitle: "16 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 2,
    category: "Tier 2 — Important",
    chapters: 16,
    structureFormula: "4 → 3 → 4 → 3 → 1 → 1",
    blocks: [
      { chapters: "1–4", label: "DIVISIONS", description: "Party spirit and wisdom of the cross" },
      { chapters: "5–7", label: "DISORDERS", description: "Sexuality, marriage, lawsuits" },
      { chapters: "8–11", label: "DISPUTES", description: "Food, worship, Lord's Supper" },
      { chapters: "12–14", label: "GIFTS", description: "Spiritual gifts — love as greatest" },
      { chapters: "15", label: "RESURRECTION", description: "The doctrinal climax" },
      { chapters: "16", label: "DETAILS", description: "Collection and closing" }
    ],
    anchors: [
      { ch: 1, word: "CROSS", scene: "'The message of the cross is foolishness to those perishing'" },
      { ch: 2, word: "SPIRIT", scene: "'The Spirit searches all things — even the depths of God'" },
      { ch: 3, word: "FIRE", scene: "Each builder's work tested by fire — gold or straw" },
      { ch: 4, word: "FOOLS", scene: "'We are fools for Christ' — apostles as spectacle" },
      { ch: 5, word: "YEAST", scene: "A little yeast leavens the whole lump" },
      { ch: 6, word: "TEMPLE", scene: "'Your body is a temple of the Holy Spirit'" },
      { ch: 7, word: "MARRIED", scene: "Marriage, divorce, and singleness" },
      { ch: 8, word: "IDOL", scene: "Food sacrificed to idols — knowledge puffs up" },
      { ch: 9, word: "RACE", scene: "'Run in such a way as to win the prize'" },
      { ch: 10, word: "ROCK", scene: "The rock that followed them was Christ" },
      { ch: 11, word: "TABLE", scene: "Lord's Supper abused — 'examine yourselves'" },
      { ch: 12, word: "BODY", scene: "One body, many members" },
      { ch: 13, word: "LOVE", scene: "'If I have not love I am nothing' — love never fails" },
      { ch: 14, word: "TONGUE", scene: "Tongues and prophecy — 'all things decently and in order'" },
      { ch: 15, word: "SEED", scene: "Resurrection body like a seed — 'O death, where is your sting?'" },
      { ch: 16, word: "DOOR", scene: "'A great door of effective work has opened'" }
    ],
    memorySentence: "The CROSS is wisdom, the SPIRIT searches deep, FIRE tests each builder, FOOLS for Christ, a little YEAST corrupts, your body is a TEMPLE, the MARRIED and single each have callings, IDOL meat divides, RACE to win, drink from the ROCK, don't abuse the TABLE, the BODY has many members, without LOVE nothing counts, TONGUES must serve others, we rise like a SEED, and a great DOOR stands open.",
    keyVerses: [
      { ref: "1 Corinthians 1:18", theme: "'The message of the cross is foolishness… but to us it is the power of God'" },
      { ref: "1 Corinthians 13:13", theme: "'The greatest of these is love'" },
      { ref: "1 Corinthians 15:20", theme: "'Christ has been raised — the firstfruits'" }
    ]
  },
  {
    id: "philippians",
    title: "Philippians",
    subtitle: "4 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 2,
    category: "Tier 2 — Important",
    chapters: 4,
    structureFormula: "1 → 1 → 1 → 1",
    blocks: [
      { chapters: "1", label: "CHAINS", description: "Joy in suffering" },
      { chapters: "2", label: "MIND", description: "Humility of Christ — kenosis" },
      { chapters: "3", label: "PRIZE", description: "Press on toward the goal" },
      { chapters: "4", label: "PEACE", description: "Contentment and peace of God" }
    ],
    anchors: [
      { ch: 1, word: "CHAINS", scene: "'My chains have advanced the gospel' — to die is gain" },
      { ch: 2, word: "KNEE", scene: "Every knee shall bow — Christ emptied Himself" },
      { ch: 3, word: "RUBBISH", scene: "'I count everything as rubbish compared to knowing Christ'" },
      { ch: 4, word: "CONTENT", scene: "'I have learned in all circumstances to be content'" }
    ],
    memorySentence: "From CHAINS Paul rejoices, at every KNEE Christ is Lord, all earthly gain is RUBBISH, and in all things Paul is CONTENT.",
    keyVerses: [
      { ref: "Philippians 1:21", theme: "'To live is Christ, to die is gain'" },
      { ref: "Philippians 2:5-8", theme: "'Have this mind — Christ humbled himself'" },
      { ref: "Philippians 4:7", theme: "'The peace of God which surpasses understanding'" }
    ]
  },
  {
    id: "colossians",
    title: "Colossians",
    subtitle: "4 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 2,
    category: "Tier 2 — Important",
    chapters: 4,
    structureFormula: "2 → 2",
    blocks: [
      { chapters: "1–2", label: "DOCTRINE", description: "Christ's supremacy" },
      { chapters: "3–4", label: "DUTY", description: "Set your minds on things above" }
    ],
    anchors: [
      { ch: 1, word: "IMAGE", scene: "'He is the image of the invisible God — firstborn over all creation'" },
      { ch: 2, word: "SHADOW", scene: "Old rituals are shadows — the substance belongs to Christ" },
      { ch: 3, word: "ABOVE", scene: "'Set your minds on things above' — put off the old self" },
      { ch: 4, word: "SALT", scene: "'Let your speech always be gracious, seasoned with salt'" }
    ],
    memorySentence: "Christ is the IMAGE of God, the old law was a SHADOW, now set your heart on things ABOVE, and season your words with SALT.",
    keyVerses: [
      { ref: "Colossians 1:15-17", theme: "'He is before all things and in him all things hold together'" },
      { ref: "Colossians 2:9", theme: "'In Him the whole fullness of deity dwells bodily'" },
      { ref: "Colossians 3:1-2", theme: "'Seek the things that are above'" }
    ]
  },
  {
    id: "james",
    title: "James",
    subtitle: "5 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 2,
    category: "Tier 2 — Important",
    chapters: 5,
    structureFormula: "1 → 1 → 1 → 1 → 1",
    blocks: [
      { chapters: "1", label: "TRIALS", description: "Testing produces endurance" },
      { chapters: "2", label: "FAITH", description: "Faith without works is dead" },
      { chapters: "3", label: "TONGUE", description: "The tongue is a fire" },
      { chapters: "4", label: "PRIDE", description: "Submit to God" },
      { chapters: "5", label: "PATIENCE", description: "Wait for the Lord" }
    ],
    anchors: [
      { ch: 1, word: "MIRROR", scene: "Hear the word and do it — don't be like a man who forgets his face in a mirror" },
      { ch: 2, word: "RING", scene: "Man with gold rings welcomed — poor man told to sit on the floor" },
      { ch: 3, word: "FIRE", scene: "The tongue — a small fire that sets a great forest ablaze" },
      { ch: 4, word: "FOG", scene: "'You are a mist that appears for a little while then vanishes'" },
      { ch: 5, word: "RAIN", scene: "Be patient like the farmer waiting for the early and late rains" }
    ],
    memorySentence: "Look in the MIRROR and act on it, don't honor the gold RING over the poor, guard the FIRE of the tongue, your life is a FOG so submit to God, wait for the RAIN with patience.",
    keyVerses: [
      { ref: "James 1:22", theme: "'Be doers of the word and not hearers only'" },
      { ref: "James 2:17", theme: "'Faith by itself, if it does not have works, is dead'" },
      { ref: "James 5:16", theme: "'The prayer of a righteous person has great power'" }
    ]
  },
  {
    id: "1peter",
    title: "1 Peter",
    subtitle: "5 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 2,
    category: "Tier 2 — Important",
    chapters: 5,
    structureFormula: "1 → 1 → 1 → 1 → 1",
    blocks: [
      { chapters: "1", label: "HOPE", description: "Living hope through resurrection" },
      { chapters: "2", label: "STONE", description: "Living stone, chosen people" },
      { chapters: "3", label: "SUFFERING", description: "Suffer for doing good" },
      { chapters: "4", label: "JUDGMENT", description: "Judgment begins at the household of God" },
      { chapters: "5", label: "ELDERS", description: "Shepherd the flock" }
    ],
    anchors: [
      { ch: 1, word: "GOLD", scene: "Faith more precious than gold refined by fire" },
      { ch: 2, word: "STONE", scene: "Jesus the living cornerstone — you are a chosen people, a royal priesthood" },
      { ch: 3, word: "ARK", scene: "Eight people saved through water — baptism now saves you" },
      { ch: 4, word: "FIERY", scene: "'Do not be surprised at the fiery trial'" },
      { ch: 5, word: "LION", scene: "'Your adversary the devil prowls like a roaring lion'" }
    ],
    memorySentence: "Faith is more precious than GOLD, Christ is the living STONE, Noah's ARK points to salvation, don't fear the FIERY trial, and stand firm against the roaring LION.",
    keyVerses: [
      { ref: "1 Peter 1:3", theme: "'A living hope through the resurrection'" },
      { ref: "1 Peter 2:9", theme: "'A chosen people, a royal priesthood, a holy nation'" },
      { ref: "1 Peter 5:7", theme: "'Cast all your anxiety on him because he cares for you'" }
    ]
  },

  // =============================
  // TIER 3 — ADDITIONAL BOOK GUIDES
  // =============================
  {
    id: "mark",
    title: "Mark",
    subtitle: "16 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 3,
    category: "Tier 3 — Additional",
    chapters: 16,
    structureFormula: "8 → 8",
    blocks: [
      { chapters: "1–8", label: "WHO IS HE?", description: "Identity revealed through action" },
      { chapters: "8:29", label: "THE HINGE", description: "Peter's confession" },
      { chapters: "9–16", label: "WHERE IS HE GOING?", description: "The road to the cross" }
    ],
    anchors: [
      { ch: 1, word: "IMMEDIATELY", scene: "Baptism → temptation → calling → healing — all in one chapter" },
      { ch: 2, word: "ROOF", scene: "Four friends tear through a roof to lower the paralyzed man" },
      { ch: 3, word: "FAMILY", scene: "Jesus' family thinks He is out of His mind" },
      { ch: 4, word: "STORM", scene: "Jesus asleep in the boat — 'Peace, be still!'" },
      { ch: 5, word: "PIGS", scene: "Legion cast into pigs — man clothed and in his right mind" },
      { ch: 6, word: "PLATE", scene: "John the Baptist's head brought on a plate" },
      { ch: 7, word: "FINGERS", scene: "Jesus puts fingers in the deaf man's ears — 'Ephphatha'" },
      { ch: 8, word: "EYES", scene: "Blind man healed in two stages — then Peter sees who Jesus is" },
      { ch: 9, word: "CLOUD", scene: "Transfiguration — cloud overshadows" },
      { ch: 10, word: "CLOAK", scene: "Blind Bartimaeus throws off his cloak and runs to Jesus" },
      { ch: 11, word: "LEAVES", scene: "Fig tree cursed — all leaves, no fruit; temple cleansed" },
      { ch: 12, word: "COIN", scene: "Coin of Caesar — 'Render to Caesar… render to God'" },
      { ch: 13, word: "WATCHMAN", scene: "Olivet Discourse — 'Watch! You do not know when'" },
      { ch: 14, word: "JAR", scene: "Woman breaks alabaster jar — Last Supper, Gethsemane, Peter denies" },
      { ch: 15, word: "CURTAIN", scene: "Crucifixion — curtain torn; centurion: 'Truly this was the Son of God'" },
      { ch: 16, word: "STONE", scene: "Stone rolled away — 'He is risen, He is not here'" }
    ],
    memorySentence: "IMMEDIATELY Jesus comes, men tear through a ROOF, His own FAMILY doubts, He calms a STORM, casts demons into PIGS, John's head arrives on a PLATE, FINGERS open deaf ears, blind EYES open in stages — then Peter sees — a CLOUD at the Transfiguration, Bartimaeus throws his CLOAK, a fig tree has only LEAVES, a COIN settles the Caesar question, the WATCHMAN waits, an alabaster JAR is broken, the temple CURTAIN tears, and a STONE is rolled away.",
    keyVerses: [
      { ref: "Mark 1:15", theme: "'The kingdom of God is at hand — repent and believe' (The thesis)" },
      { ref: "Mark 8:29", theme: "'You are the Christ' (The hinge)" },
      { ref: "Mark 10:45", theme: "'The Son of Man came not to be served but to serve' (The mission)" }
    ]
  },
  {
    id: "2corinthians",
    title: "2 Corinthians",
    subtitle: "13 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 3,
    category: "Tier 3 — Additional",
    chapters: 13,
    structureFormula: "7 → 2 → 4",
    blocks: [
      { chapters: "1–7", label: "PAUL'S MINISTRY", description: "Defense of apostolic suffering" },
      { chapters: "8–9", label: "GENEROSITY", description: "The Jerusalem collection" },
      { chapters: "10–13", label: "DEFENSE", description: "Confronting the 'super-apostles'" }
    ],
    anchors: [
      { ch: 1, word: "COMFORT", scene: "'The God of all comfort — comforts us in all our affliction'" },
      { ch: 2, word: "FRAGRANCE", scene: "'We are the aroma of Christ — fragrance of life or death'" },
      { ch: 3, word: "VEIL", scene: "Moses' veil — we with unveiled face behold His glory" },
      { ch: 4, word: "JAR", scene: "Treasure in jars of clay — struck down but not destroyed" },
      { ch: 5, word: "TENT", scene: "Earthly tent destroyed — we have a building from God" },
      { ch: 6, word: "TEMPLE", scene: "'We are the temple of the living God'" },
      { ch: 7, word: "TEARS", scene: "Titus brings good news — Paul's tears of joy over Corinth" },
      { ch: 8, word: "GRACE", scene: "'The grace of our Lord Jesus — though He was rich, became poor'" },
      { ch: 9, word: "SEED", scene: "'Whoever sows sparingly reaps sparingly — God loves a cheerful giver'" },
      { ch: 10, word: "WEAPONS", scene: "'Our weapons are not of the flesh — we demolish arguments'" },
      { ch: 11, word: "FOOL", scene: "Paul becomes a 'fool' to list his sufferings" },
      { ch: 12, word: "THORN", scene: "'A thorn in the flesh — my grace is sufficient for you'" },
      { ch: 13, word: "EXAMINE", scene: "'Examine yourselves to see whether you are in the faith'" }
    ],
    memorySentence: "The God of COMFORT makes us a FRAGRANCE, He removes the VEIL, we carry treasure in a JAR of clay, our earthly TENT will be replaced, we are His TEMPLE, Paul weeps TEARS of relief, preaches GRACE as the model for giving, scattered SEED grows into generosity, our WEAPONS pull down strongholds, Paul plays the FOOL to defend his ministry, lives with a THORN in the flesh, and closes with a call to EXAMINE yourselves.",
    keyVerses: [
      { ref: "2 Corinthians 1:3-4", theme: "'God of all comfort — comforts us so we may comfort others'" },
      { ref: "2 Corinthians 4:7", theme: "'Treasure in jars of clay'" },
      { ref: "2 Corinthians 12:9", theme: "'My grace is sufficient — power made perfect in weakness'" }
    ]
  },
  {
    id: "1timothy",
    title: "1 Timothy",
    subtitle: "6 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 3,
    category: "Tier 3 — Additional",
    chapters: 6,
    structureFormula: "1 → 1 → 1 → 1 → 1 → 1",
    blocks: [
      { chapters: "1", label: "SOUND DOCTRINE", description: "Guard the gospel" },
      { chapters: "2", label: "WORSHIP", description: "Prayer, men, women" },
      { chapters: "3", label: "LEADERS", description: "Qualifications for overseers and deacons" },
      { chapters: "4", label: "TRAINING", description: "Train yourself in godliness" },
      { chapters: "5", label: "WIDOWS & ELDERS", description: "Care for the vulnerable" },
      { chapters: "6", label: "GODLINESS/GAIN", description: "Contentment is great gain" }
    ],
    anchors: [
      { ch: 1, word: "BLASPHEMER", scene: "'I was a blasphemer, persecutor, violent man — but I received mercy'" },
      { ch: 2, word: "HANDS", scene: "'I desire men to pray lifting holy hands'" },
      { ch: 3, word: "HOUSEHOLD", scene: "'If a man cannot manage his own household how can he care for God's church?'" },
      { ch: 4, word: "GYMNASIUM", scene: "'Train yourself for godliness'" },
      { ch: 5, word: "LIST", scene: "The widow's list — qualifications for enrollment" },
      { ch: 6, word: "ROOTS", scene: "'Love of money is a root of all kinds of evil'" }
    ],
    memorySentence: "Paul the former BLASPHEMER urges prayer with lifted HANDS, demands that leaders manage their HOUSEHOLD, calls Timothy to the GYMNASIUM of godliness, keeps a LIST of true widows, and warns that greed has ROOTS that destroy everything.",
    keyVerses: [
      { ref: "1 Timothy 1:15", theme: "'Christ Jesus came into the world to save sinners'" },
      { ref: "1 Timothy 3:15", theme: "'The church of the living God — pillar and buttress of the truth'" },
      { ref: "1 Timothy 6:6", theme: "'Godliness with contentment is great gain'" }
    ]
  },
  {
    id: "2timothy",
    title: "2 Timothy",
    subtitle: "4 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 3,
    category: "Tier 3 — Additional",
    chapters: 4,
    structureFormula: "1 → 1 → 1 → 1",
    blocks: [
      { chapters: "1", label: "GUARD IT", description: "Guard the good deposit — fan the flame" },
      { chapters: "2", label: "ENDURE IT", description: "Soldier, athlete, farmer — suffer hardship" },
      { chapters: "3", label: "KNOW IT", description: "Last days will be hard — Scripture equips" },
      { chapters: "4", label: "FINISH IT", description: "I have finished the race — preach the word" }
    ],
    anchors: [
      { ch: 1, word: "FLAME", scene: "'Fan into flame the gift of God' — guard the good deposit" },
      { ch: 2, word: "SOLDIER", scene: "Soldier, athlete, farmer — suffer hardship with Christ" },
      { ch: 3, word: "SCROLL", scene: "'All Scripture is breathed out by God' — sacred writings" },
      { ch: 4, word: "CROWN", scene: "'I have fought the good fight… the crown of righteousness awaits me'" }
    ],
    memorySentence: "Fan the FLAME of your gift, endure like a SOLDIER, hold fast to the SCROLL of Scripture, and reach for the CROWN that awaits.",
    keyVerses: [
      { ref: "2 Timothy 1:7", theme: "'God gave us a spirit not of fear but of power'" },
      { ref: "2 Timothy 3:16-17", theme: "'All Scripture is breathed out by God and profitable'" },
      { ref: "2 Timothy 4:7", theme: "'I have fought the good fight, I have finished the race'" }
    ]
  },
  {
    id: "1john",
    title: "1 John",
    subtitle: "5 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 3,
    category: "Tier 3 — Additional",
    chapters: 5,
    structureFormula: "2 → 1 → 1 → 1",
    blocks: [
      { chapters: "1-2", label: "LIGHT", description: "God is light — walk in the light, not darkness" },
      { chapters: "3", label: "LOVE", description: "Love one another — we are children of God" },
      { chapters: "4", label: "SPIRIT", description: "Test the spirits — God is love" },
      { chapters: "5", label: "FAITH", description: "Victory that overcomes the world — assurance" }
    ],
    anchors: [
      { ch: 1, word: "DARKNESS", scene: "'If we say we have fellowship with Him but walk in darkness we lie'" },
      { ch: 2, word: "WORLD", scene: "'Do not love the world — the world is passing away'" },
      { ch: 3, word: "MURDER", scene: "'Whoever hates his brother is a murderer' — Cain as warning" },
      { ch: 4, word: "FIRST", scene: "'We love because He first loved us'" },
      { ch: 5, word: "WATER", scene: "'This is He who came by water and blood — Jesus Christ'" }
    ],
    memorySentence: "Walk out of DARKNESS, stop loving the WORLD, don't be like Cain the MURDERER, love because He loved FIRST, and trust the testimony of the WATER and the blood.",
    keyVerses: [
      { ref: "1 John 1:9", theme: "'If we confess our sins He is faithful and just to forgive' (Assurance of confession)" },
      { ref: "1 John 4:8", theme: "'Anyone who does not love does not know God — for God is love' (The heart of the letter)" },
      { ref: "1 John 5:13", theme: "'I write so that you may know that you have eternal life' (The purpose statement)" }
    ]
  },
  {
    id: "titus",
    title: "Titus",
    subtitle: "3 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 3,
    category: "Tier 3 — Additional",
    chapters: 3,
    structureFormula: "1 → 1 → 1",
    blocks: [
      { chapters: "1", label: "LEADERS", description: "Appoint elders — rebuke false teachers in Crete" },
      { chapters: "2", label: "HOUSEHOLDS", description: "Teach sound doctrine to every age and role" },
      { chapters: "3", label: "SOCIETY", description: "Submit to rulers — saved by grace not works" }
    ],
    anchors: [
      { ch: 1, word: "CRETE", scene: "'Cretans are always liars, evil beasts, lazy gluttons' — appoint elders anyway" },
      { ch: 2, word: "ADORNING", scene: "'Adorn the doctrine of God our Savior in everything'" },
      { ch: 3, word: "BATH", scene: "'He saved us through the washing of regeneration and renewing of the Holy Spirit'" }
    ],
    memorySentence: "Plant leaders in CRETE, live in a way that is ADORNING to the gospel, for you were saved through the BATH of regeneration — not your own works.",
    keyVerses: [
      { ref: "Titus 1:5", theme: "'Put what remains in order and appoint elders in every town'" },
      { ref: "Titus 2:11-12", theme: "'The grace of God has appeared — training us to renounce ungodliness'" },
      { ref: "Titus 3:5", theme: "'He saved us — not because of works but according to His own mercy'" }
    ]
  },
  {
    id: "philemon",
    title: "Philemon",
    subtitle: "1 Chapter",
    icon: "📖",
    type: "book-guide",
    tier: 3,
    category: "Tier 3 — Additional",
    chapters: 1,
    structureFormula: "7 → 9 → 9",
    blocks: [
      { chapters: "1-7", label: "THANKSGIVING", description: "Paul praises Philemon's love and faith" },
      { chapters: "8-16", label: "THE REQUEST", description: "Paul appeals for Onesimus — now a brother" },
      { chapters: "17-25", label: "THE CHARGE", description: "Charge it to my account — receive him as me" }
    ],
    anchors: [
      { ch: 1, word: "CHARGE", scene: "'If he has wronged you or owes you anything — charge that to my account' (v.18)" }
    ],
    memorySentence: "The Gospel Hidden in Philemon is a parable of substitutionary atonement.",
    keyVerses: [
      { ref: "Philemon 1:10, 16", theme: "'I appeal to you for my child Onesimus… no longer as a slave but better than a slave — as a dear brother.'" }
    ]
  },
  {
    id: "2peter",
    title: "2 Peter",
    subtitle: "3 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 3,
    category: "Tier 3 — Additional",
    chapters: 3,
    structureFormula: "1 → 1 → 1",
    blocks: [
      { chapters: "1", label: "GROW", description: "Add to your faith — make your calling sure" },
      { chapters: "2", label: "BEWARE", description: "False teachers — judgment is certain" },
      { chapters: "3", label: "WAIT", description: "The Day of the Lord — patient endurance" }
    ],
    anchors: [
      { ch: 1, word: "LADDER", scene: "Add to faith: virtue → knowledge → self-control → steadfastness → godliness → love" },
      { ch: 2, word: "DOG", scene: "'The dog returns to its vomit — the sow to the mud' — false teachers" },
      { ch: 3, word: "THIEF", scene: "'The Day of the Lord will come like a thief — the heavens will pass away with a roar'" }
    ],
    memorySentence: "Climb the LADDER of faith, beware the false teacher who returns like a DOG to vomit, and stay ready — the Lord comes like a THIEF in the night.",
    keyVerses: [
      { ref: "2 Peter 1:3", theme: "'His divine power has granted us everything pertaining to life and godliness'" },
      { ref: "2 Peter 1:21", theme: "'Men spoke from God as they were carried along by the Holy Spirit' (Inspiration of Scripture)" },
      { ref: "2 Peter 3:9", theme: "'Not wishing that any should perish but that all should reach repentance'" }
    ]
  },
  {
    id: "jude",
    title: "Jude",
    subtitle: "1 Chapter",
    icon: "📖",
    type: "book-guide",
    tier: 3,
    category: "Tier 3 — Additional",
    chapters: 1,
    structureFormula: "4 → 12 → 7 → 2",
    blocks: [
      { chapters: "1-4", label: "THE ALARM", description: "Contend for the faith — certain men have crept in" },
      { chapters: "5-16", label: "THE EVIDENCE", description: "Three OT examples of judgment — Enoch prophesied it" },
      { chapters: "17-23", label: "THE RESPONSE", description: "Build up, pray, keep, have mercy" },
      { chapters: "24-25", label: "THE DOXOLOGY", description: "To Him who is able to keep you from stumbling" }
    ],
    anchors: [
      { ch: 1, word: "CREPT", scene: "'Certain people have crept in unnoticed — who long ago were designated for condemnation' (v.4)" }
    ],
    memorySentence: "Jude is an alarm bell rung in the night to contend for the faith.",
    keyVerses: [
      { ref: "Jude 1:24-25", theme: "'Now to Him who is able to keep you from stumbling...'" }
    ]
  },
  {
    id: "2john",
    title: "2 John",
    subtitle: "1 Chapter",
    icon: "📖",
    type: "book-guide",
    tier: 3,
    category: "Tier 3 — Additional",
    chapters: 1,
    structureFormula: "3 → 3 → 5 → 2",
    blocks: [
      { chapters: "1-3", label: "GREETING", description: "To the elect lady — truth and love" },
      { chapters: "4-6", label: "WALK IN LOVE", description: "Love one another — this is the command" },
      { chapters: "7-11", label: "BEWARE", description: "Many deceivers have gone out — do not receive them" },
      { chapters: "12-13", label: "CLOSING", description: "Hope to come face to face — paper and ink fall short" }
    ],
    anchors: [
      { ch: 1, word: "DOOR", scene: "'Do not receive him into your house or give him any greeting' (v.10) — the false teacher at the door" }
    ],
    memorySentence: "Walk in love toward the brethren, but do not open the door to false teachers.",
    keyVerses: [
      { ref: "2 John 1:8", theme: "'Watch yourselves so that you may not lose what we have worked for but may win a full reward.'" }
    ]
  },
  {
    id: "3john",
    title: "3 John",
    subtitle: "1 Chapter",
    icon: "📖",
    type: "book-guide",
    tier: 3,
    category: "Tier 3 — Additional",
    chapters: 1,
    structureFormula: "8 → 3 → 1 → 3",
    blocks: [
      { chapters: "1-8", label: "GAIUS PRAISED", description: "Walking in truth — showing hospitality to missionaries" },
      { chapters: "9-11", label: "DIOTREPHES WARNED", description: "Loves to be first — refuses the apostles" },
      { chapters: "12", label: "DEMETRIUS COMMENDED", description: "Well spoken of by everyone and by the truth" },
      { chapters: "13-15", label: "CLOSING", description: "Pen and ink — peace to you — greet the friends" }
    ],
    anchors: [
      { ch: 1, word: "FIRST", scene: "'Diotrephes who likes to put himself first does not acknowledge our authority' (v.9)" }
    ],
    memorySentence: "Be faithful like Gaius, avoid the pride of Diotrephes, and keep a good reputation like Demetrius.",
    keyVerses: [
      { ref: "3 John 1:4", theme: "'I have no greater joy than to hear that my children are walking in the truth.'" }
    ]
  },
  {
    id: "1thessalonians",
    title: "1 Thessalonians",
    subtitle: "5 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 3,
    category: "Tier 3 — Additional",
    chapters: 5,
    structureFormula: "3 → 2",
    blocks: [
      { chapters: "1-3", label: "PERSONAL", description: "Paul's relationship with the Thessalonians" },
      { chapters: "4-5", label: "PRACTICAL", description: "How to live while waiting for the Lord" }
    ],
    anchors: [
      { ch: 1, word: "THUNDER", scene: "'Our gospel came to you not in word only but in power — you became an example to all Macedonia'" },
      { ch: 2, word: "MOTHER", scene: "'We were gentle among you like a nursing mother caring for her children'" },
      { ch: 3, word: "CROWN", scene: "'You are our glory and joy — our crown' — Timothy's good report" },
      { ch: 4, word: "TRUMPET", scene: "'The Lord will descend with a trumpet call — the dead in Christ rise first'" },
      { ch: 5, word: "THIEF", scene: "'The Day of the Lord comes like a thief in the night — but you are children of light'" }
    ],
    memorySentence: "The gospel came like THUNDER to Thessalonica, Paul loved them like a MOTHER, called them his CROWN, promised the dead will rise at the TRUMPET, and warned the Day comes like a THIEF — but children of light are never in the dark.",
    keyVerses: [
      { ref: "1 Thessalonians 1:9-10", theme: "'You turned from idols to serve the living God and to wait for His Son from heaven' (The model conversion)" },
      { ref: "1 Thessalonians 4:16-17", theme: "'The Lord himself will descend… the dead in Christ will rise first' (The great hope)" },
      { ref: "1 Thessalonians 5:16-18", theme: "'Rejoice always, pray without ceasing, give thanks in all circumstances' (The three commands)" }
    ]
  },
  {
    id: "2thessalonians",
    title: "2 Thessalonians",
    subtitle: "3 Chapters",
    icon: "📖",
    type: "book-guide",
    tier: 3,
    category: "Tier 3 — Additional",
    chapters: 3,
    structureFormula: "1 → 1 → 1",
    blocks: [
      { chapters: "1", label: "ENCOURAGEMENT", description: "Persevere — God will repay your persecutors" },
      { chapters: "2", label: "CORRECTION", description: "The Day has NOT yet come — the man of lawlessness first" },
      { chapters: "3", label: "INSTRUCTION", description: "Work while you wait — don't be idle" }
    ],
    anchors: [
      { ch: 1, word: "FIRE", scene: "'The Lord Jesus revealed from heaven in flaming fire — taking vengeance on those who do not know God'" },
      { ch: 2, word: "RESTRAINER", scene: "'The one who restrains will be taken out of the way — then the lawless one will be revealed'" },
      { ch: 3, word: "BREAD", scene: "'If anyone is not willing to work let him not eat' — Paul worked for his own bread" }
    ],
    memorySentence: "Christ returns in FIRE to repay persecutors, the RESTRAINER still holds back the man of lawlessness, so pick up your tools and earn your BREAD while you wait.",
    keyVerses: [
      { ref: "2 Thessalonians 1:7", theme: "'Relief for you who are afflicted — when the Lord Jesus is revealed from heaven in flaming fire'" },
      { ref: "2 Thessalonians 2:3", theme: "'That day will not come unless the rebellion comes first and the man of lawlessness is revealed'" },
      { ref: "2 Thessalonians 3:10", theme: "'If anyone is not willing to work let him not eat'" }
    ]
  }
];
