import { NIL as Nil, EOF } from "@light0x00/parser-definition";
import { Production, NonTerminal, Symbol, Terminal, } from "../../Definition";
import { ItemSet, State, Item, AugmentedGrammar, AutomataTools } from "../Definition";
import { addAll_Set, IFunction } from "@light0x00/shim";
import { getStateSet } from "../StateAutomata";
import { assert } from "@light0x00/shim";

import rootDebug from "debug";
let debug = rootDebug("APP:LR1:automata");

/*

1.何时应该展开

    对于何时应该展开 需要考虑如下几种场景

    1.1 「点」已经到了产生式的最末尾,形如A-> X·

    1.2 展开符不是终结符 没有闭包,形如 A-> ·a

    1.3 由别的项展开自己
    S->A
    A->B | B𝜶
    B->b

    I0
    S->·A
    A->·B
    A->·B𝜶
    B->·b   $
    B->·b   𝜶

    如上状态集中,B被A的两个项分别引用,
        由A->·B 可展开得到 B->·b   $
        由A->·B𝜶  可展开得到 B->·b   𝜶
    此种情况允许同一符号被多次展开✅

    1.4 自己展开自己

    S->A
    A->AAb | a

    I0
    S->·A
    A->·AAb
    A->·a

    在项 A->·AAb 中,由于为左递归产生式,且「点」位于「左递归符号」前,因此不能再展开A.❌

    I1
    S->A·
    A->A·Ab

    在项A->A·Ab中,虽然左递归,但「点」在左递归符号之后,因此可以展开A. I1继续加入如下项:✅

    A->·AAb
    A->·a

    此时,在项A->·AAb中,「点」位于左递归符号之前,因此不能再展开A❌

    结论
        0. 存在展开符号,且展开符号为非终结符
        1. 一个符号被不同的多个个项引用,可以重复展开多次
        2. 左递归 且 展开符为最左符号 不得展开 , 形如 A->·AA𝜶
        3. 左递归 但 展开符不是最左符号,可以展开,形如 A->A·A𝜶


2.如何展开(LR展望符集计算)

    名词约定:
    - 展望符集,LR中每个项都有自己的展望符集,一个项的展望符集决定何时可以归约(后称lookaheadSet,有时简称lookSet)
	- 展开符号,例如项S->·E是可展开的,展开符号为E
	- Look(A->·𝜶) 表示项A->·𝜶的展望符集

    对展望符的计算可分为3种情况

    例:
    S->E
    E->E+F | E*F | F
    F->id

    I0
    S->·E       $
    E->·E+F     $
    E->·E*F     $
    E->·F       +,*,$
    F->·id      +,*,$

    2.1. 针对闭包项
        2.1.1 展开符包含左递归产生式,初始状态I0中项S->·E产生如下3个闭包项:
            E->·E+F     $,+,*
            E->·E*F     $,+,*
            E->·F       $,+,*
            它们的lookSet计算方式如下
				E->·E+F、E->·E*F、E->·F 均为左递归产生式,它们可能处于末端,也可能被嵌入另一个左递归产生式

				例1 对于项E->·E+F而言
					- 如果它处于末端,那么 lookSet(E·E+F)就应该有`$` (继承自 lookSet(S->·E))
					- 如果它被嵌入E->·E*F,那么 lookSet(E->·E+F)就应该有`*`
					- 如果它被嵌入E->·E+F,那么 lookSet(E->·E+F)就应该有`+`
					- 要注意,它不可能被嵌入E->·F,所以 lookSet(E->·E+F)不包含`id`

				例2 对于E->·F而言,虽然其本身没有左递归,但是由于它的兄弟项中存在左递归项,因此它仍然可能被嵌入其左递归的兄弟项
					- 如果E->·F 直接作为S->·E的右侧,那么LookSet(E->·F)应包含`$` (继承自 lookSet(S->·E))
					- 如果E->·F被嵌入E->·E+F,那么LookSet(E->·F)应包含`+`
					- 如果E->·F被嵌入E->·E*F,那么LookSet(E->·F)应包含`*`

			更一般的讲,一个左递归项的LookSet应该包含它的「左递归兄弟项及其本身」的「最左非左递归符号」,以及继承的LookSet
			在本例中,E->·E+F的「左递归兄弟项」是 E->·E*F,这个兄弟项的「最左非左递归符号」是`*`, 且继承了来自于S->·E的lookSet`$`.

        2.1.2 展开符不包含左递归的产生式,由上一个项确定 的lookSet.
            - 如果项形如A->𝜶·B,由展开符B得到的项应为lookSet(A)
            - 如果项形如A->·B𝜶𝜷
                - 若𝝴∉First(𝜶) 由展开符B得到的项的lookSet为First(𝜶)
                - 否则,应当继续加入First(B),重复以上过程,直到末尾时,如果仍包含𝝴,则加入lookSet(A)
            此例中,E->·F, 由于展开符是最末符号,因此展开的项F->·id可继承lookSet(A)

    2.2 针对前进项
        如果只是单纯的项的「点」前进,那么可以直接继承.
        例如,项E->·E+F 前进后得到项E->E·+F, 后者的lookSet应该继承前者.

3. 展开后的处理

    3.1 如果项集中存在产生式相同,且「点」的位置相同的项, 应将它们合并.

    例
    A->·𝜶   $
    A->·𝜶   𝜶

    合并后:
	A->·𝜶   $,𝜶

	S->A·
    A->A·Ab
*/
export type FirstSetGetter = IFunction<Symbol, Set<Terminal>>;
/* 构造自动机所需要的方法 */
export class LRAutomataTools implements AutomataTools {
	getFirstSet: FirstSetGetter
	constructor(firstSetCalculator: FirstSetGetter) {
		this.getFirstSet = firstSetCalculator;
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

	closure(itemSet: ItemSet): ItemSet {
		let itemSetClosure: ItemSet = itemSet;
		//项集的每一个项 item
		for (let processedIdx = 0; processedIdx < itemSetClosure.length; processedIdx++) {
			let item = itemSetClosure[processedIdx];
			if (!item.hasNext()) //issue 1.1
				continue;
			let expandSym = item.nextSymbol();
			if (!(expandSym instanceof NonTerminal)) //issue 1.2
				continue;
			if (item.prod[0] == item.prod.nonTerminal && item.dotPos == 0) { //issue 1.4
				debug(`Stop expanding left recursion production ${expandSym}`);
				continue;
			}
			let lrps = this.getLeftRecursiveProds(expandSym); //issue 2.1.1.1 左递归产生式
			let nlrlookSet = this.determineNonLeftRecursionLookSet(item);
			//issue 2.1.1 展开符包含
			if (lrps.length > 0) {
				let lrLookSet = this.determineLeftRecursionLookSet(item); //由所有左递归项带来的展望符集
				for (let lrp of expandSym) {
					let unionLookSet = new Set<Terminal>();
					addAll_Set(unionLookSet, lrLookSet);
					addAll_Set(unionLookSet, nlrlookSet);
					itemSetClosure.pushOrMerge(new Item(lrp, 0, unionLookSet));
				}
			}
			//issue 2.1.2 展开符不包含递归产生式的情况
			else {
				for (let prod of expandSym.prods) {
					let newItem = new Item(prod, 0, nlrlookSet);
					itemSetClosure.pushOrMerge(newItem);
				}
			}
		}
		return itemSetClosure;
	}

	/**
    ========展开符包含左递归产生式的处理========

    文法:
    S->A
    A->A𝜶 | A𝜷 | 𝝲

    状态:
    S->·A ,$
    A->·A𝜶,$
    A->·A𝜷,$
    A->·𝝲, ?

    如何求「 A->𝝲 」的展望集?

    若𝜶,𝜷不能推出𝝴,则 lookSet(A->·𝝲) = {𝜶,𝜷}
    否则 lookSet(A->·𝝲) ={𝜶,𝜷,$}

    形式化:
    加入在A中的每一个左递归产生式中的「第一非A的符号的First集」,记为First(!A), 如果该集内存在𝝴,则一路向后直到末尾,如果仍存在𝝴,则加入 Look(A)

    伪代码:
    for each lr-prod in A
        for each sym in lr-prod
            if sym != A
                add First(sym)
                if 𝝴 ∉ First(sym)
                    break
                else if sym is rightmost
                    add lookSet(S)

    注: Look(S) 表示S的lookeheadSet
    * @param curItem
    */
	determineLeftRecursionLookSet(curItem: Item): Set<Terminal> {
		let target = curItem.nextSymbol();
		assert(target instanceof NonTerminal);

		let lookaheadSet = new Set<Terminal>();
		//目标的所有左递归产生式
		let lrProds = this.getLeftRecursiveProds(target);
		//每一个左递归产生式
		for (let lr_prod of lrProds) {
			//每一个符号
			let searching = false;
			for (let j = 0; j < lr_prod.length; j++) {
				if (lr_prod[j] != target && !searching) {
					continue;
				}
				// right-most
				if (j == lr_prod.length - 1) {
					addAll_Set(lookaheadSet, curItem.lookaheadSet);
				} else {
					let follower = lr_prod[j + 1];
					let follower_first_set = this.getFirstSet(follower);
					addAll_Set(lookaheadSet, follower_first_set);
					// 𝝴 ∉ First(follower)
					if (!follower_first_set.has(Nil)) {
						break;
					}
					// 𝝴 ∈ First(follower)  scan next one
					else {
						lookaheadSet.delete(Nil);
						searching = true;
					}
				}
			}
		}
		return lookaheadSet;
	}
	/**
    ========展开符不包含左递归产生式的处理========

    约定
    - 将闭包项记为 closureItem ,例如S->·As
    - 将展开项计为 expandItem , 例如由展开符A得到的项 A->·a

    形式化计算规则如下:
    展开符位于item末端,形如A->·B
        lookSet(expandItem)=lookSet(prevItem)
    next非末端,形如A->·B𝜶𝜷
        lookSet(expandItem)=First(𝜶) ,
            如果𝜶可推出𝝴,则继续向后寻找𝜷,重复这个过程,
            如果𝜷为最末尾符号,且𝜷仍可推出𝝴,那么将lookSet(prevItem)放入lookSet(next)
    * @param prevItem
    */
	determineNonLeftRecursionLookSet(prevItem: Item): Set<Terminal> {
		let expandSym = prevItem.nextSymbol();
		assert(expandSym instanceof NonTerminal);

		let lookaheadSet = new Set<Terminal>();

		for (let i = prevItem.dotPos; i < prevItem.prod.length; i++) {
			if (i == prevItem.prod.length - 1) {
				addAll_Set(lookaheadSet, prevItem.lookaheadSet);
				break;
			} else {
				let firstSetOfFollow = this.getFirstSet(prevItem.prod[i + 1]);
				addAll_Set(lookaheadSet, firstSetOfFollow);
				if (firstSetOfFollow.has(Nil)) {
					lookaheadSet.delete(Nil);
				} else {
					break;
				}
			}
		}
		return lookaheadSet;
	}
	getLeftRecursiveProds(non_terminal: NonTerminal) {
		let lr_prods: Production[] = [];
		//每一个产生式
		for (let prod of non_terminal.prods) {
			//产生式中的每一个符号
			for (let symbol of prod) {
				//若相等,,则表示prod存在左递归
				if (symbol == non_terminal) {
					lr_prods.push(prod);
					break;
				}
				//若不相等 且First(symbol)不存在𝝴则中断,则表示prod没有左递归
				else if (!this.getFirstSet(symbol).has(Nil)) {
					break;
				}
			}
		}
		debug(lr_prods.join(","));
		return lr_prods;
	}
	getStartState(grammar: AugmentedGrammar) {
		return new State(0, this.closure(new ItemSet(new Item(grammar.prodOfStartNT, 0, new Set<Terminal>([EOF])))));
	}
}

export function getStateSet_LR(grammar: AugmentedGrammar, getFirstSet: FirstSetGetter) {
	return getStateSet(grammar, new LRAutomataTools(getFirstSet));
}
