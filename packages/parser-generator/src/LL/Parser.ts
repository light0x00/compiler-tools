/*
Nonrecursive LL Predictive Parsing
*/
import { EOF, NIL, ASTree, ASTElement, ILexer } from "@light0x00/parser-definition";
import { Terminal, NonTerminal, Production, Symbol, IGrammar, IParser, ActionGrammar } from "../Definition";
import { Stack } from "@light0x00/shim";
import rootDebug from "debug";
import { FirstTable, FirstSetCalculator } from "../First";
import { FollowSetTable, FollowSetCalculator } from "../Follow";
import { MismatchError } from "../Toolkit";
let debug = rootDebug("APP:LLParser");

type ASTAccumulationEntry = { astNode: ASTree, accNum: number }

export class LLParser implements IParser {

	startNT: NonTerminal
	firstTable: Map<string, Map<Terminal, Production>>
	followTable: Map<string, Set<Terminal>>


	constructor(grammar: IGrammar, firstTable: FirstTable, followTable: FollowSetTable) {
		this.startNT = grammar.startNT();
		this.firstTable = firstTable;
		this.followTable = followTable;

		checkAmbiguity(firstTable, followTable);
	}

	accumulate(accStack: Stack<ASTAccumulationEntry>, ele?: ASTElement) {
		if (accStack.size() > 0) {
			let parentEntry = accStack.peek();
			if (ele != null)
				parentEntry.astNode.appendElement(ele);
			--parentEntry.accNum;
			if (parentEntry.accNum == 0) {
				accStack.pop();
			}
		}
	}

	parse(lexer: ILexer): ASTree {
		let symStack = new Stack<Symbol>();
		symStack.push(EOF);
		symStack.push(this.startNT);

		let rootAST;
		let astAccStack = new Stack<ASTAccumulationEntry>();

		let lookahead = lexer.nextToken();
		while (symStack.size() > 0) {
			// debug(symStack.join(" "));
			// debug("ASTree:"+astAccStack.map(i=>i.astNode).join(""));
			let symbol = symStack.pop()!;
			let lookaheadKey = lookahead.tableKey();
			//非终结符
			if (symbol instanceof NonTerminal) {
				let nt_key = symbol.name;
				let firstSet = this.firstTable.get(nt_key)!;
				let followSet = this.followTable.get(nt_key)!;

				let candidate_prod = firstSet.get(lookaheadKey);
				//如果当前非终结符存在 对lookahead的非ε推导
				if (candidate_prod != null) {
					//将候选式符号倒序压入栈
					for (let i = candidate_prod.length - 1; i >= 0; i--)
						symStack.push(candidate_prod[i]);

					/* 分析树 */
					let ast = candidate_prod.makeAST();

					if (rootAST == undefined && symbol == this.startNT)
						rootAST = ast;

					this.accumulate(astAccStack, ast);
					astAccStack.push({ astNode: ast, accNum: candidate_prod.length });

				}
				//否则
				else {
					//检查当前非终结符是否可推出ε, 并且lookahead存在于followSet
					if (firstSet.has(NIL) && followSet.has(lookaheadKey)) {
						//ok
						/* 分析树 */
						this.accumulate(astAccStack);
					} else {
						throw new MismatchError(firstSet.keys(), lookahead);
					}
				}
			}
			//终结符
			else {
				if (lookaheadKey != symbol)
					throw new MismatchError(symbol, lookahead);
				debug(`matched ${lookahead}`);

				/* 分析树 */
				if (lookahead != EOF)
					this.accumulate(astAccStack, lookahead);

				lookahead = lexer.nextToken();
			}
		}
		debug("success!");
		return rootAST as ASTree;
	}

}


export function buildLLParser(grammar: ActionGrammar) {
	let firstSetCalculator = new FirstSetCalculator(grammar);
	let follow = new FollowSetCalculator(grammar, firstSetCalculator);
	return new LLParser(grammar, firstSetCalculator.getFirstTable(), follow.getFollowTable());
}

/*

1. 二义性
如果一个非终结符A可以推出ε,那么必须满足 First(A) ∩ Follow(A)=∅, 否则就存在二义性

S->Aa
A->a|ε

First(A)={a,ε}
Follow(A)={a}

预测表:
+------+--------------+
|      | a            |
+------+--------------+
|A     | A->a,A->ε    |
+------+--------------+

在输入串为「a」时,分别选择A->a,A->ε,前者将匹配失败,而后者匹配成功. 无法确定一个唯一的选择.
*/
function checkAmbiguity(firstTable: FirstTable, followTable: FollowSetTable) {
	/* issue: 1. 二义性 */
	for (let [pname, firstMap] of firstTable) {
		if (firstMap.has(NIL)) {
			let followSet = followTable.get(pname)!;
			for (let v of firstMap.keys()) {
				if (followSet.has(v))
					throw new Error(`Found ambiguity in grammar. There is conflict between the First-set(${pname}) and Follow-Set(${pname}) on ${v}`);
			}
		}
	}
}