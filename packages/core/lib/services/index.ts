import {
  JsRunnerServiceImplementation,
  type JsRunnerService,
} from "./js_runner_service";
import {
  FetchDataSourceService,
  type DataSourceService,
} from "./data_source_service";

const jsRunnerService: JsRunnerService = new JsRunnerServiceImplementation();
const dataSourceService: DataSourceService = new FetchDataSourceService();

const services = {
  jsRunnerService,
  dataSourceService,
};

export { services };
