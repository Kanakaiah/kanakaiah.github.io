const fs = require('fs');
const html = 'Abraham<S>11</S> begat<S>1080</S> Isaac<S>2464</S>; and <S><mark>1161</mark></S> Isaac<S>2464</S> begat<S>1080</S> Jacob<S>2384</S>; and <S><mark>1161</mark></S> Jacob<S>2384</S> begat<S>1080</S> Judas<S>2455</S> and<S>2532</S> his<S>846</S> brethren<S>80</S>';
let processed = html.replace(/([a-zA-Z\u00C0-\u024F\u1E00-\u1EFF'-]+)([^a-zA-Z]*?)<S><mark>\d+<\/mark><\/S>/g, '<span class="text-accent bg-accent/20 px-1 rounded font-medium">$1</span>$2');
processed = processed.replace(/<S>.*?<\/S>/g, '');
fs.writeFileSync('output.txt', processed);
