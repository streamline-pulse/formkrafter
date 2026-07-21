import type { RulesLogic } from "json-logic-js";
import type { Effect } from "./effect";

export type Rule = {
  name: string;
  type: "jsonLogic" | "javaScript";
  logic?: RulesLogic;
  code?: string;
  effects?: Effect[];
};
