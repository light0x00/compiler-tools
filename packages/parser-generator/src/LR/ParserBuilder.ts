import { FollowSetCalculator } from "@/Follow";
import { FirstSetCalculator } from "@/First";
import { AugmentedGrammar, IParser } from "@/LR/Definition";
import { LRParser } from "@/LR/Parser";
/* SLR API */
import { constructStateSet_SLR } from "@/LR/SLR/Automata";
import { getParsingTable_SLR } from "@/LR/SLR/ParsingTable";
/* LR1 API */
import { getStateSet_LR } from "@/LR/LR1/Automata";
import { getParsingTable_LR } from "@/LR/LR1/ParsingTable";
import { TraitsTable } from "@/Definition";

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

