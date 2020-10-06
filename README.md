# pornhub-cmds

> fetch pornhub.com video

# examples

## login

```js
const path = require('path');
const loginCmd = require('./lib/cmd-login').default;

let context = {
  logs: [],
  datas: {},
  errs: {},
  options: {
    id: 'Pornhub',
    name: 'login',
    downloadPath: path.resolve('downloads'),
    // browser-config
    puppeteerApp: path.resolve('chrome-mac/Chromium.app/Contents/MacOS/Chromium'),
    puppeteerHeadless: false,
    puppeteerUseSS: true,
    puppeteerMaxPages: 10,
    puppeteerPageType: 'noRichContent',
    // web-config
    webURL: 'https://cn.pornhub.com',
    webUsername: '',
    webPassword: '',
  },
};

(async () => {
  await loginCmd(context).startAsync(context);
})();
```

## recommended-list

```js
const path = require('path');
const listCmd = require('./lib/cmd-recommended-list').default;

let context = {
  logs: [],
  datas: {},
  errs: {},
  options: {
    id: 'Pornhub',
    name: 'video-list',
    downloadPath: path.resolve('downloads'),
    // browser-config
    puppeteerApp: path.resolve('chrome-mac/Chromium.app/Contents/MacOS/Chromium'),
    puppeteerHeadless: true,
    puppeteerUseSS: true,
    puppeteerMaxPages: 10,
    puppeteerPageType: 'noRichContent',
    // web-config
    webURL: 'https://cn.pornhub.com',
    webUsername: '',
    webPassword: '',

    //IPagesOptions
    listURL: '/recommended',
    listPageID: [1, 1], // from,to
    listQueue: [0, 1], // step,limit
    listPreviews: ['thumb', 'webm'],
    listStore: async (time, context, pageID, vs) => {
      if (time === 'list') {
        console.log(vs);
      } else if (time === 'step') {
        // console.log(vs);
      }
    },
  },
};

(async () => {
  await listCmd(context).startAsync(context);
})();
```

## video-detail

```js
const path = require('path');
const videosCmd = require('./lib/cmd-videos').default;

let context = {
  logs: [],
  datas: {},
  errs: {},
  options: {
    id: 'Pornhub',
    name: 'video',
    downloadPath: path.resolve('downloads'),
    // browser-config
    puppeteerApp: path.resolve('chrome-mac/Chromium.app/Contents/MacOS/Chromium'),
    puppeteerHeadless: true,
    puppeteerUseSS: true,
    puppeteerMaxPages: 10,
    puppeteerPageType: 'noRichContent',
    // web-config
    webURL: 'https://cn.pornhub.com',
    webUsername: '',
    webPassword: '',

    //IVideoOptions
    videoSerialID: [''],
    videoQueue: [1, 0],
    videoPreviews: ['thumb'],
    videoStore: async (time, context, index, v) => {
      if (time === 'video') {
        console.log(v);
      }
    },
  },
};

(async () => {
  await videosCmd(context).startAsync(context);
})();
```

## download-video

```js
const path = require('path');
const downloadCmd = require('./lib/cmd-download-videos').default;

let context = {
  logs: [],
  datas: {},
  errs: {},
  options: {
    id: 'Pornhub',
    name: 'download-video',
    downloadPath: path.resolve('downloads'),
    // browser-config
    puppeteerApp: path.resolve('chrome-mac/Chromium.app/Contents/MacOS/Chromium'),
    puppeteerHeadless: true,
    puppeteerUseSS: true,
    puppeteerMaxPages: 10,
    puppeteerPageType: 'noRichContent',
    // web-config
    webURL: 'https://cn.pornhub.com',
    webUsername: '',
    webPassword: '',

    //IVideoOptions
    videoIDs: [''],
    videoQueue: [1, 0],
    videoVideo: true,
    videoOverwriteM3u8: false,
    videoVideoTimeout: 60000,
    videoStore: async (time, context, index, v) => {
      if (time === 'video') {
        console.log(v);
      }
    },
  },
};

(async () => {
  await downloadCmd(context).startAsync(context);
})();
```
