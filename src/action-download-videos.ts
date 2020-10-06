import path from 'path';
import fse from 'fs-extra';
import FileUtils from 'me-utils/lib/FileUtils';
import RunStep from 'me-actions/lib/run-step';
import RunFunc from 'me-actions/lib/run-func';
import RunQueue from 'me-actions/lib/run-queue';
import { IContext, IOptions } from './base/context';
import PuppeteerUtils from './base/puppeteer';
import Logger from './base/logger';
import { ActionForDownloadFileWithPuppeteer, ActionForDownloadFilesWithPuppeteer } from './base/action-download-files';
import utils, { IVideo } from './utils';

export interface IVideoOptions extends IOptions {
  videoIDs: string[];
  videoQueue: number[];
  videoVideo?: boolean | { quality: string; format: string };
  videoOverwriteM3u8?: boolean;
  videoVideoTimeout?: number;
  videoStore?: (time: 'video' | 'step', context: any, index?: number, v?: IVideo | IVideo[], range?: { from: number; to: number }) => Promise<any>;
}

export default class ActionForVideo extends RunStep {
  private options: IVideoOptions;
  private videos: RunQueue;

  constructor(ignoreErr: boolean = false, breakWhenErr: boolean = false) {
    super();
    this.name = 'download-videos';
    this.ignoreErr = ignoreErr;
    this.breakWhenErr = breakWhenErr;
  }

  protected async doStart(context: IContext) {
    // 初始化
    this.options = context.options as IVideoOptions;
    if (!this.options.videoQueue) this.options.videoQueue = [1, 0];
    this.step = this.options.videoQueue[0];
    this.limit = this.options.videoQueue[1];

    //迭代器配置
    this.from = 0;
    this.to = this.options.videoIDs.length - 1;
    this.onBeforeStep = async () => {
      this.videos = new RunQueue(1, 2, true, false);
    };
    this.handleFactory = (i: number) => new RunFunc(() => this.doVideo(context, i, this.options.videoIDs[i]));
    this.onAfterStep = async (range: any) => {
      if (this.videos) await this.videos.startAsync(context);
      this.videos = undefined;
      //
      if (this.options.videoStore) await this.options.videoStore('step', context, -1, undefined, range);
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
    await PuppeteerUtils.closePage(page);

    if (v.promo === 'unavaliable' || v.promo === 'premium') {
      Logger.error(`${v.title} 无法观看视频 promo ${v.promo}`, context);
    } else {
      let wantedVideo: any;
      let targetFormat: string = 'hls';
      if (typeof this.options.videoVideo === 'boolean') {
        // 挑选一个质量最好的视频下载
        let q = 0;
        for (const video of v.videos) {
          if (video.format !== targetFormat) continue;
          const tq = parseInt(video.quality, 10);
          if (!wantedVideo || tq > q) {
            q = tq;
            wantedVideo = video;
          }
        }
        //
      } else {
        for (const video of v.videos) {
          if (!video.format && video.quality === this.options.videoVideo.quality) {
            wantedVideo = video;
            break;
          } else if (!video.quality && video.format === this.options.videoVideo.format) {
            wantedVideo = video;
            break;
          } else if (video.format === this.options.videoVideo.format && video.quality === this.options.videoVideo.quality) {
            wantedVideo = video;
            break;
          }
        }
      }
      if (!wantedVideo) {
        Logger.error(`${v.title} 没有适合的格式`, context);
      }
      //
      v.wantedVideo = wantedVideo;
      //
      if (this.options.videoStore) {
        await this.options.videoStore('video', context, index, v);
      }
      //
      this.videos.addChild(
        new RunFunc(async () => {
          //下载第一个m3u8
          let urlPrefix = v.wantedVideo.url.substring(0, v.wantedVideo.url.lastIndexOf('/'));
          let data = await new ActionForDownloadFileWithPuppeteer({
            url: v.wantedVideo.url,
            saveRelativePath: `${v.local_name}/master_${v.wantedVideo.quality}`,
            ext: '.m3u8',
            overwrite: (context.options as any).liOverwriteM3u8,
          }).startAsync(context);
          if (data.err) return data.err;
          //读取这个文件
          let m3u8 = FileUtils.readTxtFile(data.data) as string;
          let m3u82: any;
          {
            m3u82 = m3u8.split('\n').filter((item) => item.match(/\.m3u8/));
            if (m3u82.length <= 0) return new Error('no m3u8 found');
            m3u82 = m3u82[0];
          }
          //第二个m3u8
          data = await new ActionForDownloadFileWithPuppeteer({
            url: `${urlPrefix}/${m3u82}`,
            saveRelativePath: `${v.local_name}/index-v1-a1-${v.wantedVideo.quality}`,
            ext: '.m3u8',
            overwrite: (context.options as any).liOverwriteM3u8,
          }).startAsync(context);
          if (data.err) return data.err;
          m3u82 = FileUtils.readTxtFile(data.data) as string;
          //console.log(m3u82);
          let tss: any[] = [];
          {
            tss = m3u82.split('\n').filter((item: any) => item.match(/\.ts/));
            if (tss.length <= 0) return new Error('no ts found');
            for (let i = 0; i < tss.length; i++) {
              tss[i] = {
                url: `${urlPrefix}/${tss[i]}`,
                saveRelativePath: `${v.local_name}/${tss[i].substring(0, tss[i].indexOf('.'))}`,
                ext: '.ts',
                overwrite: false,
              };
            }
          }
          data = await new ActionForDownloadFilesWithPuppeteer(1, tss, false, false, (context.options as any).liVideoTimeout).startAsync(context);
          if (data.err) return data.err;
          //合并所有的视频
          //先确认所有的文件都存在
          let allDone = true;
          let allPath = path.resolve(context.options.downloadPath, `${v.local_name}/${v.wantedVideo.local_name}.ts`);
          for (let ts of tss) {
            ts.savePath = path.resolve(context.options.downloadPath, `${ts.saveRelativePath}${ts.ext}`);
            if (FileUtils.isExist(ts.savePath) && FileUtils.isFile(ts.savePath)) {
              fse.appendFileSync(allPath, fse.readFileSync(ts.savePath), { mode: 0o777 });
            } else {
              allDone = false;
              break;
            }
          }
          if (!allDone) {
            fse.unlinkSync(allPath);
            return new Error('media file is missing');
          }
          //清理零碎的ts
          for (let ts of tss) fse.unlinkSync(ts.savePath);
          //
          v.isDownloaded = true;
        })
      );
    }
  }
}
