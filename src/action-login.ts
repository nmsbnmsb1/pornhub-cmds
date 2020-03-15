import puppeteer from 'puppeteer';
import Action from 'me-actions/lib/base';
import TimeUtils from 'me-utils/lib/TimeUtils';
import ObjectUtils from 'me-utils/lib/ObjectUtils';
import Logger from './base/logger';
import { IContext } from './base/context';
import Puppeteer from './base/puppeteer';

export default class ActionForLogin extends Action {
  constructor() {
    super();
    this.name = 'login';
  }

  protected async doStart(context: IContext) {
    Logger.info(`打开登陆页 ${context.options.webURL}/login`, context);
    //
    let e = await Puppeteer.handle(context.browser, Puppeteer.PageTypeNoRichContent, `${context.options.webURL}/login`, async (page: puppeteer.Page) => {
      //如果被重定向到首页，说明已登陆
      let pageURL = page.url();
      if ((pageURL.endsWith('/') && pageURL === `${context.options.webURL}/`) || pageURL === context.options.webURL) return;
      //
      await page.evaluateHandle(
        (username: string, password: string) => {
          const usernameInput: any = document.querySelector("div[class='createAccount'] form[id='signup_form'] input[id='username']");
          usernameInput.value = username;
          //
          const passwordInput: any = document.querySelector("div[class='createAccount'] form[id='signup_form'] input[id='password']");
          passwordInput.value = password;
          passwordInput.focus();
          //
          const remeberInput: any = document.querySelector("div[class='createAccount'] form[id='signup_form'] input[id='remember_me']");
          remeberInput.checked = true;
        },
        context.options.webUsername,
        context.options.webPassword
      );
      Logger.info('点击登陆', context);
      await TimeUtils.sleep(1000);
      //await page.click("div[class='createAccount'] form[id='signup_form'] input[id='submit']");
      await page.focus("div[class='createAccount'] form[id='signup_form'] input[id='submit']");
      await page.keyboard.press('Enter');
      await page.waitForNavigation();
    });
    //
    if (ObjectUtils.isError(e)) throw e;
    Logger.info(`已登陆`, context);
  }
}
