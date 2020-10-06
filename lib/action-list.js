"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const run_step_1 = __importDefault(require("me-actions/lib/run-step"));
const run_queue_1 = __importDefault(require("me-actions/lib/run-queue"));
const run_func_1 = __importDefault(require("me-actions/lib/run-func"));
const ObjectUtils_1 = __importDefault(require("me-utils/lib/ObjectUtils"));
const logger_1 = __importDefault(require("./base/logger"));
const puppeteer_1 = __importDefault(require("./base/puppeteer"));
const action_download_files_1 = require("./base/action-download-files");
const utils_1 = __importDefault(require("./utils"));
class ActionForList extends run_step_1.default {
    constructor(listSel, totalPageSel, ignoreErr = false, breakWhenErr = true) {
        super();
        this.name = 'list';
        this.ignoreErr = ignoreErr;
        this.breakWhenErr = breakWhenErr;
        this.listSel = listSel;
        this.totalPageSel = totalPageSel;
    }
    async doStart(context) {
        this.options = context.options;
        if (!this.options.listPageID)
            this.options.listPageID = [1, 1];
        if (!this.options.listQueue)
            this.options.listQueue = [1, 1];
        if (ObjectUtils_1.default.isEmpty(this.options.listPreviews))
            this.options.listPreviews = [];
        this.from = this.options.listPageID[0];
        this.to = this.options.listPageID[1];
        this.step = this.options.listQueue[0];
        this.limit = this.options.listQueue[1];
        this.onBeforeStep = async () => {
            this.storedData = [];
            if (this.options.listPreviews.indexOf('thumb') >= 0)
                this.thumbs = new run_queue_1.default(4, 2, true, false);
            if (this.options.listPreviews.indexOf('webm') >= 0)
                this.webms = new run_queue_1.default(1, 2, true, false);
        };
        this.handleFactory = (pageID) => new run_func_1.default(async () => this.doPage(context, pageID));
        this.onAfterStep = async (range) => {
            let all = [];
            if (this.thumbs && this.thumbs.numChildren() > 0)
                all.push(this.thumbs.startAsync(context));
            if (this.webms && this.webms.numChildren() > 0)
                all.push(this.webms.startAsync(context));
            if (all.length > 0)
                await Promise.all(all);
            this.thumbs = undefined;
            this.webms = undefined;
            if (this.options.listStore)
                await this.options.listStore('step', context, -1, this.storedData, range);
        };
        return super.doStart(context);
    }
    async doPage(context, pageID) {
        logger_1.default.info(`打开 P${pageID} ${this.options.listURL}`, context);
        const page = await puppeteer_1.default.openPage(context.browser, [puppeteer_1.default.ResTypeScript], `${context.options.webURL}${this.options.listURL}${this.options.listURL.indexOf('?') >= 0 ? '&' : '?'}page=${pageID}`, true);
        let { vs, totalPageID } = await page.evaluate(utils_1.default.e_list, this.listSel, this.totalPageSel);
        await puppeteer_1.default.closePage(page);
        if (totalPageID > this.to) {
            logger_1.default.info(`总共 ${totalPageID} 页`, context);
            this.to = totalPageID;
        }
        if (this.options.listStore) {
            await this.options.listStore('list', context, pageID, vs);
        }
        this.storedData.push(...vs);
        if (this.thumbs) {
            for (let v of vs) {
                for (let t of v.s_thumbs) {
                    this.thumbs.addChild(new action_download_files_1.ActionForDownloadFileWithPuppeteer({ url: t.url, saveRelativePath: `${v.local_name}/${t.local_name}`, ext: t.ext }, 60000));
                }
            }
        }
        if (this.webms) {
            for (let v of vs) {
                if (!v.webm)
                    continue;
                this.webms.addChild(new action_download_files_1.ActionForDownloadFileWithPuppeteer({ url: v.webm.url, saveRelativePath: `${v.local_name}/${v.webm.local_name}`, ext: v.webm.ext }, 60000));
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