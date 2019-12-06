import { StateSet, AugmentedGrammar } from "@/LR/Definition";
import { getParsingTable } from "@/LR/ParsingTable";

export function getParsingTable_LR(stateSet: StateSet, grammar: AugmentedGrammar) {
	return getParsingTable(stateSet, grammar.startNT(), (i) => i.lookaheadSet);
}
