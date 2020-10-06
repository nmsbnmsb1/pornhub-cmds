"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const FileUtils_1 = __importDefault(require("me-utils/lib/FileUtils"));
const run_step_1 = __importDefault(require("me-actions/lib/run-step"));
const run_func_1 = __importDefault(require("me-actions/lib/run-func"));
const run_queue_1 = __importDefault(require("me-actions/lib/run-queue"));
const puppeteer_1 = __importDefault(require("./base/puppeteer"));
const logger_1 = __importDefault(require("./base/logger"));
const action_download_files_1 = require("./base/action-download-files");
const utils_1 = __importDefault(require("./utils"));
class ActionForVideo extends run_step_1.default {
    constructor(ignoreErr = false, breakWhenErr = false) {
        super();
        this.name = 'download-videos';
        this.ignoreErr = ignoreErr;
        this.breakWhenErr = breakWhenErr;
    }
    async doStart(context) {
        this.options = context.options;
        if (!this.options.videoQueue)
            this.options.videoQueue = [1, 0];
        this.step = this.options.videoQueue[0];
        this.limit = this.options.videoQueue[1];
        this.from = 0;
        this.to = this.options.videoIDs.length - 1;
        this.onBeforeStep = async () => {
            this.videos = new run_queue_1.default(1, 2, true, false);
        };
        this.handleFactory = (i) => new run_func_1.default(() => this.doVideo(context, i, this.options.videoIDs[i]));
        this.onAfterStep = async (range) => {
            if (this.videos)
                await this.videos.startAsync(context);
            this.videos = undefined;
            if (this.options.videoStore)
                await this.options.videoStore('step', context, -1, undefined, range);
        };
        return super.doStart(context);
    }
    async doVideo(context, index, serialID) {
        let url = serialID.startsWith('/') ? serialID : `/view_video.php?viewkey=${serialID}`;
        let v = { serial_id: url.substring(url.lastIndexOf('=') + 1), url };
        url = `${context.options.webURL}${url}`;
        logger_1.default.info(`打开 ${url}`, context);
        const page = await puppeteer_1.default.openPage(context.browser, [puppeteer_1.default.ResTypeScript], url, true);
        v = await page.evaluate(utils_1.default.e_detail, v);
        await puppeteer_1.default.closePage(page);
        if (v.promo === 'unavaliable' || v.promo === 'premium') {
            logger_1.default.error(`${v.title} 无法观看视频 promo ${v.promo}`, context);
        }
        else {
            let wantedVideo;
            let targetFormat = 'hls';
            if (typeof this.options.videoVideo === 'boolean') {
                let q = 0;
                for (const video of v.videos) {
                    if (video.format !== targetFormat)
                        continue;
                    const tq = parseInt(video.quality, 10);
                    if (!wantedVideo || tq > q) {
                        q = tq;
                        wantedVideo = video;
                    }
                }
            }
            else {
                for (const video of v.videos) {
                    if (!video.format && video.quality === this.options.videoVideo.quality) {
                        wantedVideo = video;
                        break;
                    }
                    else if (!video.quality && video.format === this.options.videoVideo.format) {
                        wantedVideo = video;
                        break;
                    }
                    else if (video.format === this.options.videoVideo.format && video.quality === this.options.videoVideo.quality) {
                        wantedVideo = video;
                        break;
                    }
                }
            }
            if (!wantedVideo) {
                logger_1.default.error(`${v.title} 没有适合的格式`, context);
            }
            v.wantedVideo = wantedVideo;
            if (this.options.videoStore) {
                await this.options.videoStore('video', context, index, v);
            }
            this.videos.addChild(new run_func_1.default(async () => {
                let urlPrefix = v.wantedVideo.url.substring(0, v.wantedVideo.url.lastIndexOf('/'));
                let data = await new action_download_files_1.ActionForDownloadFileWithPuppeteer({
                    url: v.wantedVideo.url,
                    saveRelativePath: `${v.local_name}/master_${v.wantedVideo.quality}`,
                    ext: '.m3u8',
                    overwrite: context.options.liOverwriteM3u8,
                }).startAsync(context);
                if (data.err)
                    return data.err;
                let m3u8 = FileUtils_1.default.readTxtFile(data.data);
                let m3u82;
                {
                    m3u82 = m3u8.split('\n').filter((item) => item.match(/\.m3u8/));
                    if (m3u82.length <= 0)
                        return new Error('no m3u8 found');
                    m3u82 = m3u82[0];
                }
                data = await new action_download_files_1.ActionForDownloadFileWithPuppeteer({
                    url: `${urlPrefix}/${m3u82}`,
                    saveRelativePath: `${v.local_name}/index-v1-a1-${v.wantedVideo.quality}`,
                    ext: '.m3u8',
                    overwrite: context.options.liOverwriteM3u8,
                }).startAsync(context);
                if (data.err)
                    return data.err;
                m3u82 = FileUtils_1.default.readTxtFile(data.data);
                let tss = [];
                {
                    tss = m3u82.split('\n').filter((item) => item.match(/\.ts/));
                    if (tss.length <= 0)
                        return new Error('no ts found');
                    for (let i = 0; i < tss.length; i++) {
                        tss[i] = {
                            url: `${urlPrefix}/${tss[i]}`,
                            saveRelativePath: `${v.local_name}/${tss[i].substring(0, tss[i].indexOf('.'))}`,
                            ext: '.ts',
                            overwrite: false,
                        };
                    }
                }
                data = await new action_download_files_1.ActionForDownloadFilesWithPuppeteer(1, tss, false, false, context.options.liVideoTimeout).startAsync(context);
                if (data.err)
                    return data.err;
                let allDone = true;
                let allPath = path_1.default.resolve(context.options.downloadPath, `${v.local_name}/${v.wantedVideo.local_name}.ts`);
                for (let ts of tss) {
                    ts.savePath = path_1.default.resolve(context.options.downloadPath, `${ts.saveRelativePath}${ts.ext}`);
                    if (FileUtils_1.default.isExist(ts.savePath) && FileUtils_1.default.isFile(ts.savePath)) {
                        fs_extra_1.default.appendFileSync(allPath, fs_extra_1.default.readFileSync(ts.savePath), { mode: 0o777 });
                    }
                    else {
                        allDone = false;
                        break;
                    }
                }
                if (!allDone) {
                    fs_extra_1.default.unlinkSync(allPath);
                    return new Error('media file is missing');
                }
                for (let ts of tss)
                    fs_extra_1.default.unlinkSync(ts.savePath);
                v.isDownloaded = true;
            }));
        }
    }
}
exports.default = ActionForVideo;
//# sourceMappingURL=action-download-videos.js.map