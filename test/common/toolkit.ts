import { EOF, ILexer, IToken } from "@/common/definition";
import { Word, Tag } from "@/parser/definition";
import fs from "fs";

export class MockLexer implements ILexer {

	tokens: Array<IToken> = [];
	position = 0;
	constructor(tokens: Array<IToken>) {
		this.tokens = tokens;
	}

	peek(): IToken {
		if (this.position >= this.tokens.length)
			return EOF;
		return this.tokens[this.position];
	}

	nextToken(): IToken {
		if (this.position >= this.tokens.length)
			return EOF;
		return this.tokens[this.position++];
	}
}

export class TokenBuilder{
	static ID(v:string){
		return new Word(Tag.ID,v);
	}
	// static SINGLE
}

export const getMock = (fullpath: string) => fs.readFileSync(fullpath, "utf8");