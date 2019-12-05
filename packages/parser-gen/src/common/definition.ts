/* -------------------------------- Lexical Analysis Specification -------------------------------- */

export interface IToken {
	tableKey(): Object;
}

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

/*
#关于分析树的构造
对于自顶向下分析 在构造父节点时无法确定其需要的元素 因此节点需要懒初始化
	具体的解决方案是,先new父节点(这时不传任何元素),当处理到其子节点时,再往父节点追加元素
对于自底向上分析 由于从子节点开始构建分析树 构造每个节点所需的元素是确定的(归约句柄) 因此可以在构造AST传入元素初始化
*/

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

