import { assert } from "@light0x00/shim";
import { ASTMaker, NIL, ILexer } from "@light0x00/parser-definition";
import _ from "lodash";

// export type Terminal = string | Tag | IToken;
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
	nonTerminal: NonTerminal;
	makeAST: ASTMaker;
	private _precedence: number;
	private _leftAssociation: boolean;
	static DefaultMakeAST = () => { throw new Error("No action is provided"); };
	constructor(id: number, non_terminal: NonTerminal, body: Symbol[], makeAST: ASTMaker = Production.DefaultMakeAST, precedence: number = 0, leftAssociation: boolean = false) {
		super(...body);
		this.id = id;
		this.nonTerminal = non_terminal;
		this.name = non_terminal.name;
		this._precedence = precedence;
		this._leftAssociation = leftAssociation;
		this.makeAST = makeAST;
	}

	get leftAssoc() {
		return this._leftAssociation;
	}

	get prec() {
		return this._precedence;
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
/* 用于测试分析表 无法用于生成语法树 (!!下一次迭代干掉)*/
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

export type TerminalTrait = { prec: number, leftAssoc: boolean }
export type TraitsTable = Map<Terminal, TerminalTrait>

export type RawActionGrammar = Array<Array<NonTerminal | RawProduction | ASTMaker>>;

export class ActionGrammar implements IGrammar {
	protected prodIdCounter = 0;
	protected nonTerminals: NonTerminal[] = [];
	protected productions: Production[] = [];
	protected productionsMap = new Map<number, Production>();
	protected traits: TraitsTable;
	constructor(rawGrammar: RawActionGrammar, traits: TraitsTable = new Map<Terminal, TerminalTrait>()) {
		this.traits = traits;
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
			//The first one must be NonTerminal
			let nonTerminal = x[0];
			this.nonTerminals.push(nonTerminal);
			//The last one could be ASTMaker
			let hasDefault = _.isFunction(x[x.length - 1]);
			//for each production in non-terminal
			for (let i = 1; i < (hasDefault ? x.length - 1 : x.length); i++) {
				let rawProd = x[i] as RawProduction;
				assert(x[i] != null && rawProd.body != null);
				let { body, action } = rawProd;
				//动作
				if (action == null && hasDefault)
					action = x[x.length - 1] as ASTMaker;
				//优先级、结合方向
				let { prec, leftAssoc } = this.determineProdTrait(body);
				let prod = new Production(this.prodIdCounter++, nonTerminal, body, action, prec, leftAssoc);
				nonTerminal.prods.push(prod);
				this.productionsMap.set(prod.id, prod);
				this.productions.push(prod);
			}
		}
		this.afterConstruct();
	}

	private determineProdTrait(prodBody: Symbol[]): TerminalTrait {
		let maxTrait: TerminalTrait = { prec: -1, leftAssoc: false };
		for (let sym of prodBody) {
			if (this.traits.has(sym)) {
				let curTrait = this.traits.get(sym)!;
				if (curTrait.prec >= maxTrait.prec) {
					maxTrait = curTrait;
				}
			}
		}
		return maxTrait;
	}

	protected afterConstruct() {
		//Implement in subclasses
	}
	toString() {
		return this.productions.join("\n");
	}
	NTS() {
		return this.nonTerminals;
	}
	Prods() {
		if (this.productions == null)
			this.productions = Array.from(this.productionsMap.values());
		return this.productions;
	}
	//start symbol
	startNT() {
		return this.nonTerminals[0];
	}
}

export class GrammarError extends Error {

}