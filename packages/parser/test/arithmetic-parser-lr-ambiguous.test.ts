
import { RegexpTokenizer } from "@/arithmetic-tokenzier";
import should from "should";

import { parserLR1, parserSLR } from "@/arithmetic-parser-lr-ambiguous";


describe("============LR Ambiguity Parser Test============", function () {

	describe(`
	Grammar
	S->E
	E->E+E | E-E | E*E | E/E | (E) | NUM
	`, function () {

		describe(`LR1 Ambiguity  Test`, function () {

			it(`1+2*3`, function () {
				let ast = parserLR1.parse(new RegexpTokenizer("1+2*3"));
				should(ast.eval()).eql(7);
			});
			it(`1+2*3-(5-1)/2`, function () {
				let ast = parserLR1.parse(new RegexpTokenizer("1+2*3-(5-1)/2"));
				should(ast.eval()).eql(5);
			});
		});
		describe(`SLR Ambiguity Test`, function () {

			it(`1+2*3`, function () {
				let ast = parserSLR.parse(new RegexpTokenizer("1+2*3"));
				should(ast.eval()).eql(7);
			});
			it(`1+2*3-(5-1)/2`, function () {
				let ast = parserSLR.parse(new RegexpTokenizer("1+2*3-(5-1)/2"));
				should(ast.eval()).eql(5);
			});

		});
	});
});