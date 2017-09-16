var Bayes = (function (Bayes) {
    Array.prototype.unique = function () {
        var u = {}, a = [];
        for (var i = 0, l = this.length; i < l; ++i) {
            if (u.hasOwnProperty(this[i])) {
                continue;
            }
            a.push(this[i]);
            u[this[i]] = 1;
        }
        return a;
    }
    var stemKey = function (stem, label) {
        return '_Bayes::stem:' + stem + '::label:' + label;
    };
    var docCountKey = function (label) {
        return '_Bayes::docCount:' + label;
    };
    var stemCountKey = function (stem) {
        return '_Bayes::stemCount:' + stem;
    };

    var log = function (text) {
        console.log(text);
    };

    var tokenize = function (text) {
        text = text.toLowerCase().replace(/\W/g, ' ').replace(/\s+/g, ' ').trim().split(' ').unique();
        return text;
    };

    var getLabels = function () {
        var labels = localStorage.getItem('_Bayes::registeredLabels');
        if (!labels) labels = '';
        return labels.split(',').filter(function (a) {
            return a.length;
        });
    };

    var registerLabel = function (label) {
        var labels = getLabels();
        if (labels.indexOf(label) === -1) {
            labels.push(label);
            localStorage.setItem('_Bayes::registeredLabels', labels.join(','));
        }
        return true;
    };

    var stemLabelCount = function (stem, label) {
        var count = parseInt(localStorage.getItem(stemKey(stem, label)));
        if (!count) count = 0;
        return count;
    };
    var stemInverseLabelCount = function (stem, label) {
        var labels = getLabels();
        var total = 0;
        for (var i = 0, length = labels.length; i < length; i++) {
            if (labels[i] === label) 
                continue;
            total += parseInt(stemLabelCount(stem, labels[i]));
        }
        return total;
    };

    var stemTotalCount = function (stem) {
        var count = parseInt(localStorage.getItem(stemCountKey(stem)));
        if (!count) count = 0;
        return count;
    };
    var docCount = function (label) {
        var count = parseInt(localStorage.getItem(docCountKey(label)));
        if (!count) count = 0;
        return count;
    };
    var docInverseCount = function (label) {
        var labels = getLabels();
        var total = 0;
        for (var i = 0, length = labels.length; i < length; i++) {
            if (labels[i] === label) 
                continue;
            total += parseInt(docCount(labels[i]));
        }
        return total;
    };
    var increment = function (key) {
        var count = parseInt(localStorage.getItem(key));
        if (!count) count = 0;
        localStorage.setItem(key, parseInt(count) + 1);
        return count + 1;
    };

    var incrementStem = function (stem, label) {
        increment(stemCountKey(stem));
        increment(stemKey(stem, label));
    };

    var incrementDocCount = function (label) {
        return increment(docCountKey(label));
    };

    Bayes.train = function (text, label) {
        registerLabel(label);
        var words = tokenize(text);
        var length = words.length;
        for (var i = 0; i < length; i++)
            incrementStem(words[i], label);
        incrementDocCount(label);
    };

    Bayes.guess = function (text) {
        var words = tokenize(text);
        var length = words.length;
        var labels = getLabels();
        var totalDocCount = 0;
        var docCounts = {};
        var docInverseCounts = {};
        var scores = {};
        var labelProbability = {};
        
        for (var j = 0; j < labels.length; j++) {
            var label = labels[j];
            docCounts[label] = docCount(label);
            docInverseCounts[label] = docInverseCount(label);
            totalDocCount += parseInt(docCounts[label]);
        }
        
        for (var j = 0; j < labels.length; j++) {
            var label = labels[j];
            var logSum = 0;
            labelProbability[label] = docCounts[label] / totalDocCount;
           
            for (var i = 0; i < length; i++) {
                var word = words[i];
                var _stemTotalCount = stemTotalCount(word);
                if (_stemTotalCount === 0) {
                    continue;
                } else {
                    var wordProbability = stemLabelCount(word, label) / docCounts[label];
                    var wordInverseProbability = stemInverseLabelCount(word, label) / docInverseCounts[label];
                    var wordicity = wordProbability / (wordProbability + wordInverseProbability);

                    wordicity = ( (1 * 0.5) + (_stemTotalCount * wordicity) ) / ( 1 + _stemTotalCount );
                    if (wordicity === 0)
                        wordicity = 0.01;
                    else if (wordicity === 1)
                        wordicity = 0.99;
               }
           
                logSum += (Math.log(1 - wordicity) - Math.log(wordicity));
                //log(label + "icity of " + word + ": " + wordicity);
            }
            scores[label] = 1 / ( 1 + Math.exp(logSum) );
        }
        return scores;
    };
    
    Bayes.extractWinner = function (scores) {
        var bestScore = 0;
        var bestLabel = null;
        for (var label in scores) {
            if (scores[label] > bestScore) {
                bestScore = scores[label];
                bestLabel = label;
            }
        }
        return {label: bestLabel, score: bestScore};
    };

    return Bayes;
})(Bayes || {});

localStorage.clear();

var go = function go() {
    var text = document.getElementById("test_phrase").value;
    var scores = Bayes.guess(text);
    var winner = Bayes.extractWinner(scores);
    document.getElementById("result_1").innerHTML = winner.label;
    document.getElementById("probalility_1").innerHTML = winner.score;
    idx = 2;
    for (var label in scores) {
        if(scores[label] != winner.score && label != winner.label){
            document.getElementById("result_"+idx).innerHTML = label;
            document.getElementById("probalility_"+idx).innerHTML = scores[label];
            idx+=1;
        }
    }
    console.log(scores);
};

// French Training
Bayes.train("Samedi, lors d'un d'un discours devant l'armée dans l'Etat de Carabobo (centre-nord), Maduro a affirmé que des personnes actuellement «détenues» comparaîtront devant un tribunal militaire pour avoir préparé un coup d'Etat et encouragé une intervention militaire américaine. Il n'a cependant pas précisé le nombre de personnes interpellées ni s'il s'agit de civils ou de militaires. L'Italie a été gouvernée pendant un an par un homme qui n'avait pas été élu par le peuple. Dès la nomination de Mario Monti au poste de président du conseil, fin 2011, j'avais dit :Attention, c'est prendre un risque politique majeur. Par leur vote, les Italiens n'ont pas seulement adressé un message à leurs élites nationales, ils ont voulu dire : Nous, le peuple, nous voulons garder la maîtrise de notre destin. Et ce message pourrait être envoyé par n'importe quel peuple européen, y compris le peuple français.", 'French');
Bayes.train("Il en faut peu, parfois, pour passer du statut d'icône de la cause des femmes à celui de renégate. Lorsqu'elle a été nommée à la tête de Yahoo!, le 26 juillet 2012, Marissa Mayer était vue comme un modèle. Elle montrait qu'il était possible de perforer le fameux plafond de verre, même dans les bastions les mieux gardés du machisme (M du 28 juillet 2012). A 37 ans, cette brillante diplômée de Stanford, formée chez Google, faisait figure d'exemple dans la Silicon Valley californienne, où moins de 5 % des postes de direction sont occupés par des femmes. En quelques mois, le symbole a beaucoup perdu de sa puissance.", 'French');
Bayes.train("Dans la capitale et d'autres villes du pays, les manifestants se sont rassemblés devant des installations de l'armée après le décès de deux jeunes victimes de tirs militaires cette semaine à Caracas, qui porte, selon le parquet, à 75 le nombre de morts recensés en 85 jours de manifestations contre Nicolas Maduro, très impopulaire dans un contexte de grave crise économique. Premier intervenant de taille à SXSW 2013, Bre Pettis, PDG de la société Makerbot, spécialisée dans la vente d'imprimantes 3D, a posé une question toute simple, avant de dévoiler un nouveau produit qui l'est un peu moins. Voulez-vous rejoindre notre environnement 3D ?, a-t-il demandé à la foule qui débordait de l'Exhibit Hall 5 du Convention Center.", 'French');
Bayes.train("Des milliers de manifestants ont défilé samedi 9 mars à Tokyo pour exiger l'abandon rapide de l'énergie nucléaire au Japon, près de deux ans jour pour jour après le début de la catastrophe de Fukushima.", 'French');
Bayes.train("Oui, ça en a tout l'air, même si le conflit en Syrie n'était pas confessionnel au départ et ne l'est pas encore vraiment. Il faut saluer là l'extraordinaire résistance de la société civile syrienne à la tentation confessionnelle, mais cela ne durera pas éternellement.", 'French');

// Spanish Training
Bayes.train("El ex presidente sudafricano, Nelson Mandela, ha sido hospitalizado la tarde del sábado, según confirmó un hospital de Pretoria a CNN. Al parecer se trata de un chequeo médico que ya estaba previsto, relacionado con su avanzada edad, según explicó el portavoz de la presidencia Sudafricana Mac Maharaj.", 'Spanish');
Bayes.train("Trabajadores del Vaticano escalaron al techo de la Capilla Sixtina este sábado para instalar la chimenea de la que saldrá el humo negro o blanco para anunciar el resultado de las votaciones para elegir al nuevo papa.La chimenea es el primer signo visible al público de las preparaciones que se realizan en el interior de la capilla donde los cardenales católicos se reunirán a partir de este martes para el inicio del cónclave.", 'Spanish');
Bayes.train("La Junta Directiva del Consejo Nacional Electoral (CNE) efectuará hoy una sesión extraordinaria para definir la fecha de las elecciones presidenciales, después de que Nicolás Maduro fuera juramentado ayer Viernes presidente de la República por la Asamblea Nacional.", 'Spanish');
Bayes.train(" A 27 metros bajo el agua, la luz se vuelve de un azul profundo y nebuloso. Al salir de la oscuridad, tres bailarinas en tutú blanco estiran las piernas en la cubierta de un buque de guerra hundido. No es una aparición fantasmal, aunque lo parezca, es la primera de una serie de fotografías inolvidables que se muestran en la única galería submarina del mundo.", 'Spanish');
Bayes.train("Uhuru Kenyatta, hijo del líder fundador de Kenia, ganó por estrecho margen las elecciones presidenciales del país africano a pesar de enfrentar cargos de crímenes contra la humanidad por la violencia electoral de hace cinco años. Según anunció el sábado la comisión electoral, Kenyatta logró el 50,07% de los votos. Su principal rival, el primer ministro Raila Odinga, obtuvo 43,31% de los votos, y dijo que reclamará el resultado en los tribunales. La Constitución exige que el 50% más un voto para una victoria absoluta.", 'Spanish');

// English Training
Bayes.train("State Bank of India has taken the lead in bringing lenders and tech companies together for using Blockchain technology to share information among banks which will eventually help prevent frauds and tackle bad loans which are almost one-fifth of banks' loan book. The SBI's initiative, christened Bankchain, is in partnership with IBM, Microsoft, Skylark, KPMG and 10 commercial banks. One morning in late September 2011, a group of American drones took off from an airstrip the C.I.A. had built in the remote southern expanse of Saudi Arabia. The drones crossed the border into Yemen, and were soon hovering over a group of trucks clustered in a desert patch of Jawf Province, a region of the impoverished country once renowned for breeding Arabian horses.", 'English');
Bayes.train("Just months ago, demonstrators here and around Egypt were chanting for the end of military rule. But on Saturday, as a court ruling about a soccer riot set off angry mobs, many in the crowd here declared they now believed that a military coup might be the best hope to restore order. Although such calls are hardly universal and there is no threat of an imminent coup, the growing murmurs that military intervention may be the only solution to the collapse of public security can be heard across the country, especially in circles opposed to the Islamists who have dominated post-Mubarak elections. In one sense, this gambit should appeal to the Tories, coming straight out of their playbook. The Conservatives have specifically devoted the past couple of years to breaking stuff, then informing the country that only they can fix it. And so with the Murdochs, whose populist papers pushed relentlessly against the dastardly EU for decades, yet are now keen to point out how much the country is going to need the Murdochs’ business now Brexit’s pushing it towards the financial shitter (again, I paraphrase slightly): only they can fix us.", 'English');
Bayes.train(" Syrian rebels released 21 detained United Nations peacekeepers to Jordanian forces on Saturday, ending a standoff that raised new tensions in the region and new questions about the fighters just as the United States and other Western nations were grappling over whether to arm them. From editors to prime ministers, those charged with giving it to them tend to know what the Murdochs want, and typically oblige as surreptitiously as possible – presumably because they know they shouldn’t, really. Margaret Thatcher invited him several times to family Christmas at Chequers, and treated him as a Reaganesque friend – and yet she never mentions him once in her memoirs. Quite a thing to leave out, considering all she gifted him.The rebels announced the release of the Filipino peacekeepers, and Col. Arnulfo Burgos, a spokesman for the Armed Forces of the Philippines, confirmed it.", 'English');
Bayes.train(" The 83rd International Motor Show, which opened here last week, features the world premieres of 130 vehicles. These include an unprecedented number of models with seven-figure prices, including the $1.3 million LaFerrari supercar, the $1.15 million McLaren P1, the $1.6 million Koenigsegg Hundra and a trust-fund-busting Lamborghini, the $4 million Veneno. The neighborhood has become so rich that the new Rolls-Royce Wraith, expected to sell for more than $300,000, seemed, in comparison, like a car for the masses.", 'English');
Bayes.train("David Hallberg, the statuesque ballet star who is a principal dancer at both the storied Bolshoi Ballet of Moscow and American Ballet Theater in New York, is theoretically the type of front-row coup that warrants a fit of camera flashes. But when Mr. Hallberg, 30, showed up at New York Fashion Week last month, for a presentation by the Belgian designer Tim Coppens, he glided into the front row nearly unnoticed, save for a quick chat with Tumblr’s fashion evangelist, Valentine Uhovski, and a warm embrace from David Farber, the executive style editor at WSJ.", 'English');

Bayes.train("Hamare ghar ke piche ke khidkiyaan ek chote phool ke baagiche aur jangalon ki or khulta hai jo ek chote nala ke bagal mein hai. Ghar ka ek deewaar bagiche ke bagal mein hai aur hari patto waale ped (English Ivy) uspar faele hai. Kaafi saalon se yeh ivy choti chidiya (finch) ka ghar raha hai. Ivy ke laton mein jo ghosle hai lomdi aur raccoons aur billiyon se suraksha dete hai.Ek din ivy mein bahut halchal thi. Pareshani se cheekh rahe the chidiya aath ya dus aur aaye the paas ke jangalon se ke saath rone ke liye. Mainne turant halchal ka kaaran pata kar liya. Ek saanp ivy se nikal kar latak raha khidki ke saamne itni door par ki main use khinch kar nikaal sakta tha. Saanp ke deh ka beech ka bhaag fula hua tha jagah par—yeh saboot tha ki usne ghosle mein se do bachchon ko nigal liya hai. Hum 50 saal se us ghar mein the par kabhi aysa nahin hua. Yeh jiwan-mein-ek-baar hone waala anubhav tha—ya aysa humne socha.Kuch dinon baad ek aur halchal hua, is baar hamare kutton ke ghere mein. Humne wahi achambhe ki cheekhein suni, pados ke chidoyon ka ikattha hona. Hum jaan gaye lutera kaun tha. Hamara ek naati ghere par chadha aur ek aur saanp nikaala jo abhi bhi maa chidiya ko daboche hue tha jise usne pakda tha ghosle mein aur maar diya tha.Mainne khud se kaha, “Kya ho raha hai? Kya Eden ke Bagiche mein phir se lutere aa gaye?” Tab mere mann mein bhavishyevaktaaon ke kahe gaye chetaoni aayi. Hum shaetaan ke prabhaao se hamesha bache nahin rahenge, apne gharon mein bhi nahin. Hamein apne chote bachchon ko bachana hai. Hum ek bahut khatarnaak duniya mein rehte hai jo sabse zyaada dhaarmik cheezon par hamla karta hai. Parivaar, jo paramavashyak sanstha hai aaj aur anantta mein, dikhne aur undekhe prabhaao se khatre mein hai. Shaetaan furtila hai. Uska lakshye hai chot pahunchana. Agar woh parivaar ko kamzor kar sakta ya nasht kar sakta, woh safal ho jaaega.Antim-din Sant parivaar ke shresht mahatva ko pehchaante hai aur koshish karte is tarike se rehne ki taaki shaetaan hamare gharon mein na ghus sake. Hum khud ke aur apne bachchon ke liye suraksha aur bachaao paate hai un vaado ko nibhaane mein jo Masih ke chelon ke rup mein aagyakari ho kar banaya hai. Isaiah ne kaha, “Aur dharm ka fal shaanti; aur uska parinaam sada ka chaen aur nishchint rehna hoga.Shaanti Prabhu ke bataye gaye praktikaranon mein bhi vaada kiya gaya hai, “Agar hum tayaar rahein hamein darna nahin hai.Purohiti ki sampurn shakti diya gaya hai taaki ghar aur usmein rehne waale surakshit rahein. Pita ke paas adhikaar aur zimmedaari hai bachchon ko sikhlane aur ashirvaad dene aur unke liye susamachaar ke dharamvidhiyon ko uplabdh karne ka aur ayse hi koi purohiti suraksha ko zaroorat anusaar dena. Use pyaar aur imaandaari aur sammaan dikhana hai maa ke liye taaki bachche us pyaar ko dekh sakein.Mainne jaana hai ki vishwaas ek sachchi shakti hai, sirf dikhawa ya bhram ka nahin. Kuch hi cheezein ek sachchi maa ke vishwaasi prarthnaaon se zyaada shaktishaali hai.Apne aap ko aur apne parivaar ko Pavitra Aatma ke uphaar ke baare mein sikhlaao aur Ishu Masih ke Praeshchit ke baare mein bhi. Tum isse mahaan kaarye nahin karoge jitna apne ghar ke deewaaron ke beech.", 'Hindi');
Bayes.train("Hum jaante hai ki hum swarg ke maata-pita ke aatmik bachche hai, is dharti par apna maranshil shareer praapt karne aur parkhe jaane ke liye aaye hai. Hum jinke paas maranshil shareer hai ke paas shakti hai un jiwon ke upar jinke paas shareer nahin hai. Hum swatantra hai chunne ke liye apne kaaryon ko, magar unke parinaam hum nahin chun sakte. Parinaam badle nahin ja sakte. Dharamshaastra mein chunne ki shakti ko “naetik chunne ki shakti” kaha jaata hai, jiska matlab hai hum achchaai aur buraai mein se chun sakte hai. Shaetaan mauka dhoondh raha hai hamein behka kar hamari naetik chunne ki shakti ka durupyog kar sake. Dharamshaastra hamein sikhlata hai “ki har manushye dharamsiddhaant aur siddhant mein bhavishye ko dekh kar kaarye karein, us naetik chunne ki shakti ke anusaar jo Prabhu ne use diya hai, taaki har manushye apne hi paapon ke liye zimmedaar rahe kayamat ke din par. Alma ne sikhlaya ki “Prabhu paapon ki or tanik bhi jhut ki drishti se nahin dekhta. Ise samajhne ke liye, hamein paap ko paapi se alag karna padega. Uddharan ke taur par, jab unhonne Uddhaarkarta ke paas ek mahila ko laaya jo vaybhichaar mein pakdi gayi thi, Usne maamla suljhaya in paanch shabdon se: “Jaa, aur phir paap na karna.”7 Yeh hai Unke dekhrekh ka tarika.Sahansheelta ek sadgun hai, magar anye sadgunon ki tarah, jab us par gaur kiya jaae, woh ek buri aadat ban jaata hai. Hamein “sahansheelta ke jaal” se bach ke rehna hai taaki hum usmein fase nahin. Janta jab sahansheel ho jaati hai kamzor kaanoon ko dekh kar taaki galat kaarye ko kanooni kaha jaae tab gambheer dhaarmik parinaam ko nahin roka ja sakta jiska parinaam Parmeshwar ke shuddhta ke niyam ko bhang karna hai. Sabhi log Masih ke Raushni ke saath paeda hote hai, ek maarg dikhane waala prabhaao jo ek vyakti ko sahi aur galat pehchaanne ka mauka deta hai. Hum us raushni ke saath kya karte hai aur kaise use apnaate hai maranshilta ke pariksha ka bhaag hai. “Kyunki suno, Masih ki Aatma har ek vyakti ko isliye di gayi hai jisse woh uchit ko anuchit se jaan sake; isliye nirnay karne ka raasta main dikhata hoon; kyunki achche kaarye karne ki jo prerna milti hai aur Masih mein vishwaas karne ka aagrah jo hota hai, woh Masih ke shakti aur den ke dwara bheja jaata hai; isliye tumhe purn rup se janna chahiye ki yeh sab Parmeshwar se hai.", 'Hindi');
Bayes.train("Har vyakti ko tayaar rehna chahiye Pavitra Aatma ke prerna aur prabhaao par amal karne ke liye. Prabhu ke paas ek tarika hai shudh gyaan dene ka hamare mann ko hamein prabhawit karne, maarg dikhane, sikhlane, aur chetaaoni dene ke liye. Parmeshwar ki har putra ya putri un cheezon ko jaan sakta hai jo turant jaanni hoti hai. Prerna aur praktikaran paane aur uspar amal karna seekho.Mainne jo padha aur padhaya aur seekha hai, unmein se sabse anmol aur pavitra sachchaai jo main dena chahata hoon woh hai Ishu Masih ki khaas gawahi. Woh jiwit hai. Main jaanta hoon Woh jiwit hai. Main Uska gawaah hoon. Aur main Unki gawahi de sakta hoon. Woh hamare Uddhaarkarta, hamare Muktidaata hai. Mujhe iska pakka vishwaas hai. Main iski gawahi deta hoon, Ishu Masih ke naam se, amen.", 'Hindi');