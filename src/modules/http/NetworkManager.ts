import axios, {AxiosError, AxiosRequestConfig, Method} from "axios";
import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {StringUtils} from "../../utils/StringUtils";
const request = require('request');

const DefaultTimeout = 30000;

export type Itf<I = any, O = any> = (data?: I, headers?) => Promise<O>

export function post<I = any, O = any>(
  p1: string, p2?: string | boolean): Itf<I, O> {
  const opt = makeInterfaceOption("POST", p1, p2);
  return (d, h) => networkMgr().request(new Interface(opt), d, h);
}
export function get<I = any, O = any>(
  p1: string, p2?: string | boolean): Itf<I, O> {
  const opt = makeInterfaceOption("GET", p1, p2);
  return (d, h) => networkMgr().request(new Interface(opt), d, h)
}
export function put<I = any, O = any>(
  p1: string, p2?: string | boolean): Itf<I, O> {
  const opt = makeInterfaceOption("PUT", p1, p2);
  return (d, h) => networkMgr().request(new Interface(opt), d, h)
}
export function del<I = any, O = any>(
  p1: string, p2?: string | boolean): Itf<I, O> {
  const opt = makeInterfaceOption("DELETE", p1, p2);
  return (d, h) => networkMgr().request(new Interface(opt), d, h)
}

function makeInterfaceOption(method: Method,
                             hostOrRoute: string,
                             routeOrUseToken?: string | boolean): InterfaceOptions {
  const res: InterfaceOptions = { method, route: hostOrRoute };
  if (typeof routeOrUseToken === "string") { // 有host参数
    res.host = hostOrRoute;
    res.route = routeOrUseToken;
    // 有host参数，不可设置token
    res.useToken = false;
  } else
    res.useToken = routeOrUseToken;

  if (res.useToken === undefined) res.useToken = true;
  return res;
}

export class RequestError<T = any> extends Error {

  status: number
  code: number
  message: string
  payload: T

  get name() {
    const code = this.status >= 200 && this.status < 300 ?
      this.code : this.status;
    return `Request Error: ${code}`;
  }

  constructor(status, code, message, payload?: T) {
    super();
    this.status = status;
    this.code = code;
    this.message = message;
    this.payload = payload;
  }
}

export interface InterfaceOptions {
  method: Method;
  host?: string;
  route: string;
  useToken?: boolean;
}

export class Interface implements InterfaceOptions {

  public method: Method;
  public host = "";
  public route: string;
  public useToken = true;
  public useEncrypt = true;
  public deleteKey = true

  public get isGet() {return this.method.toUpperCase() == 'GET'}

  constructor(options: InterfaceOptions) {
    Object.assign(this, options);
  }
}

export function networkMgr(): NetworkManager {
  return getManager(NetworkManager);
}

@manager
class NetworkManager extends BaseManager {

  /**
   * 发起请求
   */
  public async request<T = any>(
    interface_: Interface, data: any = {}, headers: any = {}): Promise<T> {

    headers["Content-Type"] ||= "application/json";
    headers["Accept"] ||= "application/json";

    let sendData, url = interface_.route;
    // TODO: 拓展表单的情况
    // if (data instanceof FormData) sendData = data;
    // else {
    sendData = {...data};
    url = StringUtils.fillData2StrInUrl(url, sendData); // 填充URL里面的参数
    // }

    const config: AxiosRequestConfig = {
      // baseURL: interface_.host,
      url: interface_.host + url,
      method: interface_.method, headers,
      timeout: DefaultTimeout
    }
    if (interface_.isGet)
      config.url += `?${StringUtils.makeQueryParam(sendData)}`;
      // config.params = sendData;
    else {
      if (headers["Content-Type"] == "application/x-www-form-urlencoded")
        config.data = StringUtils.makeQueryParam(sendData);
      else
        config.data = sendData
    }
    console.log("[Request]", config);

    let response
    try {
      response = await axios.request(config)
      console.log("[Request response]", response);
    } catch (e) {
      console.error("[Request error]", e, e?.response);
      if (e instanceof AxiosError) response = e.response
      else throw e;
    }

    const status = response?.status;
    // response?.data是请求返回的信息
    // 如果符合本框架的格式，则返回response?.data?.code，否则为0（成功）
    const code = response?.data?.data ? response?.data?.code || 0 : 0;
    // 如果符合本框架的格式，则返回response?.data?.code，否则为0（成功）
    const res = response?.data;

    if (status >= 200 && status < 300 &&
      code === 0 || code === 200) return res;

    const message = response.data?.message ||
      response.data?.reason || response.statusText;
    throw new RequestError(status, code, message, res);
  }

  public getImageBuffer(imageUrl) {
    return new Promise((resolve, reject) => {
      request.get(imageUrl, (error, response, body) => {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  }
}
