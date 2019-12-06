
import rootDebug from "debug";
import { NIL } from "@light0x00/parser-definition";
import { Terminal, Production, NonTerminal, Symbol, IGrammar } from "@/Definition";
import { CyclicDepsDector } from "./Toolkit";
let debug = rootDebug("APP:first");

export type FirstMap = Map<Terminal, Production>
export type FirstSet = Set<Terminal>
export type FirstTable = Map<string, Map<Terminal, Production>>

export class FirstSetCalculator {
	private cache = new Map<NonTerminal, FirstMap>()
	private ciclicDector = new CyclicDepsDector<NonTerminal>()
	private grammar: IGrammar
	constructor(grammar: IGrammar) {
		this.grammar = grammar;
	}

	getFirstSet(target: Symbol): FirstSet {
		if (!(target instanceof NonTerminal)) //终结符的first集就是本身
			return new Set([target]);
		let map = this.getFirstMap(target);
		return new Set(map.keys());
	}

	getFirstMap(target: NonTerminal): FirstMap {
		if (this.cache.has(target))
			return this.cache.get(target)!;

		let firstMap = new Map<Terminal, Production>();

		//target 的每一个子产生式(候选式) prod
		for (let i = 0; i < target.prods.length; i++) {
			let prod: Production = target[i];
			//prod 的每一个符号
			for (let lm_idx = 0; lm_idx < prod.length; lm_idx++) {
				let leftMost: Symbol = prod[lm_idx];
				/*
                推导First(leftMost)
                    加入 First(leftMost)-ε
                    - 如果不包含ε,中断.
                    - 如果包含ε,后一个符号作为leftMost,继续推导的First(leftMost),重复同样的过程直到到产生式末尾.
                    - 当到产生式达末尾时,如果还有ε,则将ε加入First(S)
                */
				if (leftMost == target) { //issue 1.自递归
					if (lm_idx == 0) //对于左递归文法 给出提示
						debug(`Found the left recursive production ${prod}`);
					break;
				}
				if (leftMost instanceof NonTerminal) {
					if (this.ciclicDector.registerAndCheckCycl(target, leftMost)) {  //issue 3.循环依赖 跳过
						debug(`Cyclic dependencies are detected between the non-terminal ${target} and ${leftMost}  when calculating the first set of ${target}!`);
						continue;
					}
				}
				//加入 First(leftMost)-ε
				let lm_first_set = this.getFirstSet(leftMost);
				for (let a of lm_first_set) {
					if (a != NIL)
						firstMap.set(a, prod);
				}
				//不包含ε
				if (!lm_first_set.has(NIL)) {
					break;
				}
				//包含ε
				else {
					//到达最后一个仍包含ε 加入ε
					if (lm_idx == prod.length - 1)
						firstMap.set(NIL, prod);
				}
			}
		}
		this.cache.set(target, firstMap);
		return firstMap;
	}

	getFirstTable() {
		let firstTable = new Map<string, Map<Terminal, Production>>();
		for (let prod of this.grammar.NTS()) {
			let firstMap = this.getFirstMap(prod);
			firstTable.set(prod.name, firstMap);
		}
		return firstTable;
	}
}
