import puppeteer from 'puppeteer-core';
import RunOne from 'me-actions/lib/run-one';
import RunFunc from 'me-actions/lib/run-func';
import TimeUtils from 'me-utils/lib/TimeUtils';
import { IContext } from './base/context';
import Logger from './base/logger';
import ActionForBrowser from './base/action-browser';
import PuppeteerUtils from './base/puppeteer';

export default (context: IContext) => {
  const action = new RunOne(false);
  action.setName('cmd-login');
  //
  action.addChild(new ActionForBrowser('open'));
  action.addChild(
    new RunFunc(async () => {
      Logger.info(`正在登陆`, context);
      let loginURL = `${context.options.webURL}/login`;
      Logger.info(`打开登陆页 ${loginURL}`, context);
      //
      await PuppeteerUtils.handle(context.browser, PuppeteerUtils.PageTypeNoRichContent, loginURL, false, async (page: puppeteer.Page) => {
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
        //
        if (!context.options.puppeteerHeadless) {
          await TimeUtils.sleep(30000);
        } else {
          Logger.info('登陆', context);
          //await page.click("div[class='createAccount'] form[id='signup_form'] input[id='submit']");
          await page.focus("div[class='createAccount'] form[id='signup_form'] input[id='submit']");
          await page.keyboard.press('Enter');
          await page.waitForNavigation();
        }
      });
      Logger.info(`已登陆`, context);
    })
  );

  // 清理
  action.watchCatch((result) => {
    Logger.error(result.err, context);
  });
  action.watchFinally((result) => {
    new ActionForBrowser('close').start(context);
  });
  return action;
};
