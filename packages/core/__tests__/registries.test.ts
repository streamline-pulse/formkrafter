import { describe, expect, test } from "bun:test";
import { checkCompanyRegistry, checkPlate, formatCompanyRegistry, formatPlate } from "../lib/utils/registries.js";

describe("registres publics", () => {
  test("immatriculations par pays", () => {
    expect(checkPlate("fr", "ab-123-cd")).toBe(true);
    expect(checkPlate("fr", "AB-123-CI")).toBe(false); // I n'est pas admis en France
    expect(formatPlate("fr", "ab123cd")).toBe("AB-123-CD");
    expect(checkPlate("bj", "AB 1234 RB")).toBe(true);
    expect(formatPlate("bj", "ab1234rb")).toBe("AB 1234 RB");
    expect(checkPlate("ci", "1234 AB 01")).toBe(true);
    expect(checkPlate("sn", "DK 1234 AA")).toBe(true);
    expect(checkPlate("generic", "A1")).toBe(false);
    expect(checkPlate("unknown", "ABCD12")).toBe(true);
    expect(formatPlate("bj", "xx")).toBe("XX");
  });

  test("registres du commerce", () => {
    expect(checkCompanyRegistry("ohada-rccm", "RB/COT/01 B 1234")).toBe(true);
    expect(formatCompanyRegistry("ohada-rccm", "rb/cot/01b1234")).toBe("RB/COT/01 B 1234");
    expect(checkCompanyRegistry("ohada-rccm", "COT/01 B 1234")).toBe(false);
    expect(checkCompanyRegistry("fr-rcs", "123 456 789 RCS Paris")).toBe(true);
    expect(formatCompanyRegistry("fr-rcs", "123456789 rcs paris")).toBe("123 456 789 RCS PARIS");
    expect(checkCompanyRegistry("generic", "ABC")).toBe(false);
  });
});
