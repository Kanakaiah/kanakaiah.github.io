const fs = require('fs');

const data = `1|Genesis|50|GARDEN|BEGINNING|Where Everything Began and Everything Broke
2|Exodus|40|BURNING BUSH|REDEMPTION|The God Who Descends to Set His People Free
3|Leviticus|27|ALTAR|HOLY|Come Near — But Only Through Blood and Fire
4|Numbers|36|SERPENT|WANDER|Forty Years Learning What Unbelief Costs
5|Deuteronomy|34|SCROLL|REMEMBER|The Last Words Before the Promised Land
6|Joshua|24|JORDAN|POSSESS|Every Promise Kept — Every Enemy Conquered
7|Judges|21|YOKE|CYCLE|When Everyone Does What Is Right in Their Own Eyes
8|Ruth|4|GRAIN|REDEEM|A Gentile Woman Who Found Her Home in God's Covenant
9|1 Samuel|31|HORN|ANOINT|The Last Judge, the First King, the Heart God Chose
10|2 Samuel|24|HARP|COVENANT|A King After God's Heart Who Broke His Own
11|1 Kings|22|TEMPLE|DIVIDED|A Kingdom Built in Glory, Shattered by Idolatry
12|2 Kings|25|CHAIN|EXILE|The Long Slow Slide Into Captivity
13|1 Chronicles|29|GENEALOGY|PREPARE|Building a People Worthy of God's House
14|2 Chronicles|36|FIRE|SEEK|Seek God and Flourish — Forsake Him and Fall
15|Ezra|10|HAMMER|RESTORE|Return, Rebuild, Reform — God's Exiles Come Home
16|Nehemiah|13|WALL|REBUILD|Walls Built with One Hand, Sword in the Other
17|Esther|10|SCEPTER|PROVIDENCE|God's Name Is Hidden — His Hand Is Everywhere
18|Job|42|WHIRLWIND|SOVEREIGN|The Man Who Asked Why — and Heard God Roar
19|Psalms|150|HARP|WORSHIP|Every Cry of the Human Heart Addressed to Heaven
20|Proverbs|31|PATH|WISDOM|The Architecture of a Life Well Lived
21|Ecclesiastes|12|SMOKE|VANITY|Everything Under the Sun Is Vapor — Except God
22|Song of Solomon|8|VINEYARD|LOVE|The Love That Refuses to Let Go
23|Isaiah|66|COAL|SALVATION|The Gospel Before the Gospel Was Written
24|Jeremiah|52|TEARS|BROKEN|The Prophet Who Wept and Would Not Stop Speaking
25|Lamentations|5|ASH|GRIEF|Sitting in the Ruins and Choosing to Hope
26|Ezekiel|48|WHEEL|GLORY|The Glory Left — The Glory Will Return
27|Daniel|12|LION|KINGDOM|Kingdoms Fall — God's Kingdom Stands Forever
28|Hosea|14|RING|FAITHFUL|The God Who Pursues the Wife Who Keeps Running
29|Joel|3|LOCUST|POUR|Devastation Before the Great Outpouring
30|Amos|9|PLUMB LINE|JUSTICE|Let Justice Roll Like Waters That Cannot Be Stopped
31|Obadiah|1|CLIFF|PRIDE|Pride Soars on Eagles' Wings — and Falls to Ruin
32|Jonah|4|FISH|MERCY|The Reluctant Prophet and the God Who Won't Let Go
33|Micah|7|SCALES|HUMBLE|What Does the LORD Require — and Why It Is Enough
34|Nahum|3|FLOOD|WRATH|Nineveh's Comfort Is Gone — God Is Not Forever Patient
35|Habakkuk|3|WATCHTOWER|TRUST|I Will Wait on My Watchtower Though Everything Shakes
36|Zephaniah|3|FIRE|DAY|The Day That Burns — and Then Sings
37|Haggai|2|RUINS|PRIORITY|Put God's House First — Then Watch Everything Change
38|Zechariah|14|LAMPSTAND|RESTORE|The Coming King Who Will Fill All Creation
39|Malachi|4|SUN|RETURN|Return to Me and I Will Return to You`;

const lookup = {};
data.split('\n').forEach(line => {
  const parts = line.split('|');
  const name = parts[1];
  let id = name.toLowerCase().replace(/\s+/g, '');
  lookup[id] = {
    themeWord: parts[3],
    keyWord: parts[4],
    subtitle: parts[5]
  };
});

let tsPath = 'C:/Users/etipa/.gemini/antigravity/scratch/kanakaiah_git/src/data/otBooks.ts';
let content = fs.readFileSync(tsPath, 'utf8');

for (let id in lookup) {
  let item = lookup[id];
  let regexId = new RegExp(`(id:\\s*'${id}',\\s*name:\\s*'[^']+',\\s*themeWord:\\s*')[^']+('.*?keyWord:\\s*')[^']+('.*?subtitle:\\s*')[^']+(')`, 's');
  
  content = content.replace(regexId, `$1${item.themeWord}$2${item.keyWord}$3${item.subtitle}$4`);
}

fs.writeFileSync(tsPath, content, 'utf8');
console.log('Done');
