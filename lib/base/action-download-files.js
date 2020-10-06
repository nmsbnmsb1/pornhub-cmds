"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionForDownloadFilesWithPuppeteer = exports.ActionForDownloadFileWithPuppeteer = exports.parseContentRange = exports.pre = void 0;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const base_1 = __importDefault(require("me-actions/lib/base"));
const run_queue_1 = __importDefault(require("me-actions/lib/run-queue"));
const ObjectUtils_1 = __importDefault(require("me-utils/lib/ObjectUtils"));
const FileUtils_1 = __importDefault(require("me-utils/lib/FileUtils"));
const logger_1 = __importDefault(require("./logger"));
const puppeteer_1 = __importDefault(require("./puppeteer"));
function pre(context, config) {
    if (config.saveRelativePath) {
        let url = encodeURI(config.url);
        let ext = config.ext;
        if (!ext) {
            ext = url.substring(url.lastIndexOf('/') + 1);
            if (ext.indexOf('.') > 0)
                ext = ext.substring(ext.lastIndexOf('.'));
            else
                ext = '';
            if (ext.indexOf('?') > 0)
                ext = ext.substring(0, ext.indexOf('?'));
        }
        if (ext && !ext.startsWith('.'))
            ext = `.${ext}`;
        ext = ext.toLowerCase();
        const savePath = path_1.default.resolve(context.options.downloadPath, `${config.saveRelativePath}${ext}`);
        const errPath = `${savePath}.err`;
        const tmpPath = `${savePath}.tmp`;
        return { url, savePath, errPath, tmpPath, ext, exists: !config.overwrite && fs_extra_1.default.existsSync(savePath) };
    }
    config.exists = fs_extra_1.default.existsSync(config.savePath);
    return config;
}
exports.pre = pre;
function parseContentRange(headersOrContentLength, contentRange) {
    let cLength;
    let cRange;
    if (typeof headersOrContentLength === 'number') {
        cLength = headersOrContentLength;
        cRange = contentRange;
    }
    else {
        cLength = parseInt(headersOrContentLength['content-length'], 10);
        cRange = headersOrContentLength['content-range'];
    }
    if (!cLength || !cRange)
        return { unit: 'unknown', startPos: 0, endPos: 0, length: 0, isEnd: false };
    let start = 0;
    let end = cRange.indexOf(' ');
    const unit = cRange.substring(start, end);
    start = end + 1;
    end = cRange.indexOf('-');
    const startPos = parseInt(cRange.substring(start, end), 10);
    start = end + 1;
    end = cRange.indexOf('/');
    const endPos = parseInt(cRange.substring(start, end), 10);
    start = end + 1;
    const length = parseInt(cRange.substring(start), 10);
    return { unit, startPos, endPos, length, isEnd: length === cLength && endPos + 1 === length };
}
exports.parseContentRange = parseContentRange;
class ActionForDownloadFileWithPuppeteer extends base_1.default {
    constructor(config, timeout = 15000) {
        super();
        this.config = config;
        this.timeout = timeout;
    }
    async doStart(context) {
        let c = pre(context, this.config);
        if (c.exists)
            return;
        logger_1.default.info(`开始下载 ${c.url} ext: ${c.ext}`, context);
        const page = await puppeteer_1.default.openPage(context.browser, puppeteer_1.default.PageTypeALL);
        let data;
        if (c.ext === '.webm') {
            data = await new Promise((resolve) => {
                const timeoutID = setTimeout(() => {
                    clearTimeout(timeoutID);
                    page.off('response', response);
                    resolve(new Error('Timeout'));
                }, 60000);
                const response = (resp) => {
                    if (resp.headers()['content-type'] !== 'video/webm')
                        return;
                    const { isEnd } = parseContentRange(resp.headers());
                    if (isEnd) {
                        clearTimeout(timeoutID);
                        page.off('response', response);
                        resolve(resp);
                    }
                };
                page.on('response', response);
                page.goto(c.url);
            });
            if (ObjectUtils_1.default.isError(data)) {
                logger_1.default.error(`下载出错 ${c.url}，Error ${data}`, context);
                FileUtils_1.default.writeFile(c.errPath, data.toString(), { mode: 0o777 });
            }
            else if (!data) {
                data = new Error('Empty');
                logger_1.default.error(`下载出错 ${c.url}，无内容`, context);
                FileUtils_1.default.writeFile(c.errPath, 'Empty', { mode: 0o777 });
            }
            else {
                FileUtils_1.default.writeFile(c.savePath, await data.buffer(), { mode: 0o777 });
                if (fs_extra_1.default.existsSync(c.errPath))
                    fs_extra_1.default.removeSync(c.errPath);
                logger_1.default.warn(`下载完成 ${c.url}，保存至 ${c.savePath}`, context);
            }
        }
        else if (c.ext === '.jpg' || c.ext === '.jpeg' || c.ext === '.png' || c.ext === '.gif') {
            try {
                data = await page.goto(c.url);
            }
            catch (e) {
                data = e;
            }
            if (ObjectUtils_1.default.isError(data)) {
                logger_1.default.error(`下载出错 ${c.url}，Error ${data}`, context);
                FileUtils_1.default.writeFile(c.errPath, data.toString(), { mode: 0o777 });
            }
            else if (!data) {
                data = new Error('Empty');
                logger_1.default.error(`下载出错 ${c.url}，无内容`, context);
                FileUtils_1.default.writeFile(c.errPath, 'Empty', { mode: 0o777 });
            }
            else {
                FileUtils_1.default.writeFile(c.savePath, await data.buffer(), { mode: 0o777 });
                if (fs_extra_1.default.existsSync(c.errPath))
                    fs_extra_1.default.removeSync(c.errPath);
                logger_1.default.warn(`下载完成 ${c.url}，保存至 ${c.savePath}`, context);
            }
        }
        else {
            if (fs_extra_1.default.existsSync(c.savePath))
                fs_extra_1.default.unlinkSync(c.savePath);
            await page._client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: c.savePath });
            try {
                await page.goto(c.url);
            }
            catch (e) { }
            logger_1.default.info(`等待下载完成 ${c.url}`, context);
            let timeoutID;
            data = await new Promise((resolve) => {
                let tick = Date.now();
                let lastSize = 0;
                timeoutID = setInterval(() => {
                    if (!fs_extra_1.default.existsSync(c.savePath)) {
                        if (Date.now() - tick > this.timeout) {
                            clearInterval(timeoutID);
                            resolve(new Error(`${c.savePath} not exists`));
                        }
                        return;
                    }
                    let files = fs_extra_1.default.readdirSync(c.savePath);
                    if (files.length <= 0) {
                        if (Date.now() - tick > this.timeout) {
                            clearInterval(timeoutID);
                            resolve(new Error(`${c.savePath} no files`));
                        }
                        return;
                    }
                    let filename = files[0];
                    if (!filename) {
                        if (Date.now() - tick > this.timeout) {
                            clearInterval(timeoutID);
                            resolve(new Error(`${c.savePath} no filename`));
                        }
                        return;
                    }
                    if (filename.endsWith('.crdownload')) {
                        let stat = fs_extra_1.default.statSync(`${c.savePath}${path_1.default.sep}${filename}`);
                        if (lastSize < stat.size) {
                            lastSize = stat.size;
                            tick = Date.now();
                        }
                        else {
                            if (Date.now() - tick > this.timeout) {
                                clearInterval(timeoutID);
                                resolve(new Error('Timeout'));
                            }
                        }
                    }
                    else {
                        clearInterval(timeoutID);
                        resolve(filename);
                    }
                }, 500);
            });
            clearInterval(timeoutID);
            if (!ObjectUtils_1.default.isString(data)) {
                logger_1.default.error(`下载出错 ${c.url}，Error ${data}`, context);
                try {
                    fs_extra_1.default.rmdirSync(c.savePath);
                }
                catch (e) { }
                FileUtils_1.default.writeFile(c.errPath, data ? data.toString() : 'error', { mode: 0o777 });
            }
            else {
                let ts = Date.now();
                fs_extra_1.default.renameSync(`${c.savePath}${path_1.default.sep}${data}`, `${path_1.default.dirname(c.savePath)}${ts}`);
                try {
                    fs_extra_1.default.rmdirSync(c.savePath);
                }
                catch (e) { }
                if (fs_extra_1.default.existsSync(c.errPath))
                    fs_extra_1.default.removeSync(c.errPath);
                fs_extra_1.default.renameSync(`${path_1.default.dirname(c.savePath)}${ts}`, c.savePath);
                logger_1.default.warn(`下载完成 ${c.url}，保存至 ${c.savePath}`, context);
            }
        }
        await puppeteer_1.default.closePage(page);
        return c.savePath;
    }
}
exports.ActionForDownloadFileWithPuppeteer = ActionForDownloadFileWithPuppeteer;
class ActionForDownloadFilesWithPuppeteer extends run_queue_1.default {
    constructor(runCount = 0, list, ignoreErr = true, breakWhenErr = false, timeout = 15000) {
        super(runCount, 2, ignoreErr, breakWhenErr);
        this.list = list;
        this.timeout = timeout;
    }
    async doStart(context) {
        for (let i = 0; i < this.list.length; i++) {
            this.addChild(new ActionForDownloadFileWithPuppeteer(this.list[i], this.timeout));
        }
        return super.doStart(context);
    }
}
exports.ActionForDownloadFilesWithPuppeteer = ActionForDownloadFilesWithPuppeteer;
//# sourceMappingURL=action-download-files.js.map