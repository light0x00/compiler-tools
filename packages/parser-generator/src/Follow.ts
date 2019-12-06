import { addAll_Set as addAll } from "@light0x00/shim";
import { EOF, NIL } from "@light0x00/parser-definition";
import { NonTerminal, Terminal, IGrammar, Symbol } from "./Definition";
import rootDebug from "debug";
import { CyclicDepsDector } from "./Toolkit";
import { FirstSetCalculator } from "./First";

let debug = rootDebug("APP:follow");

export class FollowSetCalculator {

	private cyclicDector = new CyclicDepsDector<NonTerminal>()// issue: 9.循环依赖
	private cache = new Map<NonTerminal, Set<Terminal>>()
	private firstSetCalculator: FirstSetCalculator
	private grammar: IGrammar

	constructor(grammar: IGrammar, firstSetCalculator: FirstSetCalculator) {
		this.grammar = grammar;
		this.firstSetCalculator = firstSetCalculator;
	}
	private throwError(holder: NonTerminal, other: NonTerminal) {
		throw new Error(`Cyclic dependencies are detected between the non-terminal ${holder} and ${other}  when calculating the follow set of ${holder}!`);
	}
	/*
    约定:
    j表示当前正在处理的产生式(prod)
    k表示当前正在处理的符号(j中的一个符号)
    k+n表示当前符号k后的n个符号

    伪代码:
    k是否为j末尾符号
        - 是, 加入Follow(j)
        - 不是,加入 (First(k+1)-{ε})
            - 如果 ε ∈ First(k+1) 则继续加入 First(k+2)).
                并重复这一过程,直到第n个满足ε ∉ First(k+n),
                如果符号(k+n)直到j的最后一个符号还仍旧存在 ε ∈ First(k+n), 则加入Follow(j)

    注:伪代码仅供参考,一切以实物为准!
    */
	getFollowSet(target: NonTerminal): Set<Terminal> {
		if (this.cache.has(target)) {
			debug(`cache hit:${target}`);
			return this.cache.get(target)!;
		}

		let non_terminals = this.grammar.NTS();

		let follow_set = new Set<Terminal>();
		let whichHaveAddedFristSet = new Set<Symbol>(); //记录已经添加过哪些符号的First集
		let whichHaveAddedFollowSet = new Set<Symbol>(); //记录已经添加过哪些符号的Follow集

		if (non_terminals[0] == target) {  // if start symbol
			follow_set.add(EOF);
			debug(`+EOF is added because ${target} is the beginning symbol`);
		}
		//每一个非终结符i
		for (let i = 0; i < non_terminals.length; i++) {
			let non_terminal = non_terminals[i];

			//终结符中的每一个产生式j
			for (let j = 0; j < non_terminal.prods.length; j++) {
				let prod = non_terminal.prods[j];
				debug(`Scanning ${target} in production:${prod}`);

				let searching = false; //标记是否处于搜索状态 issue:  5. 连续重复
				//每一个符号k
				for (let k = 0; k < prod.length; k++) {
					if (prod[k] != target && !searching) { //非搜索状态,且非target,则跳过   issue:  5. 连续重复
						continue;
					}
					//k为j的末尾符号
					if (k == prod.length - 1) {
						if (non_terminal != target && !whichHaveAddedFollowSet.has(non_terminal)) {   //issue: 6,7 自递归 && 重复添加
							if (this.cyclicDector.registerAndCheckCycl(target, non_terminal)) // issue: 9.循环依赖 跳过
								continue;
							debug(`+Since ${target.name} is at the end of production ${prod.name},add Follow(${non_terminal.name})`);
							addAll(follow_set, this.getFollowSet(non_terminal));
							whichHaveAddedFollowSet.add(non_terminal); //标记Follow(p)已添加
						}
						break;
					}
					searching = true;
					//处理k+1
					let follower = prod[k + 1];
					if (whichHaveAddedFristSet.has(follower))  //issue: 6. 重复添加
						continue;
					let followerFirstSet = this.firstSetCalculator.getFirstSet(follower);

					whichHaveAddedFristSet.add(follower); //标记 First(k+1)为已添加
					//如果: ε ∈ First(k+1)
					if (followerFirstSet.has(NIL)) {
						addAll(follow_set, followerFirstSet);
						follow_set.delete(NIL);
						debug(`+The symbol ${follower} follows ${target},add First(${follower})-{𝝴}, due ${follower} contains 𝝴 ,scan the following symbol of ${follower} `);
					}
					//如果 ε ∉ First(k+1)
					else {
						addAll(follow_set, followerFirstSet);
						debug(`+The symbol ${follower} follows ${target},add First(${follower})`);
						searching = false;  //k+1不可推出𝝴 则结束搜索状态    issue:  5. 连续重复
					}
				}
			}
		}
		this.cache.set(target, follow_set);
		return follow_set;
	}

	getFollowTable(): FollowSetTable {
		let followTable = new Map<string, Set<Terminal>>();
		for (let non_terminal of this.grammar.NTS()) {
			let followSet = this.getFollowSet(non_terminal);
			followTable.set(non_terminal.name, followSet);
		}
		return followTable;
	}
}
export type FollowSet = Set<Terminal>;
export type FollowSetTable = Map<string, Set<Terminal>>;

