import jsonLogic from "json-logic-js";
import { services } from "../services";
import type { Rule } from "../rules/rule";

export type CommonUtils = object;

export type InputUtils = CommonUtils;

export type PanelUtils = CommonUtils;

export type CollectionUtils = CommonUtils;

export type ActionUtils = {
  validateForm: () => {
    isValid: boolean;
  };
} & CommonUtils;

export type Utils = InputUtils & PanelUtils & CollectionUtils & ActionUtils;

export const evalBrickCode = (code: string, data?: Record<string, unknown>) => {
  const customFunction = `
      const dataMap = ${JSON.stringify(data)};

      ${code}
    `;

  try {
    return services.jsRunnerService.eval(customFunction);
  } catch (error) {
    return error;
  }
};

const evalRule = (rule: Rule, dataMap?: Record<string, unknown>): boolean => {
  if (rule.type === "jsonLogic") {
    if (rule.logic == null) return false;

    return jsonLogic.apply(rule.logic, dataMap) === true;
  }

  if (rule.type === "javaScript") {
    if (!rule.code) return false;

    return evalBrickCode(rule.code, dataMap) === true;
  }

  return false;
};

type Properties = {
  value?: string;
  required?: boolean;
  hidden?: boolean;
  disabled?: boolean;
};

const getActiveRules = (rules?: Rule[], dataMap?: Record<string, unknown>) =>
  rules?.filter((rule) => evalRule(rule, dataMap));

const getActiveEffect = (rules?: Rule[], dataMap?: Record<string, unknown>) =>
  getActiveRules(rules, dataMap)
    ?.map((rule) => rule.effects)
    .flat()
    .filter((effect) => effect != undefined);

export const getAffectedProperties = (
  rules?: Rule[],
  dataMap?: Record<string, unknown>
): Properties => {
  return getActiveEffect(rules, dataMap)
    ?.map((effect) => {
      let value;
      if (effect.property) {
        if (effect.property.type === "boolean") value = effect.boolean;
        else if (effect.property.type === "logic" && effect.logic != null)
          value = jsonLogic.apply(effect.logic, dataMap);
        else if (effect.property.type === "code" && effect.code)
          value = evalBrickCode(effect.code, dataMap);
        else if (effect.property.type === "string") value = effect.string;

        return {
          [effect.property.target]: value,
        };
      }
      return {};
    })
    .flat()
    .reduce((acc, item) => ({ ...acc, ...item }), {}) ?? { hidden: false };
};
