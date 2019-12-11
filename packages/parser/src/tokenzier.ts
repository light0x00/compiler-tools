import { IToken, EOF, ILexer } from "@light0x00/parser-definition";
import { Word, Num, Tag, Single } from "@/definition";
import rootDebug from "debug";
import { Queue, assert } from "@light0x00/shim";
import { cloneDeep } from "lodash";

let debug = rootDebug("APP:tokenizer");


enum TokenType {
	BLANK, COMMENT, WORD, NUM, REAL, STRING, SINGLE
}

export class RegexpTokenizer implements ILexer {

	private patterns = [
		{ regexp: /(?<space>\s+)/y, type: TokenType.BLANK },
		{ regexp: /(?<comment>\/\/[^\n]*)/y, type: TokenType.COMMENT },
		{ regexp: /(?<word>[A-Z_a-z]\w*)/y, type: TokenType.WORD },
		{ regexp: /(?<real>([1-9]\d*\.\d+)|(0\.\d+))/y, type: TokenType.REAL },
		{ regexp: /(?<num>(0(?![0-9]))|([1-9]\d*(?!\.)))/y, type: TokenType.NUM },
		{ regexp: /(?<string>"(\\"|\\\\|\\n|\\t|[^"])*")/y, type: TokenType.STRING },
		{ regexp: /(?<single>.)/y, type: TokenType.SINGLE }
	]
	private lastIndex = 0
	private text: string
	private hasMore = true
	private reservedWords = new Map<string, Word>()
	private lineNo: number = 1
	private colNo: number = 0
	constructor(text: string) {
		this.text = text;
		this.reserve(new Word(Tag.WHILE, "while"));
		this.reserve(new Word(Tag.IF, "if"));
		this.reserve(new Word(Tag.ELSEIF, "elseif"));
		this.reserve(new Word(Tag.ELSE, "else"));
	}

	private reserve(reserve: Word) {
		this.reservedWords.set(reserve.lexeme, reserve);
	}

	private buffer = new Queue<IToken>();
	peek() {
		return this.peekFor(0);
	}

	peekFor(i: number): IToken {
		if (this.fill(i)) {
			return this.buffer.get(i) as IToken;
		} else {
			return EOF;
		}
	}

	nextToken(): IToken {
		if (this.fill(0))
			return this.buffer.removeFirst() as IToken;
		else
			return EOF;
	}

	/**
	 * 填充直到队列达到指定数量,或没有足够的输入符号.
	 * 如果填充达到要求的数量,返回true,否则false
	 * @param i
	 */
	private fill(i: number) {
		while (this.buffer.size() < i + 1 && this.hasMore) {
			this.addToken();
		}
		return i < this.buffer.size();
	}

	/**
	 * 填充
	 */
	private addToken(): boolean {
		assert(this.hasMore);

		let type;
		let lexeme;
		for (let p of this.patterns) {
			p.regexp.lastIndex = this.lastIndex;
			let r = p.regexp.exec(this.text);
			if (r != null) {
				type = p.type;
				lexeme = r[0];
				this.colNo += lexeme.length;
				this.lastIndex = p.regexp.lastIndex;
				if (this.lastIndex >= this.text.length)
					this.hasMore = false;
				break;
			}
		}
		if (type == undefined || lexeme == undefined) {
			this.hasMore = false;
			return false;
		}
		let pos = { lineNo: this.lineNo, colNo: this.colNo };
		switch (type) {
			/* 匹配一个空白符，包括空格、制表符、换页符、换行符和其他 Unicode 空格。 */
			case TokenType.BLANK:
				for (let chr of lexeme) {
					debug("空白 " + chr.charCodeAt(0));
					if (chr == "\n") {
						++this.lineNo;
						this.colNo = 0;
					}
				}
				break;
			case TokenType.WORD:
				debug("标识符 " + lexeme);
				if (this.reservedWords.has(lexeme)) {
					let reseve = this.reservedWords.get(lexeme);
					let dup = cloneDeep(reseve)!;
					dup.pos = pos;
					this.buffer.addLast(dup);
				} else {
					this.buffer.addLast(new Word(Tag.ID, lexeme, pos));
				}
				break;
			case TokenType.NUM:
				// debug("整数 " + lexeme);
				this.buffer.addLast(new Num(Number.parseInt(lexeme), pos));
				break;
			case TokenType.REAL:
				this.buffer.addLast(new Num(Number.parseFloat(lexeme), pos));
				// debug("浮点数 " + lexeme);
				break;
			case TokenType.STRING:
				this.buffer.addLast(new Word(Tag.STRING, lexeme, pos));
				// debug("字符串字面量 " + lexeme);
				break;
			case TokenType.COMMENT:
				debug("注释 " + lexeme);
				break;
			case TokenType.SINGLE:
				// debug("单字符 " + lexeme);
				this.buffer.addLast(new Single(lexeme, pos));
				break;
			default:
				throw new Error("tokenizer error,unknown token:" + lexeme);
		}
		return true;
	}

}
