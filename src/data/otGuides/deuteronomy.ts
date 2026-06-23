import type { StudyGuide } from '../types';

export const DEUTERONOMY_GUIDE: StudyGuide = {
  id: 'deuteronomy',
  structureFormula: 'History (1-4) + Law (5-26) + Covenant (27-30) + Final Words (31-34)',
  memorySentence: 'Moses speaks his final words, urging the new generation to remember the covenant and choose life.',
  blocks: [
    { chapters: '1-4', label: 'History', description: 'A review of what God has done in the wilderness.' },
    { chapters: '5-26', label: 'Law', description: 'An exposition of the Ten Commandments and specific laws.' },
    { chapters: '27-30', label: 'Covenant', description: 'Blessings, curses, and the call to choose life.' },
    { chapters: '31-34', label: 'Final Words', description: 'Joshua appointed, a song taught, and Moses dies.' }
  ],
  keyVerses: [
    { ref: 'Deuteronomy 6:4-5', text: 'Hear, O Israel: The LORD our God, the LORD is one. You shall love the LORD your God with all your heart and with all your soul and with all your might.', theme: 'Love God' },
    { ref: 'Deuteronomy 30:19', text: 'I call heaven and earth to witness against you today, that I have set before you life and death, blessing and curse. Therefore choose life, that you and your offspring may live.', theme: 'Choose Life' }
  ],
  anchors: [
    { ch: 1, word: 'REVIEW', scene: 'Moses addressing a massive crowd on the dusty plains of Moab' },
    { ch: 2, word: 'WANDER', scene: 'Footprints winding through the barren wilderness of Seir' },
    { ch: 3, word: 'BASHAN', scene: 'The iron bed of Og, a giant king defeated by Israel' },
    { ch: 4, word: 'LISTEN', scene: 'A fiery mountain speaking with a voice out of the darkness' },
    { ch: 5, word: 'COVENANT', scene: 'Two stone tablets of the Ten Commandments held high' },
    { ch: 6, word: 'SHEMA', scene: 'Words bound to a forehead and inscribed on doorposts' },
    { ch: 7, word: 'CHOSEN', scene: 'A treasured people standing apart from the nations' },
    { ch: 8, word: 'REMEMBER', scene: 'Manna raining in the desert to teach that man lives by every word' },
    { ch: 9, word: 'STUBBORN', scene: 'Moses breaking the stone tablets at the sight of the golden calf' },
    { ch: 10, word: 'TABLETS', scene: 'New stone tablets placed carefully inside an ark of acacia wood' },
    { ch: 11, word: 'RAIN', scene: 'Lush hills drinking water from the rain of heaven' },
    { ch: 12, word: 'SANCTUARY', scene: 'A single, chosen place where the Lord’s name will dwell' },
    { ch: 13, word: 'PROPHETS', scene: 'A false dreamer pointing toward foreign, carved idols' },
    { ch: 14, word: 'TITHES', scene: 'Bringing a tenth of the grain and flock to rejoice before the Lord' },
    { ch: 15, word: 'CANCEL', scene: 'A year of release, debts forgiven and slaves set free' },
    { ch: 16, word: 'FESTIVALS', scene: 'Crowds rejoicing at the Feast of Unleavened Bread, Weeks, and Booths' },
    { ch: 17, word: 'KING', scene: 'A king sitting on a throne, copying the law onto a scroll' },
    { ch: 18, word: 'PROPHET', scene: 'A future prophet like Moses speaking the very words of God' },
    { ch: 19, word: 'REFUGE', scene: 'A man fleeing for his life down a marked road to a safe city' },
    { ch: 20, word: 'WARFARE', scene: 'A priest addressing an army standing ready for battle' },
    { ch: 21, word: 'JUSTICE', scene: 'Elders washing their hands over a heifer in a running stream' },
    { ch: 22, word: 'ORDER', scene: 'A parapet built on the flat roof of a stone house' },
    { ch: 23, word: 'ASSEMBLY', scene: 'Regulations for who may enter the congregation of the Lord' },
    { ch: 24, word: 'MERCY', scene: 'Leaving an unharvested sheaf of grain for the widow and orphan' },
    { ch: 25, word: 'FAIRNESS', scene: 'Honest weights and measures on a merchant’s scale' },
    { ch: 26, word: 'FIRSTFRUITS', scene: 'A basket of fresh harvest fruit presented to the priest' },
    { ch: 27, word: 'CURSES', scene: 'Half the tribes standing on Mount Ebal declaring curses' },
    { ch: 28, word: 'BLESSINGS', scene: 'Abundant storehouses and blessings overtaking the faithful' },
    { ch: 29, word: 'OATH', scene: 'The entire assembly renewing their vow in the land of Moab' },
    { ch: 30, word: 'LIFE', scene: 'Two paths diverging: one of life and blessing, one of death' },
    { ch: 31, word: 'SUCCESSOR', scene: 'Moses laying his hands on Joshua, commissioning him with strength' },
    { ch: 32, word: 'SONG', scene: 'Moses singing a prophetic song of God as the Rock' },
    { ch: 33, word: 'BLESSING', scene: 'Moses pronouncing final, beautiful blessings over the twelve tribes' },
    { ch: 34, word: 'NEBO', scene: 'An old prophet looking out over the promised land from a mountaintop' }
  ]
};
