import RunStep from 'me-actions/lib/run-step';
import { IContext, IOptions } from './base/context';
import { IVideo } from './utils';
export interface IVideoOptions extends IOptions {
    videoSerialID: string[];
    videoQueue: number[];
    videoPreviews?: 'thumb'[];
    videoStore?: (time: 'video' | 'step', context: any, index?: number, v?: IVideo | IVideo[], range?: {
        from: number;
        to: number;
    }) => Promise<any>;
}
export default class ActionForVideo extends RunStep {
    private options;
    private thumbs;
    private storedData;
    constructor(ignoreErr?: boolean, breakWhenErr?: boolean);
    protected doStart(context: IContext): Promise<void>;
    protected doVideo(context: IContext, index: number, serialID: string): Promise<void>;
    protected doStop(context: IContext): Promise<void>;
}
