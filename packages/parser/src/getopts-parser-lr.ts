import { AbstractRegexpTokenizer } from "./difinition";
import { IToken, ASTLeaf, ASTList, NIL } from "@light0x00/parser-definition";
import { AugmentedGrammar } from "@light0x00/parser-generator/lib/LR/Definition";
import { NonTerminal } from "@light0x00/parser-generator/lib/Definition";
import { buildLR1Parser } from "@light0x00/parser-generator/lib/LR/ParserBuilder";

enum Tag {
	BLANK = "BLANK", SERIAL = "SERIAL", SUFFIX = "SUFFIX", DASH = "DASH", STRING = "STRIN"
}

class Token implements IToken {
	protected tag: Tag;
	protected lexeme: string;
	constructor(tag: Tag, lexeme: string) {
		this.tag = tag;
		this.lexeme = lexeme;
	}
	tableKey(): Object {
		return this.tag;
	}
	getValue() {
		return this.lexeme;
	}
	toString() {
		return this.lexeme;
	}
}

class Single extends Token {

	tableKey(): Object {
		return this.lexeme;
	}
}

class OptsTokenzier extends AbstractRegexpTokenizer<Tag>{

	constructor(text: string) {
		super(text, [
			{ regexp: /\s+/y, type: Tag.BLANK },
			/* -- xxxx */
			{ regexp: /--\s+(?<suffix>.*)$/y, type: Tag.SUFFIX },
			/* - */
			{ regexp: /-/y, type: Tag.DASH },
			/* "xx xx xxx" */
			{ regexp: /"(?<string>(\\"|\\\\|\\n|\\t|[^"])*)"/y, type: Tag.STRING },
			/* xxxxxxx */
			{ regexp: /[^\s]+/y, type: Tag.SERIAL },
		]);
	}

	protected createToken(lexeme: string, type: Tag, match: RegExpExecArray): IToken | undefined {
		switch (type) {
			case Tag.BLANK:
				break;
			case Tag.SERIAL:
				return new Token(Tag.SERIAL, lexeme);
			case Tag.STRING:
				return new Token(Tag.STRING, match.groups!["string"]);
			case Tag.SUFFIX:
				return new Token(Tag.SUFFIX, match.groups!["suffix"]);
			case Tag.DASH:
				return new Single(Tag.DASH, lexeme);
		}
		return undefined;
	}
}

let t = new OptsTokenzier(`-m "feat: initial commit" --fuck shit -- bitch`);
console.log(t.nextToken());
console.log(t.nextToken());
console.log(t.nextToken());
console.log(t.nextToken());
console.log(t.nextToken());
console.log(t.nextToken());
console.log(t.nextToken());
console.log(t.nextToken());
console.log(t.nextToken());
console.log(t.nextToken());
console.log(t.nextToken());
console.log(t.nextToken());
console.log(t.nextToken());

class OptSuffix extends ASTLeaf {
	eval(): string {
		return (this.token as Token).getValue();
	}
}

class LongOptKey extends ASTList {
	eval(): string {
		return (this.child(2) as Token).getValue();
	}
}


class OptVal extends ASTLeaf {
	eval(): string {
		return (this.token as Token).getValue();
	}
}
class LongOptEntry extends ASTList {
	eval(): OptEntryVo {
		let key = (this.child(0) as LongOptKey).eval();
		let val: string | undefined;
		if (this.childrenNum == 2) {
			val = (this.child(1) as OptVal).eval();
		}
		return { key, val };
	}
}
class ShortOptKey extends ASTList {
	eval(): string {
		return (this.child(1) as Token).getValue();
	}
}
class ShortOptEntry extends ASTList {
	eval(): Array<OptEntryVo> {
		let entries: Array<OptEntryVo> = [];
		let keys = (this.child(0) as LongOptKey).eval();
		for (let k of keys) {
			//
			entries.push({ key: k, val: undefined });
		}
		if (this.childrenNum == 2) {
			entries[entries.length - 1].val = (this.child(1) as OptVal).eval();
		}
		return entries;
	}
}

type OptEntryVo = { key: string, val: string | undefined }
class Opt extends ASTList {
	eval(): Array<OptEntryVo> {
		let entries: Array<{ key: string, val: string | undefined }> = [];
		if (this.childrenNum == 0)
			return entries;
		if (this.child(0) instanceof LongOptEntry) {
			entries.push((this.child(0) as LongOptEntry).eval());
		} else if (this.child(0) instanceof ShortOptEntry) {
			entries.push(...(this.child(0) as ShortOptEntry).eval());
		}
		if (this.childrenNum == 2) {
			entries.push(...(this.child(1) as Opt).eval());
		}
		return entries;
	}
}

type OptsVo = { opts: Array<OptEntryVo> | undefined, suffixOpt: string | undefined }
class Opts extends ASTList {

	eval(): OptsVo {
		let result: OptsVo | undefined;
		if (this.childrenNum == 0) {
			result = { opts: undefined, suffixOpt: undefined };
		} else if (this.childrenNum == 1) {
			let first = this.child(0);
			if (first instanceof Opt) {
				result = { opts: first.eval(), suffixOpt: undefined };
			} else if (first instanceof OptSuffix) {
				result = { opts: undefined, suffixOpt: first.eval() };
			}
		} else {
			let opts = (this.child(0) as Opt).eval();
			let suffix = (this.child(1) as OptSuffix).eval();
			result = { opts: opts, suffixOpt: suffix };
		}
		return result!;
	}
}

/*
opts -> opt suffix
opt -> short-opt opt | long-opt opt | 𝝴
short-opt -> -SERIAL opt-val | -SERIAL
long-opt -> --SERIAL opt-val | --SERIAL
suffix -> SUFFIX | 𝝴
opt-val-> SERIAL | STRING
*/

let S = new NonTerminal("S");
let opts = new NonTerminal("opts");
let opt = new NonTerminal("opt");
let long_opt = new NonTerminal("long-opt");
let long_opt_key = new NonTerminal("long-opt-key");
let short_opt = new NonTerminal("short-opt");
let short_opt_key = new NonTerminal("short-opt-key");
let opt_val = new NonTerminal("opt-val");
let suffix = new NonTerminal("suffix");

let grammar = new AugmentedGrammar([
	[S, { body: [opts] }],

	[opts, { body: [opt, suffix] }, (e) => new Opts(e)],
	[opt, { body: [long_opt, opt] }, { body: [short_opt, opt] }, { body: [NIL] }, (e) => new Opt(e)],
	[suffix, { body: [Tag.SUFFIX] }, { body: [NIL] }, (e) => new OptSuffix(e![0] as IToken)],

	[long_opt, { body: [long_opt_key, opt_val] }, { body: [long_opt_key] }, (e) => new LongOptEntry(e)],
	[short_opt, { body: [short_opt_key, opt_val] }, { body: [short_opt_key] }, (e) => new ShortOptEntry(e)],

	[long_opt_key, { body: ["-", "-", Tag.SERIAL] }, (e) => new LongOptKey(e)],
	[short_opt_key, { body: ["-", Tag.SERIAL] }, (e) => new ShortOptKey(e)],
	[opt_val, { body: [Tag.SERIAL] }, { body: [Tag.STRING] }, (e) => new OptVal(e![0] as IToken)]
]);

let parser = buildLR1Parser(grammar);
let ast = parser.parse(new OptsTokenzier(`-am "feat: initial commit" --fuck shit -a -b --bullshit -- bitch`));
console.log(ast.eval());
