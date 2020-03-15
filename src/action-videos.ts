import RunQueue from 'me-actions/lib/run-queue';
import RunStep from 'me-actions/lib/run-step';
import RunFunc from 'me-actions/lib/run-func';
import { IContext, IOptions } from './base/context';
import Puppeteer from './base/puppeteer';
import Logger from './base/logger';
import { ActionForDownloadFile } from './base/action-download-files';
import utils, { IVideo } from './utils';

export interface IVideosOptions extends IOptions {
  videosSerialID: string[];
  videosQueue: number[];
  videosPreview?: 'thumb'[];
  videosRecommend?: boolean;
  videosRecommendPreview?: ('thumb' | 'webm')[];
  videosVideo?: boolean | { quality: number; format: string };
}

export default class ActionForVideo extends RunStep {
  private options: IVideosOptions;
  private thumbs: RunQueue;
  private webms: RunQueue;
  private videos: RunQueue;

  constructor(ignoreErr: boolean = false, breakWhenErr: boolean = false) {
    super();
    this.name = 'videos';
    this.ignoreErr = ignoreErr;
    this.breakWhenErr = breakWhenErr;
  }

  protected async doStart(context: IContext) {
    // 初始化
    this.options = context.options as IVideosOptions;
    if (!this.options.videosPreview) this.options.videosPreview = ['thumb'];
    if (!this.options.videosRecommendPreview) this.options.videosRecommendPreview = ['thumb', 'webm'];
    if (!this.options.videosQueue) this.options.videosQueue = [1, 0];
    this.step = this.options.videosQueue[0];
    this.limit = this.options.videosQueue[1];

    //迭代器配置
    this.from = 0;
    this.to = this.options.videosSerialID.length - 1;
    this.onBeforeStep = async () => {
      if (this.options.videosPreview.indexOf('thumb') >= 0 || (this.options.videosRecommend && this.options.videosRecommendPreview.indexOf('thumb') >= 0)) {
        this.thumbs = new RunQueue(1, 2, true, false);
      }
      if (this.options.videosRecommend && this.options.videosRecommendPreview.indexOf('webm') >= 0) {
        this.webms = new RunQueue(3, 2, true, false);
      }
      if (this.options.videosVideo) this.videos = new RunQueue(1, 2, true, false);
    };
    this.handleFactory = (i: number) => new RunFunc(() => this.doVideo(context, this.options.videosSerialID[i]));
    this.onAfterStep = async () => {
      let all = [];
      if (this.thumbs && this.thumbs.numChildren() > 0) {
        all.push(this.thumbs.startAsync(context));
      }
      if (this.webms && this.webms.numChildren() > 0) {
        all.push(this.webms.startAsync(context));
      }
      if (this.videos && this.videos.numChildren() > 0) {
        all.push(this.videos.startAsync(context));
      }
      if (all.length > 0) await Promise.all(all);
      this.thumbs = undefined;
      this.webms = undefined;
      this.videos = undefined;
    };
    //
    return super.doStart(context);
  }

  protected async doVideo(context: IContext, serialID: string) {
    const vURL = serialID.startsWith('/') ? serialID : `/view_video.php?viewkey=${serialID}`;
    const fullURL = `${context.options.webURL}${vURL}`;
    Logger.info(`打开 ${context.options.name}-${fullURL}`, context);

    //
    const page = await Puppeteer.openPage(context.browser, [Puppeteer.ResTypeScript], fullURL);
    //detail
    let v: IVideo = {} as any;
    v.serial_id = serialID;
    v.url = vURL;
    v = await page.evaluate(utils.e_getVideoDetail, v);

    if (v.promo === 'unavaliable' || v.promo === 'premium') {
      //
    } else {
      //thumbs
      if (this.options.videosPreview.indexOf('thumb') >= 0) {
        if (v.poster || v.thumbs) {
          this.thumbs.addChild(utils.getThumbsDownloadAction(v, 'b'));
        }
      }
      //recommend
      if (this.options.videosRecommend) {
        let listSel = "div[id='vpContentContainer'] ul[id='relatedVideosCenter'] li";
        let rvs: IVideo[] = await page.evaluate(utils.e_getVideos, listSel);
        //console.log(rvs);
        if (rvs && rvs.length > 0) {
          if (this.options.videosRecommendPreview.indexOf('thumb') >= 0) {
            for (let rv of rvs) {
              if (!rv.poster && !rv.thumbs) continue;
              this.thumbs.addChild(utils.getThumbsDownloadAction(rv, 's'));
            }
          }
          if (this.options.videosRecommendPreview.indexOf('webm') >= 0) {
            for (let rv of rvs) {
              if (!rv.webm) continue;
              this.webms.addChild(utils.getWebmDownloadAction(rv));
            }
          }
        }
      }
      //video
      if (this.options.videosVideo) {
        let videos = await page.evaluate(utils.e_getVideoVideos, v.promo);
        v.video = videos;
        //
        let target: any;
        if (videos.length > 0) {
          //如果直接可以下载
          if (typeof this.options.videosVideo === 'boolean') {
            // 挑选一个质量最好的视频下载
            let tmp: any = {};
            for (const video of videos) {
              if (!video.videoUrl) continue;
              if (video.format === 'mp4') {
                const q = parseInt(video.quality, 10);
                if (!tmp.mp4 || tmp.mp4.q < q) {
                  video.q = q;
                  tmp.mp4 = video;
                }
              }
            }
            if (tmp.mp4) target = tmp.mp4;
          } else {
            for (const video of videos) {
              if (!video.format && video.quality === this.options.videosVideo.quality) {
                target = video;
                break;
              } else if (!video.quality && video.format === this.options.videosVideo.format) {
                target = video;
                break;
              } else if (video.format === this.options.videosVideo.format && video.quality === this.options.videosVideo.quality) {
                target = video;
                break;
              }
            }
          }
        }

        //
        if (target) {
          this.videos.addChild(
            new ActionForDownloadFile(
              {
                url: target.videoUrl,
                saveRelativePath: `${v.local_name}/${target.quality}`,
                ext: target.format,
              },
              true
            )
          );
        } else {
          Logger.error(`${this.options.name}-${v.title} 没有适合的格式`, context);
        }
      }
    }
    //
    await Puppeteer.closePage(page);
  }

  protected async doStop(context: IContext) {
    super.doStop(context);
    if (this.thumbs) {
      this.thumbs.stop(context);
      this.thumbs = undefined;
    }
    if (this.webms) {
      this.webms.stop(context);
      this.webms = undefined;
    }
    if (this.videos) {
      this.videos.stop(context);
      this.videos = undefined;
    }
  }
}
