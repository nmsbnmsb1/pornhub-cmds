import path from 'path';
import fse from 'fs-extra';
import puppeteer from 'puppeteer';
import Action from 'me-actions/lib/base';
import RunQueue from 'me-actions/lib/run-queue';
import ObjectUtils from 'me-utils/lib/ObjectUtils';
import FileUtils from 'me-utils/lib/FileUtils';
import Logger from './logger';
import { IContext } from './context';
import PuppeteerUtils from './puppeteer';

export function pre(context: IContext, config: IDownloadConfig | IDownloadConfig2) {
  if ((config as any).saveRelativePath) {
    let url = encodeURI(config.url);
    let ext = config.ext;
    if (!ext) {
      ext = url.substring(url.lastIndexOf('/') + 1);
      if (ext.indexOf('.') > 0) ext = ext.substring(ext.lastIndexOf('.'));
      else ext = '';
      if (ext.indexOf('?') > 0) ext = ext.substring(0, ext.indexOf('?'));
    }
    if (ext && !ext.startsWith('.')) ext = `.${ext}`;
    ext = ext.toLowerCase();
    const savePath = path.resolve(context.options.downloadPath, `${(config as IDownloadConfig).saveRelativePath}${ext}`);
    const errPath = `${savePath}.err`;
    const tmpPath = `${savePath}.tmp`;
    return { url, savePath, errPath, tmpPath, ext, exists: !(config as IDownloadConfig).overwrite && fse.existsSync(savePath) };
  }
  //
  (config as IDownloadConfig2).exists = fse.existsSync((config as IDownloadConfig2).savePath);
  return config as IDownloadConfig2;
}

export interface IDownloadConfig {
  url: string;
  saveRelativePath: string;
  ext?: string;
  overwrite?: boolean;
}

export interface IDownloadConfig2 {
  url: string;
  savePath: string;
  errPath: string;
  ext: string;
  tmpPath: string;
  exists?: boolean;
}

//Puppeteer下载
export function parseContentRange(headersOrContentLength: number | { [name: string]: string }, contentRange?: string) {
  let cLength: number;
  let cRange: string;
  if (typeof headersOrContentLength === 'number') {
    cLength = headersOrContentLength;
    cRange = contentRange;
  } else {
    cLength = parseInt(headersOrContentLength['content-length'], 10);
    cRange = headersOrContentLength['content-range'];
  }
  if (!cLength || !cRange) return { unit: 'unknown', startPos: 0, endPos: 0, length: 0, isEnd: false };

  // Content-Type: video/webm
  // Content-Length: 500105
  // Content-Range: bytes 0-500104/500105
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

export class ActionForDownloadFileWithPuppeteer extends Action {
  private config: IDownloadConfig | IDownloadConfig2;
  private timeout: any;

  constructor(config: IDownloadConfig | IDownloadConfig2, timeout: number = 15000) {
    super();
    this.config = config;
    this.timeout = timeout;
  }

  protected async doStart(context: IContext) {
    let c: IDownloadConfig2 = pre(context, this.config);
    if (c.exists) return;

    Logger.info(`开始下载 ${c.url} ext: ${c.ext}`, context);
    const page = await PuppeteerUtils.openPage(context.browser, PuppeteerUtils.PageTypeALL);
    let data: any;
    if (c.ext === '.webm') {
      // download-webm
      data = await new Promise((resolve) => {
        const timeoutID = setTimeout(() => {
          clearTimeout(timeoutID);
          page.off('response', response);
          resolve(new Error('Timeout'));
        }, 60000);
        const response = (resp: puppeteer.Response) => {
          if (resp.headers()['content-type'] !== 'video/webm') return;
          const { isEnd } = parseContentRange(resp.headers());
          if (isEnd) {
            clearTimeout(timeoutID);
            page.off('response', response);
            resolve(resp);
          }
        };
        //
        page.on('response', response);
        page.goto(c.url);
      });
      //console.log(resp);
      if (ObjectUtils.isError(data)) {
        Logger.error(`下载出错 ${c.url}，Error ${data}`, context);
        FileUtils.writeFile(c.errPath, data.toString(), { mode: 0o777 });
      } else if (!data) {
        data = new Error('Empty');
        Logger.error(`下载出错 ${c.url}，无内容`, context);
        FileUtils.writeFile(c.errPath, 'Empty', { mode: 0o777 });
      } else {
        FileUtils.writeFile(c.savePath, await data.buffer(), { mode: 0o777 });
        if (fse.existsSync(c.errPath)) fse.removeSync(c.errPath);
        Logger.warn(`下载完成 ${c.url}，保存至 ${c.savePath}`, context);
      }
    } else if (c.ext === '.jpg' || c.ext === '.jpeg' || c.ext === '.png' || c.ext === '.gif') {
      try {
        data = await page.goto(c.url);
      } catch (e) {
        data = e;
      }
      if (ObjectUtils.isError(data)) {
        Logger.error(`下载出错 ${c.url}，Error ${data}`, context);
        FileUtils.writeFile(c.errPath, data.toString(), { mode: 0o777 });
      } else if (!data) {
        data = new Error('Empty');
        Logger.error(`下载出错 ${c.url}，无内容`, context);
        FileUtils.writeFile(c.errPath, 'Empty', { mode: 0o777 });
      } else {
        FileUtils.writeFile(c.savePath, await data.buffer(), { mode: 0o777 });
        if (fse.existsSync(c.errPath)) fse.removeSync(c.errPath);
        Logger.warn(`下载完成 ${c.url}，保存至 ${c.savePath}`, context);
      }
    } else {
      if (fse.existsSync(c.savePath)) fse.unlinkSync(c.savePath);
      //其他浏览器不支持的文件格式
      await (page as any)._client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: c.savePath });
      //会弹出下载页面
      try {
        await page.goto(c.url);
      } catch (e) {}
      //检测文件是否存在
      Logger.info(`等待下载完成 ${c.url}`, context);
      let timeoutID: any;
      data = await new Promise((resolve) => {
        let tick = Date.now();
        let lastSize = 0;
        timeoutID = setInterval(() => {
          if (!fse.existsSync(c.savePath)) {
            if (Date.now() - tick > this.timeout) {
              clearInterval(timeoutID);
              resolve(new Error(`${c.savePath} not exists`));
            }
            return;
          }
          let files = fse.readdirSync(c.savePath);
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
          //正在下载
          if (filename.endsWith('.crdownload')) {
            let stat = fse.statSync(`${c.savePath}${path.sep}${filename}`);
            //console.log(stat.size);
            if (lastSize < stat.size) {
              lastSize = stat.size;
              tick = Date.now();
            } else {
              if (Date.now() - tick > this.timeout) {
                clearInterval(timeoutID);
                resolve(new Error('Timeout'));
              }
            }
          } else {
            clearInterval(timeoutID);
            resolve(filename);
          }
        }, 500);
      });
      clearInterval(timeoutID);
      //
      if (!ObjectUtils.isString(data)) {
        Logger.error(`下载出错 ${c.url}，Error ${data}`, context);
        try {
          fse.rmdirSync(c.savePath);
        } catch (e) {}
        FileUtils.writeFile(c.errPath, data ? data.toString() : 'error', { mode: 0o777 });
      } else {
        let ts = Date.now();
        fse.renameSync(`${c.savePath}${path.sep}${data}`, `${path.dirname(c.savePath)}${ts}`);
        try {
          fse.rmdirSync(c.savePath);
        } catch (e) {}
        if (fse.existsSync(c.errPath)) fse.removeSync(c.errPath);
        fse.renameSync(`${path.dirname(c.savePath)}${ts}`, c.savePath);
        Logger.warn(`下载完成 ${c.url}，保存至 ${c.savePath}`, context);
      }
    }

    await PuppeteerUtils.closePage(page);
    return c.savePath;
  }
}

export class ActionForDownloadFilesWithPuppeteer extends RunQueue {
  private list: any;
  private timeout: number;

  constructor(
    runCount: number = 0,
    list: (IDownloadConfig | IDownloadConfig2)[],
    ignoreErr: boolean = true,
    breakWhenErr: boolean = false,
    timeout: number = 15000
  ) {
    super(runCount, 2, ignoreErr, breakWhenErr);
    this.list = list;
    this.timeout = timeout;
  }
  protected async doStart(context: IContext) {
    for (let i = 0; i < this.list.length; i++) {
      this.addChild(new ActionForDownloadFileWithPuppeteer(this.list[i], this.timeout));
    }
    return super.doStart(context);
  }
}
