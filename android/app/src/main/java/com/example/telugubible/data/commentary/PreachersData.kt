package com.example.telugubible.data.commentary

import com.example.telugubible.data.model.CommentaryResource
import com.example.telugubible.data.model.PreacherEntry
import com.example.telugubible.data.model.PreacherEra

object PreachersData {

    val ERAS: List<PreacherEra> = listOf(
        PreacherEra(
            heading = "Early Church",
            description = "Apostolic & patristic fathers • AD 30–600",
            entries = listOf(
                PreacherEntry(
                    rank = "c. AD 35–108",
                    person = "Ignatius of Antioch",
                    reference = "Bishop of Antioch; apostolic father; martyr",
                    quote = "Disciple of the Apostle John. Wrote seven epistles on church unity, the Eucharist, and the bishop's role while being transported to Rome for execution.",
                    resources = listOf(CommentaryResource("web", "Ante-Nicene Fathers vol. 1 — CCEL", "https://www.ccel.org/ccel/schaff/anf01.html"))
                ),
                PreacherEntry(
                    rank = "c. 185–254",
                    person = "Origen of Alexandria",
                    reference = "Theologian & biblical scholar; Alexandria",
                    quote = "The most prolific writer of the early church — over 2,000 works. Pioneer of systematic biblical commentary and the allegorical method; produced the Hexapla.",
                    resources = listOf(CommentaryResource("book", "On First Principles (De Principiis)", "https://www.amazon.com/First-Principles-Origen/dp/0268037256"))
                ),
                PreacherEntry(
                    rank = "c. 296–373",
                    person = "Athanasius of Alexandria",
                    reference = "Defender of Nicaea — \"Athanasius contra mundum\"",
                    quote = "Champion of the full divinity of Christ against Arianism; exiled five times for defending the homoousios. Also compiled the first known list of all 27 NT canonical books.",
                    resources = listOf(CommentaryResource("book", "On the Incarnation — C.S. Lewis intro ed.", "https://www.amazon.com/Incarnation-Athanasius-Popular-Patristics/dp/0881414271"))
                ),
                PreacherEntry(
                    rank = "330–394",
                    person = "The Cappadocian Fathers",
                    reference = "Basil the Great · Gregory of Nazianzus · Gregory of Nyssa",
                    quote = "Secured trinitarian orthodoxy at the Council of Constantinople (381). Gregory of Nazianzus — \"the Christian Demosthenes\" — famous for five theological orations on the divinity of Son and Spirit.",
                    resources = listOf(CommentaryResource("book", "Five Theological Orations — Gregory of Nazianzus", "https://www.amazon.com/Five-Theological-Orations-Nazianzus/dp/0881412406"))
                ),
                PreacherEntry(
                    rank = "c. 347–407",
                    person = "John Chrysostom",
                    reference = "\"Golden Mouth\"; Archbishop of Constantinople",
                    quote = "The undisputed greatest preacher of the ancient church. Over 600 homilies survive — masterful expositions of Matthew, Romans, Galatians, and the Pauline corpus.",
                    resources = listOf(CommentaryResource("book", "On the Priesthood (De Sacerdotio)", "https://www.amazon.com/Six-Books-Priesthood-St-Chrysostom/dp/0913836389"))
                ),
                PreacherEntry(
                    rank = "354–430",
                    person = "Augustine of Hippo",
                    reference = "Bishop of Hippo; greatest Western theologian",
                    quote = "Shaped Western Christianity more than any other figure outside Scripture. His doctrines of grace, original sin, and the two cities defined the Reformation a millennium later.",
                    resources = listOf(
                        CommentaryResource("book", "Confessions", "https://www.amazon.com/Confessions-Oxford-Worlds-Classics/dp/0199537828"),
                        CommentaryResource("book", "The City of God (De Civitate Dei)", "https://www.amazon.com/City-God-Penguin-Classics/dp/0140448942")
                    )
                )
            )
        ),
        PreacherEra(
            heading = "Medieval",
            description = "Scholastics & mystics • 600–1500",
            entries = listOf(
                PreacherEntry(
                    rank = "1033–1109",
                    person = "Anselm of Canterbury",
                    reference = "Archbishop of Canterbury; father of scholasticism",
                    quote = "Articulated the ontological argument for God's existence and the satisfaction theory of atonement. His motto fides quaerens intellectum defined medieval theological method.",
                    resources = listOf(CommentaryResource("book", "Why God Became Man (Cur Deus Homo)", "https://www.amazon.com/Cur-Deus-Homo-God-Became/dp/1985649837"))
                ),
                PreacherEntry(
                    rank = "1090–1153",
                    person = "Bernard of Clairvaux",
                    reference = "Abbot of Clairvaux; preacher & mystic",
                    quote = "Luther praised him as the best of the medieval monks, especially his Christ-centeredness. Wrote 86 sermons on the Song of Songs.",
                    resources = listOf(CommentaryResource("book", "On Loving God (De Diligendo Deo)", "https://www.amazon.com/Loving-God-Bernard-Clairvaux/dp/1481883232"))
                ),
                PreacherEntry(
                    rank = "1225–1274",
                    person = "Thomas Aquinas",
                    reference = "\"The Angelic Doctor\"; Dominican friar & systematician",
                    quote = "Produced the most comprehensive systematic theology in Western Christendom by synthesizing Aristotle with Scripture and Augustine. His Summa Theologica remains influential.",
                    resources = listOf(CommentaryResource("book", "Summa Theologica — abridged ed.", "https://www.amazon.com/Summa-Theologica-Thomas-Aquinas/dp/0870610635"))
                )
            )
        ),
        PreacherEra(
            heading = "Reformation",
            description = "Reformers & Puritans • 1500–1700",
            entries = listOf(
                PreacherEntry(
                    rank = "1483–1546",
                    person = "Martin Luther",
                    reference = "Father of the Protestant Reformation",
                    quote = "Recovered justification by faith alone (sola fide) and the supreme authority of Scripture (sola scriptura). Translated the NT into German in 11 weeks at Wartburg.",
                    resources = listOf(CommentaryResource("book", "The Bondage of the Will", "https://www.amazon.com/Bondage-Will-Martin-Luther/dp/0801048931"))
                ),
                PreacherEntry(
                    rank = "1509–1564",
                    person = "John Calvin",
                    reference = "Genevan Reformer; systematic & expository theologian",
                    quote = "Preached 2,000+ sermons in Geneva verse by verse without notes. Produced the Institutes of the Christian Religion and commentaries across Scripture.",
                    resources = listOf(CommentaryResource("book", "Institutes of the Christian Religion", "https://www.amazon.com/Institutes-Christian-Religion-John-Calvin/dp/0664220282"))
                ),
                PreacherEntry(
                    rank = "1616–1683",
                    person = "John Owen",
                    reference = "\"Prince of the Puritans\"; Vice-Chancellor, Oxford",
                    quote = "The most rigorous Puritan theologian. Wrote definitive works on the Holy Spirit, the atonement, and the mortification of sin.",
                    resources = listOf(CommentaryResource("book", "The Mortification of Sin", "https://www.amazon.com/Mortification-Sin-John-Owen/dp/1845509773"))
                ),
                PreacherEntry(
                    rank = "1615–1691",
                    person = "Richard Baxter",
                    reference = "Puritan pastor; Kidderminster",
                    quote = "Transformed Kidderminster through systematic pastoral catechizing. His vision of pastoral care in The Reformed Pastor remains the gold standard.",
                    resources = listOf(CommentaryResource("book", "The Reformed Pastor", "https://www.amazon.com/Reformed-Pastor-Richard-Baxter/dp/0851511910"))
                ),
                PreacherEntry(
                    rank = "1628–1688",
                    person = "John Bunyan",
                    reference = "Nonconformist preacher; Bedford",
                    quote = "Imprisoned 12 years for preaching; wrote Pilgrim's Progress from Bedford jail — the best-selling Christian allegory of all time.",
                    resources = listOf(CommentaryResource("book", "The Pilgrim's Progress", "https://www.amazon.com/Pilgrims-Progress-John-Bunyan/dp/0486426750"))
                ),
                PreacherEntry(
                    rank = "1662–1714",
                    person = "Matthew Henry",
                    reference = "Presbyterian minister & commentator",
                    quote = "His commentary was read cover to cover by Whitefield and Spurgeon. Combines warm devotional application with solid exegesis.",
                    resources = listOf(CommentaryResource("book", "Commentary on the Whole Bible", "https://www.amazon.com/Matthew-Henrys-Commentary-Whole-Bible/dp/1565631862"))
                )
            )
        ),
        PreacherEra(
            heading = "Revival Era",
            description = "Great Awakenings & 19th century • 1700–1900",
            entries = listOf(
                PreacherEntry(
                    rank = "1703–1758",
                    person = "Jonathan Edwards",
                    reference = "Greatest American theologian; First Great Awakening",
                    quote = "Combined high Calvinist theology with a profound philosophical vision of God's beauty. Religious Affections remains the definitive work on genuine conversion.",
                    resources = listOf(CommentaryResource("book", "Religious Affections", "https://www.amazon.com/Religious-Affections-Jonathan-Edwards/dp/0486491595"))
                ),
                PreacherEntry(
                    rank = "1714–1770",
                    person = "George Whitefield",
                    reference = "\"The Grand Itinerant\"; revivalist & evangelist",
                    quote = "Preached to open-air crowds of up to 30,000 without amplification in Britain and America. Lloyd-Jones called him 'the greatest preacher England ever produced.'",
                    resources = listOf(CommentaryResource("book", "Selected Sermons of George Whitefield", "https://www.amazon.com/Selected-Sermons-George-Whitefield/dp/0851514618"))
                ),
                PreacherEntry(
                    rank = "1834–1892",
                    person = "Charles H. Spurgeon",
                    reference = "\"Prince of Preachers\"; Metropolitan Tabernacle, London",
                    quote = "Preached to over 10 million people across 38 years; published 3,561 sermons — the largest single-author sermon library in history.",
                    resources = listOf(
                        CommentaryResource("book", "Lectures to My Students", "https://www.amazon.com/Lectures-My-Students-C-Spurgeon/dp/0310329116"),
                        CommentaryResource("book", "Morning and Evening", "https://www.amazon.com/Morning-Evening-Charles-Haddon-Spurgeon/dp/1565637879")
                    )
                ),
                PreacherEntry(
                    rank = "1837–1899",
                    person = "D.L. Moody",
                    reference = "Evangelist; founder of Moody Bible Institute",
                    quote = "Pioneered mass urban evangelism across America and Britain. Founded Moody Bible Institute and popularized gospel music in evangelism.",
                    resources = listOf(CommentaryResource("book", "Secret Power — on the Holy Spirit", "https://www.amazon.com/Secret-Power-D-L-Moody/dp/0802454593"))
                )
            )
        ),
        PreacherEra(
            heading = "20th Century",
            description = "Modern theologians & preachers • 1900–2000",
            entries = listOf(
                PreacherEntry(
                    rank = "1881–1937",
                    person = "J. Gresham Machen",
                    reference = "Presbyterian NT scholar; founder of Westminster Seminary",
                    quote = "The foremost scholarly defender of orthodox Protestantism against theological liberalism. His Christianity and Liberalism demonstrated that liberalism was a different religion.",
                    resources = listOf(CommentaryResource("book", "Christianity and Liberalism", "https://www.amazon.com/Christianity-Liberalism-Gresham-Machen/dp/0802864996"))
                ),
                PreacherEntry(
                    rank = "1899–1981",
                    person = "D. Martyn Lloyd-Jones",
                    reference = "\"The Doctor\"; Westminster Chapel, London",
                    quote = "The 20th century's most formidable expository preacher. Combined rigorous exegesis with urgent pastoral and evangelistic application across 1,600+ sermons.",
                    resources = listOf(CommentaryResource("book", "Preaching and Preachers", "https://www.amazon.com/Preaching-Preachers-Martyn-Lloyd-Jones/dp/0310278708"))
                ),
                PreacherEntry(
                    rank = "1918–2018",
                    person = "Billy Graham",
                    reference = "\"America's Pastor\"; BGEA",
                    quote = "Preached the gospel live to an estimated 215 million people in over 185 countries across seven decades — more than any person in history.",
                    resources = listOf(CommentaryResource("book", "Just As I Am", "https://www.amazon.com/Just-As-I-Am-Autobiography/dp/0061259187"))
                ),
                PreacherEntry(
                    rank = "1921–2011",
                    person = "John Stott",
                    reference = "All Souls Church, London; Anglican evangelical leader",
                    quote = "Perhaps the most globally influential evangelical Anglican of the 20th century. A principal drafter of the Lausanne Covenant; author of The Cross of Christ.",
                    resources = listOf(CommentaryResource("book", "The Cross of Christ", "https://www.amazon.com/Cross-Christ-John-Stott/dp/0830833206"))
                ),
                PreacherEntry(
                    rank = "1926–2020",
                    person = "J.I. Packer",
                    reference = "Regent College, Vancouver; Anglican-Reformed scholar",
                    quote = "Bridged the Puritans and modern evangelicalism. Knowing God is the most-read evangelical theological book of the 20th century.",
                    resources = listOf(CommentaryResource("book", "Knowing God", "https://www.amazon.com/Knowing-God-J-I-Packer/dp/083081650X"))
                ),
                PreacherEntry(
                    rank = "1939–2017",
                    person = "R.C. Sproul",
                    reference = "Ligonier Ministries; Saint Andrew's Chapel",
                    quote = "Made systematic theology and Reformed doctrine accessible to laypeople like no one in his generation. His series on the holiness of God is a landmark.",
                    resources = listOf(CommentaryResource("book", "The Holiness of God", "https://www.amazon.com/Holiness-God-R-C-Sproul/dp/0842339655"))
                )
            )
        ),
        PreacherEra(
            heading = "Contemporary",
            description = "Present-day preachers & theologians • 2000–present",
            entries = listOf(
                PreacherEntry(
                    rank = "b. 1946",
                    person = "D.A. Carson",
                    reference = "Trinity Evangelical Divinity School; co-founder, TGC",
                    quote = "Extraordinary range — NT commentary (especially John), biblical theology, hermeneutics, and cultural engagement.",
                    resources = listOf(CommentaryResource("book", "The Gospel of John — Pillar NT Commentary", "https://www.amazon.com/Gospel-according-John-Pillar-Testament/dp/0851117499"))
                ),
                PreacherEntry(
                    rank = "b. 1946",
                    person = "John Piper",
                    reference = "Bethlehem Baptist (ret.); Desiring God Ministries",
                    quote = "Revived Christian Hedonism: \"God is most glorified in us when we are most satisfied in him.\" Deeply rooted in Jonathan Edwards and John Owen.",
                    resources = listOf(CommentaryResource("book", "Desiring God", "https://www.amazon.com/Desiring-God-Meditations-Christian-Hedonist/dp/1601423101"))
                ),
                PreacherEntry(
                    rank = "1939–2025",
                    person = "John MacArthur",
                    reference = "Grace Community Church; The Master's Seminary",
                    quote = "Completed a 42-year verse-by-verse exposition of the entire New Testament. The MacArthur Study Bible has sold over 1 million copies.",
                    resources = listOf(CommentaryResource("book", "The MacArthur Study Bible", "https://www.amazon.com/NASB-MacArthur-Study-Bible-Hardcover/dp/0529122553"))
                ),
                PreacherEntry(
                    rank = "1950–2023",
                    person = "Tim Keller",
                    reference = "Redeemer Presbyterian, NYC; co-founder, TGC",
                    quote = "The most effective apologist-preacher of his generation. Applied Reformed theology with cultural intelligence at the heart of secular Manhattan.",
                    resources = listOf(CommentaryResource("book", "The Reason for God", "https://www.amazon.com/Reason-God-Belief-Age-Skepticism/dp/1594483493"))
                ),
                PreacherEntry(
                    rank = "b. 1952",
                    person = "Alistair Begg",
                    reference = "Parkside Church, Cleveland; Truth for Life",
                    quote = "Among the clearest verse-by-verse expositors currently active. Combines Scottish wit, pastoral warmth, and theological precision.",
                    resources = listOf(CommentaryResource("book", "Pray Big", "https://www.amazon.com/Pray-Big-Alistair-Begg/dp/1784983071"))
                ),
                PreacherEntry(
                    rank = "b. 1959",
                    person = "Al Mohler",
                    reference = "President, Southern Baptist Theological Seminary",
                    quote = "Called \"the reigning intellectual of the evangelical movement in the US\" (New York Times). A leading voice on theology, culture, and worldview formation.",
                    resources = listOf(CommentaryResource("book", "The Conviction to Lead", "https://www.amazon.com/Conviction-Lead-Principles-Effective-Leadership/dp/0764211250"))
                )
            )
        )
    )
}
