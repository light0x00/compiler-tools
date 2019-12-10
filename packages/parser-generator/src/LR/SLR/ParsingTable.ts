import { StateSet, AugmentedGrammar } from "../Definition";
// import { getFollowTable } from "../follow";
import { getParsingTable } from "../ParsingTable";
import { IFunction } from "@light0x00/shim";
import { NonTerminal, Terminal } from "@/Definition";

/**
 *
 * @param stateSet 状态机
 * @param grammar 文法
 */
export function getParsingTable_SLR(stateSet: StateSet, grammar: AugmentedGrammar, getFollowSet: IFunction<NonTerminal, Set<Terminal>>) {
	return getParsingTable(stateSet, grammar.startNT(), (item) => getFollowSet(item.prod.nonTerminal)!);
}
