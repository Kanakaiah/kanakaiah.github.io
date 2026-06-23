import type { StudyGuide } from '../types';

export const LEVITICUS_GUIDE: StudyGuide = {
  id: 'leviticus',
  structureFormula: 'Way to God (1-16) + Walk with God (17-27)',
  memorySentence: 'Come near to a holy God, but only through the blood of atonement and the fire of sacrifice.',
  blocks: [
    { chapters: '1-10', label: 'Sacrifices & Priests', description: 'Instructions for five offerings and the ordination of priests.' },
    { chapters: '11-15', label: 'Purity Laws', description: 'Distinguishing between clean and unclean in daily life.' },
    { chapters: '16', label: 'Day of Atonement', description: 'The annual cleansing of the tabernacle and the nation.' },
    { chapters: '17-27', label: 'Holiness Code', description: 'Practical laws for living as a set-apart holy people.' }
  ],
  keyVerses: [
    { ref: 'Leviticus 17:11', text: 'For the life of the flesh is in the blood, and I have given it for you on the altar to make atonement for your souls, for it is the blood that makes atonement by the life.', theme: 'Atonement' },
    { ref: 'Leviticus 19:2', text: 'Speak to all the congregation of the people of Israel and say to them, You shall be holy, for I the LORD your God am holy.', theme: 'Holiness' }
  ],
  anchors: [
    { ch: 1, word: 'BURNT', scene: 'A whole bull burning completely on a bronze altar' },
    { ch: 2, word: 'GRAIN', scene: 'Fine flour mixed with oil and frankincense' },
    { ch: 3, word: 'PEACE', scene: 'A fellowship offering of an unblemished lamb' },
    { ch: 4, word: 'SIN', scene: 'A priest dipping his finger in blood before the veil' },
    { ch: 5, word: 'GUILT', scene: 'A ram offered as restitution for unintentional sins' },
    { ch: 6, word: 'FIRE', scene: 'A perpetual fire burning brightly on the altar' },
    { ch: 7, word: 'PORTION', scene: 'Priests receiving their holy portion of peace offerings' },
    { ch: 8, word: 'ORDAIN', scene: 'Aaron and his sons washed and clothed in holy garments' },
    { ch: 9, word: 'GLORY', scene: 'Fire coming out from the Lord to consume the offering' },
    { ch: 10, word: 'STRANGE', scene: 'Nadab and Abihu struck dead by consuming fire' },
    { ch: 11, word: 'CLEAN', scene: 'A division between clean and unclean animals' },
    { ch: 12, word: 'PURIFY', scene: 'A mother bringing two turtledoves for purification' },
    { ch: 13, word: 'DISEASE', scene: 'A priest examining a white spot of leprosy on skin' },
    { ch: 14, word: 'CLEANSED', scene: 'Two living birds, cedarwood, scarlet yarn, and hyssop' },
    { ch: 15, word: 'DISCHARGE', scene: 'Washing garments and bathing in water for ceremonial cleansing' },
    { ch: 16, word: 'ATONEMENT', scene: 'The high priest placing hands on the head of a scapegoat' },
    { ch: 17, word: 'BLOOD', scene: 'Life is in the blood, given to make atonement on the altar' },
    { ch: 18, word: 'UNLAWFUL', scene: 'A warning against the wicked practices of Egypt and Canaan' },
    { ch: 19, word: 'HOLY', scene: 'Leaving the gleanings of the harvest field for the poor' },
    { ch: 20, word: 'PUNISH', scene: 'Severe judgments pronounced against detestable sins' },
    { ch: 21, word: 'PRIESTS', scene: 'Regulations for the holiness of the priests who offer the bread' },
    { ch: 22, word: 'OFFERINGS', scene: 'Ensuring that only unblemished animals are presented' },
    { ch: 23, word: 'FEASTS', scene: 'Blowing trumpets and dwelling in booths made of branches' },
    { ch: 24, word: 'LAMPSTAND', scene: 'Clear olive oil keeping the lamps burning continually' },
    { ch: 25, word: 'JUBILEE', scene: 'A ram’s horn sounding liberty throughout the land' },
    { ch: 26, word: 'BLESSING', scene: 'Rain in its season, yielding rich harvests and peace' },
    { ch: 27, word: 'VOWS', scene: 'Valuations of persons, animals, and lands dedicated to the Lord' }
  ]
};
