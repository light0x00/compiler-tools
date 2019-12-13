import { parser, JsonTokenizer } from "@/json-parser-lr";
import should from "should";


describe("============JSON Parser Test============", function () {

	it(``, function () {
		let ast = parser.parse(new JsonTokenizer(`{"a":123,"b":{"c":"ccc"}}`));
		let r = ast.eval();
		should(r).be.eql({ a: 123, b: { c: "ccc" } });
		console.log(r);
	});

	it(``, function () {
		should.throws(function(){
			parser.parse(new JsonTokenizer(`{"a":123,"b":{"c":"ccc"}`));
		});
	});

});
