import { StateSet, AugmentedGrammar } from "../LRDefinition";
// import { getFollowTable } from "../follow";
import { getParsingTable } from "../LRParsingTable";
import { IFunction } from "../../../common/shim";
import { NonTerminal, Terminal } from "../../definition";

/**
 *
 * @param stateSet 状态机
 * @param grammar 文法
 */
export function getParsingTable_SLR(stateSet: StateSet, grammar: AugmentedGrammar, getFollowSet: IFunction<NonTerminal, Set<Terminal>>) {
	return getParsingTable(stateSet, grammar.startNT(), (item) => getFollowSet(item.prod.non_terminal)!);
}
