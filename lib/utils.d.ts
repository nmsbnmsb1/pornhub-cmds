import { ActionForDownloadFile, ActionForDownloadFiles } from './base/action-download-files';
export interface IVideo {
    serial_id: string;
    url: string;
    title: string;
    local_name: string;
    poster: string;
    thumbs: {
        length: number;
        url: string;
    };
    webm: string;
    video: {
        quality: number;
        format: string;
        videoUrl: string;
    }[];
    free: number;
    pay: string;
    premium: number;
    promo: string;
}
declare const _default: {
    e_getVideos(sel: string): IVideo[];
    e_totalPage(sel: string): number;
    e_getVideoDetail(v?: IVideo): IVideo;
    e_getVideoVideos(promo: "free" | "pay"): any;
    getThumbsDownloadAction(v: IVideo, size: string): ActionForDownloadFiles;
    getWebmDownloadAction(v: IVideo): ActionForDownloadFile;
};
export default _default;
