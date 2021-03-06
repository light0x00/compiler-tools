import { buildLLParser } from "@light0x00/parser-generator/lib/LL/Parser";
import { NIL, ASTList } from "@light0x00/parser-definition";
import { NonTerminal, ActionGrammar } from "@light0x00/parser-generator/lib/Definition";
import { Tag, Num, Single, Token } from "./arithmetic-tokenzier";
/*
E -> TE'
E' -> +TE'| -TE' |ε
T -> FT'
T' -> *FT'| /FT' |ε
F -> (E)|NUM
*/
class Expr extends ASTList {

	eval() {
		let term = this.child(0) as Term;
		let expr2;
		if (this.childrenNum == 2)
			expr2 = this.child(1) as Expr2;
		let result = term.eval();
		while (expr2 != null) {
			let op = expr2.operator();
			let rightValue = expr2.rightValue();
			switch (op) {
				case "+":
					result += rightValue;
					break;
				case "-":
					result -= rightValue;
					break;
				default:
					throw new Error("unknown operator " + op);
			}
			if (expr2.hasSubExpr2())
				expr2 = expr2.subExpr2();
			else
				expr2 = null;
		}
		return result;
	}
}

/* E2 */
class Expr2 extends ASTList {

	operator(): string {
		return (this.child(0) as Single).getValue() as string;
	}
	rightValue(): number {
		return (this.child(1) as Term).eval();
	}

	hasSubExpr2() {
		return this.childrenNum == 3;
	}

	subExpr2(): Expr2 {
		return (this.child(2) as Expr2);
	}
}

class Term extends ASTList {

	eval() {
		let result = (this.child(0) as Factor).eval();
		let term2;
		if (this.childrenNum == 2) {
			term2 = this.child(1) as Term2;
		}
		while (term2 != null) {
			let op = term2.operator();
			let rightValue = term2.rightValue();
			switch (op) {
				case "*":
					result *= rightValue;
					break;
				case "/":
					result /= rightValue;
					break;
				default:
					throw new Error("unknown operator " + op);
			}
			if (term2.hasSubTerm2()) {
				term2 = term2.getSubTerm2();
			} else {
				term2 = null;
			}
		}
		return result;
	}
}

class Term2 extends ASTList {

	toString() {
		return "(" + this.children.join(" ") + ")";
	}
	operator(): string {
		return (this.child(0) as Token).getValue() as string;
	}
	rightValue(): number {
		return (this.child(1) as Factor).eval();
	}
	hasSubTerm2(): boolean {
		return this.childrenNum == 3;
	}
	getSubTerm2() {
		return this.child(2) as Term2;
	}
}

class Factor extends ASTList {
	eval(): number {
		/* (E) */
		if (this.childrenNum == 3) {
			return (this.child(1) as Expr).eval();
		}
		/* NUM */
		else {
			return (this.child(0) as Num).getValue();
		}
	}
}

let E = new NonTerminal("E");
let E2 = new NonTerminal("E2");
let T = new NonTerminal("T");
let T2 = new NonTerminal("T2");
let F = new NonTerminal("F");

let grammar = new ActionGrammar([
	[E,
		{ body: [T, E2], action: () => new Expr() }
	],
	[E2,
		{ body: ["+", T, E2], action: () => new Expr2() },
		{ body: ["-", T, E2], action: () => new Expr2() },
		{ body: [NIL] }
	],
	[T,
		{ body: [F, T2], action: () => new Term() }
	],
	[T2,
		{ body: ["*", F, T2], action: () => new Term2() },
		{ body: ["/", F, T2], action: () => new Term2() },
		{ body: [NIL] }],
	[F,
		{ body: ["(", E, ")"], action: () => new Factor() },
		{ body: [Tag.NUM], action: () => new Factor() }
	]
]);

let parser = buildLLParser(grammar);

export default parser;