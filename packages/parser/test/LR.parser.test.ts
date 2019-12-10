import { NonTerminal } from "@light0x00/parser-generator/lib/Definition";
import { AugmentedGrammar } from "@light0x00/parser-generator/lib/LR/Definition";
import { Tag, Num, Single } from "@/Definition";
import { buildLR1Parser, buildSLRParser } from "@light0x00/parser-generator/lib/LR/ParserBuilder";
import { RegexpTokenizer } from "@/Tokenzier";
import { ASTList } from "@light0x00/parser-definition";
import should from "should";

class Program extends ASTList {
	eval(): number {
		return (this.child(0) as Expr).eval();
	}
}

class Expr extends ASTList {
	eval(): number {
		if (this.childrenNum == 3) {
			let left = (this.child(0) as Expr);
			let op = (this.child(1) as Single).getValue();
			let right = (this.child(2) as Term);
			switch (op) {
				case "+":
					return left.eval() + right.eval();
				case "-":
					return left.eval() - right.eval();
				default:
					throw new Error(`Unknown token :${op}`);
			}
		} else {
			return (this.child(0) as Term).eval();
		}
	}

}

class Term extends ASTList {
	eval(): number {
		if (this.childrenNum == 3) {
			let left = (this.child(0) as Term);
			let op = (this.child(1) as Single).getValue();
			let right = (this.child(2) as Factor);
			switch (op) {
				case "*":
					return left.eval() * right.eval();
				case "/":
					return left.eval() / right.eval();
				default:
					throw new Error(`Unknown token :${op}`);
			}
		} else {
			return (this.child(0) as Factor).eval();
		}
	}

}

class Factor extends ASTList {
	eval(): number {
		if (this.childrenNum == 3) {
			return (this.child(1) as Expr).eval();
		} else {
			return (this.child(0) as Num).getValue();
		}
	}
}

let S = new NonTerminal("S");
let E = new NonTerminal("E");
let T = new NonTerminal("T");
let F = new NonTerminal("F");
let grammar = new AugmentedGrammar([
	[S,
		{ body: [E], action: (e) => new Program(e) }
	],
	[E,
		{ body: [E, "+", T] },
		{ body: [E, "-", T] },
		{ body: [T] },
		(e) => new Expr(e)
	],
	[T,
		{ body: [T, "*", F], },
		{ body: [T, "/", F] },
		{ body: [F] },
		(e) => new Term(e)
	],
	[F,
		{ body: ["(", E, ")",] },
		{ body: [Tag.NUM] },
		(e) => new Factor(e)
	]
]);

describe("============LR Parser Test============", function () {

	describe(`
	Grammar
	S->E
	E->E+T | E-T | T
	T->T*F | T/F |F
	F->(E) | NUM
	`, function () {

		describe(`SLR Test`, function () {
			let parser = buildSLRParser(grammar);
			it(`1+2*3-4/5-(2-1)=5.2`, function () {
				let ast = parser.parse(new RegexpTokenizer("1+2*3-4/5-(2-1)"));
				should(ast.eval()).eql(5.2);
			});
		});

		describe(`LR1 Test`, function () {
			let parser = buildLR1Parser(grammar);
			it(`1+2*3-4/5-(2-1)=5.2`, function () {
				let ast = parser.parse(new RegexpTokenizer("1+2*3-4/5-(2-1)"));
				should(ast.eval()).eql(5.2);
			});
		});

	});
});