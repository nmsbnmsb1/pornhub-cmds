export default {
  fillZero(s: any, bits: number) {
    s = s.toString();
    while (s.length < bits) s = `0${s}`;
    return s;
  },
  localNameFromURL(url: string) {
    return url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'));
  },
};
