"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const run_step_1 = __importDefault(require("me-actions/lib/run-step"));
const run_queue_1 = __importDefault(require("me-actions/lib/run-queue"));
const run_func_1 = __importDefault(require("me-actions/lib/run-func"));
const logger_1 = __importDefault(require("./base/logger"));
const puppeteer_1 = __importDefault(require("./base/puppeteer"));
const utils_1 = __importDefault(require("./utils"));
class ActionForList extends run_step_1.default {
    constructor(ignoreErr = false, breakWhenErr = true) {
        super();
        this.name = 'list';
        this.ignoreErr = ignoreErr;
        this.breakWhenErr = breakWhenErr;
    }
    async doStart(context) {
        this.options = context.options;
        if (!this.options.listPreview)
            this.options.listPreview = ['thumb', 'webm'];
        if (!this.options.listPageID)
            this.options.listPageID = [1, 1];
        if (!this.options.listQueue)
            this.options.listQueue = [1, 1];
        this.from = this.options.listPageID[0];
        this.to = this.options.listPageID[1];
        this.step = this.options.listQueue[0];
        this.limit = this.options.listQueue[1];
        this.onBeforeStep = async () => {
            if (this.options.listPreview.indexOf('thumb') >= 0)
                this.thumbs = new run_queue_1.default(1, 2, true, false);
            if (this.options.listPreview.indexOf('webm') >= 0)
                this.webms = new run_queue_1.default(3, 2, true, false);
        };
        this.handleFactory = (pageID) => new run_func_1.default(async () => this.doPage(context, pageID));
        this.onAfterStep = async () => {
            let all = [];
            if (this.thumbs && this.thumbs.numChildren() > 0) {
                all.push(this.thumbs.startAsync(context));
            }
            if (this.webms && this.webms.numChildren() > 0) {
                all.push(this.webms.startAsync(context));
            }
            if (all.length > 0)
                await Promise.all(all);
            this.thumbs = undefined;
            this.webms = undefined;
        };
        return super.doStart(context);
    }
    async doPage(context, pageID) {
        logger_1.default.info(`打开 ${context.options.name}-P${pageID} ${this.options.listURL}`, context);
        const page = await puppeteer_1.default.openPage(context.browser, [puppeteer_1.default.ResTypeScript], `${context.options.webURL}${this.options.listURL}${this.options.listURL.indexOf('?') >= 0 ? '&' : '?'}page=${pageID}`);
        const vs = await page.evaluate(utils_1.default.e_getVideos, this.options.listSelector.listSel);
        (context.datas[this.options.listURL] || (context.datas[this.options.listURL] = {}))[pageID] = vs;
        if (this.options.listSelector.totalPageSel) {
            const totalPageID = await page.evaluate(utils_1.default.e_totalPage, this.options.listSelector.totalPageSel);
            logger_1.default.info(`${context.options.name}-P${pageID} 总共 ${totalPageID} 页`, context);
            if (totalPageID > this.to)
                this.to = totalPageID;
        }
        await puppeteer_1.default.closePage(page);
        if (this.thumbs) {
            for (let v of vs) {
                if (!v.poster && !v.thumbs)
                    continue;
                this.thumbs.addChild(utils_1.default.getThumbsDownloadAction(v, 's'));
            }
        }
        if (this.webms) {
            for (let v of vs) {
                if (!v.webm)
                    continue;
                this.webms.addChild(utils_1.default.getWebmDownloadAction(v));
            }
        }
    }
    async doStop(context) {
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
exports.default = ActionForList;
//# sourceMappingURL=action-list.js.map