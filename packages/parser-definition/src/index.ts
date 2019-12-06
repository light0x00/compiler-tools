/* -------------------------------- Lexical Analysis Specification -------------------------------- */

export interface IToken {
	tableKey(): Object;
}
export let foo="fooo";
export let bar="fooo";
/* special token like EOF\NIL */
class Special implements IToken {
	[Symbol.toStringTag]: string;
	description: string;
	private desc: string;
	constructor(desc: string) {
		this.desc = desc;
	}
	getValue(): Object {
		throw new Error("Special Toekn has no value!");
	}
	tableKey() {
		return this;
	}
	toString() {
		return this.desc;
	}
}
export const NIL = new Special("NIL");
export const EOF = new Special("EOF");

export interface ILexer {
	peek(): IToken
	nextToken(): IToken
	// position(): { lineNo: number, colNo: number }
}

/* -------------------------------- Syntax Analysis Specification -------------------------------- */

/* Used to produce abstract syntax tree during parsing */
export interface ASTMaker {
	(eles?: Array<ASTree | IToken>): ASTree;
}

/*
The elements that make up an AST node:
-IToken (for leaf nodes)
-ASTree (for non-leaf node)
*/
export type ASTElement = IToken | ASTree

/* AST */
export abstract class ASTree {
	abstract appendElement(ele: ASTElement): void;
	eval(): Object {
		throw new Error("Do not support the evaluate!");
	}
}
export abstract class ASTList extends ASTree {
	protected children: Array<ASTElement>
	constructor(children?: Array<ASTElement>) {
		super();
		if (children == null)
			children = new Array<ASTElement>();
		this.children = children;
	}
	//issue #关于分析树的构造
	appendElement(ele: ASTElement) {
		this.children.push(ele);
	}
	get childrenNum() {
		return this.children.length;
	}
	protected child(i: number) {
		if (i >= this.children.length) {
			throw new Error("index out of children ast node array!");
		}
		return this.children[i];
	}

	toString() {
		let eleStr = this.children.join(" ");
		return this.childrenNum > 1 ? "(" + eleStr + ")" : eleStr;
	}
}
export abstract class ASTLeaf extends ASTree {
	token: IToken
	constructor(token?: IToken) {
		super();
		if (token != undefined)
			this.token = token;
	}
	appendElement(token: IToken) {
		this.token = token;
	}

	toString() {
		return this.token.toString();
	}
}

