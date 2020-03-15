"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const progress_1 = __importDefault(require("progress"));
const base_1 = __importDefault(require("me-actions/lib/base"));
const run_queue_1 = __importDefault(require("me-actions/lib/run-queue"));
const FileUtils_1 = __importDefault(require("me-utils/lib/FileUtils"));
const logger_1 = __importDefault(require("./logger"));
function pre(context, url, saveRelativePath, ext, overwrite = false) {
    if (!ext) {
        ext = url.substring(url.lastIndexOf('.'));
        if (ext.indexOf('?') > 0)
            ext = ext.substring(0, ext.indexOf('?'));
    }
    if (!ext.startsWith('.'))
        ext = `.${ext}`;
    const savePath = path_1.default.resolve(context.options.downloadPath, `${saveRelativePath}${ext}`);
    if (!overwrite && fs_extra_1.default.existsSync(savePath))
        return;
    const errPath = `${savePath}.err`;
    const tmpPath = `${savePath}.tmp`;
    return { url, savePath, errPath, tmpPath, ext };
}
exports.pre = pre;
class ActionForDownloadFile extends base_1.default {
    constructor(config, showProgress = false, timeout = 30000) {
        super();
        this.config = config;
        this.showProgress = showProgress;
        this.timeout = timeout;
    }
    async doStart(context) {
        let c;
        if (this.config.saveRelativePath) {
            c = pre(context, this.config.url, this.config.saveRelativePath, this.config.ext, this.config.overwrite);
        }
        else {
            c = this.config;
        }
        if (!c)
            return;
        logger_1.default.info(`开始下载 ${c.url}`, context);
        FileUtils_1.default.mkdir(path_1.default.dirname(c.savePath), '0777');
        const ws = fs_extra_1.default.createWriteStream(c.tmpPath);
        await new Promise((resolve) => ws.on('open', resolve));
        let data = await new Promise((resolve) => {
            const clientReq = (c.url.slice(0, 5) === 'https' ? https_1.default : http_1.default).request(c.url, {}, (res) => {
                const totalLength = parseInt(res.headers['content-length'], 10);
                let bar;
                if (this.showProgress) {
                    let name = c.url.substring(c.url.lastIndexOf('/') + 1);
                    if (name.indexOf('?') > 0)
                        name = name.substring(0, name.indexOf('?'));
                    bar = new progress_1.default(`downloading ${name} [:bar] :current/:total :percent :rate/bps :elapsed`, {
                        complete: '=',
                        incomplete: '-',
                        width: 40,
                        total: totalLength,
                    });
                }
                res.on('data', (chunk) => {
                    ws.write(chunk);
                    if (bar)
                        bar.tick(chunk.length);
                });
                res.on('end', () => {
                    ws.end(() => {
                        fs_extra_1.default.renameSync(c.tmpPath, c.savePath);
                        logger_1.default.info(`下载完成 ${c.url}，保存至 ${c.savePath}`, context);
                        resolve();
                    });
                });
            });
            clientReq.on('error', (e) => {
                logger_1.default.error(`下载出错 ${c.url}，${e.message}`, context);
                clientReq.abort();
                resolve(e);
            });
            clientReq.setTimeout(this.timeout, () => {
                logger_1.default.error(`下载超时 ${c.url}`, context);
                clientReq.abort();
                resolve(new Error('Timeout'));
            });
            clientReq.end();
        });
        return data;
    }
}
exports.ActionForDownloadFile = ActionForDownloadFile;
class ActionForDownloadFiles extends run_queue_1.default {
    constructor(runCount = 0, list, ignoreErr = false, breakWhenErr = false, showProgress = false, timeout = 30000) {
        super(runCount, 2, ignoreErr, breakWhenErr);
        this.list = list;
        this.showProgress = showProgress;
        this.timeout = timeout;
    }
    async doStart(context) {
        for (let config of this.list) {
            this.addChild(new ActionForDownloadFile(config, this.showProgress, this.timeout));
        }
        return super.doStart(context);
    }
}
exports.ActionForDownloadFiles = ActionForDownloadFiles;
//# sourceMappingURL=action-download-files.js.map