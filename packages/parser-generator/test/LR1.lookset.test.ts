import { NonTerminal, Terminal, Symbol } from "@/Definition";
import { AugmentedGrammar, Item, ItemSet } from "@/LR/Definition";
import { LRAutomataTools } from "@/LR/LR1/Automata";
import { EOF } from "@light0x00/parser-definition";
import { FirstSetCalculator } from "@/First";

import "should";


describe("============Calculation Of LR-Lookahead-Set Test============", function () {

	describe(`
    青铜
    S->A
    A->A𝜶 | A𝜷 | c
    `, function () {

		let S = new NonTerminal("S");
		let A = new NonTerminal("A");
		let grammar = new AugmentedGrammar([
			[S, { body: [A] }],
			[A, { body: [A, "a"] }, { body: [A, "b"] }, { body: ["c"] }]
		]);
		let fir = new FirstSetCalculator(grammar);
		let automataTools = new LRAutomataTools((sym) => fir.getFirstSet(sym));

		let item = new Item(S[0], 0, new Set<Terminal>([EOF]));

		it(`Left-Recursion-Look-Set of ${item}`, function () {
			let expection = new Set<Symbol>(["a", "b"]);
			let actuality = automataTools.determineLeftRecursionLookSet(item);
			for (let v of expection)
				actuality.should.have.key(v);
		});

		it(`Non-Left-Recursion-Look-Set of ${item}`, function () {
			let expection = new Set<Symbol>([EOF]);
			let actuality = automataTools.determineNonLeftRecursionLookSet(item);
			for (let v of expection)
				actuality.should.have.key(v);
		});
	});

});


describe("============Calculation Of LR-Closure Test============", function () {
	describe(`
    黄金
    S->E
    E->E+F | E*F | F
    F->id
    `, function () {

		let S = new NonTerminal("S");
		let E = new NonTerminal("E");
		let F = new NonTerminal("F");
		let grammar = new AugmentedGrammar([
			[S, { body: [E] }],
			[E, { body: [E, "+", F] }, { body: [E, "*", F] }, { body: [F] }],
			[F, { body: ["id"] }]
		]);
		let fir = new FirstSetCalculator(grammar);
		let automataTools = new LRAutomataTools((sym) => fir.getFirstSet(sym));
		let item = new Item(S[0], 0, new Set<Terminal>([EOF]));
		let I0 = new ItemSet(item);

		it(`LR-Closure of ${I0} should be:
        S->·E,{EOF}
        E->·E+F,{+,*,EOF}
        E->·E*F,{+,*,EOF}
        E->·F,{+,*,EOF}
        F->·id,{+,*,EOF}
        `, function () {
			let expection = new ItemSet(
				item,
				new Item(E[0], 0, new Set<Terminal>(["+", "*", EOF])),
				new Item(E[1], 0, new Set<Terminal>(["+", "*", EOF])),
				new Item(E[2], 0, new Set<Terminal>(["+", "*", EOF])),
				new Item(F[0], 0, new Set<Terminal>(["+", "*", EOF])),
			);
			let actuality = automataTools.closure(I0);
			actuality.equals(expection).should.true();
		});

	});
});

