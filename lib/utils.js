"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    e_list(listSel, totalPageSel, matchIDs) {
        let vs = [];
        {
            const divs = document.querySelectorAll(listSel);
            for (const div of divs) {
                if (!div.getAttribute('data-id'))
                    continue;
                if (matchIDs && matchIDs.indexOf(div.getAttribute('_vkey')) < 0)
                    continue;
                const v = {};
                vs.push(v);
                const imgDiv = div.querySelector("div[class='phimage']");
                const a = imgDiv.querySelector('a');
                const img = a.querySelector('img');
                const url = a.getAttribute('href');
                const titleDiv = div.querySelector("div[class*='thumbnail-info-wrapper']");
                v.serial_id = div.getAttribute('_vkey');
                v.url = url;
                if (v.url.startsWith('javascript:'))
                    v.url = `/view_video.php?viewkey=${v.serial_id}`;
                v.title = this.trimInnerText(titleDiv.querySelector("span[class='title'] a").innerText);
                v.local_name = v.serial_id;
                v.duration = this.trimInnerText(imgDiv.querySelector("var[class='duration']").innerText);
                v.hd = imgDiv.querySelector("span[class*='hd-thumbnail']") ? 1 : 0;
                v.vr = imgDiv.querySelector("span[class*='vr-thumbnail']") ? 1 : 0;
                if (titleDiv.querySelector("span[class='price']")) {
                    v.promo = 'pay';
                }
                let premium = imgDiv.querySelector("i[class*='premiumIcon']") ? 1 : 0;
                if (premium)
                    v.promo = 'premium';
                if (v.promo !== 'pay' && v.promo !== 'premium')
                    v.promo = 'free';
                v.thumbs = { url: img.getAttribute('data-path'), length: parseInt(img.getAttribute('data-thumbs'), 10) };
                v.s_thumbs = [];
                for (let i = 1; i <= v.thumbs.length; i++)
                    v.s_thumbs.push({ url: v.thumbs.url.replace('{index}', `${i}`), local_name: `thumb_${i <= 9 ? `0${i}` : i}` });
                v.webm = { url: img.getAttribute('data-mediabook'), local_name: 'preview', ext: '.webm' };
            }
        }
        let totalPageID = 1;
        {
            const pagelis = document.querySelectorAll(totalPageSel);
            for (const li of pagelis) {
                let p = -1;
                const a = li.querySelector('a') || li;
                p = parseInt(this.trimInnerText(a.innerText), 10);
                if (!isNaN(p) && p > totalPageID)
                    totalPageID = p;
            }
        }
        return { vs, totalPageID };
    },
    e_detail(v) {
        if (!v)
            v = {};
        if (!v.url)
            v.url = document.head.querySelector("meta[property='og:url']").getAttribute('content');
        if (!v.serial_id)
            v.serial_id = v.url.substring(v.url.lastIndexOf('=') + 1);
        v.promo = 'free';
        if (document.querySelector("div[class='wrapper'] div[class='geoBlocked']")) {
            v.promo = 'unavaliable';
        }
        else if (document.querySelector("div[class='removed'] div[class='notice video-notice']")) {
            v.promo = 'unavaliable';
        }
        else if (document.querySelector("div[class='premiumLockedPartners']")) {
            v.promo = 'premium';
        }
        else if (document.querySelector("div[id='vpContentContainer'] button[class*='orangeButton purchaseButton']")) {
            v.promo = 'pay';
        }
        else if (document.querySelector("div[id='vpContentContainer'] div[class*='js-paidDownload'] span[class='pay2Download']")) {
            v.promo = 'pay';
        }
        if (v.promo === 'unavaliable')
            return v;
        v.title = document.head.querySelector("meta[property='og:title']").getAttribute('content');
        v.local_name = v.serial_id;
        let poster = { url: document.head.querySelector("meta[property='og:image']").getAttribute('content'), local_name: 'poster' };
        v.thumbs = {
            length: 16,
            url: `${poster.url.substring(0, poster.url.lastIndexOf(')') + 1)}{index}${poster.url.substring(poster.url.lastIndexOf('.'))}`,
        };
        v.b_thumbs = [];
        for (let i = 1; i <= v.thumbs.length; i++)
            v.b_thumbs.push({ url: v.thumbs.url.replace('{index}', `${i}`), local_name: `b.thumb_${i <= 9 ? `0${i}` : i}` });
        let duration = parseInt(document.head.querySelector("meta[property='video:duration']").getAttribute('content'), 10);
        let min = Math.floor(duration / 60);
        let sec = duration - min * 60;
        v.duration = `${min < 10 ? `0${min}` : min}:${sec < 0 ? `0${sec}` : sec}`;
        try {
            let flashvars = this[`flashvars_${document.querySelector("div[id='vpContentContainer'] div[id='player']").getAttribute('data-video-id')}`];
            v.hd = flashvars.isHD === 'true' ? 1 : 0;
        }
        catch (e) { }
        v.vr = document.querySelector("div[id='vpContentContainer'] div[class='video-actions-menu'] div[data-tab='vr-tab'") ? 1 : 0;
        if (v.promo === 'premium')
            return v;
        v.videos = [];
        if (v.promo === 'free') {
            if (!document.querySelector("div[id='vpContentContainer'] div[class='video-actions-menu'] div[class='tab-menu-wrapper-row'] div[data-tab='vr-tab'")) {
                let downTab = document.querySelector("div[id='vpContentContainer'] div[class='video-actions-container'] div[class*='download-tab']");
                if (downTab) {
                    let as = downTab.querySelectorAll('a');
                    if (as && as.length > 0 && !downTab.querySelector("div[class='notLoggedIn']")) {
                        for (let a of as) {
                            let quality = this.trimInnerText(a.innerText).replace('p', '').replace('高清', '');
                            if (!isNaN(quality))
                                v.videos.push({ url: a.getAttribute('href'), local_name: quality, format: 'mp4', quality, direct: true });
                        }
                    }
                }
            }
            else {
                let vrDownTab = document.querySelector("div[id='vpContentContainer'] div[class='video-actions-container'] div[class*='vr-tab']");
                if (vrDownTab) {
                    let a = vrDownTab.querySelector("li[class*='vr1']").querySelector('a');
                    v.videos.push({ url: a.getAttribute('href'), local_name: '1080', format: 'mp4', quality: '1080', direct: true });
                }
            }
            if (v.videos.length <= 0)
                v.videos = this[`flashvars_${document.querySelector("div[id='vpContentContainer'] div[id='player']").getAttribute('data-video-id')}`].mediaDefinitions;
            for (let video of v.videos) {
                if (video.videoUrl)
                    video.url = video.videoUrl;
                video.local_name = video.quality;
            }
        }
        return v;
    },
};
//# sourceMappingURL=utils.js.map