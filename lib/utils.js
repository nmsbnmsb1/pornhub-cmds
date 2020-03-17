"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const action_download_files_1 = require("./base/action-download-files");
exports.default = {
    e_getVideos(sel) {
        const vs = [];
        const lis = document.querySelectorAll(sel);
        for (const li of lis) {
            if (!li.getAttribute('data-id'))
                continue;
            const imgDiv = li.querySelector("div[class='phimage']");
            const a = imgDiv.querySelector('a');
            const img = a.querySelector('img');
            const url = a.getAttribute('href');
            const titleDiv = li.querySelector("div[class*='thumbnail-info-wrapper']");
            const v = {};
            v.serial_id = li.getAttribute('_vkey');
            v.url = url;
            if (v.url.startsWith('javascript:'))
                v.url = `/view_video.php?viewkey=${v.serial_id}`;
            v.title = titleDiv.querySelector("span[class='title'] a").innerText;
            v.local_name = `[${v.serial_id}] ${v.title}`
                .replace(/[\r\n]/g, '')
                .replace(/\s+/g, ' ')
                .replace(/:/g, '：')
                .replace(/\//g, '_')
                .trim();
            v.poster = img.getAttribute('data-thumb_url');
            v.thumbs = { length: parseInt(img.getAttribute('data-thumbs'), 10), url: img.getAttribute('data-path') };
            v.webm = img.getAttribute('data-mediabook');
            if (titleDiv.querySelector("span[class='price']"))
                v.pay = titleDiv.querySelector("span[class='price']").innerText;
            v.premium = imgDiv.querySelector("i[class*='premiumIcon']") ? 1 : 0;
            v.free = v.pay || v.premium ? 0 : 1;
            for (let k in v) {
                if (typeof v[k] === 'string' && v[k])
                    v[k] = v[k]
                        .replace(/[\r\n]/g, '')
                        .replace(/\s+/g, ' ')
                        .trim();
            }
            vs.push(v);
        }
        return vs;
    },
    e_totalPage(sel) {
        let endPage = -1;
        const pagelis = document.querySelectorAll(sel);
        for (const li of pagelis) {
            let p = -1;
            const a = li.querySelector('a') || li;
            p = parseInt(a.innerText
                .replace(/[\r\n]/g, '')
                .replace(/\s+/g, ' ')
                .trim(), 10);
            if (!isNaN(p) && p > endPage) {
                endPage = p;
            }
        }
        return endPage;
    },
    e_getVideoDetail(v) {
        if (!v)
            v = {};
        if (!v.url)
            v.url = document.head.querySelector("meta[property='og:url']").getAttribute('content');
        if (!v.serial_id)
            v.serial_id = v.url.substring(v.url.lastIndexOf('=') + 1);
        v.promo = 'free';
        v.free = 1;
        v.pay = '0';
        v.premium = 0;
        if (document.querySelector("div[class='wrapper'] div[class='geoBlocked']")) {
            v.promo = 'unavaliable';
            v.free = 0;
            v.pay = '0';
            v.premium = 0;
        }
        else if (document.querySelector("div[class='premiumLockedPartners']")) {
            v.promo = 'premium';
            v.free = 0;
            v.pay = '0';
            v.premium = 1;
        }
        else if (document.querySelector("div[id='vpContentContainer'] button[class*='orangeButton purchaseButton']")) {
            v.promo = 'pay';
            v.free = 0;
            v.pay = document.querySelector("div[id='vpContentContainer'] button[class*='orangeButton purchaseButton']").innerText;
            v.premium = 0;
        }
        if (v.promo === 'unavaliable')
            return v;
        v.title = document.head.querySelector("meta[property='og:title']").getAttribute('content');
        v.local_name = `[${v.serial_id}] ${v.title}`
            .replace(/[\r\n]/g, '')
            .replace(/\s+/g, ' ')
            .replace(/:/g, '：')
            .replace(/\//g, '_')
            .trim();
        v.poster = document.head.querySelector("meta[property='og:image']").getAttribute('content');
        try {
            v.thumbs = {
                length: 16,
                url: `${v.poster.substring(0, v.poster.lastIndexOf(')') + 1)}{index}${v.poster.substring(v.poster.lastIndexOf('.'))}`,
            };
        }
        catch (e) { }
        return v;
    },
    e_getVideoVideos(promo) {
        let m = [];
        if (promo === 'pay') {
            m.push({
                format: 'mp4',
                quality: 1080,
                videoUrl: document.querySelector("div[id='vpContentContainer'] div[id='js-player'] video").getAttribute('src'),
            });
            return m;
        }
        if (!document.querySelector("div[id='vpContentContainer'] div[class='video-actions-menu'] div[class='tab-menu-wrapper-row'] div[data-tab='vr-tab'")) {
            let downTab = document.querySelector("div[id='vpContentContainer'] div[class='video-actions-container'] div[class*='download-tab']");
            if (downTab) {
                let as = downTab.querySelectorAll('a');
                if (as && as.length > 0 && !downTab.querySelector("div[class='notLoggedIn']")) {
                    for (let a of as) {
                        let quality = parseInt(a.innerText
                            .replace(/[\r\n]/g, '')
                            .replace(/\s+/g, ' ')
                            .replace('p', '')
                            .replace('高清', '')
                            .trim(), 10);
                        if (!isNaN(quality))
                            m.push({ format: 'mp4', quality, videoUrl: a.getAttribute('href') });
                    }
                    return m;
                }
            }
        }
        else {
            let vrDownTab = document.querySelector("div[id='vpContentContainer'] div[class='video-actions-container'] div[class*='vr-tab']");
            if (vrDownTab) {
                let a = vrDownTab.querySelector("li[class*='vr1']").querySelector('a');
                m.push({ format: 'mp4', quality: '1080', videoUrl: a.getAttribute('href'), direct: true });
                return m;
            }
        }
        m = this[`flashvars_${document.querySelector("div[id='vpContentContainer'] div[id='player']").getAttribute('data-video-id')}`].mediaDefinitions;
        return m;
    },
    getThumbsDownloadAction(v, size) {
        let list = [];
        if (v.poster) {
            list.push({ url: v.poster, saveRelativePath: `${v.local_name}/${size}.poster` });
        }
        if (v.thumbs) {
            for (let i = 1; i <= v.thumbs.length; i++) {
                list.push({ url: v.thumbs.url.replace('{index}', `${i}`), saveRelativePath: `${v.local_name}/${size}.thumb_${i <= 9 ? `0${i}` : i}` });
            }
        }
        return new action_download_files_1.ActionForDownloadFiles(5, list);
    },
    getWebmDownloadAction(v) {
        return new action_download_files_1.ActionForDownloadFile({ url: v.webm, saveRelativePath: `${v.local_name}/preview`, ext: '.webm' });
    },
};
//# sourceMappingURL=utils.js.map