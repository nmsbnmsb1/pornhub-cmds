export interface IAttachment {
    url: string;
    local_name: string;
    ext?: string;
    quality: string;
    format: string;
    direct?: boolean;
}
export interface IVideo {
    serial_id: string;
    url: string;
    title: string;
    local_name: string;
    duration: string;
    hd: number;
    vr: number;
    promo: string;
    thumbs: {
        length: number;
        url: string;
    };
    s_thumbs: IAttachment[];
    b_thumbs: IAttachment[];
    webm: IAttachment;
    videos: IAttachment[];
    wantedVideo: IAttachment;
    isDownloaded: boolean;
}
declare const _default: {
    e_list(listSel: string, totalPageSel: string, matchIDs?: string[]): {
        vs: IVideo[];
        totalPageID: number;
    };
    e_detail(v?: IVideo): IVideo;
};
export default _default;
