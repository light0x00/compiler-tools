import { NonTerminal } from "@light0x00/parser-generator/lib/Definition";
import { IToken, ASTList, ASTLeaf } from "@light0x00/parser-definition";
import { AbstractRegexpTokenizer } from "./difinition";
import rootDebug from "debug";
import { buildLR1Parser } from "@light0x00/parser-generator/lib/LR/ParserBuilder";
import { AugmentedGrammar } from "@light0x00/parser-generator/lib/LR/Definition";
let debug = rootDebug("APP:json-parser");

enum Tag {
	STRING = "STRING", NUM = "NUM", SINGLE = "SINGLE"
}
enum TokenType {
	BLANK, NUM, STRING, SINGLE
}

abstract class Token implements IToken {
	abstract tableKey(): Object;
	abstract getValue(): Object;
}

class Word extends Token {
	tag: Tag
	lexeme: string
	constructor(tag: Tag, lexeme: string) {
		super();
		this.tag = tag;
		this.lexeme = lexeme;
	}
	tableKey(): Object {
		return this.tag;
	}
	getValue(): string {
		return this.lexeme;
	}

	toString() {
		return this.lexeme;
	}
}
class StringLiteral extends Word {
	constructor(lexeme: string) {
		super(Tag.STRING, lexeme);
	}

	getValue(): string {
		return this.lexeme.replace(/^"/, "").replace(/"$/, ""); //去掉双引号;
	}
}
class Single extends Token {
	tag: Tag
	lexeme: string
	constructor(lexeme: string) {
		super();
		this.tag = Tag.SINGLE;
		this.lexeme = lexeme;
	}
	tableKey(): Object {
		return this.lexeme;
	}
	getValue(): string {
		return this.lexeme;
	}

	toString() {
		return this.lexeme;
	}
}

class NumberLiteral extends Token {
	tag: Tag
	lexeme: number
	constructor(lexeme: number) {
		super();
		this.tag = Tag.NUM;
		this.lexeme = lexeme;
	}
	tableKey(): Object {
		return this.tag;
	}
	getValue(): number {
		return this.lexeme;
	}

	toString() {
		return this.lexeme;
	}
}

export class JsonTokenizer extends AbstractRegexpTokenizer<TokenType> {

	protected lineNo: number = 1
	protected colNo: number = 0

	constructor(text: string) {
		super(text, [
			{ regexp: /(?<space>\s+)/y, type: TokenType.BLANK },
			{ regexp: /(?<real>([1-9]\d*\.\d+)|(0\.\d+))/y, type: TokenType.NUM },
			{ regexp: /(?<num>(0(?![0-9]))|([1-9]\d*(?!\.)))/y, type: TokenType.NUM },
			{ regexp: /"(?<string>(\\"|\\\\|\\n|\\t|[^"])*)"/y, type: TokenType.STRING },
			{ regexp: /(?<single>.)/y, type: TokenType.SINGLE }
		]);
	}

	protected createToken(lexeme: string, type: TokenType, match: RegExpExecArray): IToken | undefined {
		this.colNo += lexeme.length;
		switch (type) {
			case TokenType.BLANK:
				for (let chr of lexeme) {
					debug("空白 " + chr.charCodeAt(0));
					if (chr == "\n") {
						++this.lineNo;
						this.colNo = 0;
					}
				}
				break;
			case TokenType.NUM:
				return new NumberLiteral(Number.parseFloat(lexeme));
			case TokenType.STRING:
				return new StringLiteral(match!.groups!["string"]);
			case TokenType.SINGLE:
				return new Single(lexeme);
			default:
				throw new Error("tokenizer error,unknown token:" + lexeme);
		}
		return undefined;
	}
}

class ObjectNode extends ASTList {
	eval(): Object {
		let obj = {};
		if (this.childrenNum == 3) {
			let entryNode: EntryNode | undefined = (this.child(1) as EntryNode);
			do {
				let key = entryNode.key();
				let val = entryNode.val();
				Object.defineProperty(obj, key, { value: val, enumerable: true });

				entryNode = entryNode.nextEntry();
			} while (entryNode != undefined);
		}
		return obj;
	}
}

type Entry = { key: object, val: object };

class EntryNode extends ASTList {
	eval(): Array<Entry> {
		throw new Error("Method not implemented.");
	}
	key(): string {
		return (this.child(0) as KeyNode).eval();
	}
	val(): object {
		return (this.child(2) as ValNode).eval();
	}
	nextEntry(): EntryNode | undefined {
		if (this.childrenNum == 5) {
			return this.child(4) as EntryNode;
		}
		return undefined;
	}
}

class KeyNode extends ASTLeaf {
	eval(): string {
		return (this.token as Word).getValue();
	}
}

class ValNode extends ASTList {
	eval(): object {
		let child = this.child(0);
		if (child instanceof ObjectNode) {
			return child.eval();
		} else {
			return (child as Token).getValue();
		}
	}
}
/*
obj-> { entry }
entry->key : val , entry | key : val
key->String
val-> obj |  String | Number
*/

let S = new NonTerminal("S");
let obj = new NonTerminal("obj");
let entry = new NonTerminal("entry");
let key = new NonTerminal("key");
let val = new NonTerminal("val");

let grammar = new AugmentedGrammar([
	[S, { body: [obj] }],
	[obj, { body: ["{", entry, "}"] }, (e) => new ObjectNode(e)],
	[entry, { body: [key, ":", val, ",", entry] }, { body: [key, ":", val] }, (e) => new EntryNode(e)],
	[key, { body: [Tag.STRING] }, (e) => new KeyNode(e![0] as IToken)],
	[val, { body: [obj] }, { body: [Tag.STRING] }, { body: [Tag.NUM] }, (e) => new ValNode(e)]
]);

export let parser = buildLR1Parser(grammar);
