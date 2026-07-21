import type { RulesLogic } from "json-logic-js";

export type Effect = {
  name?: string;
  property?: {
    target: string;
    type: "logic" | "code" | "boolean" | "string";
  };
  logic?: RulesLogic;
  code?: string;
  boolean?: boolean;
  string?: string;
};
