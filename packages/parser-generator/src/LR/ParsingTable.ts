import { assert } from "@light0x00/shim";
import { EOF } from "@light0x00/parser-definition";
import { NonTerminal,Terminal, GrammarError } from "../Definition";
import {  StateSet, Operation, ParsingTable, Shift, Goto, Reduce, Accept, Item } from "./Definition";

import { IFunction } from "@light0x00/shim";

import rootDebug from "debug";
let debug = rootDebug("APP:LR:parsing-table");


/*
输入: 一个由「项集族」和「项集间跳转关系」组成的状态机
输出: LR/SLR分析表

注: 用 stateA.next_state(input_symbol) 表示状态A输入符号后进入的下一个状态

遍历每一个状态S中的每一个项I
    - I为Reduce/Accpet项,形如 A->𝜶𝜷·
        - 若A是不是开始符号,则为Follow(T)中的每一个符号f填入: T[S][f] = Reduce A
        - 若A是开始符号,操作同上,不过填入得时 Accept A (本质上Accept项是一个特殊的归约项)
    - I为Shift/Goto, A->𝜶·𝜷
        - 若𝜷为非终结符,则产生 跳转项, T[S][𝜷] = Goto S.next_state(𝜷)
        - 若𝜷为终结符,则产生式 移入项, T[S][𝜷] = Shift S.next_state(𝜷)
*/
/**
 *
 * @param stateSet 状态机
 * @param S 开始符号
 * @param allowedFollowsWhenReducing 对于任意一个归约项,返回其允许的「归约展望符」(SLR/LR)
 */
export function getParsingTable(stateSet: StateSet, S: NonTerminal, allowedFollowsWhenReducing: IFunction<Item, Set<Terminal>>): ParsingTable {

	// let S = grammar.startNT; //开始符号
	let parsingTable = new ParsingTable();

	//状态集中的每一个状态
	for (let state of stateSet) {
		/*
        LR(0)中的冲突在SLR(1)中的应对方案

        S->T
        T->aBd | 𝝴
        B->Tb | 𝝴

        <2>
        T->a·Bd
        B->·Tb
        B->Nil·
        T->·aBd
        T->Nil·

        冲突的解决方案:

        LR(0)
            1. 存在归约/归约冲突.如: B->Nil·、T->Nil· , 无法确定归约为B还是T
            2. 存在移入/归约冲突.如: T->·aBd 、T->Nil· , 无法确定是归约w为T还是移入a

        SLR(1)
            将lookahead与如下集合匹配:
                1. 状态的后继符号集合(记为 next—set )
                2. 每个归约项的Follow集(记为 Follow(X1)...Follow(Xn))
            如果 lookahead ∈ next-set 则移入()
            如果 lookahead ∈ Follow(Xk) (注:k为X1...Xn中的一个元素) 则归约为Xk

            在此例中,对于上面LR(0)存在的问题,SLR(1)的解决过程如下:
                计算 B、T的Follow集、后继符号集合(记为 next—set),可得到如下结果:
                Follow(B)={d}
                Follow(T)={$,b}
                next-set={B,T,a}

                如果lookahead ∈ Follow(B),则采用B归约
                如果lookahead ∈ Follow(T),则采用T归约
                如果lookahead ∈ next-set,则采用移入

        SLR使用lookahead、可归约项的Follow集来解决 归约-归约,移入-归约的冲突.

        其中,lookahead用于如下集合匹配:

        1.可移入项的后继符号组成的集合(记为 next—set )
        2.每个可归约项的Follow集(记为 Follow(X1)...Follow(Xn))

        如果 lookahead ∈ next-set 则移入
        如果 lookahead ∈ Follow(Xk) (注:Xk为X1...Xn中的一个元素) 则归约为Xk
        */
		//记录当前状态已经处理了哪些后继符号(nextSymbol)
		// let added = new Set<Symbol>();
		//状态中的每一个项
		for (let item of state) {
			/*
            移入项 形如: A->𝜶·𝜷

            1. 允许多个项移入同一符号,考虑如下两个项, 它们的 nextSymbol 都是 E, 在处理第一个项时,已经计算了当前状态对输入E的后继状态
            所以在当前状态第二次遇到E时,不必再重新处理.
                    S->·E
                    E->·E+T
            2. 对同一符号,存在规约/接受操作
            E->E+E·
            E->E·+E
            E->E·*E

            */
			if (item.hasNext()) {
				let nextSymbol = item.nextSymbol();
				/*

                */
				let existingOp = parsingTable.get(state, nextSymbol);
				if (existingOp != null) {
					if (!(existingOp instanceof Shift || existingOp instanceof Goto))
						throw new GrammarError(`State(${state.id}) is ambiguous when the following symbol is ${nextSymbol}`);
					else
						continue;
				}
				let nextState = state.getNextState(nextSymbol);
				assert(nextState != null);
				let op: Operation;
				//非终结符 goto
				if (nextSymbol instanceof NonTerminal)
					op = new Goto(nextState);
				//终结符 shift
				else
					op = new Shift(nextState);
				debug(`state(${state.id}) ${nextSymbol} ${op}`);
				parsingTable.put(state, nextSymbol, op);
			}
			//规约项 形如: A->𝜶𝜷·
			else {
				/*
                何时可以对某个归约项进行归约,不同的算法有着不同的规定:
                    1. SLR分析,lookhead存在于「项对应的产生式的Follow集」
                    😇 New features to support LR
                    2. LR分析,lookhead存在于项的展望集(lookaheadSet)
                */

				// let item_follow_set = followTable.get(item.prod.non_terminal.name);
				// let item_follow_set = item.lookaheadSet
				let allowedFollows = allowedFollowsWhenReducing(item);

				assert(allowedFollows != null);
				//遍历Follow(A)的每一个符号
				for (let followSymbol of allowedFollows) {
					let op;
					//accept 如果follow为$ 且item对应的非结符是开始符号
					if (followSymbol == EOF && item.prod.non_terminal == S)
						op = new Accept(state);
					//reduce
					else
						op = new Reduce(item.prod);
					/*
                    关于冲突检查,原则上同一个状态对同一符号只能有一个操作
                    若个一个状态中的多个归约项的Follow集存在交集,那么分为如下两种情况进行处理:
                        1. 允许状态中多个项归约为同一个符号. 如下例子中,虽然两个项的Follow集都为Follow(A),但是归约动作/结果都是相同的(都是A),因此SLR允许该情况存在.
                            A->𝜶·
                            A->𝜶·
                        2. 不允许状态中多个项归约为不同符号. 如下例子中,Follow(A) ∩ Follow(B)不为空的情况下,无法预知归约为A还是B,因此如下情况不允许存在.
                            A->𝜶·
                            B->𝜶·

                    注:虽然以上例子比较「不正常」,但是算法应当识别出不正常,哪些可以挽救,而哪些不可以.
                    */
					let existingOp = parsingTable.get(state, followSymbol);
					if (existingOp != null) {
						if (!existingOp.equals(op)) //不可挽救的
							throw new GrammarError(`State(${state.id}) has multiple operations(${existingOp},${op}) on the following symbol ${followSymbol}`);
						//else 为可挽救的
					}
					else {
						debug(`state(${state.id}) ${followSymbol} ${op}`);
						parsingTable.put(state, followSymbol, op);
					}
				}
			}
		}
	}
	return parsingTable;
}
