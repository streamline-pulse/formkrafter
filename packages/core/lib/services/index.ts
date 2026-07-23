import {
  SandboxJsRunnerService,
  type JsRunnerService,
} from "./js_runner_service";
import {
  FetchDataSourceService,
  type DataSourceService,
} from "./data_source_service";
import {
  Base64FileUploadService,
  type FileUploadService,
} from "./file_upload_service";
import {
  FetchSpecSourceService,
  type SpecSourceService,
} from "./spec_source_service";
import {
  FetchOptionSourceService,
  type OptionSourceService,
} from "./option_source_service";

export interface Services {
  jsRunnerService: JsRunnerService;
  dataSourceService: DataSourceService;
  fileUploadService: FileUploadService;
  specSourceService: SpecSourceService;
  optionSourceService: OptionSourceService;
}

const GLOBAL_KEY = Symbol.for("formkrafter.core.services");
const globalStore = globalThis as unknown as Record<symbol, Services | undefined>;

const services: Services = (globalStore[GLOBAL_KEY] ??= {
  jsRunnerService: new SandboxJsRunnerService(),
  dataSourceService: new FetchDataSourceService(),
  fileUploadService: new Base64FileUploadService(),
  specSourceService: new FetchSpecSourceService(),
  optionSourceService: new FetchOptionSourceService(),
});

services.specSourceService ??= new FetchSpecSourceService();
services.optionSourceService ??= new FetchOptionSourceService();

export { services };
