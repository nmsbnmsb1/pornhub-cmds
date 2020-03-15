import path from 'path';
import http from 'http';
import https from 'https';
import fse from 'fs-extra';
import ProgressBar from 'progress';
import Action from 'me-actions/lib/base';
import RunQueue from 'me-actions/lib/run-queue';
import FileUtils from 'me-utils/lib/FileUtils';
import Logger from './logger';
import { IContext } from './context';

export function pre(context: IContext, url: string, saveRelativePath: string, ext?: string, overwrite: boolean = false) {
  if (!ext) {
    ext = url.substring(url.lastIndexOf('.'));
    if (ext.indexOf('?') > 0) ext = ext.substring(0, ext.indexOf('?'));
  }
  if (!ext.startsWith('.')) ext = `.${ext}`;
  const savePath = path.resolve(context.options.downloadPath, `${saveRelativePath}${ext}`);
  if (!overwrite && fse.existsSync(savePath)) return;

  const errPath = `${savePath}.err`;
  const tmpPath = `${savePath}.tmp`;
  return { url, savePath, errPath, tmpPath, ext };
}

export class ActionForDownloadFile extends Action {
  private config: any;
  private showProgress: boolean;
  private timeout: number;

  constructor(
    config:
      | { url: string; saveRelativePath: string; ext?: string; overwrite?: boolean }
      | { url: string; savePath: string; errPath: string; ext: string; tmpPath: string },
    showProgress: boolean = false,
    timeout: number = 30000
  ) {
    super();
    this.config = config;
    this.showProgress = showProgress;
    this.timeout = timeout;
  }
  protected async doStart(context: IContext) {
    let c: { url: string; savePath: string; errPath: string; ext: string; tmpPath: string };
    if ((this.config as any).saveRelativePath) {
      c = pre(context, this.config.url, (this.config as any).saveRelativePath, this.config.ext, (this.config as any).overwrite);
    } else {
      c = this.config as any;
    }
    if (!c) return;

    //
    Logger.info(`开始下载 ${c.url}`, context);
    //
    FileUtils.mkdir(path.dirname(c.savePath), '0777');
    const ws = fse.createWriteStream(c.tmpPath);
    await new Promise((resolve) => ws.on('open', resolve));
    //
    let data = await new Promise((resolve) => {
      const clientReq = (c.url.slice(0, 5) === 'https' ? https : http).request(c.url, {}, (res) => {
        const totalLength = parseInt(res.headers['content-length'], 10);
        let bar: ProgressBar;
        if (this.showProgress) {
          let name = c.url.substring(c.url.lastIndexOf('/') + 1);
          if (name.indexOf('?') > 0) name = name.substring(0, name.indexOf('?'));
          bar = new ProgressBar(`downloading ${name} [:bar] :current/:total :percent :rate/bps :elapsed`, {
            complete: '=',
            incomplete: '-',
            width: 40,
            total: totalLength,
          });
        }
        res.on('data', (chunk) => {
          ws.write(chunk);
          if (bar) bar.tick(chunk.length);
        });
        res.on('end', () => {
          ws.end(() => {
            fse.renameSync(c.tmpPath, c.savePath);
            Logger.info(`下载完成 ${c.url}，保存至 ${c.savePath}`, context);
            resolve();
          });
        });
      });
      clientReq.on('error', (e) => {
        Logger.error(`下载出错 ${c.url}，${e.message}`, context);
        clientReq.abort();
        resolve(e);
      });
      clientReq.setTimeout(this.timeout, () => {
        Logger.error(`下载超时 ${c.url}`, context);
        clientReq.abort();
        resolve(new Error('Timeout'));
      });
      clientReq.end();
    });
    //
    return data;
  }
}

export class ActionForDownloadFiles extends RunQueue {
  private list: any;
  private showProgress: boolean;
  private timeout: number;

  constructor(
    runCount: number = 0,
    list: (
      | { url: string; saveRelativePath: string; ext?: string; overwrite?: boolean }
      | { url: string; savePath: string; errPath: string; ext: string; tmpPath: string }
    )[],
    ignoreErr: boolean = false,
    breakWhenErr: boolean = false,
    showProgress: boolean = false,
    timeout: number = 30000
  ) {
    super(runCount, 2, ignoreErr, breakWhenErr);
    //
    this.list = list;
    this.showProgress = showProgress;
    this.timeout = timeout;
  }
  protected async doStart(context: IContext) {
    for (let config of this.list) {
      this.addChild(new ActionForDownloadFile(config, this.showProgress, this.timeout));
    }
    return super.doStart(context);
  }
}
