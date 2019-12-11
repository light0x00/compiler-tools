
import { Production, Terminal, Symbol, NonTerminal, ActionGrammar, RawActionGrammar, TraitsTable } from "../Definition";
import { addAll_Set, assert } from "@light0x00/shim";
import { ILexer, ASTree } from "@light0x00/parser-definition";

/* 项是所属项集中的一个成员,一个「项」由「产生式」和一个「点」组成,例如 A->a·B */
export class Item {

	prod: Production;
	private _dot: number = 0;
	/*
    由于lookaheadSet可能重复,所以使用Set来存储
    为什么lookaheadSet可能重复?

    S->A
    A->BC
    B->b | 𝝴
    C->b | 𝝴

    S->·A , {$}
    A->·BC , {b,b,$}  //重复
    */
	lookaheadSet: Set<Terminal>
	constructor(production: Production, dot: number = 0, lookaheadSet: Set<Terminal> = new Set<Terminal>()) {
		this.prod = production;
		/* 对于空推导(形如A->𝝴). 直接将 dot 置于末尾(A->𝝴·) */
		this._dot = production.isEpsilon() ? production.length : dot;
		this.lookaheadSet = lookaheadSet;
	}

	get dotPos() {
		return this._dot;
	}

	hasNext(): boolean {
		return this._dot < this.prod.length;
	}

	nextSymbol(): Symbol {
		if (!this.hasNext())
			throw new Error(`${this} has no next item!`);
		return this.prod[this._dot];
	}
	nextItem() {
		if (!this.hasNext())
			throw new Error(`${this} has no next item!`);
		/*
			😇New features to support LR

			为什么当前项展望集应该被后继项继承?

			考虑如下文法:
			S->As
			A->a

			I0
			S->·As ,$
			A->·a ,s

			I1
			A->a· ,s

			如上所示,I0输入a得到I1
			其中「A->a· ,s」继承了「 A->·a ,s」的展望符
			*/
		return new Item(this.prod, this._dot + 1, this.lookaheadSet);
	}
	toString() {
		let str = "";
		let symbols = this.prod;
		for (let i = 0; i < symbols.length; i++) {
			if (this._dot == i)
				str += "·";
			str += symbols[i];
		}
		if (this._dot == symbols.length)
			str += "·";
		str += ",";
		str += "{" + Array.from(this.lookaheadSet).join(",") + "}";
		return `${this.prod.name}->${str}`;
	}
	equals(other: Item) {
		/*
			两个项是否相等,
			1. 所含产生式一样
			2. 「dot」所在位置一样

			😇New features to support LR
			3. 展望集(lookaheadSet)一样
			*/
		if (other.prod.id != this.prod.id)
			return false;
		if (other._dot != this._dot)
			return false;

		if (other.lookaheadSet.size != this.lookaheadSet.size)
			return false;
		//n2复杂度 暂时不管
		for (let t of this.lookaheadSet) {
			// let find = false
			// for (let o of other.lookaheadSet) {
			//     if (o == t) {
			//         find = true
			//         break
			//     }
			// }
			// if (!find)
			//     return false
			if (!other.lookaheadSet.has(t)) {
				return false;
			}
		}
		return true;
	}
	/*  😇New features to support LALR */
	isSameCoreWith(other: Item) {
		if (other.prod.id != this.prod.id)
			return false;
		if (other._dot != this._dot)
			return false;
		return true;
	}

	private hashCodeCache: string
	hashCode(): string {
		if (this.hashCodeCache == null) {
			// this.hashCodeCache = this.prod.id + '' + this._dot + hash.keys(this.lookaheadSet)
			this.hashCodeCache = this.prod.id + "-" + this._dot;
		}
		return this.hashCodeCache;
	}

	// reducible() {
	//     return this.dot == this.prod.length
	// }
}

export class ItemSet extends Array<Item> {
	//用于记录已经添加的项的Hash 防止逻辑上的重复
	added = new Map<string, Item>()
	items = new Array<Item>()
	constructor(...items: Item[]) {
		super(...items);
		for (let item of items)
			this.added.set(item.hashCode(), item);
	}

	contains(item: Item) {
		return this.added.has(item.hashCode());
	}

	pushOrMerge(item: Item) {
		let existing = this.added.get(item.hashCode());
		if (existing === undefined) {
			this.push(item);
		} else {
			//已经存在 则合并LR展望符集
			addAll_Set(existing.lookaheadSet, item.lookaheadSet);
		}
	}
	//最好的办法是 将数组作为内部对象 而不是继承
	push(item: Item) {
		this.added.set(item.hashCode(), item);
		return super.push(item);
	}

	toString() {
		let str = "";
		for (let item of this) {
			str += item.toString() + "\n";
		}
		return str.replace(/\n$/, "");
	}
	equals(other: ItemSet) {
		/* 两个项集A、B是否相等,取决于
			  1. 它们所包含的项个数相等
			  2. A、B中的每一个项在对方集合中都存在相等的项
		   */
		if (other.length != this.length)
			return false;
		//又写出一个n2复杂度23333  !!更好的办法是用Set来存放
		for (let o1 of this) {
			let hasMatched = false;
			for (let o2 of other) {
				if (o1.equals(o2)) {
					hasMatched = true;
					break;
				}
			}
			if (!hasMatched)
				return false;
		}
		return true;
	}

	/*
    返回当前状态的后继符号集
    例: 对于下状态(项集),其后继符号为: {E,T,F,(,id}
    I0
        S->·E
        E->·E+T
        E->·T
        T->·T*F
        T->·F
        F->·(E)
        F->·id
     */
	getNextSymbols() {
		let nextSymbols = new Set<Symbol>();
		for (let item of this) {
			if (item.hasNext()) {
				nextSymbols.add(item.nextSymbol());
			}
		}
		return nextSymbols;
	}

}
/* 状态基本等同于项集 唯一的区别是状态需要id 而项集不需要 */
export class State extends ItemSet {
	id: number
	/* 描述当前状态在接受某个符号后去往的后继状态 */
	mapping = new Map<Symbol, State>()
	constructor(id: number, items: Item[]) {
		super(...items);
		this.id = id;
	}

	toString() {
		return `<${this.id}>\n${super.toString()}`;
	}

	/**
     * 添加后继状态
     * 添加当前状态输入「指定符号」后去往的「后继状态」
     *
     * 原则上一个状态对于同一符号只能有一个后继状态,如果重复将抛出异常
     * @param symbol 输入符号
     * @param nextState 后继状态
     */
	addNextState(symbol: Symbol, nextState: State) {
		assert(this.mapping.get(symbol) == null, `A state can only have one next state to the same symbol`);
		this.mapping.set(symbol, nextState);
	}

	getNextState(symbol: Symbol) {
		return this.mapping.get(symbol);
	}

}

export class StateSet extends Array<State>{
	mapping = new Map<State, Map<Symbol, State>>()
	/* 判断状态集中是否已经存在 相同性质(参见ItemSet的equals方法) 的状态(项集) */
	getExisting(state: ItemSet): null | State {
		for (let existing of this) {
			if (existing.equals(state)) {
				return existing;
			}
		}
		return null;
	}
	satrtState(): State {
		assert(this[0] != null);
		return this[0];
	}
}
/*
LR\SLR 在构造状态时有所不同 因此将不同部分独立处理
*/
export interface AutomataTools {
	GOTO(I: ItemSet, inputSymbol: Symbol): ItemSet
	closure(itemSet: ItemSet): ItemSet
	getStartState(grammar: ActionGrammar): State
}

/**
 *
 * 将二维数组形式的产生式集(Symbol[][]) 转为带有编号的Production集合,并赋予指定的非终结符
 *
 * 一个非终结符的产生式集可视为一个Symbol二维数组,
 * 为了便于实现LR分析表,需要将这个二维数组转为Production集合,
 * 且为每个Production赋予一个编号.
 */
export class AugmentedGrammar extends ActionGrammar {

	constructor(rawGrammar: RawActionGrammar, traits?: TraitsTable) {
		super(rawGrammar, traits);
	}

	afterConstruct() {
		assert(this.startNT().length == 1 && this.startNT()[0].length == 1,
			"The start symbol of an augmented grammar has one and only one production, and the production contains only one symbol!");
	}
	/* 开始符号的产生式 原则上只能有一个 */
	get prodOfStartNT(): Production {
		return this.startNT()[0];
	}
}

/* 表示LR语法分析表格的操作 */
export abstract class Operation {
	abstract equals(obj: Object): boolean

	isReduce(): this is Reduce {
		return false;
	}
	isShift(): this is Shift {
		return false;
	}

	isGoto(): this is Goto {
		return false;
	}

	isAccept(): this is Accept {
		return false;
	}
}

export class Shift extends Operation {
	nextState: State
	prec: number;
	assoc: boolean;
	constructor(nextState: State, prec: number = -1, assoc: boolean = false) {
		super();
		this.nextState = nextState;
		this.prec = prec;
		this.assoc = assoc;
	}

	setIfLarger(prec: number, assoc: boolean) {
		if (prec > this.prec) {
			this.prec = prec;
			this.assoc = assoc;
		}
	}

	toString() {
		return `shift ${this.nextState.id}`;
	}
	equals(obj: Object) {
		return obj instanceof Shift && obj.nextState == this.nextState;
	}
	isShift() {
		return true;
	}
}

export class Goto extends Operation {
	nextState: State

	constructor(nextState: State) {
		super();
		this.nextState = nextState;
	}
	toString() {
		return `goto ${this.nextState.id}`;
	}
	equals(obj: Object) {
		return obj instanceof Goto && obj.nextState == this.nextState;
	}

	isGoto() {
		return true;
	}
}

export class Reduce extends Operation {
	/* 用于归约的产生式 */
	prod: Production;
	prec: number;
	leftAssoc: boolean;
	constructor(prod: Production, prec: number = -1, leftAssoc: boolean = false) {
		super();
		this.prod = prod;
		this.prec = prec;
		this.leftAssoc = leftAssoc;
	}

	toString() {
		return `reduce ${this.prod.id}`;
	}

	equals(obj: Object) {
		return obj instanceof Reduce && obj.prod == this.prod;
	}

	isReduce() {
		return true;
	}
}

export class Accept extends Operation {
	constructor() {
		super();
	}
	equals(obj: Object) {
		return obj instanceof Accept;
	}
	toString() {
		return `accept`;
	}
	isAccept() {
		return true;
	}
}

export class ParsingTable {
	private parsingTable = new Map<State, Map<Symbol, Operation>>()

	get table() {
		return this.parsingTable;
	}

	put(state: State, symbol: Symbol, op: Operation): void {
		let row = this.parsingTable.get(state);
		if (row == undefined) {
			row = new Map<Symbol, Operation>();
			this.parsingTable.set(state, row);
		}
		row.set(symbol, op);
	}
	has(state: State, symbol: Symbol, op: Operation): boolean {
		let row = this.parsingTable.get(state);
		if (row == undefined)
			return false;
		let exstingOp = row.get(symbol);
		if (exstingOp == null)
			return false;
		return exstingOp.equals(op);
	}
	get(state: State, symbol: Symbol): Operation | undefined {
		let row = this.parsingTable.get(state);
		// assert(row != null, `state(${state.id}) is not found in parsing table!`)
		if (row == undefined)
			return undefined;
		return row.get(symbol);
	}

	getExpectedSymbols(state: State): Symbol[] {
		let row = this.parsingTable.get(state);
		if (row == undefined)
			return [];
		return Array.from(row.keys());
	}

	getExpectedTokens(state: State) {
		let expS = this.getExpectedSymbols(state);
		return expS.filter(s => !(s instanceof NonTerminal));
	}

}

export interface IParser {
	parse(lexer: ILexer): ASTree
}

export class ProdsInjector {
	prodIdCounter = 0
	inject(nt: NonTerminal, rawProds: Symbol[][]) {
		for (let rawProd of rawProds) {
			nt.addProd(this.prodIdCounter++, rawProd);
		}
	}
}

