import RunStep from 'me-actions/lib/run-step';
import { IContext, IOptions } from './base/context';
export interface IListOptions extends IOptions {
    listURL: string;
    listSelector: {
        listSel: string;
        totalPageSel?: string;
    };
    listPageID?: number[];
    listQueue?: number[];
    listPreview?: ('thumb' | 'webm')[];
}
export default class ActionForList extends RunStep {
    private options;
    private thumbs;
    private webms;
    constructor(ignoreErr?: boolean, breakWhenErr?: boolean);
    protected doStart(context: IContext): Promise<void>;
    private doPage;
    protected doStop(context: IContext): Promise<void>;
}
