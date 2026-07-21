import {
  JsRunnerServiceImplementation,
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

const jsRunnerService: JsRunnerService = new JsRunnerServiceImplementation();
const dataSourceService: DataSourceService = new FetchDataSourceService();
const fileUploadService: FileUploadService = new Base64FileUploadService();

const services = {
  jsRunnerService,
  dataSourceService,
  fileUploadService,
};

export { services };
