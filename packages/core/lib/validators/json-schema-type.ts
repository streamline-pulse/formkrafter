type JSONSchemaPrimitiveType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array"
  | "null"
  | "void";

export type JSONSchemaType =
  | JSONSchemaPrimitiveType
  | JSONSchemaPrimitiveType[];
