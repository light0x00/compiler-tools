import { add } from "lodash";
import "should";

describe("============LR Parser Test============", function () {
	it(`is expected`, function () {
		add(1, 2).should.eql(3);
	});
});
