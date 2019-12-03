import { assert } from "../common/shim";
import { ASTMaker, NIL, ILexer } from "../common/definition";

export type Terminal = Object;
export type Symbol = NonTerminal | Terminal;
export class NonTerminal extends Array<Production> {
	name: string;
	constructor(name: string, prods: Production[] = []) {
		super(...prods);
		this.name = name;
	}
	get prods() {
		return this;
	}
	set prods(prods: Production[]) {
		this.push(...prods);
	}
	toString() {
		return this.name;
	}
	addProd(id: number, body: Symbol[]) {
		let prod = new Production(id, this, body);
		this.prods.push(prod);
		return prod;
	}
}
export class Production extends Array<Symbol> {
	id: number;
	name: string;
	non_terminal: NonTerminal;
	makeAST: ASTMaker;
	static DefaultMakeAST = () => { throw new Error("No action is provided"); };
	constructor(id: number, non_terminal: NonTerminal, body: Symbol[], makeAST: ASTMaker = Production.DefaultMakeAST) {
		super(...body);
		this.id = id;
		this.non_terminal = non_terminal;
		this.name = non_terminal.name;
		if (makeAST != null)
			this.makeAST = makeAST;
	}
	/* 是否为空推导 形如 A->𝝴 */
	isEpsilon() {
		return this.length == 1 && this[0] == NIL;
	}
	toString() {
		return `(${this.id}) ${this.name}->${this.join("")}`;
	}
}
export interface IParser {
	parse(lexer: ILexer): void;
}
export interface IGrammar {
	NTS(): NonTerminal[];
	Prods(): Production[];
	startNT(): NonTerminal;
}
/* 用于测试分析表 无法生成语法树 (!!下一次迭代干掉)*/
export type RawSimpleGrammar = Array<Array<NonTerminal | Symbol[]>>;
export class SimpleGrammar implements IGrammar {
	protected prodIdCounter = 0;
	protected non_terminals: NonTerminal[] = [];
	protected productions: Production[] = [];
	protected prodMap = new Map<number, Production>();
	constructor(rawGrammar: RawSimpleGrammar) {
		this.construct(rawGrammar);
	}
	protected beforeConstruct(rawGrammar: RawSimpleGrammar) {
		assert(rawGrammar.length > 0);
	}
	protected construct(rawGrammar: RawSimpleGrammar) {
		this.beforeConstruct(rawGrammar);
		//每一个非终结符
		for (let x of rawGrammar) {
			assert(x.length > 1 && x[0] instanceof NonTerminal);
			let nt = x[0];
			this.non_terminals.push(x[0]);
			//非终结符的每一个产生式
			for (let i = 1; i < x.length; i++) {
				assert(x[i] instanceof Array);
				let prod = new Production(this.prodIdCounter++, nt, x[i] as Symbol[]);
				nt.prods.push(prod);
				this.prodMap.set(prod.id, prod);
				this.productions.push(prod);
			}
		}
		this.afterConstruct();
	}
	protected afterConstruct() {
		//Implement in subclasses
	}
	toString() {
		return this.productions.join("\n");
	}
	NTS() {
		return this.non_terminals;
	}
	Prods() {
		if (this.productions == null)
			this.productions = Array.from(this.prodMap.values());
		return this.productions;
	}
	//start symbol
	startNT() {
		return this.non_terminals[0];
	}
}
/* production with semantic action */
export type RawProduction = {
	action?: ASTMaker;
	body: Symbol[];
};
export type RawActionGrammar = Array<Array<NonTerminal | RawProduction>>;
export class ActionGrammar implements IGrammar {
	protected prodIdCounter = 0;
	protected non_terminals: NonTerminal[] = [];
	protected productions: Production[] = [];
	protected prodMap = new Map<number, Production>();
	constructor(rawGrammar: RawActionGrammar) {
		this.construct(rawGrammar);
	}
	protected beforeConstruct(rawGrammar: RawActionGrammar) {
		assert(rawGrammar.length > 0);
	}
	protected construct(rawGrammar: RawActionGrammar) {
		this.beforeConstruct(rawGrammar);
		//for each non-terminal
		for (let x of rawGrammar) {
			assert(x.length > 1 && x[0] instanceof NonTerminal);
			let nt = x[0];
			this.non_terminals.push(x[0]);
			//for each production in non-terminal
			for (let i = 1; i < x.length; i++) {
				let rawProd = x[i] as RawProduction;
				assert(rawProd != null && rawProd.body != null);
				let prod = new Production(this.prodIdCounter++, nt, rawProd.body, rawProd.action);
				nt.prods.push(prod);
				this.prodMap.set(prod.id, prod);
				this.productions.push(prod);
			}
		}
		this.afterConstruct();
	}
	protected afterConstruct() {
		//Implement in subclasses
	}
	toString() {
		return this.productions.join("\n");
	}
	NTS() {
		return this.non_terminals;
	}
	Prods() {
		if (this.productions == null)
			this.productions = Array.from(this.prodMap.values());
		return this.productions;
	}
	//start symbol
	startNT() {
		return this.non_terminals[0];
	}
}
