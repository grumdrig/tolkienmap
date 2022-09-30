// General purpose tool to use a list of names from stdin, each on their own
// line, to generate a name generator.

const data = require('fs').readFileSync(0, 'utf-8')
	.toLowerCase()
	.split('\n')
	.map(s => s.trim())
	.filter(s => s.length);

let frequencies = {
	V: {}, v: {}, w: {},
	C: {}, c: {}, k: {},
};
let patterns = {};

for (let name of data) {
	let pattern = '';
	// let parts = [];
	function step(regex, sets) {
		let m = name.match(regex);
		if (m) {
			name = name.slice(m[0].length);
			// parts.push(m[0]);
			let set = sets[(pattern.length == 0) ? 0 : (name.length == 0) ? 2 : 1];
			pattern += set;
			frequencies[set][m[0]] = (frequencies[set][m[0]] || 0) + 1;
		}
	}
	let vpat =  /^[aeiouyAEIOUYàèìòùÀÈÌÒÙáéíóúýÁÉÍÓÚÝâêîôûÂÊÎÔÛãõÃÕäëïöüÿÄËÏÖÜŸØøÅåÆæœ]+/i;
	let cpat = /^[^aeiouyAEIOUYàèìòùÀÈÌÒÙáéíóúýÁÉÍÓÚÝâêîôûÂÊÎÔÛãõÃÕäëïöüÿÄËÏÖÜŸØøÅåÆæœ]+/i;
	while (name.length > 0) {
		step(vpat, 'Vvw');
		step(cpat, 'Cck');
	}
	patterns[pattern] = (patterns[pattern] || 0) + 1;
	console.log(pattern);
}

function burnin(preamble, set) {
	console.log(`\t${preamble} [`);
	let total = 0;
	for (let v in set) total += set[v];
	for (let v in set) {
		console.log(`\t\t[${(set[v] / total).toFixed(5)}, '${v}'],`);
	}
	console.log("\t\t];");
}

console.log('function generateName() {');
console.log('\tconst frequencies = {');
for (let set in frequencies)
	burnin(`${set}:`, frequencies[set]);
console.log('\t}');
burnin('const patterns =', patterns);

console.log(`
	function pickp(a) {
		let r = rand();
		for (let [frequency, value] of a) {
			r -= frequency;
			if (r <= 0) return value;
		}
		return '';  // shouldn't happen, but
	}

	let result = '';
	let pat = pickp(patterns);
	for (let p of pat) {
		result += pickp(frequencies[p]);
	}
	return result[0].toUpperCase() + result.slice(1);
}
`);