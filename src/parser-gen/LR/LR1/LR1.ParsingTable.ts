import { StateSet, AugmentedGrammar } from "@/parser-gen/LR/LRDefinition";
import { getParsingTable } from "@/parser-gen/LR/LRParsingTable";

export function getParsingTable_LR(stateSet: StateSet, grammar: AugmentedGrammar) {
	return getParsingTable(stateSet, grammar.startNT(), (i) => i.lookaheadSet);
}
