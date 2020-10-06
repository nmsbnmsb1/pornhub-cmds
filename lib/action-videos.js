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
        if (!this.options.videoPreviews)
            this.options.videoPreviews = ['thumb'];
        if (!this.options.videoQueue)
            this.options.videoQueue = [1, 0];
        this.step = this.options.videoQueue[0];
        this.limit = this.options.videoQueue[1];
        this.from = 0;
        this.to = this.options.videoSerialID.length - 1;
        this.onBeforeStep = async () => {
            this.storedData = [];
            if (this.options.videoPreviews.indexOf('thumb') >= 0)
                this.thumbs = new run_queue_1.default(4, 2, true, false);
        };
        this.handleFactory = (i) => new run_func_1.default(() => this.doVideo(context, i, this.options.videoSerialID[i]));
        this.onAfterStep = async (range) => {
            if (this.thumbs)
                await this.thumbs.startAsync(context);
            this.thumbs = undefined;
            if (this.options.videoStore)
                await this.options.videoStore('step', context, -1, this.storedData, range);
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
        if (v.promo === 'unavaliable' || v.promo === 'premium') {
        }
        else {
            if (v.thumbs) {
                for (let t of v.b_thumbs) {
                    this.thumbs.addChild(new action_download_files_1.ActionForDownloadFileWithPuppeteer({ url: t.url, saveRelativePath: `${v.local_name}/${t.local_name}`, ext: t.ext }, 60000));
                }
            }
        }
        await puppeteer_1.default.closePage(page);
        if (this.options.videoStore) {
            await this.options.videoStore('video', context, index, v);
        }
        this.storedData.push(v);
    }
    async doStop(context) {
        super.doStop(context);
        if (this.thumbs) {
            this.thumbs.stop(context);
            this.thumbs = undefined;
        }
    }
}
exports.default = ActionForVideo;
//# sourceMappingURL=action-videos.js.map