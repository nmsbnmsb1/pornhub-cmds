import RunStep from 'me-actions/lib/run-step';
import RunQueue from 'me-actions/lib/run-queue';
import RunFunc from 'me-actions/lib/run-func';
import ObjectUtils from 'me-utils/lib/ObjectUtils';
import { IContext, IOptions } from './base/context';
import Logger from './base/logger';
import PuppeteerUtils from './base/puppeteer';
import { ActionForDownloadFileWithPuppeteer } from './base/action-download-files';
import utils, { IVideo } from './utils';

export interface IListOptions extends IOptions {
  listURL: string;
  listPageID?: number[]; // from,to
  listQueue?: number[]; // step,limit
  listPreviews?: string[]; //poster/s_thumb/b_thumb/webm
  listStore?: (time: 'list' | 'step', context: any, pageID?: number, vs?: IVideo[], range?: { from: number; to: number }) => Promise<any>;
}

export default class ActionForList extends RunStep {
  private options: IListOptions;
  private listSel: string;
  private totalPageSel: string;
  private storedData: IVideo[];
  private thumbs: RunQueue;
  private webms: RunQueue;

  constructor(listSel: string, totalPageSel: string, ignoreErr: boolean = false, breakWhenErr: boolean = true) {
    super();
    this.name = 'list';
    this.ignoreErr = ignoreErr;
    this.breakWhenErr = breakWhenErr;
    this.listSel = listSel;
    this.totalPageSel = totalPageSel;
  }

  protected async doStart(context: IContext) {
    // 初始化
    this.options = context.options as IListOptions;
    if (!this.options.listPageID) this.options.listPageID = [1, 1];
    if (!this.options.listQueue) this.options.listQueue = [1, 1];
    if (ObjectUtils.isEmpty(this.options.listPreviews)) this.options.listPreviews = [];

    //迭代器配置
    this.from = this.options.listPageID[0];
    this.to = this.options.listPageID[1];
    this.step = this.options.listQueue[0];
    this.limit = this.options.listQueue[1];
    this.onBeforeStep = async () => {
      this.storedData = [];
      if (this.options.listPreviews.indexOf('thumb') >= 0) this.thumbs = new RunQueue(4, 2, true, false);
      if (this.options.listPreviews.indexOf('webm') >= 0) this.webms = new RunQueue(1, 2, true, false);
    };
    this.handleFactory = (pageID: number) => new RunFunc(async () => this.doPage(context, pageID));
    this.onAfterStep = async (range: any) => {
      let all = [];
      if (this.thumbs && this.thumbs.numChildren() > 0) all.push(this.thumbs.startAsync(context));
      if (this.webms && this.webms.numChildren() > 0) all.push(this.webms.startAsync(context));
      if (all.length > 0) await Promise.all(all);
      this.thumbs = undefined;
      this.webms = undefined;
      //
      if (this.options.listStore) await this.options.listStore('step', context, -1, this.storedData, range);
    };
    //
    return super.doStart(context);
  }

  private async doPage(context: IContext, pageID: number) {
    Logger.info(`打开 P${pageID} ${this.options.listURL}`, context);
    const page = await PuppeteerUtils.openPage(
      context.browser,
      [PuppeteerUtils.ResTypeScript],
      `${context.options.webURL}${this.options.listURL}${this.options.listURL.indexOf('?') >= 0 ? '&' : '?'}page=${pageID}`,
      true
    );
    let { vs, totalPageID } = await page.evaluate(utils.e_list, this.listSel, this.totalPageSel);
    await PuppeteerUtils.closePage(page);

    //
    if (totalPageID > this.to) {
      Logger.info(`总共 ${totalPageID} 页`, context);
      this.to = totalPageID;
    }
    //vs = [vs[0]];
    if (this.options.listStore) {
      await this.options.listStore('list', context, pageID, vs);
    }
    this.storedData.push(...vs);

    //thumbs
    if (this.thumbs) {
      for (let v of vs) {
        for (let t of v.s_thumbs) {
          this.thumbs.addChild(new ActionForDownloadFileWithPuppeteer({ url: t.url, saveRelativePath: `${v.local_name}/${t.local_name}`, ext: t.ext }, 60000));
          //break;
        }
      }
    }
    //webm
    if (this.webms) {
      for (let v of vs) {
        if (!v.webm) continue;

        this.webms.addChild(
          new ActionForDownloadFileWithPuppeteer({ url: v.webm.url, saveRelativePath: `${v.local_name}/${v.webm.local_name}`, ext: v.webm.ext }, 60000)
        );
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
