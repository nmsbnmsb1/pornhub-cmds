import Action from 'me-actions/lib/base';
import RunQueue from 'me-actions/lib/run-queue';
import { IContext } from './context';
export declare function pre(context: IContext, url: string, saveRelativePath: string, ext?: string, overwrite?: boolean): {
    url: string;
    savePath: string;
    errPath: string;
    tmpPath: string;
    ext: string;
};
export declare class ActionForDownloadFile extends Action {
    private config;
    private showProgress;
    private timeout;
    constructor(config: {
        url: string;
        saveRelativePath: string;
        ext?: string;
        overwrite?: boolean;
    } | {
        url: string;
        savePath: string;
        errPath: string;
        ext: string;
        tmpPath: string;
    }, showProgress?: boolean, timeout?: number);
    protected doStart(context: IContext): Promise<unknown>;
}
export declare class ActionForDownloadFiles extends RunQueue {
    private list;
    private showProgress;
    private timeout;
    constructor(runCount: number, list: ({
        url: string;
        saveRelativePath: string;
        ext?: string;
        overwrite?: boolean;
    } | {
        url: string;
        savePath: string;
        errPath: string;
        ext: string;
        tmpPath: string;
    })[], ignoreErr?: boolean, breakWhenErr?: boolean, showProgress?: boolean, timeout?: number);
    protected doStart(context: IContext): Promise<unknown>;
}
