import { buildLLParser } from "@/parser-gen/LL/LL.parser";
import { NIL, ASTList } from "@/common/definition";
import { NonTerminal, ActionGrammar } from "@/parser-gen/definition";
import { Tag, Num, Single, Token } from "@/parser/definition";
import { RegexpTokenizer } from "@/parser/tokenzier";
import debug from "debug";
import should from "should";

debug.enable("APP:LLParser");

describe("============LL Parser Test============", function () {
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

	describe(`
	Grammar
	E -> TE'
	E' -> +TE'| -TE' |ε
	T -> FT'
	T' -> *FT'| /FT' |ε
	F -> (E)|NUM
	`, function () {

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

		it(`1+2*(3+4)*5/2=36`, function () {
			let ast = parser.parse(new RegexpTokenizer("1+2*(3+4)*5/2"));
			should(ast.eval()).eql(36);
		});

		it(`(1+2*(3+4)*5)/2=35.5`, function () {
			let ast = parser.parse(new RegexpTokenizer("(1+2*(3+4)*5)/2"));
			should(ast.eval()).eql(35.5);
		});
	});

});
