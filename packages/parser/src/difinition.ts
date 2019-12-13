import { IToken, EOF, ILexer } from "@light0x00/parser-definition";
import { Queue, assert } from "@light0x00/shim";

// import rootDebug from "debug";
// let debug = rootDebug("APP:tokenizer");

type TokenPatterns<T> = Array<{ regexp: RegExp, type: T }>

export abstract class AbstractRegexpTokenizer<T> implements ILexer {

	private patterns: TokenPatterns<T>;
	private lastIndex = 0
	private text: string
	private hasMore = true

	private buffer = new Queue<IToken>();

	constructor(text: string, patterns: TokenPatterns<T>) {
		this.text = text;
		this.patterns = patterns;
	}

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
		//determine lexeme and type by TokenPatterns
		let type: T | undefined;
		let lexeme: string | undefined;
		let match: RegExpExecArray | null = null;
		for (let p of this.patterns) {
			p.regexp.lastIndex = this.lastIndex;
			match = p.regexp.exec(this.text);
			if (match != null) {
				type = p.type;
				lexeme = match[0];

				this.lastIndex = p.regexp.lastIndex;
				//reach the end
				if (this.lastIndex >= this.text.length)
					this.hasMore = false;
				break;
			}
		}
		if (type == undefined || lexeme == undefined || match == null) {
			this.hasMore = false;
			return false;
		}
		//create token
		let t = this.createToken(lexeme, type, match);
		if (t == undefined) {
			return false;
		} else {
			this.buffer.addLast(t);
			return true;
		}
	}

	protected abstract createToken(lexeme: string, type: T, match: RegExpExecArray): IToken | undefined

}