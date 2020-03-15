"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const run_queue_1 = __importDefault(require("me-actions/lib/run-queue"));
const run_step_1 = __importDefault(require("me-actions/lib/run-step"));
const run_func_1 = __importDefault(require("me-actions/lib/run-func"));
const puppeteer_1 = __importDefault(require("./base/puppeteer"));
const logger_1 = __importDefault(require("./base/logger"));
const action_download_files_1 = require("./base/action-download-files");
const utils_1 = __importDefault(require("./utils"));
class ActionForVideo extends run_step_1.default {
    constructor(ignoreErr = false, breakWhenErr = false) {
        super();
        this.name = 'videos';
        this.ignoreErr = ignoreErr;
        this.breakWhenErr = breakWhenErr;
    }
    async doStart(context) {
        this.options = context.options;
        if (!this.options.videosPreview)
            this.options.videosPreview = ['thumb'];
        if (!this.options.videosRecommendPreview)
            this.options.videosRecommendPreview = ['thumb', 'webm'];
        if (!this.options.videosQueue)
            this.options.videosQueue = [1, 0];
        this.step = this.options.videosQueue[0];
        this.limit = this.options.videosQueue[1];
        this.from = 0;
        this.to = this.options.videosSerialID.length - 1;
        this.onBeforeStep = async () => {
            if (this.options.videosPreview.indexOf('thumb') >= 0 || (this.options.videosRecommend && this.options.videosRecommendPreview.indexOf('thumb') >= 0)) {
                this.thumbs = new run_queue_1.default(1, 2, true, false);
            }
            if (this.options.videosRecommend && this.options.videosRecommendPreview.indexOf('webm') >= 0) {
                this.webms = new run_queue_1.default(3, 2, true, false);
            }
            if (this.options.videosVideo)
                this.videos = new run_queue_1.default(1, 2, true, false);
        };
        this.handleFactory = (i) => new run_func_1.default(() => this.doVideo(context, this.options.videosSerialID[i]));
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
            if (all.length > 0)
                await Promise.all(all);
            this.thumbs = undefined;
            this.webms = undefined;
            this.videos = undefined;
        };
        return super.doStart(context);
    }
    async doVideo(context, serialID) {
        const vURL = serialID.startsWith('/') ? serialID : `/view_video.php?viewkey=${serialID}`;
        const fullURL = `${context.options.webURL}${vURL}`;
        logger_1.default.info(`打开 ${context.options.name}-${fullURL}`, context);
        const page = await puppeteer_1.default.openPage(context.browser, [puppeteer_1.default.ResTypeScript], fullURL);
        let v = {};
        v.serial_id = serialID;
        v.url = vURL;
        v = await page.evaluate(utils_1.default.e_getVideoDetail, v);
        if (v.promo === 'unavaliable' || v.promo === 'premium') {
        }
        else {
            if (this.options.videosPreview.indexOf('thumb') >= 0) {
                if (v.poster || v.thumbs) {
                    this.thumbs.addChild(utils_1.default.getThumbsDownloadAction(v, 'b'));
                }
            }
            if (this.options.videosRecommend) {
                let listSel = "div[id='vpContentContainer'] ul[id='relatedVideosCenter'] li";
                let rvs = await page.evaluate(utils_1.default.e_getVideos, listSel);
                if (rvs && rvs.length > 0) {
                    if (this.options.videosRecommendPreview.indexOf('thumb') >= 0) {
                        for (let rv of rvs) {
                            if (!rv.poster && !rv.thumbs)
                                continue;
                            this.thumbs.addChild(utils_1.default.getThumbsDownloadAction(rv, 's'));
                        }
                    }
                    if (this.options.videosRecommendPreview.indexOf('webm') >= 0) {
                        for (let rv of rvs) {
                            if (!rv.webm)
                                continue;
                            this.webms.addChild(utils_1.default.getWebmDownloadAction(rv));
                        }
                    }
                }
            }
            if (this.options.videosVideo) {
                let videos = await page.evaluate(utils_1.default.e_getVideoVideos, v.promo);
                v.video = videos;
                let target;
                if (videos.length > 0) {
                    if (typeof this.options.videosVideo === 'boolean') {
                        let tmp = {};
                        for (const video of videos) {
                            if (!video.videoUrl)
                                continue;
                            if (video.format === 'mp4') {
                                const q = parseInt(video.quality, 10);
                                if (!tmp.mp4 || tmp.mp4.q < q) {
                                    video.q = q;
                                    tmp.mp4 = video;
                                }
                            }
                        }
                        if (tmp.mp4)
                            target = tmp.mp4;
                    }
                    else {
                        for (const video of videos) {
                            if (!video.format && video.quality === this.options.videosVideo.quality) {
                                target = video;
                                break;
                            }
                            else if (!video.quality && video.format === this.options.videosVideo.format) {
                                target = video;
                                break;
                            }
                            else if (video.format === this.options.videosVideo.format && video.quality === this.options.videosVideo.quality) {
                                target = video;
                                break;
                            }
                        }
                    }
                }
                if (target) {
                    this.videos.addChild(new action_download_files_1.ActionForDownloadFile({
                        url: target.videoUrl,
                        saveRelativePath: `${v.local_name}/${target.quality}`,
                        ext: target.format,
                    }, true));
                }
                else {
                    logger_1.default.error(`${this.options.name}-${v.title} 没有适合的格式`, context);
                }
            }
        }
        await puppeteer_1.default.closePage(page);
    }
    async doStop(context) {
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
exports.default = ActionForVideo;
//# sourceMappingURL=action-videos.js.map