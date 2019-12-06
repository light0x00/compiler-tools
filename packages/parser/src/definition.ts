import { IToken } from "@light0x00/parser-definition";
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
	ELSE = "ELSE"
}
export type TokenPosition = {
	lineNo: number;
	colNo: number;
};
export abstract class Token implements IToken {
	readonly tag: Tag;
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
	abstract tableKey(): Object;
	abstract getValue(): Object;
}
/* 多字符 符号 */
export class Word extends Token {
	lexeme: string;
	constructor(tag: Tag, lexeme: string, pos?: TokenPosition) {
		super(tag, pos);
		this.lexeme = lexeme;
	}
	tableKey() {
		return this.tag;
	}
	getValue() {
		return this.lexeme;
	}
	toString() {
		return this.lexeme;
	}
}
/* 数字 */
export class Num extends Token {
	readonly value: number;
	constructor(v: number, pos?: TokenPosition) {
		super(Tag.NUM, pos);
		this.value = v;
	}
	tableKey() {
		return this.tag;
	}
	getValue() {
		return this.value;
	}
	toString() {
		return this.value.toString();
	}
}
/* 单字符 符号
比"-" 可能是运算符,也可能是构成lambda的一部分 ()->
这类符号作用很多,相比与用自动机识别,通过BNF来表达更合适,因此在语法分析阶段处理
*/
export class Single extends Token {
	lexeme: string; /* 这里原本应该为char类型 */
	constructor(v: string, pos?: TokenPosition) {
		super(Tag.SINGLE, pos);
		this.lexeme = v;
	}
	tableKey() {
		return this.lexeme;
	}
	getValue(): Object {
		return this.lexeme;
	}
	toString() {
		return this.lexeme;
	}
}
