import { EOF, ILexer, Token, Word, Tag } from "@/definition";
import fs from "fs";

export class MockLexer implements ILexer {

	tokens: Array<Token> = [];
	position = 0;
	constructor(tokens: Array<Token>) {
		this.tokens = tokens;
	}

	peek(): Token {
		if (this.position >= this.tokens.length)
			return EOF;
		return this.tokens[this.position];
	}

	nextToken(): Token {
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