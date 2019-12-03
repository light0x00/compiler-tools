
import { MismatchError } from "../toolkit";
import { Stack } from "@/common/shim";
import { ILexer, ASTElement, IToken, ASTree } from "@/common/definition";
import { IParser, NonTerminal } from "@/parser-gen/definition";
import { State, Shift, Goto, Reduce, Accept, StateSet, ParsingTable } from "./LRDefinition";

import rootDebug from "debug";
let debug = rootDebug("APP:LR:parser");

export class LRParser implements IParser {
	stateAutomata: StateSet
	parsingTable: ParsingTable
	constructor(stateAutomata: StateSet, parsingTable: ParsingTable) {
		this.stateAutomata = stateAutomata;
		this.parsingTable = parsingTable;
	}
	/* !!重构 */
	determineTableKey(sym: IToken | NonTerminal) {
		if (sym instanceof NonTerminal)
			return sym;
		else {
			return sym.tableKey();
		}
	}

	parse(lexer: ILexer): ASTree {
		let startState = this.stateAutomata.satrtState();
		let stateStack = new Stack<State>(startState);
		let astStack = new Stack<ASTElement>();
		let lookahead: IToken | NonTerminal = lexer.peek();

		while (1) {
			let topSta = stateStack.peek();
			let op = this.parsingTable.get(topSta, this.determineTableKey(lookahead));
			if (op == undefined)
				throw new MismatchError(this.parsingTable.getExpectedTokens(topSta), lookahead);
			if (op instanceof Shift) {
				astStack.push(lexer.nextToken());
				stateStack.push(op.nextState);
				lookahead = lexer.peek();
			} else if (op instanceof Reduce) {
				/* 此次归约产生的AST节点所需的元素 */
				let eles: ASTElement[] = [];
				// 动作: 归约完成后将符号对应的状态弹出
				// 每个状态都由输入一个符号得到 因此每个状态都一个对应的符号  详见:P158
				for (let i = 0; i < op.prod.length; i++) {
					stateStack.pop();
					eles.unshift(astStack.pop()!);  //此处将把顺序弄反
				}
				astStack.push(op.prod.makeAST(eles));  //issue ASTNode的元素的顺序问题

				debug(`reduce ${op.prod}, make ast: ${astStack.peek()}`);
				//将向前看符号指定为归约符号
				lookahead = op.prod.non_terminal;
			} else if (op instanceof Goto) {
				stateStack.push(op.nextState);
				lookahead = lexer.peek();
			} else if (op instanceof Accept) {
				debug(`accept!`);
				break;
			}
			debug(`${astStack.join(" ")}`);
		}
		return astStack.pop() as ASTree;
	}
}

/*
1. ASTNode的元素的顺序问题

考虑如下文法
	S->E
	E->E+T | E-T | T
	T->T*F | T/F |F
	F->(E) | NUM

假设输入:
1 + 2 / 3
必然在某一时刻 Ast Stack中的元素为:
ENode + TNode / FNode

此时,即将要执行的动作是将 TNode / FNode 规约为T,创建一个TNode:
	new TNode([TNode,'/',FNode])
这时要注意的是,传给TNode的集合应该保持与产生式中定义的符号顺序保持一致.
假如传入的是 [FNode,'/',TNode], 那么原本的2/3的含义将变为3/2
*/
