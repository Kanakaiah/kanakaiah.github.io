import re
import os
import json

DATA = """
# 📖 BOOK 6: JOSHUA (24 Chapters)
## ✦ Image Word: JORDAN | Key Word: POSSESS | Subtitle: *Every Promise Kept — Every Enemy Conquered*
## ✦ Big Structure
```
Chapters  1–5    =  ENTERING      (Cross the Jordan — consecrate yourselves)
Chapters  6–12   =  CONQUERING    (Major battles — the land taken)
Chapters  13–21  =  DIVIDING      (Land distributed to the tribes)
Chapters  22–24  =  COMMITTING    (Altar controversy — Joshua's farewell)
```

## ✦ One-Word Anchors
| Ch | One Word | Scene |
|---|---|---|
| 1 | **STRONG** | "Be strong and courageous — do not be terrified" × 4 |
| 2 | **SCARLET** | Rahab's scarlet cord hung in the window — the spies escape |
| 3 | **PRIESTS** | Priests carry the ark — feet touch the Jordan — it stops |
| 4 | **STONES** | Twelve stones lifted from the riverbed — a memorial |
| 5 | **KNIFE** | Circumcision at Gilgal — manna ceases — flint knives used |
| 6 | **WALLS** | Jericho's walls collapse after seven days of marching |
| 7 | **TENT** | Achan hides plunder under his tent — Israel defeated at Ai |
| 8 | **AMBUSH** | Ambush at Ai — the city burned |
| 9 | **BREAD** | Gibeonites show stale bread — Israel fooled into a treaty |
| 10 | **SUN** | Sun stands still over Gibeon — the longest day |
| 11 | **WATERS** | Northern coalition defeated at the waters of Merom |
| 12 | **KINGS** | Thirty-one defeated kings listed |
| 13 | **REMAINING** | Much land still remains to be taken — Joshua grows old |
| 14 | **CALEB** | "Give me this mountain" — Caleb at 85 claims Hebron |
| 15 | **BOUNDARY** | Judah's detailed boundary lines |
| 16 | **EPHRAIM** | Ephraim's inheritance — but they do not drive out the Canaanites |
| 17 | **DAUGHTERS** | Zelophehad's daughters receive their inheritance |
| 18 | **LOTS** | Seven remaining tribes receive land by lot at Shiloh |
| 19 | **SIMEON** | Simeon's lot falls inside Judah's territory |
| 20 | **REFUGE** | Six cities of refuge — for accidental killing |
| 21 | **FULFILLED** | Levitical cities assigned — "Not one word of promise failed" |
| 22 | **ALTAR** | Eastern tribes build a memorial altar — almost causes civil war |
| 23 | **OLD** | Joshua's first farewell — "The LORD has fought for you" |
| 24 | **CHOOSE** | "Choose this day whom you will serve — as for me and my house" |

## ✦ Memory Sentence
> *"Be **STRONG**, Rahab hangs the **SCARLET** cord, the **PRIESTS** step in and the river stops, **STONES** mark the miracle, **KNIVES** for circumcision at Gilgal, the **WALLS** fall, a **TENT** hides Achan's sin, an **AMBUSH** burns Ai, stale **BREAD** fools Israel into a treaty, the **SUN** freezes over Gibeon, the northern **WATERS** see the last great coalition fall, thirty-one **KINGS** are listed, much land **REMAINS**, **CALEB** claims his mountain, **BOUNDARIES** are drawn, **EPHRAIM** inherits but fails to conquer, the **DAUGHTERS** claim what is theirs, the **LOTS** fall for seven more tribes, **SIMEON** settles inside Judah, **REFUGE** cities protect the innocent, every **PROMISE FULFILLED**, an **ALTAR** nearly breaks the unity, old **JOSHUA** gives his farewell, and the people **CHOOSE** their God."*

## ✦ Key Verses
| Verse | Theme |
|---|---|
| **1:9** | *"Be strong and courageous — the LORD your God is with you wherever you go"* → The commissioning |
| **21:45** | *"Not one word of all God's good promises failed — every one was fulfilled"* → The theological climax |
| **24:15** | *"Choose this day whom you will serve — as for me and my house, we will serve the LORD"* → The covenant choice |

# 📖 BOOK 7: JUDGES (21 Chapters)
## ✦ Image Word: YOKE | Key Word: CYCLE | Subtitle: *When Everyone Does What Is Right in Their Own Eyes*
## ✦ Big Structure
```
Chapters  1–2    =  PROLOGUE      (Incomplete conquest — the cycle introduced)
Chapters  3–16   =  THE JUDGES    (Twelve judges — the spiral downward)
Chapters  17–21  =  EPILOGUE      (Two horrifying stories — the bottom of the barrel)
```

## ✦ One-Word Anchors
| Ch | One Word | Scene |
|---|---|---|
| 1 | **THUMBS** | Adoni-bezek's thumbs and big toes cut off — partial conquest |
| 2 | **ANGEL** | Angel of the LORD rebukes at Bokim — the cycle announced |
| 3 | **GOAD** | Ehud kills Eglon — Shamgar kills 600 with an oxgoad |
| 4 | **TENT PEG** | Jael drives a tent peg through sleeping Sisera's temple |
| 5 | **SONG** | Deborah and Barak's victory song — "Stars fought from heaven" |
| 6 | **FLEECE** | Gideon tests God twice with a fleece — wet then dry |
| 7 | **JARS** | Gideon's 300 — jars, torches, and trumpets rout the Midianites |
| 8 | **EPHOD** | Gideon makes a golden ephod — it becomes an idol |
| 9 | **MILLSTONE** | Abimelech's skull crushed by a millstone dropped by a woman |
| 10 | **GODS** | Israel serves seven foreign gods — twenty-three years oppressed |
| 11 | **VOW** | Jephthah's rash vow — his daughter walks out to greet him |
| 12 | **SHIBBOLETH** | Ephraimites caught at the ford by their pronunciation |
| 13 | **FLAME** | Angel ascends in the altar flame — Samson's birth announced |
| 14 | **HONEY** | Samson finds honey in the lion's carcass — "Out of the eater" |
| 15 | **JAWBONE** | Samson kills 1,000 Philistines with a donkey's jawbone |
| 16 | **HAIR** | Delilah cuts Samson's hair — he is blinded and bound |
| 17 | **SILVER** | Micah's silver idol — he hires a Levite as personal priest |
| 18 | **DAN** | Tribe of Dan steals Micah's idols on their way north |
| 19 | **CONCUBINE** | The Levite's concubine brutalized in Gibeah all night |
| 20 | **CIVIL WAR** | Israel attacks Benjamin — 65,000 dead in three days |
| 21 | **WIVES** | Wives seized at Shiloh for the surviving Benjaminites |

## ✦ Memory Sentence
> *"**THUMBS** are cut, the **ANGEL** announces the cycle, the **GOAD** of Shamgar and the blade of Ehud, Jael's **TENT PEG**, Deborah's **SONG**, Gideon's **FLEECE**, **JARS** and torches rout Midian, a golden **EPHOD** corrupts, a **MILLSTONE** drops on Abimelech, **GODS** multiply so oppressors too, Jephthah's **VOW** kills his daughter, **SHIBBOLETH** catches the proud, an angel rises in **FLAME**, Samson finds **HONEY** in the lion, kills thousands with a **JAWBONE**, his **HAIR** is cut and his strength gone, **SILVER** makes a shrine, **DAN** steals it, a **CONCUBINE** is destroyed in the night, **CIVIL WAR** tears the nation, and desperate men seize **WIVES** for the survivors."*

## ✦ Key Verses
| Verse | Theme |
|---|---|
| **2:16** | *"The LORD raised up judges who saved them from the hands of raiders"* → The pattern of grace |
| **21:25** | *"In those days Israel had no king — everyone did as they saw fit"* → The closing indictment |

# 📖 BOOK 8: RUTH (4 Chapters)
## ✦ Image Word: GRAIN | Key Word: REDEEM | Subtitle: *A Gentile Woman Who Found Her Home in God's Covenant*
## ✦ Big Structure
```
Chapter  1   =  EMPTIED       (Naomi returns from Moab — empty and bitter)
Chapter  2   =  PROVIDED      (Ruth gleans in Boaz's field — grace noticed)
Chapter  3   =  CLAIMED       (Ruth at the threshing floor — "spread your wing")
Chapter  4   =  REDEEMED      (Boaz redeems — Obed born — David's line secured)
```

## ✦ One-Word Anchors
| Ch | One Word | Scene |
|---|---|---|
| 1 | **RETURN** | "Where you go I will go — your God shall be my God" |
| 2 | **GLEANING** | Ruth gleans behind the harvesters — Boaz notices and protects her |
| 3 | **THRESHING FLOOR** | Ruth uncovers Boaz's feet at night — "Spread your wing over me" |
| 4 | **SANDAL** | The nearer kinsman removes his sandal — Boaz redeems Ruth |

## ✦ Memory Sentence
> *"Naomi says **RETURN** and Ruth clings to her God, **GLEANING** brings her to Boaz's field, the **THRESHING FLOOR** becomes a place of covenant request, and the **SANDAL** is removed so the redeemer can act."*

## ✦ Key Verses
| Verse | Theme |
|---|---|
| **1:16** | *"Where you go I will go — your people shall be my people, your God my God"* → The covenant of love |
| **2:12** | *"May you be richly rewarded by the LORD under whose wings you have come to take refuge"* → The wing of Boaz = the wing of God |
| **4:14** | *"Blessed be the LORD who has not left you without a redeemer"* → The heart of the book |

# 📖 BOOK 9: 1 SAMUEL (31 Chapters)
## ✦ Image Word: HORN | Key Word: ANOINT | Subtitle: *The Last Judge, the First King, the Heart God Chose*
## ✦ Big Structure
```
Chapters  1–7    =  SAMUEL        (Birth, call, ark recovered, Israel judged)
Chapters  8–15   =  SAUL          (King demanded, anointed, and rejected)
Chapters  16–31  =  DAVID         (Anointed, pursued, rising while Saul falls)
```

## ✦ One-Word Anchors
| Ch | One Word | Scene |
|---|---|---|
| 1 | **TEARS** | Hannah weeps at the tabernacle — "I am a woman of sorrowful spirit" |
| 2 | **SONG** | Hannah's song — "My heart rejoices in the LORD — he raises the poor" |
| 3 | **LAMP** | The lamp of God nearly out when God calls Samuel — "Speak LORD" |
| 4 | **ARK** | The ark captured by the Philistines — Eli falls backward and dies |
| 5 | **DAGON** | Dagon falls facedown before the ark twice |
| 6 | **COWS** | Ark returned on a new cart pulled by nursing cows heading home |
| 7 | **STONE** | Ebenezer stone — "Thus far the LORD has helped us" |
| 8 | **KING** | The people demand a king — "We want to be like the nations" |
| 9 | **DONKEYS** | Saul searching for lost donkeys — meets Samuel instead |
| 10 | **OIL** | Samuel pours oil on Saul's head — first anointing |
| 11 | **AMMON** | Saul defeats the Ammonites — kingship confirmed |
| 12 | **RAIN** | Samuel calls for thunder and rain at harvest — the people fear |
| 13 | **FIRE** | Saul offers the sacrifice himself — "Your kingdom will not endure" |
| 14 | **HONEY** | Jonathan eats honey unknowingly — nearly executed by Saul |
| 15 | **SHEEP** | Saul spares sheep and King Agag — "To obey is better than sacrifice" |
| 16 | **OIL** | Samuel anoints David — the youngest, the forgotten one |
| 17 | **STONE** | David's smooth stone kills Goliath — "This day the LORD will deliver you" |
| 18 | **JAVELIN** | Saul throws a javelin at David — twice |
| 19 | **WINDOW** | Michal lowers David through a window — an idol in the bed |
| 20 | **ARROW** | Jonathan's arrow signals danger — the farewell in the field |
| 21 | **BREAD** | David eats the consecrated bread at Nob — "Five loaves" |
| 22 | **CAVE** | Cave of Adullam — 400 distressed, indebted men gather to David |
| 23 | **WILDERNESS** | David flees through wilderness — Saul hunts him constantly |
| 24 | **ROBE** | David cuts Saul's robe in the cave — "The LORD's anointed" |
| 25 | **ABIGAIL** | Abigail brings bread and wine — prevents David from bloodshed |
| 26 | **SPEAR** | David takes Saul's spear and water jug while he sleeps |
| 27 | **PHILISTINES** | David lives among the Philistines — Ziklag given to him |
| 28 | **WITCH** | Saul consults the medium at Endor — Samuel's ghost appears |
| 29 | **DISMISSED** | Philistine commanders send David away from the battle |
| 30 | **RAID** | Amalekites raid Ziklag — David pursues and recovers everything |
| 31 | **ARMOR** | Saul falls on his sword — his armor taken, body on the wall |

## ✦ Memory Sentence
> *"**TEARS** become a **SONG**, the temple **LAMP** barely burns when God speaks, the **ARK** is captured, **DAGON** falls, **COWS** bring it home, an **EBENEZER STONE** marks deliverance, the people want a **KING**, Saul chases **DONKEYS** and finds a throne, **OIL** anoints him, **AMMON** confirms him, **RAIN** at harvest shocks the nation, Saul lights **FIRE** on the altar and loses his kingdom, **HONEY** nearly kills Jonathan, **SHEEP** seal Saul's rejection, a second **OIL** anointing falls on the youngest son, a **STONE** kills the giant, a **JAVELIN** flies at David, a **WINDOW** becomes an escape, an **ARROW** says goodbye, **BREAD** at Nob, a **CAVE** fills with fugitives, **WILDERNESS** years of running, a torn **ROBE** shows David's mercy, **ABIGAIL** stops the bloodshed, a **SPEAR** left behind proves the point, David among the **PHILISTINES**, the **WITCH** at Endor, David **DISMISSED**, **ZIKLAG** raided and recovered, and Saul's **ARMOR** falls with him."*

## ✦ Key Verses
| Verse | Theme |
|---|---|
| **15:22** | *"To obey is better than sacrifice — to heed than the fat of rams"* → The summary of Saul's failure |
| **16:7** | *"Man looks at the outward appearance but the LORD looks at the heart"* → The theological key of the book |
| **17:47** | *"The battle is the LORD's and he will give you into our hands"* → David's theology of war |

# 📖 BOOK 10: 2 SAMUEL (24 Chapters)
## ✦ Image Word: HARP | Key Word: COVENANT | Subtitle: *A King After God's Heart Who Broke His Own*
## ✦ Big Structure
```
Chapters  1–10   =  RISE          (David established as king over all Israel)
Chapters  11–20  =  FALL          (Bathsheba, Nathan, Absalom — consequences)
Chapters  21–24  =  APPENDIX      (Poetry, mighty men, the threshing floor)
```

## ✦ One-Word Anchors
| Ch | One Word | Scene |
|---|---|---|
| 1 | **LAMENT** | David's lament over Saul and Jonathan — "How the mighty have fallen" |
| 2 | **THRONE** | David anointed king over Judah in Hebron |
| 3 | **ABNER** | Abner defects to David — Joab murders him at the gate |
| 4 | **BED** | Ish-bosheth assassinated while napping on his bed |
| 5 | **JERUSALEM** | David captures Zion — Jerusalem becomes the City of David |
| 6 | **DANCING** | David dances before the ark — Michal despises him |
| 7 | **HOUSE** | God refuses David's temple offer — promises instead to build David a house |
| 8 | **SHIELDS** | David's military victories — gold shields taken from Hadadezer |
| 9 | **LAME** | Mephibosheth — "Is there still anyone left of Saul's house?" |
| 10 | **BEARDS** | David's ambassadors humiliated — beards shaved — war follows |
| 11 | **ROOF** | David sees Bathsheba from the roof — sends for her |
| 12 | **LAMB** | Nathan's parable — the little ewe lamb — "You are the man" |
| 13 | **CLOAK** | Amnon tears Tamar's ornamented cloak — Absalom broods in silence |
| 14 | **WOMAN** | The wise woman of Tekoa persuades David to restore Absalom |
| 15 | **DONKEY** | Absalom's rebellion — David weeps and flees barefoot |
| 16 | **STONES** | Shimei throws stones and curses David on the road |
| 17 | **COUNSEL** | Ahithophel's counsel rejected — he goes home and hangs himself |
| 18 | **OAK** | Absalom's hair caught in an oak tree — Joab drives three spears through him |
| 19 | **CROSSING** | David restored — crossing the Jordan back to Jerusalem |
| 20 | **WALL** | Sheba's head thrown over the wall — the revolt ends |
| 21 | **BONES** | Saul's bones properly buried — the famine ends |
| 22 | **ROCK** | David's psalm — "The LORD is my rock, my fortress, my deliverer" |
| 23 | **MIGHTY** | David's last words — the thirty mighty men and their exploits |
| 24 | **THRESHING FLOOR** | David's census sin — he buys Araunah's threshing floor — the temple site |

## ✦ Memory Sentence
> *"David's **LAMENT** turns to a **THRONE** in Hebron, **ABNER** defects and is murdered, **ISH-BOSHETH** dies in his **BED**, **JERUSALEM** falls to David, he **DANCES** before the ark, God promises to build David a **HOUSE**, **SHIELDS** of gold are taken, the **LAME** Mephibosheth eats at the king's table, the shaved **BEARDS** start a war, David watches from a **ROOF** and falls, Nathan brings the **LAMB** parable, Tamar's **CLOAK** is torn by her brother, a **WOMAN** of Tekoa pleads for Absalom, the king **FLEES** on a donkey, **STONES** are thrown at him on the road, **AHITHOPHEL**'s rejected counsel ends in a noose, Absalom hangs in an **OAK**, the **CROSSING** of the Jordan brings David home, a **WALL** ends the last revolt, **BONES** are buried and the rain returns, David sings about the **ROCK**, the **MIGHTY** men are honoured, and the **THRESHING FLOOR** purchased in repentance becomes the site of the temple."*

## ✦ Key Verses
| Verse | Theme |
|---|---|
| **7:12–13** | *"I will raise up your offspring — he will build a house for my name and I will establish his throne forever"* → The Davidic covenant |
| **12:13** | *"David said to Nathan — I have sinned against the LORD. Nathan said — The LORD has taken away your sin"* → Grace after catastrophic failure |
| **22:2** | *"The LORD is my rock, my fortress and my deliverer — my God is my rock in whom I take refuge"* → The theology of David's life |

# 📖 BOOK 11: 1 KINGS (22 Chapters)
## ✦ Image Word: TEMPLE | Key Word: DIVIDED | Subtitle: *A Kingdom Built in Glory, Shattered by Idolatry*
## ✦ Big Structure
```
Chapters  1–11   =  SOLOMON       (Wisdom, temple, wealth, and downfall)
Chapters  12–22  =  DIVISION      (Kingdom split — kings of Israel and Judah)
```

## ✦ One-Word Anchors
| Ch | One Word | Scene |
|---|---|---|
| 1 | **ANOINTING** | Adonijah's attempted coup — Solomon anointed at Gihon spring |
| 2 | **THRONE** | Solomon establishes his rule — deals with Adonijah, Joab, Shimei |
| 3 | **DREAM** | Solomon's dream at Gibeon — "Ask for whatever you want" |
| 4 | **TABLE** | Solomon's daily provision — 30 cors of flour, 60 of meal per day |
| 5 | **CEDAR** | Hiram of Tyre sends cedar logs for the temple |
| 6 | **TEMPLE** | Seven years to build — dimensions, gold overlay, cherubim |
| 7 | **PILLARS** | Jachin and Boaz — the two great bronze pillars at the entrance |
| 8 | **GLORY** | God's glory fills the temple — Solomon's magnificent prayer |
| 9 | **TWICE** | God appears to Solomon a second time — "If you turn aside..." |
| 10 | **QUEEN** | Queen of Sheba visits — "The half was never told me" |
| 11 | **WIVES** | 700 wives, 300 concubines — Solomon's heart turns away |
| 12 | **CALVES** | Jeroboam's two golden calves — "Here are your gods, O Israel" |
| 13 | **LION** | The man of God from Judah disobeys — a lion kills him on the road |
| 14 | **FEET** | Jeroboam's wife at Ahijah's feet — her son will die at the doorstep |
| 15 | **HEART** | Asa's heart fully devoted — unlike his father Abijam |
| 16 | **MUD** | Six kings in rapid succession — Israel sinking in the mud of idolatry |
| 17 | **RAVENS** | Elijah fed by ravens at Cherith — widow's oil and flour never run out |
| 18 | **FIRE** | Elijah on Carmel — "The God who answers by fire is God" |
| 19 | **STILL** | The still small voice — God meets exhausted Elijah under the broom tree |
| 20 | **ARROW** | Ben-Hadad defeated twice — a prophet rebukes Ahab for mercy |
| 21 | **VINEYARD** | Naboth's vineyard — Jezebel's letter — an innocent man murdered |
| 22 | **ARROW** | A random arrow between the armor joints kills Ahab |

## ✦ Memory Sentence
> *"Solomon's **ANOINTING** secures the **THRONE**, a **DREAM** grants wisdom, a **TABLE** feeds the kingdom, **CEDAR** floats down from Lebanon, the **TEMPLE** rises in seven years, two **PILLARS** guard the entrance, **GLORY** fills the house, God appears **TWICE**, the **QUEEN** of Sheba is speechless, seven hundred **WIVES** turn Solomon's heart, **GOLDEN CALVES** split the kingdom, a **LION** judges disobedience, a prophet's **FEET** bring Jeroboam's doom, Asa's **HEART** stays true, six kings rise and fall in the **MUD**, **RAVENS** feed the prophet, **FIRE** falls on Carmel, a **STILL** small voice restores him, an **ARROW** rebukes Ahab's mercy, **NABOTH'S VINEYARD** marks the lowest point, and a random **ARROW** ends Ahab's life."*

## ✦ Key Verses
| Verse | Theme |
|---|---|
| **3:9** | *"Give your servant a discerning heart — to distinguish between right and wrong"* → Solomon's great request |
| **8:27** | *"Will God really dwell on earth? The heavens cannot contain you — how much less this temple"* → The theology of the temple |
| **18:21** | *"How long will you waver between two opinions? If the LORD is God, follow him"* → Elijah's challenge |

# 📖 BOOK 12: 2 KINGS (25 Chapters)
## ✦ Image Word: CHAIN | Key Word: EXILE | Subtitle: *The Long Slow Slide Into Captivity*
## ✦ Big Structure
```
Chapters  1–17   =  TWO KINGDOMS  (Israel and Judah — Elisha's ministry — Israel falls)
Chapters  18–25  =  JUDAH ALONE   (After Israel's exile — Hezekiah to Zedekiah)
```

## ✦ One-Word Anchors
| Ch | One Word | Scene |
|---|---|---|
| 1 | **FIRE** | Elijah calls fire down on the captain's men — twice |
| 2 | **MANTLE** | Elijah's mantle falls on Elisha — the chariot of fire |
| 3 | **WATER** | Water fills the ditches — Moab sees blood and is defeated |
| 4 | **OIL** | Widow's oil multiplied — Shunammite's son raised from the dead |
| 5 | **RIVER** | Naaman dips seven times in the Jordan — healed of leprosy |
| 6 | **AXE** | Iron axe head floats — Syrian army struck blind |
| 7 | **LEPERS** | Four lepers discover the abandoned Aramean camp |
| 8 | **SEVEN** | Shunammite's land restored after seven years — Hazael anointed |
| 9 | **CHARIOT** | Jehu drives his chariot furiously — anointed to judge Ahab's house |
| 10 | **PIT** | Seventy of Ahab's sons' heads in two piles — Baal worshippers into the pit |
| 11 | **CROWN** | Joash crowned at seven years old — Athaliah killed |
| 12 | **CHEST** | Collection chest placed by the altar for temple repairs |
| 13 | **BONES** | A dead man's body touches Elisha's bones — he revives |
| 14 | **WALL** | Amaziah's pride — Jehoash breaks down Jerusalem's wall |
| 15 | **LEPROSY** | Azariah struck with leprosy for entering the temple |
| 16 | **ALTAR** | Ahaz copies the Damascus altar — removes the bronze one |
| 17 | **EXILE** | Northern Kingdom exiled — the theological explanation written |
| 18 | **WALL** | Sennacherib's commander shouts taunts from outside Jerusalem's wall |
| 19 | **ANGEL** | One angel kills 185,000 Assyrians overnight — Sennacherib retreats |
| 20 | **SUNDIAL** | Hezekiah's illness — sun's shadow goes backward ten steps |
| 21 | **BLOOD** | Manasseh fills Jerusalem with innocent blood |
| 22 | **SCROLL** | The scroll of the law found in the temple during Josiah's repairs |
| 23 | **PASSOVER** | Josiah's great Passover — unmatched since the judges' days |
| 24 | **CHAINS** | Jehoiachin led away in chains to Babylon |
| 25 | **ASHES** | Jerusalem burned — temple destroyed — the people scattered |

## ✦ Memory Sentence
> *"**FIRE** falls for Elijah, the **MANTLE** transfers to Elisha, **WATER** fills the desert, **OIL** multiplies for the widow, **NAAMAN** in the **RIVER**, an **AXE** floats, four **LEPERS** discover the feast, land restored after **SEVEN** years, **JEHU**'s **CHARIOT** races to judgment, heads piled at the **PIT**, baby **JOASH** is crowned, a **CHEST** collects offerings, a dead man touches **ELISHA'S BONES** and lives, pride breaks the **WALL**, **LEPROSY** judges the proud king, Ahaz copies a pagan **ALTAR**, the North goes into **EXILE**, Sennacherib's men shout from the **WALL**, an **ANGEL** kills 185,000, the **SUNDIAL** goes backward for Hezekiah, Manasseh pours **BLOOD**, a **SCROLL** is found, the greatest **PASSOVER** in centuries, **CHAINS** on Jehoiachin, and **ASHES** where the temple stood."*

## ✦ Key Verses
| Verse | Theme |
|---|---|
| **17:7** | *"All this took place because the Israelites had sinned against the LORD"* → The theological verdict on exile |
| **19:34** | *"I will defend this city — for my sake and for the sake of David my servant"* → Grace in the middle of judgment |
| **22:8** | *"I have found the book of the law in the temple"* → The most dramatic rediscovery in OT history |
| **25:27–30** | *"Evil-merodach lifted up Jehoiachin's head — he ate at the king's table"* → A flickering ember of hope |

# 📖 BOOK 13: 1 CHRONICLES (29 Chapters)
## ✦ Image Word: GENEALOGY | Key Word: PREPARE | Subtitle: *Building a People Worthy of God's House*
## ✦ Big Structure
```
Chapters  1–9    =  GENEALOGIES   (From Adam to the returning exiles)
Chapters  10–12  =  SAUL AND DAVID (Saul's death — David rises)
Chapters  13–22  =  THE ARK AND TEMPLE PLANS (David prepares)
Chapters  23–29  =  ORGANIZATION  (Temple staff, offering, and the handover to Solomon)
```

## ✦ One-Word Anchors
| Ch | One Word | Scene |
|---|---|---|
| 1 | **ADAM** | Genealogy begins at Adam — the whole human story anchored |
| 2 | **JUDAH** | Judah's genealogy expanded — the royal line highlighted |
| 3 | **DAVID** | The sons of David — the royal line through the exile |
| 4 | **JABEZ** | "Oh that you would bless me and enlarge my territory" — Jabez's prayer |
| 5 | **EAST** | Reuben, Gad, and half-Manasseh — tribes east of the Jordan |
| 6 | **SINGERS** | Levitical singers — Heman, Asaph, Ethan — appointed by David |
| 7 | **WARRIORS** | Genealogies of the northern warrior tribes |
| 8 | **BENJAMIN** | Benjamin's genealogy — Saul's family line |
| 9 | **GATEKEEPERS** | Temple gatekeepers and servants — the returning community |
| 10 | **SKULL** | Saul's skull on the wall of Beth Shan — "He was unfaithful" |
| 11 | **MIGHTY** | David's mighty men and the capture of Jerusalem |
| 12 | **WARRIORS** | Warriors who join David — "lion-faced men," men of Issachar |
| 13 | **CART** | Uzzah touches the ark on a cart — struck dead |
| 14 | **BALSAM** | "Attack when you hear the sound of marching in the balsam trees" |
| 15 | **LEVITES** | Levites carry the ark properly — David dances with all his might |
| 16 | **SONG** | David's song of thanksgiving — "Give thanks to the LORD" |
| 17 | **HOUSE** | God's covenant — "I will build you a house" — Nathan's oracle |
| 18 | **SHIELDS** | David's victories — gold shields from Hadadezer |
| 19 | **AMMON** | Joab's double-front battle against Ammon and Aram |
| 20 | **GIANT** | Giants of Gath defeated — including a man with six fingers |
| 21 | **THRESHING FLOOR** | David's census sin — angel with drawn sword — site purchased |
| 22 | **CEDAR** | David prepares cedar, iron, and bronze for Solomon's temple |
| 23 | **LEVITES** | Levites organized into divisions for temple service |
| 24 | **PRIESTS** | Twenty-four priestly divisions assigned by lot |
| 25 | **MUSICIANS** | 288 musicians trained and assigned for temple worship |
| 26 | **GATEKEEPERS** | Gatekeepers organized — east, west, north, south |
| 27 | **COMMANDERS** | Twelve monthly military commanders and tribal officers |
| 28 | **PLAN** | David hands Solomon the detailed temple plans — "Be strong and do it" |
| 29 | **GOLD** | The great freewill offering — David's prayer — Solomon anointed |

## ✦ Memory Sentence
> *"From **ADAM** through **JUDAH** to **DAVID**, **JABEZ** prays, the **EAST** tribes serve, **SINGERS** lead worship, **WARRIORS** line up, **BENJAMIN** traces Saul, **GATEKEEPERS** return from exile, Saul's **SKULL** warns the unfaithful, David's **MIGHTY** men capture Jerusalem, **WARRIORS** from every tribe come running, **UZZAH** touches the **CART** and dies, **BALSAM** trees signal the attack, **LEVITES** carry the ark rightly, a **SONG** breaks out, God promises to build David a **HOUSE**, **SHIELDS** of gold are taken, **AMMON** is defeated, a six-fingered **GIANT** falls, the **THRESHING FLOOR** is purchased in repentance, **CEDAR** is stockpiled, **LEVITES** are organized, **PRIESTS** divided into twenty-four courses, **MUSICIANS** trained, **GATEKEEPERS** posted, **COMMANDERS** assigned, the **PLAN** handed to Solomon, and **GOLD** pours in from the whole nation."*

## ✦ Key Verses
| Verse | Theme |
|---|---|
| **17:14** | *"I will set him over my house and my kingdom forever — his throne will be established forever"* → The Davidic covenant in Chronicles |
| **29:11** | *"Yours, LORD, is the greatness and the power — everything in heaven and earth is yours"* → David's prayer |
| **28:20** | *"Be strong and courageous and do the work — the LORD God is with you"* → David to Solomon |

# 📖 BOOK 14: 2 CHRONICLES (36 Chapters)
## ✦ Image Word: FIRE | Key Word: SEEK | Subtitle: *Seek God and Flourish — Forsake Him and Fall*
## ✦ Big Structure
```
Chapters  1–9    =  SOLOMON       (Wisdom, temple, glory, the Queen)
Chapters  10–28  =  JUDAH'S KINGS (From Rehoboam to Ahaz — the long middle)
Chapters  29–36  =  REFORM AND FALL (Hezekiah, Josiah, and final exile)
```

## ✦ One-Word Anchors
| Ch | One Word | Scene |
|---|---|---|
| 1 | **WISDOM** | Solomon chooses wisdom at Gibeon — God grants it and more |
| 2 | **CRAFTSMEN** | Hiram sends the master craftsman Huram-abi |
| 3 | **MORIAH** | Temple built on Mount Moriah — Abraham's mountain |
| 4 | **BRONZE** | The bronze sea, ten basins, lampstands, tables |
| 5 | **GLORY** | The cloud of glory fills the temple — priests cannot stand |
| 6 | **PRAYER** | Solomon's dedicatory prayer — "Hear from heaven and forgive" |
| 7 | **FIRE** | Fire from heaven consumes the sacrifice — "If my people..." |
| 8 | **CITIES** | Solomon's building projects — cities, store cities, fleet |
| 9 | **QUEEN** | Queen of Sheba overwhelmed — "Your wisdom exceeded the report" |
| 10 | **YOKE** | "My father's yoke was heavy — I will add to it" — kingdom splits |
| 11 | **PRIESTS** | Priests and Levites abandon the north and move to Judah |
| 12 | **SHIELDS** | Shishak takes the gold shields — replaced with bronze ones |
| 13 | **BATTLE** | Abijah's speech before battle — God strikes Jeroboam |
| 14 | **REST** | Asa's reforms — ten years of peace and rest |
| 15 | **COVENANT** | Asa's great covenant renewal — they seek God with their whole heart |
| 16 | **FEET** | Asa's diseased feet — he trusts physicians not the LORD |
| 17 | **TEACHERS** | Jehoshaphat sends teachers with the Book of the Law |
| 18 | **ARROW** | The random arrow finds Ahab's joint in his armor |
| 19 | **JUDGES** | Jehoshaphat appoints judges — "You judge not for man but for God" |
| 20 | **SINGERS** | Singers go out ahead of the army — the enemy destroys themselves |
| 21 | **BOWELS** | Jehoram's bowels fall out — written judgment of God |
| 22 | **HIDDEN** | Baby Joash hidden in the temple for six years |
| 23 | **CROWN** | Joash crowned — Athaliah killed at the horse gate |
| 24 | **STONES** | Zechariah stoned in the temple courtyard — "The LORD see and avenge" |
| 25 | **IDOLS** | Amaziah worships the gods of Edom he defeated |
| 26 | **LEPROSY** | Uzziah's hand breaks out in leprosy at the incense altar |
| 27 | **MIGHTY** | Jotham grew mighty because he ordered his ways before the LORD |
| 28 | **ALTAR** | Ahaz closes the temple doors and makes altars on street corners |
| 29 | **CLEANSED** | Hezekiah reopens and cleanses the temple — first act of his reign |
| 30 | **PASSOVER** | Hezekiah's great Passover — unprecedented joy in Jerusalem |
| 31 | **STOREROOMS** | Storerooms overflowing with tithes and firstfruits |
| 32 | **SPRING** | Hezekiah blocks the spring before Sennacherib arrives |
| 33 | **HUMBLED** | Manasseh in chains — he humbles himself — God restores him |
| 34 | **SCROLL** | Josiah finds the scroll — tears his robes — Huldah prophesies |
| 35 | **ARCHERS** | Josiah killed by Pharaoh Necho's archers at Megiddo |
| 36 | **DECREE** | Cyrus's decree — "Let him go up to Jerusalem" — exile over |

## ✦ Memory Sentence
> *"**WISDOM** chosen, **CRAFTSMEN** sent, the temple rises on **MORIAH**, **BRONZE** fills the courtyard, **GLORY** drives out the priests, **PRAYER** ascends, **FIRE** falls, **CITIES** built, the **QUEEN** of Sheba overwhelmed — then the **YOKE** breaks the kingdom, **PRIESTS** flee south, **SHIELDS** go to Egypt, **ABIJAH** wins by preaching, **REST** under Asa, a great **COVENANT**, but Asa trusts his **FEET** doctor not God, **TEACHERS** sent throughout Judah, a random **ARROW** kills Ahab, **JUDGES** appointed, **SINGERS** go first into battle, **JEHORAM'S BOWELS** fall out, **JOASH HIDDEN** in the temple, **CROWNED** at seven, **ZECHARIAH STONED** in the courtyard, Amaziah worships defeated **IDOLS**, Uzziah's **LEPROSY** at the incense altar, **JOTHAM GROWS MIGHTY**, Ahaz closes the **TEMPLE DOORS**, Hezekiah **CLEANSES** them again, a great **PASSOVER**, **STOREROOMS** overflow, Hezekiah blocks the **SPRING**, **MANASSEH HUMBLED** in Babylon, **JOSIAH FINDS THE SCROLL**, **ARCHERS** kill him at Megiddo, and **CYRUS'S DECREE** opens the door."*

## ✦ Key Verses
| Verse | Theme |
|---|---|
| **7:14** | *"If my people who are called by my name humble themselves and pray — I will heal their land"* → The theological heartbeat of Chronicles |
| **15:2** | *"The LORD is with you when you are with him — if you seek him he will be found"* → The seek-and-find principle |
| **36:23** | *"The LORD God of heaven has given me all the kingdoms — whoever is among his people, let him go up"* → The door reopened by Cyrus |

# 📖 BOOK 15: EZRA (10 Chapters)
## ✦ Image Word: HAMMER | Key Word: RESTORE | Subtitle: *Return, Rebuild, Reform — God's Exiles Come Home*
## ✦ Big Structure
```
Chapters  1–6    =  FIRST RETURN    (Zerubbabel leads — temple rebuilt)
Chapters  7–10   =  SECOND RETURN   (Ezra leads — the law renewed)
```

## ✦ One-Word Anchors
| Ch | One Word | Scene |
|---|---|---|
| 1 | **DECREE** | Cyrus's decree — the Spirit of the king is moved by God |
| 2 | **LIST** | The list of returning exiles — 49,897 people by name |
| 3 | **SHOUT** | Foundation laid — weeping and shouting mixed together |
| 4 | **LETTER** | Enemies write letters to stop the building — work halted |
| 5 | **PROPHETS** | Haggai and Zechariah stir the people — building resumes |
| 6 | **PASSOVER** | Temple completed — Passover celebrated with great joy |
| 7 | **HAND** | "The hand of the LORD his God was on him" — Ezra arrives |
| 8 | **FASTING** | Ezra proclaims a fast by the river — "I was ashamed to ask the king for soldiers" |
| 9 | **GARMENT** | Ezra tears his garment — the intermarriage crisis |
| 10 | **RAIN** | The people stand in the rain — the foreign wives sent away |

## ✦ Memory Sentence
> *"**CYRUS'S DECREE** moves the exiles, a **LIST** of names returns with them, the foundation is laid with **WEEPING AND SHOUTING**, **LETTERS** halt the work, **PROPHETS** restart it, the **PASSOVER** marks completion, **EZRA'S HAND** is God's hand, a **FAST** by the river, a **TORN GARMENT** over the intermarriage crisis, and the whole community stands in the **RAIN** to make it right."*

## ✦ Key Verses
| Verse | Theme |
|---|---|
| **1:3** | *"Whoever is among his people — may his God be with him — let him go up to Jerusalem"* → The great return begins |
| **7:10** | *"Ezra had devoted himself to the study and observance of the Law — and to teaching its decrees"* → The model of a biblical scholar |
| **9:9** | *"Though we are slaves our God has not forsaken us — he has extended kindness to us"* → Grace in the middle of failure |

# 📖 BOOK 16: NEHEMIAH (13 Chapters)
## ✦ Image Word: WALL | Key Word: REBUILD | Subtitle: *Walls Built with One Hand, Sword in the Other*
## ✦ Big Structure
```
Chapters  1–7    =  THE WALL        (Prayer, inspection, building, opposition, completion)
Chapters  8–10   =  THE WORD        (Ezra reads the law — covenant renewed)
Chapters  11–13  =  THE COMMUNITY   (Population, dedication, and reform)
```

## ✦ One-Word Anchors
| Ch | One Word | Scene |
|---|---|---|
| 1 | **TEARS** | Nehemiah weeps, fasts, and prays for four months |
| 2 | **NIGHT** | Nehemiah inspects the broken walls alone at night on a donkey |
| 3 | **GATES** | Every gate and section of the wall assigned to specific builders |
| 4 | **SWORD** | Workers build with one hand and hold a sword in the other |
| 5 | **DEBT** | Nehemiah confronts the nobles for charging interest on the poor |
| 6 | **LETTER** | Sanballat's fifth letter — "Come and meet with me" — Nehemiah refuses |
| 7 | **LIST** | The same list of returning exiles — Nehemiah finds it in the archives |
| 8 | **READING** | Ezra reads the law from dawn to midday — people weep — then rejoice |
| 9 | **DUST** | Great prayer of confession — from creation to exile — "We are now slaves" |
| 10 | **SEAL** | The covenant document signed and sealed — 84 names listed |
| 11 | **LOTS** | Lots cast to choose one in ten to live inside Jerusalem |
| 12 | **CHOIRS** | Two great choirs walk the wall in opposite directions and meet |
| 13 | **SABBATH** | Nehemiah returns — drives out Tobiah — closes gates on the Sabbath |

## ✦ Memory Sentence
> *"**TEARS** become a prayer, a **NIGHT** inspection reveals the damage, every **GATE** gets a builder, a **SWORD** in one hand and trowel in the other, **DEBT** confronted, threatening **LETTERS** refused, the founding **LIST** found in the archives, the **LAW READ** from dawn to midday, a long **DUST AND ASHES** prayer of confession, the **SEAL** on a new covenant, **LOTS** populate the city, two **CHOIRS** walk the completed wall, and **NEHEMIAH RETURNS** to close the gates on the Sabbath."*

## ✦ Key Verses
| Verse | Theme |
|---|---|
| **2:20** | *"The God of heaven will give us success — we his servants will start rebuilding"* → The confidence of faith |
| **6:9** | *"They were all trying to frighten us — but I prayed, 'Now strengthen my hands'"* → Prayer as the weapon |
| **8:10** | *"Do not grieve — for the joy of the LORD is your strength"* → The most quoted verse of Nehemiah |

# 📖 BOOK 17: ESTHER (10 Chapters)
## ✦ Image Word: SCEPTER | Key Word: PROVIDENCE | Subtitle: *God's Name Is Hidden — His Hand Is Everywhere*
## ✦ Big Structure
```
Chapters  1–5    =  THREAT         (Vashti, Esther, Haman's plot, Mordecai's challenge)
Chapters  6–10   =  REVERSAL       (Mordecai honored, Haman hanged, Jews triumph)
```

## ✦ One-Word Anchors
| Ch | One Word | Scene |
|---|---|---|
| 1 | **CROWN** | Queen Vashti refuses to wear the crown — deposed by royal decree |
| 2 | **BEAUTY** | Esther chosen in the kingdom-wide search — Mordecai at the gate |
| 3 | **DECREE** | Haman's decree — every Jew in the empire to be destroyed |
| 4 | **SILENCE** | "Do not think that because you are in the king's house you will escape" |
| 5 | **BANQUET** | Esther's first banquet — Haman builds the gallows for Mordecai |
| 6 | **HORSE** | Mordecai paraded on Haman's own horse through the city streets |
| 7 | **GALLOWS** | Haman hanged on the gallows he built for Mordecai |
| 8 | **SEAL** | New decree sealed — Jews may defend themselves throughout the empire |
| 9 | **PURIM** | The Jews triumph — Purim established as a feast forever |
| 10 | **GREATNESS** | Mordecai's greatness recorded — second only to the king |

## ✦ Memory Sentence
> *"**VASHTI'S CROWN** is removed, **ESTHER'S BEAUTY** fills its place, **HAMAN'S DECREE** threatens genocide, **MORDECAI'S SILENCE-BREAKING** challenge confronts Esther, the first **BANQUET** buys one more day, Haman's **HORSE** carries his enemy in honor, the **GALLOWS** swallows its builder, a new **SEAL** reverses the decree, **PURIM** marks the deliverance, and **MORDECAI'S GREATNESS** closes the book."*

## ✦ Key Verses
| Verse | Theme |
|---|---|
| **4:14** | *"Who knows whether you have not come to the kingdom for such a time as this?"* → The most famous verse in Esther — and the whole theology of the book |
| **6:13** | *"If Mordecai is of Jewish descent you will not prevail — you will surely fall before him"* → Even Haman's household sees the writing on the wall |
| **9:28** | *"These days of Purim should never fail to be celebrated among the Jews"* → The feast established forever |
"""

def parse_data(data):
    books = {}
    current_book = None
    
    lines = data.strip().split('\\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # New Book
        m_book = re.match(r'# 📖 BOOK \\d+: (.+) \\((\\d+) Chapters\\)', line)
        if m_book:
            book_name = m_book.group(1).strip().lower()
            if "1 samuel" in book_name: book_name = "1samuel"
            elif "2 samuel" in book_name: book_name = "2samuel"
            elif "1 kings" in book_name: book_name = "1kings"
            elif "2 kings" in book_name: book_name = "2kings"
            elif "1 chronicles" in book_name: book_name = "1chronicles"
            elif "2 chronicles" in book_name: book_name = "2chronicles"
            current_book = {
                'subtitle': '',
                'blocks': [],
                'anchors': [],
                'memorySentence': '',
                'keyVerses': []
            }
            books[book_name] = current_book
            i += 1
            continue
            
        if not current_book:
            i += 1
            continue
            
        if line.startswith('## ✦ Image Word:'):
            # Parse Subtitle
            # e.g. ## ✦ Image Word: JORDAN | Key Word: POSSESS | Subtitle: *Every Promise Kept — Every Enemy Conquered*
            subtitle_match = re.search(r'Subtitle:\\s*\\*?([^\\*]+)\\*?', line)
            if subtitle_match:
                current_book['subtitle'] = subtitle_match.group(1).strip()
            i += 1
            continue
            
        if line.startswith('## ✦ Big Structure'):
            i += 1
            # Skip ```
            if i < len(lines) and lines[i].startswith('```'):
                i += 1
            while i < len(lines) and not lines[i].startswith('```') and not lines[i].startswith('##'):
                b_line = lines[i].strip()
                if b_line:
                    # e.g. Chapters  1–5    =  ENTERING      (Cross the Jordan — consecrate yourselves)
                    # or Chapter 1 = ...
                    m_block = re.match(r'Chapter[s]?\\s+([^=]+)=\\s*([A-Z0-9 -]+)\\s*\\((.*)\\)', b_line)
                    if m_block:
                        chaps = m_block.group(1).strip().replace('–', '-')
                        label = m_block.group(2).strip()
                        desc = m_block.group(3).strip()
                        current_book['blocks'].append({
                            'chapters': chaps,
                            'label': label,
                            'description': desc
                        })
                i += 1
            continue
            
        if line.startswith('## ✦ One-Word Anchors'):
            i += 1
            while i < len(lines) and not lines[i].startswith('##'):
                if lines[i].startswith('|') and '---' not in lines[i] and 'One Word' not in lines[i]:
                    parts = [p.strip() for p in lines[i].split('|')[1:-1]]
                    if len(parts) >= 3:
                        ch = parts[0]
                        word = parts[1].replace('**', '')
                        scene = parts[2]
                        current_book['anchors'].append({
                            'ch': int(ch),
                            'word': word,
                            'scene': scene
                        })
                i += 1
            continue
            
        if line.startswith('## ✦ Memory Sentence'):
            i += 1
            while i < len(lines) and not lines[i].startswith('##'):
                s_line = lines[i].strip()
                if s_line.startswith('>'):
                    # remove > and italics and bold
                    sentence = s_line[1:].strip().strip('*').strip('"')
                    # keep bold ** for emphasis if needed? No, let's remove **
                    sentence = sentence.replace('**', '')
                    current_book['memorySentence'] += sentence + ' '
                i += 1
            current_book['memorySentence'] = current_book['memorySentence'].strip()
            continue
            
        if line.startswith('## ✦ Key Verses'):
            i += 1
            while i < len(lines) and not lines[i].startswith('##'):
                if lines[i].startswith('|') and '---' not in lines[i] and 'Verse' not in lines[i]:
                    parts = [p.strip() for p in lines[i].split('|')[1:-1]]
                    if len(parts) >= 2:
                        ref_raw = parts[0].replace('**', '')
                        # parts[1] is like *"Be strong..."* → The commissioning
                        theme_split = parts[1].split('→')
                        text = theme_split[0].strip().strip('*').strip('"')
                        theme = theme_split[1].strip() if len(theme_split) > 1 else ''
                        
                        # Add book name to ref if missing
                        ref = ref_raw
                        if book_name.capitalize() not in ref and not any(c.isdigit() for c in book_name):
                            ref = book_name.capitalize() + ' ' + ref_raw
                        elif "samuel" in book_name:
                            ref = ("1 Samuel " if "1" in book_name else "2 Samuel ") + ref_raw
                        elif "kings" in book_name:
                            ref = ("1 Kings " if "1" in book_name else "2 Kings ") + ref_raw
                        elif "chronicles" in book_name:
                            ref = ("1 Chronicles " if "1" in book_name else "2 Chronicles ") + ref_raw
                            
                        current_book['keyVerses'].append({
                            'ref': ref,
                            'text': text,
                            'theme': theme
                        })
                i += 1
            continue
            
        i += 1
        
    return books

def update_file(filepath, book_data):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # subtitle
    content = re.sub(r"subtitle:\\s*'[^']*'", f"subtitle: '{book_data['subtitle']}'", content)
    
    # formula
    lengths = []
    for b in book_data['blocks']:
        chaps = b['chapters'].replace('–', '-').replace('—', '-')
        if '-' in chaps:
            start, end = map(int, chaps.split('-'))
            lengths.append(str(end - start + 1))
        else:
            lengths.append('1')
    formula = ' → '.join(lengths)
    content = re.sub(r"structureFormula:\\s*'[^']*'", f"structureFormula: '{formula}'", content)
    
    # blocks
    blocks_str = "blocks: [\\n"
    for b in book_data['blocks']:
        blocks_str += f"    {{ chapters: '{b['chapters']}', label: '{b['label']}', description: \"{b['description']}\" }},\\n"
    blocks_str = blocks_str.rstrip(",\\n") + "\\n  ]"
    content = re.sub(r"blocks:\\s*\\[.*?\\]", blocks_str, content, flags=re.DOTALL)
    
    # anchors
    anchors_str = "anchors: [\\n"
    for a in book_data['anchors']:
        scene = a['scene'].replace('"', '\\"')
        anchors_str += f"    {{ ch: {a['ch']}, word: '{a['word']}', scene: \"{scene}\" }},\\n"
    anchors_str = anchors_str.rstrip(",\\n") + "\\n  ]"
    content = re.sub(r"anchors:\\s*\\[.*?\\]", anchors_str, content, flags=re.DOTALL)
    
    # memorySentence
    ms = book_data['memorySentence'].replace("'", "\\'")
    content = re.sub(r"memorySentence:\\s*['\"].*?['\"]", f"memorySentence: '{ms}'", content, flags=re.DOTALL)
    
    # keyVerses
    kv_str = "keyVerses: [\\n"
    for kv in book_data['keyVerses']:
        text = kv['text'].replace('"', '\\"').replace("'", "\\'")
        theme = kv['theme'].replace("'", "\\'")
        kv_str += f"    {{ ref: '{kv['ref']}', text: '{text}', theme: '{theme}' }},\\n"
    kv_str = kv_str.rstrip(",\\n") + "\\n  ]"
    content = re.sub(r"keyVerses:\\s*\\[.*?\\]", kv_str, content, flags=re.DOTALL)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        print(f"Updated {filepath}")

books = parse_data(DATA)
for b_name, b_data in books.items():
    update_file(os.path.join(r"C:\Users\etipa\.gemini\antigravity\scratch\kanakaiah_git\src\data\otGuides", f"{b_name}.ts"), b_data)

print("Done")
