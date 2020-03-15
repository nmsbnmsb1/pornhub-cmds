import RunStep from 'me-actions/lib/run-step';
import RunQueue from 'me-actions/lib/run-queue';
import RunFunc from 'me-actions/lib/run-func';
import { IContext, IOptions } from './base/context';
import Logger from './base/logger';
import Puppeteer from './base/puppeteer';
import utils, { IVideo } from './utils';

export interface IListOptions extends IOptions {
  listURL: string;
  listSelector: { listSel: string; totalPageSel?: string };
  listPageID?: number[]; // from,to
  listQueue?: number[]; // step,limit
  listPreview?: ('thumb' | 'webm')[];
}

export default class ActionForList extends RunStep {
  private options: IListOptions;
  private thumbs: RunQueue;
  private webms: RunQueue;

  constructor(ignoreErr: boolean = false, breakWhenErr: boolean = true) {
    super();
    this.name = 'list';
    this.ignoreErr = ignoreErr;
    this.breakWhenErr = breakWhenErr;
  }

  protected async doStart(context: IContext) {
    // 初始化
    this.options = context.options as IListOptions;
    if (!this.options.listPreview) this.options.listPreview = ['thumb', 'webm'];
    if (!this.options.listPageID) this.options.listPageID = [1, 1];
    if (!this.options.listQueue) this.options.listQueue = [1, 1];

    //迭代器配置
    this.from = this.options.listPageID[0];
    this.to = this.options.listPageID[1];
    this.step = this.options.listQueue[0];
    this.limit = this.options.listQueue[1];
    this.onBeforeStep = async () => {
      if (this.options.listPreview.indexOf('thumb') >= 0) this.thumbs = new RunQueue(1, 2, true, false);
      if (this.options.listPreview.indexOf('webm') >= 0) this.webms = new RunQueue(3, 2, true, false);
    };
    this.handleFactory = (pageID: number) => new RunFunc(async () => this.doPage(context, pageID));
    this.onAfterStep = async () => {
      let all = [];
      if (this.thumbs && this.thumbs.numChildren() > 0) {
        all.push(this.thumbs.startAsync(context));
      }
      if (this.webms && this.webms.numChildren() > 0) {
        all.push(this.webms.startAsync(context));
      }
      if (all.length > 0) await Promise.all(all);
      this.thumbs = undefined;
      this.webms = undefined;
    };
    return super.doStart(context);
  }

  private async doPage(context: IContext, pageID: number) {
    Logger.info(`打开 ${context.options.name}-P${pageID} ${this.options.listURL}`, context);

    // 获取视频列表
    const page = await Puppeteer.openPage(
      context.browser,
      [Puppeteer.ResTypeScript],
      `${context.options.webURL}${this.options.listURL}${this.options.listURL.indexOf('?') >= 0 ? '&' : '?'}page=${pageID}`
    );
    const vs: IVideo[] = await page.evaluate(utils.e_getVideos, this.options.listSelector.listSel);
    (context.datas[this.options.listURL] || (context.datas[this.options.listURL] = {}))[pageID] = vs;
    // 更新最大页数
    if (this.options.listSelector.totalPageSel) {
      const totalPageID: number = await page.evaluate(utils.e_totalPage, this.options.listSelector.totalPageSel);
      Logger.info(`${context.options.name}-P${pageID} 总共 ${totalPageID} 页`, context);
      if (totalPageID > this.to) this.to = totalPageID;
    }
    await Puppeteer.closePage(page);

    //thumbs
    if (this.thumbs) {
      for (let v of vs) {
        if (!v.poster && !v.thumbs) continue;
        this.thumbs.addChild(utils.getThumbsDownloadAction(v, 's'));
      }
    }

    //webm
    if (this.webms) {
      for (let v of vs) {
        if (!v.webm) continue;
        this.webms.addChild(utils.getWebmDownloadAction(v));
      }
    }
  }

  protected async doStop(context: IContext) {
    super.doStop(context);
    if (this.thumbs) {
      this.thumbs.stop();
      this.thumbs = undefined;
    }
    if (this.webms) {
      this.webms.stop();
      this.webms = undefined;
    }
  }
}
