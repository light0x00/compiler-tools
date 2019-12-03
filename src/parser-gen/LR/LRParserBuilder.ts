import { FollowSetCalculator } from "@/parser-gen/follow";
import { FirstSetCalculator } from "@/parser-gen/first";
import { AugmentedGrammar, IParser } from "@/parser-gen/LR/LRDefinition";
import { LRParser } from "@/parser-gen/LR/LRParser";
/* SLR API */
import { constructStateSet_SLR } from "@/parser-gen/LR/SLR/SLR.automata";
import { getParsingTable_SLR } from "@/parser-gen/LR/SLR/parsing_table_SLR";
/* LR1 API */
import { getStateSet_LR } from "@/parser-gen/LR/LR1/LR1.automata";
import { getParsingTable_LR } from "@/parser-gen/LR/LR1/LR1.ParsingTable";

export function buildSLRParser(grammar: AugmentedGrammar): IParser {
	//状态自动机
	let stateAutomata = constructStateSet_SLR(grammar);
	let firstSetCal = new FirstSetCalculator(grammar);
	let followSetCal = new FollowSetCalculator(grammar, firstSetCal);
	//分析表
	let parsingTable = getParsingTable_SLR(stateAutomata, grammar,(nt)=>followSetCal.getFollowSet(nt));
	return new LRParser(stateAutomata, parsingTable);
}

export function buildLR1Parser(grammar: AugmentedGrammar) {
	//状态自动机
	let first  = new FirstSetCalculator(grammar);
	let stateAutomata = getStateSet_LR(grammar,(i)=>first.getFirstSet(i));
	//分析表
	let parsingTable = getParsingTable_LR(stateAutomata, grammar);
	return new LRParser(stateAutomata,parsingTable);
}

