import { NonTerminal,Symbol } from "@/Definition";
import { ItemSet,Item, AugmentedGrammar, State, AutomataTools } from "../Definition";
import { getStateSet } from "../StateAutomata";
/* SLR */

export class SLRAutotamaTools implements AutomataTools {
	/**
     * 求指定项集的闭包
     *
     * 例
     * 考虑文法:
     * E->E+T | T
     * T->T*F | F
     * F->(E) | id
     *
     * 输入:
     *  E->·E+T
     *  E->·T
     *
     * 输出:
     *  E->·E+T
     *  E->·T
     *  T->·T*F
     *  T->·F
     *  F->·(E)
     *  F->·id
     *
     * @param itemSet 项集
     */
	closure(itemSet: ItemSet): ItemSet {
		let itemSetClosure: ItemSet = itemSet; //考虑实际情况 不需要深拷贝
		let added = new Set<NonTerminal>();
		//项集的每一个项 item
		for (let processedIdx = 0; processedIdx < itemSetClosure.length; processedIdx++) {
			let item = itemSetClosure[processedIdx];
			/*
            没有闭包的情况
            1. 「点」已经到了产生式的最后末尾
                    A-> X·
            2. 后继符号不是终结符 没有闭包
                    A-> ·a
            */
			if (!item.hasNext())
				continue;
			let next = item.nextSymbol();
			if (!(next instanceof NonTerminal))
				continue;
			//如果已经添加过 则跳过
			if (added.has(next))
				continue;
			//将后继符号的产生式加入 closure
			for (let prod of next.prods) {
				itemSetClosure.push(new Item(prod));
			}
			added.add(next);
		}
		return itemSetClosure;
	}

	GOTO(I: ItemSet, inputSymbol: Symbol): ItemSet {
		let nextItemSet = new ItemSet();
		for (let item of I) {
			if (!item.hasNext())
				continue;
			if (item.nextSymbol() == inputSymbol) {
				nextItemSet.push(item.nextItem());
			}
		}
		return this.closure(nextItemSet);
	}

	getStartState(grammar: AugmentedGrammar) {
		return new State(0, this.closure(new ItemSet(new Item(grammar.prodOfStartNT))));
	}


}

export function constructStateSet_SLR(grammar: AugmentedGrammar) {
	return getStateSet(grammar, new SLRAutotamaTools());
}
