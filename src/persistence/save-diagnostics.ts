export type SaveDiagnosticKind =
  | "corrupt_json"
  | "unsupported_format"
  | "unsupported_version"
  | "schema_validation_error"
  | "unexpected_error";

export interface SaveDiagnosticError {
  kind: SaveDiagnosticKind;
  message: string;
  details?: string;
  rawSnippet?: string;
}

export type ParseSaveResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: SaveDiagnosticError };

export function formatSaveDiagnostic(error: SaveDiagnosticError): string {
  switch (error.kind) {
    case "corrupt_json":
      return `Corrupt JSON data: ${error.message}`;
    case "unsupported_format":
      return `Incompatible save format: ${error.message}`;
    case "unsupported_version":
      return `Unsupported save schema version: ${error.message}`;
    case "schema_validation_error":
      return `Schema validation failure: ${error.message}`;
    case "unexpected_error":
    default:
      return `Save parse error: ${error.message}`;
  }
}
