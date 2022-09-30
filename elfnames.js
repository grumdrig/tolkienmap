let data = `Aegnor
Amarië
Amdír
Amras
Amrod
Amroth
Anairë
Angrod
Aredhel
Argon
Beleg
Caranthir
Celeborn
Celebrían
Celebrimbor
Celegorm
Círdan
Curufin
Daeron
Denethor
Duilin
Eärwen
Ecthelion
Edrahil
Egalmoth
Eldalótë
Elemmakil
Elenwë
Elu
Thingol
Elmo
Elrond
Enel
Enelyë
Enerdhil
Eöl
Erestor
Fëanor
Finarfin
Findis
Finduilas
Fingolfin
Fingon
Finrod
Felagund
Finwë
Galadhon
Galadriel
Galathil
Galdor
Gondolin
Galion
Gildor
Inglorion
Gilgalad
Gimli
Glorfindel
Gwindor
Haldir
Idril
Imin
Iminyë
Indis
Ingwë
Ingwion
Irimë
Legolas
Lindir
Lúthien
Tinúviel
Mablung
Maedhros
Maeglin
Maglor
Mahtan
Míriel
Mithrellas
Nellas
Nerdanel
Nimrodel
Olwë
Orodreth
Oropher
Orophin
Pengolodh
Penlod
Quennar
Onótimo
Rog
Rúmil
Lórien
Rúmil
Tirion
Saeros
Salgant
Tata
Tatië
Thranduil
Turgon
Tuor
Voronwë`.toLowerCase().split('\n');

let parser = /^([aäeëiíoóöuúy]+)?([bcdfghjklmnpqrstvwxz]+)?([aäeëiíoóöuúy]+)?([bcdfghjklmnpqrstvwxz]+)?([aäeëiíoóöuúy]+)?([bcdfghjklmnpqrstvwxz]+)?([aäeëiíoóöuúy]+)?([bcdfghjklmnpqrstvwxz]+)?([aäeëiíoóöuúy]+)?([bcdfghjklmnpqrstvwxz]+)?$/i;

let vowels = {};
let consonants = {};
let patterns = {};

for (let name of data) {
	let m = name.trim().match(parser);
	// console.log(m);
	let pattern = '';
	for (let i = 1; i < m.length; ++i) {
		if (m[i]) {
			let set = i & 1 ? vowels : consonants;
			pattern += i & 1 ? 'V' : 'C';
			set[m[i]] = (set[m[i]] || 0) + 1;
		}
	}
	patterns[pattern] = (patterns[pattern] || 0) + 1;
}

function burnin(name, set) {
	console.log(`\tconst ${name} = [`);
	let total = 0;
	for (let v in set) total += set[v];
	for (let v in set) {
		console.log(`\t\t[${(set[v] / total).toFixed(5)}, '${v}'],`);
	}
	console.log("];");
}

burnin('vowels', vowels);
burnin('consonants', consonants);
burnin('patterns', patterns);

