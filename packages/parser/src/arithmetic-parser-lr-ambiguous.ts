
import { NonTerminal, TerminalTrait } from "@light0x00/parser-generator/lib/Definition";
import { AugmentedGrammar } from "@light0x00/parser-generator/lib/LR/Definition";
import { buildLR1Parser, buildSLRParser } from "@light0x00/parser-generator/lib/LR/ParserBuilder";
import { ASTList } from "@light0x00/parser-definition";
import { Tag, Num, Single } from "./arithmetic-tokenzier";

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

let parserLR1 = buildLR1Parser(grammar);
let parserSLR = buildSLRParser(grammar);

export { parserLR1, parserSLR };
