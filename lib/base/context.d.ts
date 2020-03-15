import puppeteer from 'puppeteer-core';
export interface IOptions {
    id: string;
    name: string;
    downloadPath: string;
    puppeteerApp?: string;
    puppeteerHeadless?: boolean;
    puppeteerUserAgent?: string;
    puppeteerUseSS?: boolean;
    puppeteerMaxPages?: number;
    puppeteerPageType?: string | string[];
    webURL: string;
    webLogin: boolean;
    webUsername: string;
    webPassword: string;
}
export interface IContext {
    options: IOptions;
    datas: {
        [index: string]: any;
    };
    errs: {
        [index: string]: any;
    };
    browser: puppeteer.Browser;
}
