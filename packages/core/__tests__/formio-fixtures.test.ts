import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { convertFormioForm } from "../lib/compat/formio";
import { iterateBricks } from "../lib/utils/brick-spec";
import { getAffectedProperties } from "../lib/brick/utils";
import { validateFormData } from "../lib/validators/validator";
import type { BrickSpec } from "../lib/utils/brick-spec";
import type { FormioForm } from "../lib/compat/formio";

const fixturesDir = join(import.meta.dir, "fixtures", "formio");
const fixtures = readdirSync(fixturesDir).filter((file) => file.endsWith(".json"));

const loadFixture = (file: string): FormioForm =>
    JSON.parse(readFileSync(join(fixturesDir, file), "utf8"));

const brickByKey = (spec: BrickSpec, key: string): BrickSpec => {
    for (const { brick } of iterateBricks(spec)) {
        if (brick.configs?.key === key) return brick;
    }
    throw new Error(`no brick with key ${key}`);
};

const EXPECTED_WARNING_PATTERNS = [
    "converted automatically",
    "configure services.fileUploadService",
    "button",
    "skipped — only",
    "has no valueProperty",
    "unsupported component type",
    "approximated with a date input",
    "customConditional",
    "editgrid",
    "container",
    "currency",
];

describe("public Form.io fixtures", () => {
    test("all fixtures are present", () => {
        expect(fixtures.length).toBeGreaterThanOrEqual(3);
    });

    for (const file of fixtures) {
        test(`${file} converts cleanly`, () => {
            const { spec, warnings } = convertFormioForm(loadFixture(file));

            expect(spec.children?.length ?? 0).toBeGreaterThan(0);

            const unexpected = warnings.filter(
                (warning) =>
                    !EXPECTED_WARNING_PATTERNS.some((pattern) =>
                        warning.includes(pattern)
                    )
            );
            expect(unexpected).toEqual([]);

            for (const { brick } of iterateBricks(spec)) {
                expect(brick.configs?.uid).toBeUndefined();
                expect(brick.configs?.key).toBeTruthy();
            }

            expect(typeof validateFormData(spec, {}, "fr").valid).toBe("boolean");
        });
    }

    test("subvention wizard: steps, json selects, custom validator, files", () => {
        const { spec, warnings } = convertFormioForm(
            loadFixture("demande-subvention-wizard.json")
        );

        const stepper = spec.children?.[0];
        expect(stepper?.id).toBe("stepper");
        expect(stepper?.children).toHaveLength(5);

        const pays = brickByKey(spec, "pays_de_residence");
        const options = pays.configs?.options as Array<{ label: string; value: string }>;
        expect(options).toHaveLength(10);
        expect(options[0]).toEqual({ label: "Togo", value: "TG" });

        const phoneVerdict = validateFormData(
            spec,
            { telephone_du_responsable: "12345678" },
            "fr"
        );
        expect(phoneVerdict.errors.telephone_du_responsable).toBe(
            "Veuillez saisir un numéro national valide (8 chiffres)"
        );
        expect(
            validateFormData(spec, { telephone_du_responsable: "90112233" }, "fr")
                .errors.telephone_du_responsable
        ).toBeUndefined();

        const rna = brickByKey(spec, "numero_rna");
        expect(rna.rules).toHaveLength(1);
        expect(
            validateFormData(spec, { type_de_structure: "citoyens" }, "fr").errors
                .numero_rna
        ).toBeUndefined();
        expect(
            validateFormData(spec, { type_de_structure: "association" }, "fr")
                .errors.numero_rna
        ).toBeDefined();

        const attestation = brickByKey(spec, "attestation_bancaire");
        const logicRule = attestation.rules?.find((rule) => rule.type === "javaScript");
        expect(logicRule?.effects?.[0]?.property?.target).toBe("hidden");
        expect(
            getAffectedProperties(attestation.rules, { type_de_structure: "cooperative" })
                .hidden
        ).not.toBe(true);
        expect(
            getAffectedProperties(attestation.rules, { type_de_structure: "citoyens" })
                .hidden
        ).toBe(true);

        const statuts = brickByKey(spec, "statuts_de_la_structure");
        expect(statuts.dataType).toBe("object");
        expect(statuts.configs?.uploadUrl).toBe("https://api.example.org/uploads");
        expect(statuts.configs?.accept).toBe(".pdf");

        const photos = brickByKey(spec, "photos_des_activites");
        expect(photos.dataType).toBe("array");
        expect(photos.configs?.multiple).toBe(true);

        expect(
            warnings.some((warning) => warning.includes("single file kept"))
        ).toBe(false);

        const grid = brickByKey(spec, "lignes_budgetaires");
        expect(grid.type).toBe("collection");
        const rows = validateFormData(
            spec,
            { lignes_budgetaires: [{ intitule: "Loyer", categorie: "fonctionnement", montant: 0 }] },
            "fr"
        );
        expect(rows.errors["lignes_budgetaires[0].montant"]).toBeDefined();
    });

    test("incident report: tabs, editgrid, remote select, custom conditional warning", () => {
        const { spec, warnings } = convertFormioForm(
            loadFixture("rapport-incident.json")
        );

        const tabs = brickByKey(spec, "onglets");
        expect(tabs.id).toBe("tabs");
        expect(tabs.children).toHaveLength(4);

        const entrepot = brickByKey(spec, "entrepot");
        expect(entrepot.configs?.optionsSource).toBe("remote");
        expect(entrepot.configs?.optionsUrl).toBe(
            "https://api.example.org/entrepots?region={region}"
        );
        expect(entrepot.configs?.labelKey).toBe("designation");
        expect(entrepot.configs?.valueKey).toBe("id");
        expect(entrepot.configs?.searchParam).toBe("q");

        expect(brickByKey(spec, "temoins").id).toBe("data-grid");

        expect(
            warnings.some((warning) => warning.includes("customConditional"))
        ).toBe(true);
        expect(
            warnings.some((warning) => warning.includes('"survey"'))
        ).toBe(true);
        expect(
            warnings.some((warning) => warning.includes("customAction") || warning.includes("only property actions"))
        ).toBe(true);
    });

    test("payment confirmation: conditional file governs over hidden flag", () => {
        const { spec } = convertFormioForm(loadFixture("confirmation-paiement.json"));

        const proof = brickByKey(spec, "preuve_de_paiement");
        expect(proof.rules).toHaveLength(1);
        expect(
            getAffectedProperties(proof.rules, { paiement_recu: "oui" }).hidden
        ).not.toBe(true);
        expect(
            getAffectedProperties(proof.rules, { paiement_recu: "non" }).hidden
        ).toBe(true);

        const oui = validateFormData(spec, { paiement_recu: "oui", code_agent: "AG1234" }, "fr");
        expect(oui.errors.preuve_de_paiement).toBeDefined();
        expect(oui.errors.montant_recu).toBeDefined();
        expect(oui.errors.motif_de_non_reception).toBeUndefined();

        const non = validateFormData(spec, { paiement_recu: "non", code_agent: "AG1234" }, "fr");
        expect(non.errors.preuve_de_paiement).toBeUndefined();
        expect(non.errors.motif_de_non_reception).toBeDefined();

        expect(
            validateFormData(spec, { code_agent: "XX1234" }, "fr").errors.code_agent
        ).toBe("Le code agent fait 6 caractères et commence par AG");
    });
});
