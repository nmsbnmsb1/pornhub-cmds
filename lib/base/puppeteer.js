"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.e_commutils = void 0;
const path_1 = __importDefault(require("path"));
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
const TimeUtils_1 = __importDefault(require("me-utils/lib/TimeUtils"));
const logger_1 = __importDefault(require("./logger"));
const defaultUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36';
const browserMap = {};
function e_commutils() {
    this.fillZero = (s, bits) => {
        s = s.toString();
        while (s.length < bits)
            s = `0${s}`;
        return s;
    };
    this.trimInnerText = (innerText) => {
        return innerText
            .replace(/[\r\n]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };
    this.trimLocalName = (localName) => {
        return localName
            .replace(/[\r\n]/g, '')
            .replace(/\s+/g, ' ')
            .replace(/:/g, '：')
            .replace(/\//g, '_')
            .trim();
    };
    this.localNameFromURL = (url) => {
        return url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'));
    };
}
exports.e_commutils = e_commutils;
class Puppeteer {
    static async openBrowser(key, options) {
        if (!browserMap[key]) {
            browserMap[key] = {
                browser: await puppeteer_core_1.default.launch({
                    executablePath: options.app || path_1.default.resolve('chrome-mac/Chromium.app/Contents/MacOS/Chromium'),
                    headless: options.headless,
                    devtools: !options.headless,
                    slowMo: !options.headless ? 10 : 100,
                    userDataDir: path_1.default.resolve('runtime', 'tmp'),
                    ignoreHTTPSErrors: true,
                    args: [
                        options.useSS ? '--proxy-server=socks5://127.0.0.1:1086' : '',
                        '--disable-infobars',
                        '--window-position=0,0',
                        '--ignore-certifcate-errors',
                        '--ignore-certifcate-errors-spki-list',
                        `--user-agent=${options.userAgent || defaultUserAgent}`,
                    ],
                }),
                used: 0,
                options,
                cap: 0,
                pages: [],
                waits: [],
            };
            browserMap[key].browser.$puppeteer_browser_key = key;
        }
        browserMap[key].used++;
        return browserMap[key].browser;
    }
    static async closeBrowser(browser, wait = 0) {
        const key = browser.$puppeteer_browser_key;
        if (!browserMap[key])
            return;
        browserMap[key].used--;
        if (browserMap[key].used <= 0) {
            if (wait > 0)
                await TimeUtils_1.default.sleep(wait);
            if (browserMap[key] && browserMap[key].used <= 0) {
                if (wait > 0)
                    logger_1.default.get(key).warn(`浏览器已空闲${wait}毫秒，直接关闭`);
                else
                    logger_1.default.get(key).warn(`直接关闭浏览器`);
                const b = browserMap[key];
                delete browserMap[key];
                for (const w of b.waits)
                    w(false);
                await b.browser.close();
            }
        }
    }
    static async openPage(browser, pageType = '', url, injectCommUtils = false) {
        const key = browser.$puppeteer_browser_key;
        if (!browserMap[key])
            return;
        let page;
        if (browserMap[key].pages.length > 0) {
            page = browserMap[key].pages.shift();
        }
        else if (browserMap[key].cap < browserMap[key].options.maxPages) {
            browserMap[key].cap++;
            page = await browser.newPage();
            page.$puppeteer_goto = page.goto;
            page.goto = async (url, options) => {
                const resp = await page.$puppeteer_goto(url, options);
                await page.waitForTimeout(1500);
                return resp;
            };
            await page.setRequestInterception(true);
            page.setDefaultNavigationTimeout(1 * 60 * 1000);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                if (resourceType === Puppeteer.ResTypeDocument) {
                    req.continue();
                }
                else if (page.$puppeteer_page_type === Puppeteer.PageTypeALL) {
                    req.continue();
                }
                else if (page.$puppeteer_page_type === Puppeteer.PageTypeNoRichContent) {
                    if (resourceType === 'image' || resourceType === 'media')
                        req.abort();
                    else if (resourceType === 'xhr' && req.url().match(/.*(\.png|\.jpg|\.jpeg|\.gif|\.mp4|\.ts)$/))
                        req.abort();
                    else
                        req.continue();
                }
                else if (page.$puppeteer_page_type === Puppeteer.PageTypeScriptOnly) {
                    resourceType === 'script' ? req.continue() : req.abort();
                }
                else if (Array.isArray(page.$puppeteer_page_type)) {
                    page.$puppeteer_page_type.indexOf(resourceType) >= 0 ? req.continue() : req.abort();
                }
                else {
                    req.abort();
                }
            });
        }
        else {
            page = await new Promise((resolve) => {
                browserMap[key].waits.push(resolve);
            });
            if (page === false) {
                page = undefined;
                logger_1.default.get(key).warn('浏览器已关闭');
            }
        }
        if (page) {
            page.$puppeteer_browser_key = key;
            page.$puppeteer_page_type = pageType;
            if (url) {
                await page.goto(url, {
                    timeout: 60000,
                });
            }
            if (injectCommUtils) {
                await page.evaluate(e_commutils);
            }
        }
        return page;
    }
    static setPageType(page, pageType = '') {
        page.$puppeteer_page_type = pageType;
    }
    static async closePage(page) {
        await page.goto('about:blank');
        const key = page.$puppeteer_browser_key;
        if (!browserMap[key]) {
            return;
        }
        if (browserMap[key].waits.length > 0) {
            browserMap[key].waits.shift()(page);
            return;
        }
        browserMap[key].pages.push(page);
    }
    static async handle(browser, pageType, url, injectCommUtils, e) {
        const page = await Puppeteer.openPage(browser, pageType, url, injectCommUtils);
        let result;
        try {
            result = await e(page);
        }
        catch (e) {
            result = e;
        }
        await Puppeteer.closePage(page);
        return result;
    }
    static async evaluate(browser, pageType, url, injectCommUtils, e, ...eArgs) {
        const page = await Puppeteer.openPage(browser, pageType, url, injectCommUtils);
        let result;
        try {
            result = await page.evaluate(e, ...eArgs);
        }
        catch (e) {
            result = e;
        }
        await Puppeteer.closePage(page);
        return result;
    }
}
exports.default = Puppeteer;
Puppeteer.ResTypeDocument = 'document';
Puppeteer.ResTypeStylesheet = 'stylesheet';
Puppeteer.ResTypeImage = 'image';
Puppeteer.ResTypeMedia = 'media';
Puppeteer.ResTypeFont = 'font';
Puppeteer.ResTypeScript = 'script';
Puppeteer.ResTypeTexttrack = 'texttrack';
Puppeteer.ResTypeXHR = 'xhr';
Puppeteer.ResTypeFetch = 'fetch';
Puppeteer.ResTypeEventsource = 'eventsource';
Puppeteer.ResTypeWebsocket = 'websocket';
Puppeteer.ResTypeManifest = 'manifest';
Puppeteer.ResTypeOther = 'other';
Puppeteer.PageTypeALL = 'all';
Puppeteer.PageTypeNoRichContent = 'noRichContent';
Puppeteer.PageTypeScriptOnly = 'scriptOnly';
//# sourceMappingURL=puppeteer.js.map