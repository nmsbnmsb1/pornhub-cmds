import path from 'path';
import puppeteer from 'puppeteer-core';
import TimeUtils from 'me-utils/lib/TimeUtils';
import Logger from './logger';

const defaultUserAgent: string = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36';

const browserMap: {
  [key: string]: {
    browser: puppeteer.Browser;
    used: number;
    options: { maxPages: number };
    cap: number;
    pages: any[];
    waits: any[];
  };
} = {};

export default class Puppeteer {
  public static async openBrowser(key: string, options: { app: string; headless: boolean; useSS: boolean; userAgent: string; maxPages: number }) {
    // key = `${key}.${options.useProxy ? "proxy" : "noproxy"}`;
    if (!browserMap[key]) {
      browserMap[key] = {
        browser: await puppeteer.launch({
          executablePath: options.app || path.resolve('chrome-mac/Chromium.app/Contents/MacOS/Chromium'),
          headless: options.headless,
          devtools: !options.headless,
          slowMo: !options.headless ? 10 : 100,
          userDataDir: path.resolve('runtime', 'tmp'),
          ignoreHTTPSErrors: true,
          args: [
            // '--no-sandbox',
            // '--disable-setuid-sandbox',
            options.useSS ? '--proxy-server=socks5://127.0.0.1:1086' : '',
            '--disable-infobars',
            '--window-position=0,0',
            '--ignore-certifcate-errors',
            '--ignore-certifcate-errors-spki-list',
            `--user-agent=${options.userAgent || defaultUserAgent}`,
          ],
        }),
        //
        used: 0,
        options,
        cap: 0,
        pages: [],
        waits: [],
      };
      (browserMap[key].browser as any).$puppeteer_browser_key = key;
    }
    browserMap[key].used++;
    return browserMap[key].browser;
  }
  public static async closeBrowser(browser: puppeteer.Browser, wait: number = 0) {
    const key = (browser as any).$puppeteer_browser_key;
    if (!browserMap[key]) return;
    //
    browserMap[key].used--;
    if (browserMap[key].used <= 0) {
      if (wait > 0) await TimeUtils.sleep(wait);
      if (browserMap[key] && browserMap[key].used <= 0) {
        if (wait > 0) Logger.get(key).warn(`浏览器已空闲${wait}毫秒，直接关闭`);
        else Logger.get(key).warn(`直接关闭浏览器`);
        const b = browserMap[key];
        delete browserMap[key];
        for (const w of b.waits) w(false);
        await b.browser.close();
      }
    }
  }

  //document，stylesheet，image，media，font，script，texttrack，xhr，fetch，eventsource，websocket，manifest，other
  public static ResTypeDocument = 'document';
  public static ResTypeStylesheet = 'stylesheet';
  public static ResTypeImage = 'image';
  public static ResTypeMedia = 'media';
  public static ResTypeFont = 'font';
  public static ResTypeScript = 'script';
  public static ResTypeTexttrack = 'texttrack';
  public static ResTypeXHR = 'xhr';
  public static ResTypeFetch = 'fetch';
  public static ResTypeEventsource = 'eventsource';
  public static ResTypeWebsocket = 'websocket';
  public static ResTypeManifest = 'manifest';
  public static ResTypeOther = 'other';
  //
  public static PageTypeALL = 'all';
  public static PageTypeNoRichContent = 'noRichContent';
  public static PageTypeScriptOnly = 'scriptOnly';

  // 打开页面
  public static async openPage(browser: puppeteer.Browser, pageType: string | string[] = '', url?: string) {
    // 找一个空闲的page
    const key = (browser as any).$puppeteer_browser_key;
    if (!browserMap[key]) return;
    //
    let page: any;
    if (browserMap[key].pages.length > 0) {
      page = browserMap[key].pages.shift();
    } else if (browserMap[key].cap < browserMap[key].options.maxPages) {
      browserMap[key].cap++;
      //
      page = await browser.newPage();
      page.$puppeteer_goto = page.goto;
      page.goto = async (url: string, options: any) => {
        const resp = await page.$puppeteer_goto(url, options);
        await page.waitFor(1500);
        return resp;
      };
      await page.setRequestInterception(true);
      page.setDefaultNavigationTimeout(1 * 60 * 1000);
      // document，stylesheet，image，media，font，script，texttrack，xhr，fetch，eventsource，websocket，manifest，other
      page.on('request', (req: any) => {
        const resourceType = req.resourceType();
        if (resourceType === Puppeteer.ResTypeDocument) {
          req.continue();
        } else if (page.$puppeteer_page_type === Puppeteer.PageTypeALL) {
          req.continue();
        } else if (page.$puppeteer_page_type === Puppeteer.PageTypeNoRichContent) {
          if (resourceType === 'image' || resourceType === 'media') req.abort();
          else if (resourceType === 'xhr' && req.url().match(/.*(\.png|\.jpg|\.jpeg|\.gif|\.mp4|\.ts)$/)) req.abort();
          else req.continue();
        } else if (page.$puppeteer_page_type === Puppeteer.PageTypeScriptOnly) {
          resourceType === 'script' ? req.continue() : req.abort();
        } else if (Array.isArray(page.$puppeteer_page_type)) {
          page.$puppeteer_page_type.indexOf(resourceType) >= 0 ? req.continue() : req.abort();
        } else {
          req.abort();
        }
      });
      // console.log("new page", url);
    } else {
      // 等待其他页面释放
      // console.log("new page wait", url);
      page = await new Promise((resolve) => {
        browserMap[key].waits.push(resolve);
      });
      if (page === false) {
        page = undefined;
        Logger.get(key).warn('浏览器已关闭');
      }
      // else {
      //     console.log(`${url} use ${p.url} 得到空闲的页面`);
      // }
    }
    if (page) {
      page.$puppeteer_browser_key = key;
      page.$puppeteer_page_type = pageType;
      if (url) {
        await page.goto(url, {
          // waitUntil: "networkidle0",
          timeout: 60000,
        });
      }
    }
    return page;
  }
  public static setPageType(page: puppeteer.Page, pageType: string | string[] = '') {
    (page as any).$puppeteer_page_type = pageType;
  }

  public static async closePage(page: puppeteer.Page) {
    // const url = page.url();
    // console.log(Date.now(), "close page", url);
    await page.goto('about:blank');

    const key = (page as any).$puppeteer_browser_key;
    if (!browserMap[key]) {
      return;
    }
    if (browserMap[key].waits.length > 0) {
      browserMap[key].waits.shift()(page);
      return;
    }
    //
    // console.log('push', page.url());
    browserMap[key].pages.push(page);
  }

  public static async handle(browser: puppeteer.Browser, pageType: string | string[], url: string, e: (page: puppeteer.Page) => Promise<any>) {
    const page = await Puppeteer.openPage(browser, pageType, url);
    let result: any;
    try {
      result = await e(page);
    } catch (e) {
      result = e;
    }
    await Puppeteer.closePage(page);
    return result;
  }

  public static async evaluate(browser: puppeteer.Browser, pageType: string | string[], url: string, e: any, ...eArgs: any[]) {
    const page = await Puppeteer.openPage(browser, pageType, url);
    let result: any;
    try {
      result = await page.evaluate(e, ...eArgs);
    } catch (e) {
      result = e;
    }
    await Puppeteer.closePage(page);
    return result;
  }
}
