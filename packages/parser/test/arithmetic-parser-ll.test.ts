
import { RegexpTokenizer } from "@/arithmetic-tokenzier";
import debug from "debug";
import should from "should";
import parser from "@/arithmetic-parser-ll";

debug.enable("APP:LLParser");

describe("============LL Arithmetic Parser Test============", function () {
	/*
	E -> TE's
	E' -> +TE'| -TE' |ε
	T -> FT'
	T' -> *FT'| /FT' |ε
	F -> (E)|NUM
	*/
	describe(`
	Grammar
	E -> TE'
	E' -> +TE'| -TE' |ε
	T -> FT'
	T' -> *FT'| /FT' |ε
	F -> (E)|NUM
	`, function () {

		it(`1+2*(3+4)*5/2=36`, function () {
			let ast = parser.parse(new RegexpTokenizer("1+2*(3+4)*5/2"));
			should(ast.eval()).eql(36);
		});

		it(`(1+2*(3+4)*5)/2=35.5`, function () {
			let ast = parser.parse(new RegexpTokenizer("(1+2*(3+4)*5)/2"));
			should(ast.eval()).eql(35.5);
		});
	});

});
