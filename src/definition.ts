import { assert } from "./common/shim";

export enum Tag {
	Nil = "Nil",
	EOF = "EOF",
	ID = "ID",
	NUM = "NUM",
	SINGLE = "SINGLE",
	STRING = "STRING",
	BLANK = "BLANK",
	WHILE = "WHILE",
	IF = "IF",
	ELSEIF = "ELSEIF",
	ELSE = "ELSE",
}

export type TokenPosition = { lineNo: number, colNo: number }

export class Token {
	readonly tag: Tag
	protected _pos: TokenPosition;
	constructor(tag: Tag, pos: TokenPosition = { lineNo: -1, colNo: -1 }) {
		this.tag = tag;
		this.pos = pos;
	}

	toString() {
		return this.tag + `(${this.pos.lineNo},${this.pos.colNo})`;
	}

	get pos() {
		return this._pos;
	}

	set pos(pos: TokenPosition) {
		this._pos = pos;
	}
	/*
	不同类型的Token的查表问题
	分析表中存的可能是 终结符、EOF、NIL、Tag
	而分词器返回的均为Token,这里涉及到一个如何映射的问题

	比如对于以下文法,我们希望"+" 用Token.lexeme去查表,而对于id,则用Token.tag去查表.
	E -> NUM + NUM
	*/
	get tableKey(): any {
		return this;
	}
}

export class Word extends Token {
	lexeme: string
	constructor(tag: Tag, lexeme: string, pos?: TokenPosition) {
		super(tag, pos);
		this.lexeme = lexeme;
	}
	get tableKey() {
		return this.tag;
	}

	toString() {
		return super.toString() + " " + this.lexeme;
	}
}

export class Num extends Token {
	readonly value: number
	constructor(v: number, pos?: TokenPosition) {
		super(Tag.NUM, pos);
		this.value = v;
	}
	get tableKey() {
		return this.tag;
	}
	toString() {
		return super.toString() + " " + this.value;
	}
}
/* 单字符
比"-" 可能是运算符,也可能是构成lambda的一部分 ()->
这类符号作用很多,相比与用自动机识别,通过BNF来表达更合适,因此在语法分析阶段处理
*/
export class Single extends Token {
	lexeme: string /* 这里原本应该为char类型 */
	constructor(v: string, pos?: TokenPosition) {
		super(Tag.SINGLE, pos);
		this.lexeme = v;
	}
	get tableKey() {
		return this.lexeme;
	}
	toString() {
		return super.toString() + " " + this.lexeme;
	}
}

export const Nil = new Token(Tag.Nil);
export const EOF = new Token(Tag.EOF);

export interface ILexer {
	peek(): Token
	nextToken(): Token
}

export interface IReader {
	read(): string
	peek(): string
}


/* 语法分析 */


export type Terminal = Token | string
export type Symbol = NonTerminal | Terminal

export class NonTerminal extends Array<Production>{
	name: string;
	// prods: Production[];
	constructor(name: string, prods: Production[] = []) {
		super(...prods);
		this.name = name;
	}
	get prods() {
		return this;
	}
	set prods(prods: Production[]) {
		this.push(...prods);
	}

	toString() {
		return this.name;
	}

	addProd(id: number, body: Symbol[]) {
		let prod = new Production(id, this, body);
		this.prods.push(prod);
		return prod;
	}

	// parseAST(nodes: Array<ASTree> | Token) {
	// 	if (nodes instanceof Token) {
	// 		return new ASTLeaf(nodes);
	// 	} else {
	// 		return new ASTList(nodes);
	// 	}
	// }

}

/* 一个产生式由多个符号组成 */
export class Production extends Array<Symbol>{
	id: number;
	name: string;
	non_terminal: NonTerminal
	constructor(id: number, non_terminal: NonTerminal, body: Symbol[]) {
		super(...body);
		this.id = id;
		this.non_terminal = non_terminal;
		this.name = non_terminal.name;
	}
	/* 是否为空推导 形如 A->𝝴 */
	isEpsilon() {
		return this.length == 1 && this[0] == Nil;
	}

	toString() {
		return `(${this.id}) ${this.name}->${this.join("")}`;
	}
}

export interface IParser {
	parse(lexer: ILexer): void
}

export type RawGrammar = Array<Array<NonTerminal | Symbol[]>>

export class Grammar {
	protected prodIdCounter = 0;
	protected non_terminals: NonTerminal[] = []
	protected productions: Production[] = []
	protected prodMap = new Map<number, Production>()

	constructor(rawGrammar: RawGrammar) {
		this.construct(rawGrammar);
	}
	protected beforeConstruct(rawGrammar: RawGrammar) {
		assert(rawGrammar.length > 0);
	}
	protected construct(rawGrammar: RawGrammar) {
		this.beforeConstruct(rawGrammar);
		//每一个非终结符
		for (let x of rawGrammar) {
			assert(x.length > 0 && x[0] instanceof NonTerminal);
			let nt = x[0];
			this.non_terminals.push(x[0]);
			//非终结符的每一个产生式
			for (let i = 1; i < x.length; i++) {
				let prod = new Production(this.prodIdCounter++, nt, x[i] as Symbol[]);
				nt.prods.push(prod);
				this.prodMap.set(prod.id, prod);
				this.productions.push(prod);
			}
		}
		this.afterConstruct();
	}
	protected afterConstruct() {
		//Implement in subclasses
	}

	toString() {
		return this.productions.join("\n");
	}
	get NTS() {
		return this.non_terminals;
	}

	get Prods() {
		if (this.productions == null)
			this.productions = Array.from(this.prodMap.values());
		return this.productions;
	}
	//start symbol
	get startNT() {
		return this.non_terminals[0];
	}
}
