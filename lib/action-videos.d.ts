import RunStep from 'me-actions/lib/run-step';
import { IContext, IOptions } from './base/context';
export interface IVideosOptions extends IOptions {
    videosSerialID: string[];
    videosQueue: number[];
    videosPreview?: 'thumb'[];
    videosRecommend?: boolean;
    videosRecommendPreview?: ('thumb' | 'webm')[];
    videosVideo?: boolean | {
        quality: number;
        format: string;
    };
}
export default class ActionForVideo extends RunStep {
    private options;
    private thumbs;
    private webms;
    private videos;
    constructor(ignoreErr?: boolean, breakWhenErr?: boolean);
    protected doStart(context: IContext): Promise<void>;
    protected doVideo(context: IContext, serialID: string): Promise<void>;
    protected doStop(context: IContext): Promise<void>;
}
