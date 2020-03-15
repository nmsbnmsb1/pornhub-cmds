import Action from 'me-actions/lib/base';
import { IContext } from './context';
import Puppeteer from './puppeteer';

export default class ActionForBrowser extends Action {
  private op: string;

  constructor(op: string) {
    super();
    this.name = `${op} browser`;
    this.op = op;
  }

  protected async doStart(context: IContext) {
    if (this.op === 'open') {
      context.browser = await Puppeteer.openBrowser(context.options.id, {
        app: context.options.puppeteerApp,
        headless: context.options.puppeteerHeadless,
        userAgent: context.options.puppeteerUserAgent,
        useSS: context.options.puppeteerUseSS,
        maxPages: context.options.puppeteerMaxPages,
      });
    } else if (this.op === 'close') {
      if (context.browser) Puppeteer.closeBrowser(context.browser);
    }
  }
}
