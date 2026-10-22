import type {Settings,Asset} from './types.ts';
import {isVisual} from './types.ts';
export function dimensions(settings:Settings,assets:Asset[]){
 if(settings.ratio==='custom')return {width:Math.round(settings.width/2)*2,height:Math.round(settings.height/2)*2};
 const main=assets.find(isVisual);const ratio=settings.ratio==='auto'?(main&&main.width&&main.height?main.width/main.height:16/9):(()=>{const [w,h]=settings.ratio.split(':').map(Number);return w/h;})();
 return ratio>=1?{width:1280,height:Math.round(1280/ratio/2)*2}:{width:Math.round(1280*ratio/2)*2,height:1280};
}
