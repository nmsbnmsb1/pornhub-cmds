import RunStep from 'me-actions/lib/run-step';
import { IContext, IOptions } from './base/context';
import { IVideo } from './utils';
export interface IListOptions extends IOptions {
    listURL: string;
    listPageID?: number[];
    listQueue?: number[];
    listPreviews?: string[];
    listStore?: (time: 'list' | 'step', context: any, pageID?: number, vs?: IVideo[], range?: {
        from: number;
        to: number;
    }) => Promise<any>;
}
export default class ActionForList extends RunStep {
    private options;
    private listSel;
    private totalPageSel;
    private storedData;
    private thumbs;
    private webms;
    constructor(listSel: string, totalPageSel: string, ignoreErr?: boolean, breakWhenErr?: boolean);
    protected doStart(context: IContext): Promise<void>;
    private doPage;
    protected doStop(context: IContext): Promise<void>;
}
