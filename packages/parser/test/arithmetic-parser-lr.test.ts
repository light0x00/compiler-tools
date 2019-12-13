
import { RegexpTokenizer } from "@/arithmetic-tokenzier";
import should from "should";
import { parserLR1,parserSLR } from "@/arithmetic-parser-lr";


describe("============LR Parser Test============", function () {

	describe(`
	Grammar
	S->E
	E->E+T | E-T | T
	T->T*F | T/F |F
	F->(E) | NUM
	`, function () {

		describe(`SLR Test`, function () {

			it(`1+2*3-4/5-(2-1)=5.2`, function () {
				let ast = parserSLR.parse(new RegexpTokenizer("1+2*3-4/5-(2-1)"));
				should(ast.eval()).eql(5.2);
			});
		});

		describe(`LR1 Test`, function () {

			it(`1+2*3-4/5-(2-1)=5.2`, function () {
				let ast = parserLR1.parse(new RegexpTokenizer("1+2*3-4/5-(2-1)"));
				should(ast.eval()).eql(5.2);
			});
		});

	});
});