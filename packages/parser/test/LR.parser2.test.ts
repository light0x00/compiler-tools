import { NonTerminal, TerminalTrait } from "@light0x00/parser-generator/lib/Definition";
import { AugmentedGrammar } from "@light0x00/parser-generator/lib/LR/Definition";
import { Tag, Num, Single } from "@/Definition";
import { buildLR1Parser, buildSLRParser } from "@light0x00/parser-generator/lib/LR/ParserBuilder";
import { RegexpTokenizer } from "@/Tokenzier";
import { ASTList } from "@light0x00/parser-definition";
import should from "should";

class Expr extends ASTList {
	eval(): number {
		if (this.childrenNum == 3) {
			//(E)
			if (this.child(0) instanceof Single) {
				return (this.child(1) as Expr).eval();
			}
			//E op E
			else {
				let left = (this.child(0) as Expr);
				let op = (this.child(1) as Single).getValue();
				let right = (this.child(2) as Expr);
				switch (op) {
					case "+":
						return left.eval() + right.eval();
					case "-":
						return left.eval() - right.eval();
					case "*":
						return left.eval() * right.eval();
					case "/":
						return left.eval() / right.eval();
					default:
						throw new Error(`Unknown token :${op}`);
				}
			}
		}
		//NUM
		else {
			return (this.child(0) as Num).getValue();
		}
	}
}

let S = new NonTerminal("S");
let E = new NonTerminal("E");

let traits = new Map<string, TerminalTrait>();
traits.set("+", { prec: 0, leftAssoc: true });
traits.set("-", { prec: 0, leftAssoc: true });
traits.set("*", { prec: 1, leftAssoc: true });
traits.set("/", { prec: 1, leftAssoc: true });

let grammar = new AugmentedGrammar([
	[S, { body: [E] }],
	[E, { body: [E, "+", E] }, { body: [E, "-", E] }, { body: [E, "*", E] }, { body: [E, "/", E] }, { body: ["(", E, ")"] }, { body: [Tag.NUM] }, (e) => new Expr(e)]
], traits);

describe("============LR Ambiguity Parser Test============", function () {

	describe(`
	Grammar
	S->E
	E->E+E | E-E | E*E | E/E | (E) | NUM
	`, function () {

		describe(`LR1 Ambiguity  Test`, function () {
			let parser = buildLR1Parser(grammar);

			it(`1+2*3`, function () {
				let ast = parser.parse(new RegexpTokenizer("1+2*3"));
				should(ast.eval()).eql(7);
			});
			it(`1+2*3-(5-1)/2`, function () {
				let ast = parser.parse(new RegexpTokenizer("1+2*3-(5-1)/2"));
				should(ast.eval()).eql(5);
			});
		});
		describe(`SLR Ambiguity Test`, function () {
			let parser = buildSLRParser(grammar);
			it(`1+2*3`, function () {
				let ast = parser.parse(new RegexpTokenizer("1+2*3"));
				should(ast.eval()).eql(7);
			});
			it(`1+2*3-(5-1)/2`, function () {
				let ast = parser.parse(new RegexpTokenizer("1+2*3-(5-1)/2"));
				should(ast.eval()).eql(5);
			});

		});
	});
});