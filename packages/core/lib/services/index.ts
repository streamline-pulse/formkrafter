import {
  JsRunnerServiceImplementation,
  type JsRunnerService,
} from "./js_runner_service";

const jsRunnerService: JsRunnerService = new JsRunnerServiceImplementation();

const services = {
  jsRunnerService,
};

export { services };
