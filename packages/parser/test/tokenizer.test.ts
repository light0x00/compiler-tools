import should from "should";
import { RegexpTokenizer } from "@/tokenzier";
import { EOF } from "@light0x00/parser-definition";
import { getMock } from "./common/Toolkit";
import path from "path";
import rootDebug from "debug";
let debug = rootDebug("APP:test");

rootDebug.enable("APP:test");

describe("============Tokenizer Test============", function () {

	describe(`
	分词正则测试
    `, function () {
		it(`浮点数`, function () {
			let regex = /^(([1-9]\d*\.\d+)|(0\.\d+))$/;

			should(regex.test("123.456")).be.true();
			should(regex.test("0.456")).be.true();
			should(regex.test(".456")).be.false();
			should(regex.test("01.456")).be.false();
			should(regex.test("0.456a")).be.false();
		});
		it(`整数`, function () {
			let regex = /^((0(?![0-9]))|([1-9]\d*(?!\.)))$/;
			should(regex.test("000")).be.false();
			should(regex.test("01")).be.false();
			should(regex.test("1.2")).be.false();
			should(regex.test("12")).be.true();
			should(regex.test("0")).be.true();
		});
		it(`标识符/保留字`, function () {
			let regex = /^[A-Z_a-z]\w*$/;

			should(regex.test("a1")).be.true();
			should(regex.test("a1_")).be.true();
			should(regex.test("_a1")).be.true();
			should(regex.test("1a_")).be.false();
		});
		it(`注释`,function(){
			let regex = /(?<comment>\/\/[^\n]*)/y;
			should(regex.exec("//aaa\nbbb")![0]).equal("//aaa");
		});
		it(`字符串`, function () {
			let regex = /^"(\\"|\\\\|\\n|\\t|[^"])*"$/;
			should(
				regex.test(
					getMock(path.resolve(__dirname,  "./string.txt"))
				)).be.true();
		});

	});

	describe(`
	分词器集成测试
    `, function () {
		it(``,function(){
			let t = new RegexpTokenizer(getMock(path.resolve(__dirname, "program.txt")));
			let token;
			while((token=t.nextToken())!=EOF){
				debug(token.toString());
			}
		});
	});
});
