import RunQueue from 'me-actions/lib/run-queue';
import RunStep from 'me-actions/lib/run-step';
import RunFunc from 'me-actions/lib/run-func';
import { IContext, IOptions } from './base/context';
import PuppeteerUtils from './base/puppeteer';
import Logger from './base/logger';
import { ActionForDownloadFileWithPuppeteer } from './base/action-download-files';
import utils, { IVideo } from './utils';

export interface IVideoOptions extends IOptions {
  videoSerialID: string[];
  videoQueue: number[];
  videoPreviews?: 'thumb'[];
  videoStore?: (time: 'video' | 'step', context: any, index?: number, v?: IVideo | IVideo[], range?: { from: number; to: number }) => Promise<any>;
}

export default class ActionForVideo extends RunStep {
  private options: IVideoOptions;
  private thumbs: RunQueue;
  private storedData: IVideo[];

  constructor(ignoreErr: boolean = false, breakWhenErr: boolean = false) {
    super();
    this.name = 'videos';
    this.ignoreErr = ignoreErr;
    this.breakWhenErr = breakWhenErr;
  }

  protected async doStart(context: IContext) {
    // 初始化
    this.options = context.options as IVideoOptions;
    if (!this.options.videoPreviews) this.options.videoPreviews = ['thumb'];
    if (!this.options.videoQueue) this.options.videoQueue = [1, 0];
    this.step = this.options.videoQueue[0];
    this.limit = this.options.videoQueue[1];

    //迭代器配置
    this.from = 0;
    this.to = this.options.videoSerialID.length - 1;
    this.onBeforeStep = async () => {
      this.storedData = [];
      if (this.options.videoPreviews.indexOf('thumb') >= 0) this.thumbs = new RunQueue(4, 2, true, false);
    };
    this.handleFactory = (i: number) => new RunFunc(() => this.doVideo(context, i, this.options.videoSerialID[i]));
    this.onAfterStep = async (range: any) => {
      if (this.thumbs) await this.thumbs.startAsync(context);
      this.thumbs = undefined;
      //
      if (this.options.videoStore) await this.options.videoStore('step', context, -1, this.storedData, range);
    };
    //
    return super.doStart(context);
  }

  protected async doVideo(context: IContext, index: number, serialID: string) {
    let url = serialID.startsWith('/') ? serialID : `/view_video.php?viewkey=${serialID}`;
    let v: IVideo = { serial_id: url.substring(url.lastIndexOf('=') + 1), url } as any;
    //
    url = `${context.options.webURL}${url}`;
    Logger.info(`打开 ${url}`, context);
    const page = await PuppeteerUtils.openPage(context.browser, [PuppeteerUtils.ResTypeScript], url, true);
    v = await page.evaluate(utils.e_detail, v as any);

    if (v.promo === 'unavaliable' || v.promo === 'premium') {
    } else {
      //thumbs
      if (v.thumbs) {
        for (let t of v.b_thumbs) {
          this.thumbs.addChild(new ActionForDownloadFileWithPuppeteer({ url: t.url, saveRelativePath: `${v.local_name}/${t.local_name}`, ext: t.ext }, 60000));
          //break;
        }
      }
    }
    await PuppeteerUtils.closePage(page);
    //
    if (this.options.videoStore) {
      await this.options.videoStore('video', context, index, v);
    }
    this.storedData.push(v);
  }

  protected async doStop(context: IContext) {
    super.doStop(context);
    if (this.thumbs) {
      this.thumbs.stop(context);
      this.thumbs = undefined;
    }
  }
}
