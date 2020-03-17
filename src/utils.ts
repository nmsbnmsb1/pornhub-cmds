import { ActionForDownloadFile, ActionForDownloadFiles } from './base/action-download-files';

export interface IVideo {
  serial_id: string;
  url: string;
  title: string;
  local_name: string;

  poster: string;
  thumbs: { length: number; url: string };
  webm: string;
  video: { quality: number; format: string; videoUrl: string }[];

  free: number;
  pay: string;
  premium: number;
  promo: string;
}

export default {
  e_getVideos(sel: string) {
    const vs: IVideo[] = [];
    const lis = document.querySelectorAll(sel);
    for (const li of lis) {
      if (!li.getAttribute('data-id')) continue;
      //
      const imgDiv = li.querySelector("div[class='phimage']");
      const a = imgDiv.querySelector('a');
      const img = a.querySelector('img');
      const url = a.getAttribute('href');
      const titleDiv = li.querySelector("div[class*='thumbnail-info-wrapper']");
      //
      const v: IVideo = {} as any;
      v.serial_id = li.getAttribute('_vkey');
      v.url = url;
      if (v.url.startsWith('javascript:')) v.url = `/view_video.php?viewkey=${v.serial_id}`;
      v.title = (titleDiv.querySelector("span[class='title'] a") as any).innerText;
      v.local_name = `[${v.serial_id}] ${v.title}`
        .replace(/[\r\n]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/:/g, '：')
        .replace(/\//g, '_')
        .trim();

      v.poster = img.getAttribute('data-thumb_url');
      v.thumbs = { length: parseInt(img.getAttribute('data-thumbs'), 10), url: img.getAttribute('data-path') };
      v.webm = img.getAttribute('data-mediabook');

      if (titleDiv.querySelector("span[class='price']")) v.pay = (titleDiv.querySelector("span[class='price']") as any).innerText;
      v.premium = imgDiv.querySelector("i[class*='premiumIcon']") ? 1 : 0;
      v.free = v.pay || v.premium ? 0 : 1;
      //
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
  e_totalPage(sel: string) {
    let endPage = -1;
    const pagelis = document.querySelectorAll(sel);
    for (const li of pagelis) {
      let p = -1;
      const a: any = li.querySelector('a') || li;
      p = parseInt(
        a.innerText
          .replace(/[\r\n]/g, '')
          .replace(/\s+/g, ' ')
          .trim(),
        10
      );
      if (!isNaN(p) && p > endPage) {
        endPage = p;
      }
    }
    return endPage;
  },
  e_getVideoDetail(v?: IVideo) {
    if (!v) v = {} as any;
    if (!v.url) v.url = document.head.querySelector("meta[property='og:url']").getAttribute('content');
    if (!v.serial_id) v.serial_id = v.url.substring(v.url.lastIndexOf('=') + 1);
    v.promo = 'free';
    v.free = 1;
    v.pay = '0';
    v.premium = 0;
    //free/pay/premium/unavaliable
    if (document.querySelector("div[class='wrapper'] div[class='geoBlocked']")) {
      v.promo = 'unavaliable';
      v.free = 0;
      v.pay = '0';
      v.premium = 0;
    } else if (document.querySelector("div[class='premiumLockedPartners']")) {
      //premium ph5e60cacad92c3
      v.promo = 'premium';
      v.free = 0;
      v.pay = '0';
      v.premium = 1;
    } else if (document.querySelector("div[id='vpContentContainer'] button[class*='orangeButton purchaseButton']")) {
      //pay
      v.promo = 'pay';
      v.free = 0;
      v.pay = (document.querySelector("div[id='vpContentContainer'] button[class*='orangeButton purchaseButton']") as any).innerText;
      v.premium = 0;
    }
    if (v.promo === 'unavaliable') return v;
    //
    v.title = document.head.querySelector("meta[property='og:title']").getAttribute('content');
    v.local_name = `[${v.serial_id}] ${v.title}`
      .replace(/[\r\n]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/:/g, '：')
      .replace(/\//g, '_')
      .trim();
    //
    v.poster = document.head.querySelector("meta[property='og:image']").getAttribute('content');
    try {
      v.thumbs = {
        length: 16,
        url: `${v.poster.substring(0, v.poster.lastIndexOf(')') + 1)}{index}${v.poster.substring(v.poster.lastIndexOf('.'))}`,
      };
    } catch (e) {}
    //
    return v;
  },
  e_getVideoVideos(promo: 'free' | 'pay') {
    let m: any = [];
    //
    if (promo === 'pay') {
      m.push({
        format: 'mp4',
        quality: 1080,
        videoUrl: document.querySelector("div[id='vpContentContainer'] div[id='js-player'] video").getAttribute('src'),
      });
      return m;
    }
    //
    //不是vr内容
    if (!document.querySelector("div[id='vpContentContainer'] div[class='video-actions-menu'] div[class='tab-menu-wrapper-row'] div[data-tab='vr-tab'")) {
      let downTab = document.querySelector("div[id='vpContentContainer'] div[class='video-actions-container'] div[class*='download-tab']");
      if (downTab) {
        let as = downTab.querySelectorAll('a');
        if (as && as.length > 0 && !downTab.querySelector("div[class='notLoggedIn']")) {
          for (let a of as) {
            let quality = parseInt(
              a.innerText
                .replace(/[\r\n]/g, '')
                .replace(/\s+/g, ' ')
                .replace('p', '')
                .replace('高清', '')
                .trim(),
              10
            );
            if (!isNaN(quality)) m.push({ format: 'mp4', quality, videoUrl: a.getAttribute('href') });
          }
          return m;
        }
      }
    } else {
      let vrDownTab = document.querySelector("div[id='vpContentContainer'] div[class='video-actions-container'] div[class*='vr-tab']");
      if (vrDownTab) {
        let a = vrDownTab.querySelector("li[class*='vr1']").querySelector('a');
        m.push({ format: 'mp4', quality: '1080', videoUrl: a.getAttribute('href'), direct: true });
        return m;
      }
    }
    //
    m = (this as any)[`flashvars_${document.querySelector("div[id='vpContentContainer'] div[id='player']").getAttribute('data-video-id')}`].mediaDefinitions;
    return m;
  },
  getThumbsDownloadAction(v: IVideo, size: string) {
    let list: any = [];
    if (v.poster) {
      // const config = pre(context, v.poster, `${v.local_name}/${size}/poster`, undefined, overwrite);
      list.push({ url: v.poster, saveRelativePath: `${v.local_name}/${size}.poster` });
    }
    if (v.thumbs) {
      for (let i = 1; i <= v.thumbs.length; i++) {
        list.push({ url: v.thumbs.url.replace('{index}', `${i}`), saveRelativePath: `${v.local_name}/${size}.thumb_${i <= 9 ? `0${i}` : i}` });
      }
    }
    return new ActionForDownloadFiles(5, list);
  },
  getWebmDownloadAction(v: IVideo) {
    return new ActionForDownloadFile({ url: v.webm, saveRelativePath: `${v.local_name}/preview`, ext: '.webm' });
  },
};
