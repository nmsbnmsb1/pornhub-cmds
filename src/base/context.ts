import puppeteer from 'puppeteer-core';

export interface IOptions {
  id: string;
  name: string;
  downloadPath: string;
  // browser-config
  puppeteerApp?: string;
  puppeteerHeadless?: boolean; // 是否无头
  puppeteerUserAgent?: string;
  puppeteerUseSS?: boolean; // 是否使用本地代理
  puppeteerMaxPages?: number; // 最多同时打开的页面数
  puppeteerPageType?: string | string[];
  // web-config
  webURL: string;
  webLogin: boolean; // 是否需要登陆
  webUsername: string;
  webPassword: string;
}

export interface IContext {
  options: IOptions;
  // 运行时参数
  datas: { [index: string]: any };
  errs: { [index: string]: any };
  browser: puppeteer.Browser;
}
