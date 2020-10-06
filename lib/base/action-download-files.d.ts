import Action from 'me-actions/lib/base';
import RunQueue from 'me-actions/lib/run-queue';
import { IContext } from './context';
export declare function pre(context: IContext, config: IDownloadConfig | IDownloadConfig2): IDownloadConfig2;
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
export declare function parseContentRange(headersOrContentLength: number | {
    [name: string]: string;
}, contentRange?: string): {
    unit: string;
    startPos: number;
    endPos: number;
    length: number;
    isEnd: boolean;
};
export declare class ActionForDownloadFileWithPuppeteer extends Action {
    private config;
    private timeout;
    constructor(config: IDownloadConfig | IDownloadConfig2, timeout?: number);
    protected doStart(context: IContext): Promise<string>;
}
export declare class ActionForDownloadFilesWithPuppeteer extends RunQueue {
    private list;
    private timeout;
    constructor(runCount: number, list: (IDownloadConfig | IDownloadConfig2)[], ignoreErr?: boolean, breakWhenErr?: boolean, timeout?: number);
    protected doStart(context: IContext): Promise<unknown>;
}
