import {
  SandboxJsRunnerService,
  type JsRunnerService,
} from "./js-runner-service.js";
import {
  FetchDataSourceService,
  type DataSourceService,
} from "./data-source-service.js";
import {
  Base64FileUploadService,
  type FileUploadService,
} from "./file-upload-service.js";
import {
  FetchSpecSourceService,
  type SpecSourceService,
} from "./spec-source-service.js";
import {
  FetchOptionSourceService,
  type OptionSourceService,
} from "./option-source-service.js";
import {
  FetchDocumentReaderService,
  type DocumentReaderService,
} from "./document-reader-service.js";
import type { FilePickerService } from "./file-picker-service.js";

export interface Services {
  jsRunnerService: JsRunnerService;
  dataSourceService: DataSourceService;
  fileUploadService: FileUploadService;
  specSourceService: SpecSourceService;
  optionSourceService: OptionSourceService;
  documentReaderService: DocumentReaderService;
  /** Optional: file picking on platforms without a file input (React Native). */
  filePickerService?: FilePickerService;
}

const GLOBAL_KEY = Symbol.for("formkrafter.core.services");
const globalStore = globalThis as unknown as Record<symbol, Services | undefined>;

const services: Services = (globalStore[GLOBAL_KEY] ??= {
  jsRunnerService: new SandboxJsRunnerService(),
  dataSourceService: new FetchDataSourceService(),
  fileUploadService: new Base64FileUploadService(),
  specSourceService: new FetchSpecSourceService(),
  optionSourceService: new FetchOptionSourceService(),
  documentReaderService: new FetchDocumentReaderService(),
});

services.specSourceService ??= new FetchSpecSourceService();
services.optionSourceService ??= new FetchOptionSourceService();
services.documentReaderService ??= new FetchDocumentReaderService();

export { services };
