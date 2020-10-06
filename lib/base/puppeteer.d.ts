import puppeteer from 'puppeteer-core';
export declare function e_commutils(): void;
export default class Puppeteer {
    static openBrowser(key: string, options: {
        app: string;
        headless: boolean;
        useSS: boolean;
        userAgent: string;
        maxPages: number;
    }): Promise<puppeteer.Browser>;
    static closeBrowser(browser: puppeteer.Browser, wait?: number): Promise<void>;
    static ResTypeDocument: string;
    static ResTypeStylesheet: string;
    static ResTypeImage: string;
    static ResTypeMedia: string;
    static ResTypeFont: string;
    static ResTypeScript: string;
    static ResTypeTexttrack: string;
    static ResTypeXHR: string;
    static ResTypeFetch: string;
    static ResTypeEventsource: string;
    static ResTypeWebsocket: string;
    static ResTypeManifest: string;
    static ResTypeOther: string;
    static PageTypeALL: string;
    static PageTypeNoRichContent: string;
    static PageTypeScriptOnly: string;
    static openPage(browser: puppeteer.Browser, pageType?: string | string[], url?: string, injectCommUtils?: boolean): Promise<puppeteer.Page>;
    static setPageType(page: puppeteer.Page, pageType?: string | string[]): void;
    static closePage(page: puppeteer.Page): Promise<void>;
    static handle(browser: puppeteer.Browser, pageType: string | string[], url: string, injectCommUtils: boolean, e: (page: puppeteer.Page) => Promise<any>): Promise<any>;
    static evaluate(browser: puppeteer.Browser, pageType: string | string[], url: string, injectCommUtils: boolean, e: any, ...eArgs: any[]): Promise<any>;
}
