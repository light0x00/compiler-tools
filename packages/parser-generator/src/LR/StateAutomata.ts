import { State, StateSet, AugmentedGrammar, AutomataTools } from "./Definition";
import rootDebug from "debug";
let debug = rootDebug("APP:LR:Automata");

/*
构造项集族
更准确地说,是构造一个由项集组成的状态机,一个项集对应一个状态,对每个状态输入某一个符号可到达下一个状态.
这些用于记录状态间的连接关系的「边」也会存储在返回的数据结构里.

输入: 增广文法
输出: 项集族

注: 由于项集对应自动机中的一个状态,因此将交替使用「项集」、「状态」,两者含义等同.

S->E
E->E+T | T
T->T*F | F
F->(E) | id

计算开始项 S->·E 的闭包,可得到第一个状态 I0
I0
    S->·E
    E->·E+T
    E->·T
    T->·T*F
    T->·F
    F->·(E)
    F->·id

得到该项集中的每一项的中的「·」右侧的符号的集合
{E,T,F,(,id}

将该集合的每一项𝛂分别输入I0, 可得到I0的5个后继项集

𝛂=E
    E->E·+T
𝛂=T
    E->T·
    T->T·*F
𝛂=F
    T->F·
𝛂=(
    F->(·E)
𝛂=id
    F->id·

分别计算以上5个状态的闭包,可得到5个状态:

I1
    E->E·+T
I2
    E->T·
    T->T·*F
I3
    T->F·
I4
    F->(·E)
    E->·E+T
    E->·T
    T->·T*F
    T->·F
    F->·(E)
    F->·id
I5
    F->id·

遍历以上5个状态,重复上面的处理逻辑
*/
export function getStateSet(grammar: AugmentedGrammar, tools: AutomataTools): StateSet {
	//状态id计数
	let stateIdCounter = 1;
	// let I0 = new State(stateIdCounter++, closure(new ItemSet(new Item(grammar.prodOfStartNT))))
	let I0 = tools.getStartState(grammar);
	debug(`${I0}`);
	//存放状态集
	let stateSet = new StateSet();
	stateSet.push(I0);
	//状态集中待处理的 状态的索引
	let procssedIdx = 0;

	//每一个状态集中尚未处理的状态
	while (procssedIdx < stateSet.length) {
		let curState = stateSet[procssedIdx++];
		//得到当前状态的后继符号集
		let nextSymbols = curState.getNextSymbols();
		//对当前状态输入 符号集 中的每个符号
		for (let nextSymbol of nextSymbols) {
			//生成当前状态对输入(nextSymbol)的后继状态
			let nextItemSet = tools.GOTO(curState, nextSymbol);
			//检查生成的状态是否已经存在 (判断状态相等标准见:ItemSet.equals())
			let nextState = stateSet.getExisting(nextItemSet);
			if (nextState == null) {
				nextState = new State(stateIdCounter++, nextItemSet);
				stateSet.push(nextState);
				debug(`\n+Adding a new state:\n${nextState}\n`);
			}
			//记录当前状态 与 后继状态 的连接
			curState.addNextState(nextSymbol, nextState);
			debug(`mapping: ${curState.id} ----- ${nextSymbol} -----> ${nextState.id}`);
		}
	}
	return stateSet;
}