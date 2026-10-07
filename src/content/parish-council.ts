import type { CouncilMeeting, ParishCouncil } from "@/content/types/parish";

// Pastorační rada farnosti (PRF), from the old site's pages /pastoracni_rada/clenove and /pastoracni_rada/zapisy.
// ERF in the reports is the parish's economic council (ekonomická rada farnosti).

export const parishCouncil: ParishCouncil = {
  term: { from: "2023-11-01", to: "2028-11-01" },
  members: [
    "P. Jaroslav Filka",
    "Milan Císař",
    "Anna Drahovská",
    "Mgr. Eva Fialová",
    "Romana Helanová",
    "Barbora Jordanová",
    "Ing. Marek Motyčka",
    "Dr. Jakub Planer",
    "Mgr. Veronika Planerová",
    "Eva Ryšavá",
    "Martin Strašák",
  ],
  email: "pastoracniradakurim@gmail.com",
};

/** The meeting reports, newest first. */
export const councilMeetings: CouncilMeeting[] = [
  {
    date: "2026-02-02",
    html: `
      <p>Zpráva ze zasedání PRF a ERF kuřimské farnosti 2. února 2026 v 19.00 na faře</p>
      <p>Přítomno 8 členů PRF, omluveni 3, z ERF 4 členové, omluven 1</p>
      <p>Hodnoceny aktivity v roce 2025, vysloveno uznání za jejich vysokou úroveň a nasazení obětavých farníků.</p>
      <p>Dokončen harmonogram akcí pro rok 2026 (viz farní web).</p>
      <p>Mapována časová náročnost provozních a pastoračních činností a zdrojů pro jejich zajištění:</p>
      <ul>
      <li>indikována potřeba v budoucnu zajišťovat určité činnosti zaměstnanecky (zvl. v oblasti správy objektů a farní agendy); k tomu bude nutná restrukturalizace příjmů a výdajů</li>
      <li>probrána koncepce výzdoby kostela: zjednodušit, využít sezónní rostliny, před svátky požádat o dary na zakoupení květin</li>
      <li>snaha o personální pokrytí služeb (zvl. hledáme kostelníka pro Kuřim)</li>
      </ul>
      <p>V rozpravě zazněly podněty k využití QR kódů, změně přístupu k hledání vize farnosti a řešení urgentních sociálních potřeb. Otázka zraněných vztahů mezi farníky nebyla z časových důvodů otevřena.</p>
      <p>Příští setkání PRF a ERF bude upřesněno mailem (pravděpodobně podzim 2026).</p>`,
  },
  {
    date: "2025-08-26",
    html: `
      <p>Zpráva ze zasedání PRF kuřimské farnosti 26. srpna 2025 v 19.00 na faře</p>
      <p>Přítomno 8 členů, omluveni 3</p>
      <p>Projednávané věci:</p>
      <p>1. Reflexe proběhlých akcí</p>
      <ul>
      <li>evangelizace a farní den 14. června: oceněna odvaha těch, kdo vyšli evangelizovat do města, farní den se vydařil, příště je potřeba najít koordinátora dopředu, aby oslovil lidi, začalo se včas plánovat a chystat, doporučeno příští rok udělat farní den opět společně s Komunitou Emmanuel</li>
      <li>farní tábor: vysoce oceněno nasazení vedoucích a praktikantů a skvělá úroveň programu na táboře, promýšlena podpora týmu vedoucích a praktikantů</li>
      </ul>
      <p>2. vyhodnocení dotazníku:</p>
      <ul>
      <li>připravili Martin Strašák a Jakub Planer (viz zpracovaná prezentace)</li>
      <li>motivem pro vizi je otevřená a vnitřně propojená farnost, vytvořena pracovní skupina, která se bude věnovat upřesňování vize (Martin Strašák, Jakub Planer, Veronika Planerová, P. Jaroslav Filka)</li>
      </ul>
      <p>3. identifikované potřeby, které vyplynuly z dotazníku:</p>
      <ul>
      <li>udělat nácvik pro ministranty v přednesu přímluv (Martin Strašák)</li>
      <li>zajistit rozpis lektorů na předčítání perikop (neřešit těsně před mší sv.)</li>
      <li>komunikační formy ponechat v současném rozsahu (nejvíce jsou preferovány ohlášky, ale všechny ostatní formy jsou rovněž využívány různými skupinami farníků; znamená to však značnou pracnost vše zajišťovat a aktualizovat)</li>
      </ul>
      <p>4. připravované akce:</p>
      <ul>
      <li>Česká:<ul>
      <li>sedmiradostná pouť 31. srpna z České,</li>
      <li>mše sv. a žehnání zvonu 13. září ve 14 hod v České, oslavy 240 let obce</li>
      <li>hodová mše obce Česká 5. října v 11 hod v kuřimském kostele</li>
      </ul></li>
      <li>Kuřim:<ul>
      <li>Den národnostních menšin 14. září 2025 od 14 hod,</li>
      <li>pouť na Vranov 21. září 2025 (z Moravských Knínic),</li>
      <li>adorační den 12. října (neděle),</li>
      <li>Hubertská mše 26. října v 9.30 hod s lesáckou hudbou</li>
      </ul></li>
      <li>Brno a okolí:<ul>
      <li>přednáška Tomáše Petráčka 16. října v 19 hod v Tišnově</li>
      <li>laboratoř pastoračních aktivit 18. října na BiGy v Brně</li>
      </ul></li>
      </ul>
      <p>Příští setkání PRF bude upřesněno mailem (pravděpodobně říjen 2025).</p>`,
  },
  {
    date: "2025-04-23",
    html: `
      <p>Zpráva ze zasedání PRF a ERF kuřimské farnosti 23. dubna 2025 v 19.00 na faře</p>
      <p>Přítomno 8 členů, omluveni 3, z ERF 4 členové, omluven 1</p>
      <p>Rozprava s děkanem P. Josefem Rybeckým:</p>
      <ul>
      <li>co se ve farnosti daří a z čeho máme radost</li>
      <li>jaké věci aktuálně ve farnosti řešíme</li>
      <li>jaké potřeby vnímáme v horizontu 3 až 5 let</li>
      </ul>
      <p>V rozhovoru zazněla témata: současné aktivity ve farnosti, přebírání zodpovědnosti mladší generací, funkce zázemí na faře, parkovací místa v blízkosti kostela, spolupráce s Charitou, péče o manžele a mládež 13+ aj.</p>
      <p>Příští setkání PRF bude upřesněno mailem (pravděpodobně červen 2025).</p>`,
  },
  {
    date: "2025-03-18",
    html: `
      <p>Zpráva ze zasedání PRF kuřimské farnosti 18. března 2025 v 17.30 na faře</p>
      <p>Přítomno 9 členů, omluveni 2.</p>
      <p>Seznámení s akcenty v pastoračním plánu brněnské diecéze (formace spolupracovníků, nadfarnostní podpora skupin věřících, vytváření ohnisek živé víry). Reference o přípravách oslav:</p>
      <ul>
      <li>790 let obce Moravské Knínice 6. – 8. června 2025,</li>
      <li>240 let obce Česká 13. září 2025,</li>
      <li>800 let farnosti v roce 2026.</li>
      </ul>
      <p>Odsouhlasení finální podoby dotazníku pro farníky</p>
      <p>rozprava o možnostech evangelizačních aktivit v Kuřimi v červnu 2025 ve spolupráci s Komunitou Emmanuel a podobě farního dne.</p>
      <p>Příští setkání PRF bude 23. 4. 2025 v 18.30 hod.</p>`,
  },
  {
    date: "2024-10-22",
    html: `
      <p>Zpráva ze zasedání PRF kuřimské farnosti 22. října 2024 v 17.30 na faře</p>
      <p>Přítomno 6 členů, omluveno 5.</p>
      <p>Domluva účasti na setkání PRF dne 13. listopadu v Tišnově (Eva Fialová nabídla odvoz autem).</p>
      <p>Doplnění podnětů k jubileu 800 let kuřimského kostela. Bára Jordanová zaslala tipy na přednášející k sakrální architektuře (Marek Štěpán z Vranova) a umění (Milivoj Husák z Lelekovic). Milan Císař předjedná s městem Kuřim spolupráci na oslavách (je to první písemná zmínka o Kuřimi), kontaktuje pana místostarostu Petra Vodku. Ustanoví se společná pracovní skupina pro přípravu oslav, přizveme i ostatní církve.</p>
      <p>Prodiskutování obsahu dotazníku k životu ve farnosti (připravil Jakub Planer a Martin Strašák) a zapracování připomínek. Dotazník už je téměř dokončen, vyexpedujeme ho co nejdříve.</p>
      <p>Příští zasedání PRF bude v prosinci 2024 (upřesníme mailem).</p>`,
  },
  {
    date: "2024-08-27",
    html: `
      <p>Zpráva ze zasedání PRF kuřimské farnosti 27. srpna 2024 v 17.30 na faře</p>
      <p>Přítomno 10 členů, omluven 1.</p>
      <p>1) Vyhodnocení proběhlých akcí</p>
      <ul>
      <li>Noc kostelů (7. 6.): v Kuřimi i Moravských Knínicích proběhla zdařile, v Knínicích zvlášť hojně navštívena díky tomu, že lidé šli k volbám do školy vedle kostela a že mnozí byli zvědaví na opravený kostel, přitáhla je aktivity před kostelem (koštování mešních vín, ochutnávky hostií aj.), prohlídku věže absolvovalo cca 200 návštěvníků. Pan Romanovský upozornil na obraz knínického kostela z roku 1885, který objevil v Moravské galerii v Brně (viz <a href="https://sbirky.moravska-galerie.cz/dilo/CZE:MG.B_997">https://sbirky.moravska-galerie.cz/dilo/CZE:MG.B_997</a>). Informaci uvedeme ve zpravodaji (Iva Koláčková) a v budoucnu využijeme. Doporučeno Noc kostelů konat ob rok (kloní se k tomu většina členů PRF).</li>
      <li>Farní den (9. 6.): spokojenost mladých a rodin, formát pikniku nebyl vhodný pro starší generaci (více jim vyhovuje, aby se doma naobědvali, a pak přišli na odpolední program), příště zohlednit.</li>
      <li>Hody M. Knínice, Kuřim, Jinačovice: v Kuřimi oceňujeme varhaníka pana Čápa (chystá píseň k M. Magdaleně, dbá na krásu liturgie), návrh obohatit mši sv. (plus po mši koláčky, víno před kostelem – aby to farníky nenechávalo chladné); v Knínicích hody mají tradici (kroje, průvod).</li>
      </ul>
      <p>2) Informace o připravovaných iniciativách:</p>
      <ul>
      <li>Reflexe příprav Dne národnostních menšin (15. 9.): proběhla přípravná schůzka s panem starostou Sukalovským a paní Životskou, stánkaře kontaktuje paní Květoňová (bude 16 stánků gastronomie), navíc stánek Tyco a stánek farnosti na nádvoří, v kostele bude výstava obrazů Veroniky Planerové, prohlídku věže zajišťuje pan Čáp, u kostela bude skákací hrad pro děti a stan Komunity Emmanuel; požádáme farníky o pomoc se zajištěním a přípravou akce.</li>
      <li>Pěší pouť na Vranov (22. 9.): bude změna v pořadu bohoslužeb (8 hod v Kuřimi, 9.30 v Knínicích, 11 hod na Vranově); účast z Knínic se očekává nižší (21. 9. je tam svatba Jaromíra Večeře a Sáry Navrátilové)</li>
      <li>Hody v České (6. 10.): bude změna v pořadu bohoslužeb (8 hod v Kuřimi, 9.30 v Knínicích, 11 hod v Kuřimi za obec Česká);</li>
      <li>Pastorační veletrh v Brně (19. 10.): z naší farnosti tam bude video o Mission Possible a workshop k seznámení s kurzem (připravujeme s Komunitou Emmanuel)</li>
      <li>Červená středa (27. 11.): letos bude v Knínicích (domluveno nasvícení kostela s Tomášem Večeřou, zajišťuje Standa Krčma)</li>
      <li>Pastorační projekty „Mladí mladým“ dotované z biskupství v roce 2025: informaci předáme vedení spolča, podpoříme jejich iniciativy, např. se uvažovalo o večerech chval, projekty o životním prostředí, sociální problematice aj.</li>
      <li>Oslavy 240 let obce Česká v roce 2025: zvažuje se možnost postavení zvoničky a pořízení zvonu od pana Manouška, posvěcení historické stodoly, kronikář pan Hruška připravuje výstavu ke starým selským rodům v České</li>
      <li>Výstava betlémů: letos zapojíme 1. třídy ZŠ (aby to nebyla soutěž paní učitelek), doplní se venkovní betlém, zvažuje se zbudování zvoničky.</li>
      <li>Dotazník pro farníky: Martin Strašák vytvoří pracovní skupinu (nebude se tomu věnovat celá PRF, jen se jí předloží práce skupiny)</li>
      <li>Jubilejní rok 2025 (milostivé léto): vyhlášena Česká národní pouť do Říma 28. – 30. března 2025, program v diecézích zatím není zveřejněn; v naší farnosti zkusíme udělat něco pro manžele (nabízí se víc formátů: večeře při svíčkách, Láska a pravda s Komunitou Emmanuel, manželské setkání – Pavel a Katka Rajmicovi, nutno dále v této věci jednat)</li>
      </ul>
      <p>3) Koncepce výročí 800 let kostela v Kuřimi v roce 2026</p>
      <ul>
      <li>Hosté, které chceme pozvat<ul>
      <li>Jakub Vágner – jeho otec zakládal ZOO v Hradci Králové, mluví o přírodě</li>
      <li>P. Marek Vácha – o Antarktidě nebo dle dohody s ním</li>
      <li>PhDr. Jáchym Jaroslav Šimek (emeritní opat v Želivi, byl v Austrálii, má světový rozhled)</li>
      <li>Někoho na sakrální architekturu/umění (kdo?)</li>
      </ul></li>
      <li>Tipy pro programovou náplň: více událostí během roku<ul>
      <li>Koncert Hradišťan, Javory – Ulrychovi (udělat v rámci Noci kostelů?)</li>
      <li>Muzikál Jesus Christ Superstar (v Brně zajišťoval Tomáš Večeřa), mohl by být v kostele</li>
      <li>Festival (Michal Horák, Pavel Helan, Víťa Marčík – divadlo, Pavel Čadek…)</li>
      <li>Historie farnosti: připravujeme vydání kroniky (do r. 1918 překlady z latiny a němčiny hotovy), domluvena redakční spolupráce s Adamem Janíkem (studoval historii), vydání předjednáno v nakladatelství Ivo Sperát (publikuje historické dokumenty)</li>
      <li>Besedy o historii farnosti (možno zapojit i paní Laurincovou), připravit letáček (na informační centrum, pro občasné návštěvníky)</li>
      <li>Fotografický workshop (nabídl Tomáš Trojan (udělat už na podzim 2024?)</li>
      <li>Dny otevřené fary: ne při DNM (fara slouží jako zázemí); mělo by v ní být něco zajímavého pro návštěvníky (výstava?)</li>
      <li>Letní farní kino v přístřešku na nádvoří (zdarma je ke stažení asi 60 filmů na Promítej i ty, festival Jeden svět); možnost dělat rozbory filmů s filmovým kritikem (doc PhDr. Vladimír Suchánek z Dolních Louček, už tam takto působí)</li>
      <li>Výstava v kulturáku [toho, co dělají lidé z Kuřimi, kteří tvoří]: vernisáž (Veronika Planerová, malíř František Mikš, vyšívání obrazů Kristýna Kvaltinová), básně a texty (Ing. Jiří Šipr, Martin Strašák), fotky (Tomáš Trojan, Hynek Vermouzek), oslovit ZUŠ, výtvarný obor (paní učitelka Dáša Bočková) – výstavu nabídnout školám</li>
      <li>Běh pro Máři Magdalenu: navrhoval Metoděj Polášek na Mission Possible, udělat v rámci Kuřimské běžecké ligy? (Aleš Sýkora); pozvat mistra ČR v běhu Jiřího Homoláče (kontakt Eva Ryšavá)</li>
      <li>Nízkoprahové mediálně atraktivní aktivity přístupné širší veřejnosti (např. vysadit památeční strom)</li>
      </ul></li>
      </ul>
      <p>4) Další podněty a připomínky</p>
      <ul>
      <li>Oslavy 800 let kostela v Kuřimi koordinovat s městem Kuřim (spojit se s vedením obce a zastupiteli)</li>
      <li>Na web farnosti dát informace z PRF (složení, zápisy); Milan Císař se spojí s Ondrou Planerem a dořeší to spolu</li>
      </ul>
      <p>Příští zasedání PRF bude 22. 10. 2024 v 17.30 na faře.</p>`,
  },
  {
    date: "2024-06-05",
    html: `
      <p>Zpráva ze zasedání PRF kuřimské farnosti 5. června 2024 v 17.30 na faře</p>
      <p>Přítomno 9 členů, omluveni 2.</p>
      <p>1) Vyhodnocení Dne rodin (19. 5.): velmi vydařená akce, děkujeme manželům Sádlíkovým a jejich spolupracovníkům za odvedenou práci.</p>
      <p>2) Reflexe přípravy Noci kostelů (7. 6.): koncerty nebudou pojaty tak velkolepě jako vloni, více vynikne propojení s liturgií Slavnosti Božského Srdce (zpěvy zajistí chrámový sbor), vystoupení scholy dle harmonogramu, další program zajištěn s Komunitou Emmanuel, zvučení a nasvícení kostela sjednáno.</p>
      <p>3) Farní den ve formátu „piknik“ (9. 6.): jsou domluveny organizační věci (grilování, občerstvení, příprava plochy na zahradě aj.)</p>
      <p>4) Den národnostních menšin (15. 9.): probíhá předpříprava, kontakty se stánkaři aj.</p>
      <p>5) Koncepce výročí 800 let kostela v Kuřimi v roce 2026 – bod přesunut na příští PRF</p>
      <p>6) Dotazník k životu ve farnosti: v celé PRF zpracovávání neefektivní, návrh na vytvoření týmu, který bude dotazník sestavovat, dořešíme na příští PRF</p>
      <p>7) Různé podněty, postřehy atd. Rozhodlo se založit mail pro pastorační radu (pastoracniradakurim@gmail.com) a využívat prostor na Google disku na sdílení dokumentů (vytvoří Milan Císař).</p>
      <p>Příští zasedání PRF bude 27. 8. 2024 v 17.30 na faře.</p>`,
  },
  {
    date: "2024-04-17",
    html: `
      <p>Zpráva ze zasedání PRF kuřimské farnosti 17. dubna 2024 v 17.30 na faře</p>
      <p>Přítomno 10 členů, omluven 1.</p>
      <p>1) Kontrola: plán akcí na rok 2024 (doplněno ve sdílené tabulce)</p>
      <ul>
      <li>Pouť do Předklášteří 11. května 2024 společně s Komunitou Emmanuel a farníky z Tišnova (kontakt přes účastníky Mission Possible)</li>
      <li>Den rodin 19. 5. 2024 (zajišťuje Pavel a Lucie Sádlíkovi)</li>
      <li>Zmrzlina před kostelem 2. 6. 2024 (v rámci předtáborovky dětí na faře, zmrzlinu zajistí Marek Motyčka, Eva Fialová má švagra, který provozuje restauraci, poptá se na možnosti půjčení zmrzlinového stroje)</li>
      <li>Piknik na zahradě (farní den) 9. června 2024: pozvat lidi, kteří do kostela přišli nově, věnovat se jim, vtáhnout do vztahů, spřátelit se s nimi</li>
      </ul>
      <p>2) Reference: pastorační projekty podané na biskupství</p>
      <ul>
      <li>Kurz Mission Possible (žádost o 70 000 Kč, dostali jsme 32 600 Kč), kurz proběhl v celém rozsahu (10 lekcí) dle naplánovaného harmonogramu v lednu až březnu 2024, zajišťován ve spolupráci s Komunitou Emmanuel, bylo 29 účastníků ze 7 farností, náklady cca 58 000 Kč (velkou položkou byly energie na vytápění prostor na faře). Kurz výrazně přispěl k navázání kontaktů a spolupráce v rámci našeho děkanátu. Inicioval potřebu udělat seminář k vylití Ducha svatého (seminář se připravuje od září 2024 nebo ledna 2025 v Tišnově, alternativou je seminář v Brně od října 2024 do května 2025). Dokončuje videoklip z průběhu kurzu (máme ho odeslat na biskupství) a ještě je třeba dopracovat evangelizační projekty, které se díky kurzu upřesnily: připravuje se pracovní skupina pro projekt Sportem k víře, v Knínicích již existuje pracovní skupina pro evangelizační náplň Noc kostelů.</li>
      <li>Výstava betlémů (žádost o 10 000 Kč, dostali jsme 6 500 Kč): připravuje se inovace, nabídka se na podzim vloží na web <a href="https://www.krestanskevanoce.cz/">https://www.krestanskevanoce.cz/</a>.</li>
      </ul>
      <p>3) Stav příprav Noci kostelů 7. června 2024: program v Kuřimi i v M. Knínicích vyvěšen na <a href="https://www.nockostelu.cz/">https://www.nockostelu.cz/</a> i na nástěnkách, ke koncepci z minulé PRF upřesňujeme:</p>
      <ul>
      <li>divadlo nebude (klíčoví herci v daném termínu nemohou)</li>
      <li>prezentace k 350. výročí zjevení Nejsvětějšího Srdce Ježíšova v Paray-le-Monial zajištěna (doc. Václava Bakešová)</li>
      <li>stan s občerstvením u kostela v Kuřimi nebude, aktivity pro děti koordinuje Eva Fialová (tvorba srdíček aj.)</li>
      <li>venkovní nasvícení kostela nebude (konzultováno s Tomášem Večeřou, v letních měsících je dlouho světlo, nevyniklo by to jako na podzim při Červené středě), interiér kostela nasvítíme obdobně jako vloni</li>
      <li>výstava k Noci kostelů: Jana Němečková nemůže spolupracovat, zajistíme v menším rozsahu (fotografie vybere Anička Drahovská)</li>
      <li>žádost o dotaci na JMK podána, přislíbeno 33 000 Kč, můžeme odměnit vystupující umělce</li>
      <li>posečení trávy u kostela (zajistí Milan Císař)</li>
      </ul>
      <p>4) Dotazník pojmout jako formu komunikování s lidmi: co si ve farnosti cení, v čem jsou dobří a mohli by prospět ostatním, co jim tu chybí… (potřeba spolu žít, pracovat a slavit)</p>
      <ul>
      <li>Můžeme se inspirovat:<ul>
      <li>výsledky farního průzkumu z Tišnova (podklady přeposlány e-mailem)</li>
      <li>dotazník spokojenosti z webu v Moravských Knínicích</li>
      </ul></li>
      <li>Potřeba stanovit cíl dotazníku (zjistit, jak se lidem ve farnosti žije, co potřebují?) a oblasti, které chceme zahrnout (Petrklíč, spolčo, atd.).</li>
      <li>Šíření přes sociální sítě (na instagramu máme asi 60 sledujících, ne všichni jsou z naší farnosti) i papírovou formou (pro starší generaci).</li>
      </ul>
      <p>5) Moderátor pastoračních aktivit tišnovského děkanství: představil se jáhen JUDr Václav Kotlář z Tišnova (medailonek otiskneme ve farním zpravodaji Petrklíč), informoval o jmenování Pavlíny Krásenské (z Předklášteří) koordinátorkou pro pastoraci mládeže.</p>
      <p>6) Další návrhy a různé (abychom řešili, co je potřeba, ale také bychom měli hledat vizi, jak se má profilovat pastorace v budoucnosti)</p>
      <ul>
      <li>Aktivně komunikovat s farníky (co řešíme, proč to řešíme – aby se mohli zapojit do komunikování ve farnosti) [Jakub Planer], na web dát zápisy z jednání PRF</li>
      <li>Akce připravované v Kuřimi:<ul>
      <li>participativní rozpočet – otázka navrhnout zřízení křížové cesty Kuřimskou horou (projekt by se musel podat do 5. května), další možnost navrhnout opravu schodiště ke kostelu (předloží Milan Císař)</li>
      <li>oslavy 60 let povýšení Kuřimi na město (pondělí až neděle 10. – 16. června 2024), na Dolním náměstí bude podium (do budoucna bude možno využít park u nádraží – i pro evangelizaci)</li>
      </ul></li>
      <li>Pan Mikš nabízí obraz červeně nasvíceného kostela. Šlo by ho dát na plakát pro Červenou středu, pozvat pana Mikše na Noc kostelů (a tam obraz vystavit, osloví Veronika Planerová)</li>
      <li>Koncepce jubilea 800 let kuřimského kostela byla z časových důvodů přesunuta na jednání PRF 5. 6. 2024.</li>
      </ul>
      <p>Příští zasedání PRF ve středu 5. 6. 2024 v 17.30 na faře.</p>`,
  },
  {
    date: "2024-02-12",
    html: `
      <p>Zpráva ze zasedání PRF kuřimské farnosti 12. 2. 2024 v 17.30 na faře</p>
      <p>Přítomno 10 členů, omluven 1.</p>
      <p>1) Kontrola plánu akcí na rok 2024 (doplněno ve sdílené tabulce)</p>
      <p>2) Reference: pastorační projekty na dotaci z biskupství</p>
      <ul>
      <li>Kurz Mission Possible (projekt podán, žádost o 70 000 Kč)</li>
      <li>Výstava betlémů (projekt podán, žádost o 10 000 Kč)</li>
      <li>Hřiště – hospoda – kostel (nebylo podáno, nepodařilo se dokončit specifikaci všech kritérií žádosti, máme jen rámcový nástřel)</li>
      <li>Den národnostních menšin v září 2024 (nebylo podáno, hledáme vizi pro evangelizační náplň – zatím není zcela jasná, Veronika Planerová nabídla výstavu obrazů, stan na nádvoří se osvědčil, opět spojíme síly s Komunitou Emmanuel, třeba hledat, jaké jsou další možnosti)</li>
      </ul>
      <p>3) Koncepce: letošní Noc kostelů 7. června 2024</p>
      <p>V tomto termínu je souběh tří událostí:</p>
      <ul>
      <li>slavnost Nejsvětějšího Srdce Ježíšova [letos to je 350 let od zjevení B. Srdce sv. Markétě Marii Alacoque, jak je vhodné to zdůraznit – novéna?]</li>
      <li>první pátek (obvyklou adoraci lze do programu snadno zařadit)</li>
      <li>Noc kostelů (je přislíbeno vystoupení scholy a pásmo Komunity Emmanuel, Pavel Rajmic a Church Knights letos nebude, hledá se něco jiného: je potřeba, aby program byl atraktivní i pro lidi, kteří nechodí do kostela:<ul>
      <li>divadlo: děti mají nacvičeno z tábora, mohli by s praktikanty při víkendovce připravit „Biblické příběhy slovem a obrazem“ (zkontaktuje Veronika Planerová). Divadelníci z Knínic nemají nacvičené věci, které by byly vhodné do kostela (poptá se Romana Helanová)</li>
      <li>videoprezentacek výročí NSJ: Václava Bakešová překládá knihu s touto tematikou (osloví P. Jaroslav Filka)</li>
      <li>adorace: zavedeme označení vítačů (např. srdce se jménem) a popisné tabule – lidé to vidí a mohou si sami projít nabídku (pomodlíme se s Vámi, můžete si vytáhnout kartičku se slovem z Bible…)</li>
      <li>zvážit: stan s občerstvením před kostelem (přitáhne to lidi a navodí atmosféru) a program pro děti u kostela, aby se rodičům odlehčilo (řeší Eva Fialová)</li>
      <li>výstava k Noci kostelů: ne jen historie kostela, ale přesah do života farnosti: na nástěnky nebo na banery dát věci z aktivit ve farnosti (tábor, schola, spolčo, dovolená rodin – dole, v zadní části kostela – ne na kůru, možná i venku)</li>
      <li>žádost o dotaci na JMK je třeba podat teď v únoru, v ní už vše musí být obsaženo a vyčísleno (řeší P. Jaroslav Filka), propagaci připravit do 25. dubna (plakát Ondra Ryšavý), 23. května uzávěrka Zlobice (zašle Milan Císař), program vyvěsit na web <a href="https://www.nockostelu.cz/">https://www.nockostelu.cz/</a> (P. Jaroslav Filka)</li>
      </ul></li>
      </ul>
      <p>4) Další návrhy a různé</p>
      <ul>
      <li>pouť do Předklášteří 11. 5. 2024 – půjde i Komunita Emmanuel, odchod cca v 10 hod z Kuřimi, mše v bazilice cca ve 14 hod (již s panem děkanem Rybeckým domluveno), po mši posezení v místním pivovaru</li>
      <li>křížové cesty: obdobně jako vloni skupiny farníků (rozpis Milan Císař) + křížová cesta pro rodiny s dětmi se zakončením na farní zahradě (domluví Anička Drahovská)</li>
      <li>farní ples (připravit v horizontu 2 až 3 let) – potenciál k propojení lidí, pozvat lidi i zvenku. Možná místa pro konání: Kotelna (musíme vše přivézt a odvézt, nájem je 3000 Kč, kapacita cca 100 osob), kulturní dům (zatím nepřipadá v úvahu: nájem 15000 Kč, kapacita 250 osob), sál v restauraci Viva (momentálně mimo provoz), sokolovna v České a obecní hospoda v Knínicích (mimo Kuřim, nepraktické). Pracovní skupinu na přípravu plesu sestavit s předstihem (potřeba chystat minimálně půl roku dopředu). Martin Strašák zajistí kapelu (má svoji).</li>
      <li>věnovat se lidem, kteří do kostela přišli nově: pozvat je, vtáhnout do vztahů. Oslovit a spřátelit se s nimi, aby se tu cítili jako doma.</li>
      <li>Zjistit, jak se lidem ve farnosti žije, co potřebují (spolu žít, pracovat a slavit). Možné aktivity:<ul>
      <li>dotazník – forma komunikování s lidmi: co si ve farnosti cení, v čem jsou dobří a mohli by prospět ostatním, co jim tu chybí…</li>
      <li>piknik na zahradě – letos spojíme s farním dnem (je kolize s hlučnými programy na zámku, proto zkusíme nový formát akce)</li>
      <li>den rodin bude 19. 5. 2024 na zámku (zajišťuje Pavel Sádlík). Farnost se chce zapojit a podpořit. Kromě toho požádáme o představení služeb pro rodiny, které dělá Komunita Emmanuel (Ondra Bakeš).</li>
      </ul></li>
      </ul>
      <p>5) V roce 2026 bude výročí 800 let od postavení kostela v Kuřimi. Pojmout jako celoroční sled aktivit. Je třeba vymyslet koncept (podnět pro některou z příštích PRF).</p>
      <p>Příští zasedání PRF bude ve středu 17. 4. 2024 v 17.30 na faře.</p>`,
  },
  {
    date: "2023-11-24",
    html: `
      <p>Zpráva ze zasedání PRF kuřimské farnosti 24. 11. 2023 v 17.30 na faře</p>
      <p>Přítomno 7 členů, omluveni 4.</p>
      <p>1. Sestavení plánu aktivit na rok 2024:</p>
      <p>Aktivity 2024 – předpokládané termíny</p>
      <ul>
      <li>7. 1. požehnání koledníkům TKS v kostele + obchůzka s Tyršovkou</li>
      <li>10. 1. v 18 hod v kostele ZUŠ Kuřim tříkrálový koncert 18hod.</li>
      <li>28. 1. lucernárium Kuřim + MK – dětská mše za hudebního doprovodu scholy</li>
      <li>3. -11. 2. jarní prázdniny (dovolená farních rodin – Jeseníky?)</li>
      <li>10. 2. ostatky</li>
      <li>14. 2. popelec</li>
      <li>3. 3. dětská mše za hudebního doprovodu scholy</li>
      <li>10. 3. Sandra Silná (evangelická farářka) – postní duchovní obnova?</li>
      <li>23. 3. křížová cesta rodin s dětmi, táborák na farní zahradě</li>
      <li>24. 3. květná neděle</li>
      <li>29. 3. křížová cesta Chudčice ve 14 hodin a křížová cesta ulicemi města Kuřim ve 20 hodin</li>
      <li>30. 3. pletení žil (fara 9:30 – 11:30) a v 20hod. velikonoční vigilie v doprovodu chrámového sboru</li>
      <li>31. 3. velikonoční neděle</li>
      <li>7. 4. neděle Božího milosrdenství – dětská mše za hudebního doprovodu scholy</li>
      <li>12. 5. Den matek - 1SVP Kuřim - (za doprovodu scholy?)</li>
      <li>19. 5. Den pro rodinu (zámek) – akce za podpory farnosti</li>
      <li>1. - 2. 6. předtáborová víkendovka na faře</li>
      <li>7. 6. Noc kostelů 18 – 22 hod.</li>
      <li>9. 6. Koncert duchovní hudby (BES)</li>
      <li>9. 6. odpoledne farní den (15. 6.?)</li>
      <li>5. 7. mše v kapli sv. Cyrila a Metoděje v MK, mše u Klimentka na Lipůvce</li>
      <li>12. – 14. 7. Markétské hody v MK</li>
      <li>20. 7. babské hody Kuřim, hody Jinačovice</li>
      <li>21. 7. slavnost sv. Maří Magdaleny, hodová mše 9:30 Kuřim 11:00 mše Jinačovice</li>
      <li>28. 7. – 4. 8. dovolená farních rodin (Mikulovice)</li>
      <li>10. – 17. 8. farní tábor pro děti (Čachnov)</li>
      <li>1. 9. pouť Česká – Vranov, sedmiradostná cesta</li>
      <li>8. 9. dětská mše za hudebního doprovodu scholy</li>
      <li>15. 9. DNM</li>
      <li>22. 9. pěší pouť na Vranov</li>
      <li>5. 10. hody Česká</li>
      <li>6. 10. dětská mše za hudebního doprovodu, hodová mše za obec Česká v 11:00 hodin</li>
      <li>6. 10. koncert Ať svoboda zní v 18 hod</li>
      <li>3. 11. dětská mše za hudebního doprovodu scholy</li>
      <li>16. – 17. 11. Martinské hody MK + den obce MK</li>
      <li>24. 11. misijní jarmark Česká (slavnost Krista Krále)</li>
      <li>30. 11. oslava konce církevního roku (farní silvestr)?</li>
      <li>1. 12. - 1. neděle adventní – žehnání věnců</li>
      <li>7. 12. adventní duchovní obnova?</li>
      <li>8. 12. dětská mše za hudebního doprovodu scholy, Mikuláš, (2. neděle adventní)</li>
      <li>14. 12. chystání betlémů</li>
      <li>15. 12. začátek výstavy betlémů (3. neděle adventní)</li>
      <li>24. 12. v 15 hod. divadlo za doprovodu scholy 22 hod. půlnoční mše za doprovodu chrámového sboru</li>
      <li>26. 12. zpívání u Jesliček Divizna v 16 hod.</li>
      </ul>
      <p>2. Hledání způsobů, jak zareagovat na výzvu Otce biskupa Pavla Konzbula a připravit evangelizační projekty ve farnostech – vytvořeny pracovní skupiny pro přípravu kurzu Mission Possible (Vladislav Bobčík), shromáždění podnětů k evangelizační náplni výstavy betlémů (Milan Císař), Dne národnostních menšin (P. Jaroslav Filka) a záměru Hřiště – hospoda – kostel v Moravských Knínicích (Romana Helanová).</p>
      <p>3. Mediální prezentace farnosti:</p>
      <ul>
      <li>Milan Císař zašle soupis kontaktů pro zveřejňování pořádaných akcí.</li>
      <li>Sledovanost mediální prezentace farnosti se rozvrstvuje: mladí už nepoužívají Facebook (spravuje Milan Císař), ale Instagram (spravuje Veronika Planerová), jsou i jiné platformy, např. Snapchat (tu zatím nevyužíváme)</li>
      </ul>
      <p>4. Různé:</p>
      <ul>
      <li>reference o setkání zástupců PRF s představiteli brněnské diecéze 8. 11. na BiGy (Veronika Planerová), promítnuta prezentace ze setkání</li>
      <li>potřeba pracovat s mládeží (zapojení dětí z Moravských Knínic – od 6. do 9. třídy nikdo nechodí do náboženství, připojit je k výuce na faře, nebo hledat jiné způsoby, vytvořit spolčo pro 14 – 16tileté)</li>
      </ul>
      <p>Příští zasedání PRF bude 12. 2. 2024 v 17.30 hod na faře.</p>`,
  },
  {
    date: "2023-11-01",
    html: `
      <p>Zpráva ze zasedání PRF kuřimské farnosti 1. 11. 2023 v 19.00 na faře</p>
      <p>Přítomno 9 členů, omluveni 2.</p>
      <p>Ustavující zasedání pastorační rady farnosti Kuřim, předání dekretů členům PRF, složení slibu, seznámení se stanovami PRF, domluva účasti zástupců naší PRF na setkání s biskupem Pavlem Konzbulem a generálním vikářem Pavlem Kafkou 8. 11. 2023 v Brně na BiGy.</p>
      <p>Další zasedání PRF je naplánováno na pondělí 24. 11. 2023 v 17:30 hod na faře.</p>`,
  },
];
