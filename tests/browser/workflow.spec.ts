import {test,expect} from '@playwright/test';
import path from 'node:path';
test('real upload, render, portrait revision, restore and download',async({page},testInfo)=>{
 const account=await page.request.post('/api/auth/register',{data:{email:`browser-${Date.now()}-${testInfo.project.name}@example.test`,password:'browser-test-fixture-only'}});expect(account.ok()).toBeTruthy();
 await page.goto('/');await page.getByRole('button',{name:'Start a new video'}).click();
 await page.getByLabel('Choose videos or images').setInputFiles([path.resolve('test-data/fixtures/clip-a.mp4'),path.resolve('test-data/fixtures/clip-b.mp4')]);
 await expect(page.getByRole('button',{name:'Create my video'})).toBeEnabled();
 await page.getByLabel('Choose audio files').setInputFiles(path.resolve('test-data/fixtures/music.wav'));
 await expect(page.getByRole('button',{name:'Create my video'})).toBeEnabled();
 await page.getByRole('button',{name:'Create my video'}).click();
 await expect(page.getByRole('link',{name:'Download video'})).toBeVisible({timeout:90000});
 await expect(page.getByLabel('Edited video preview')).toBeVisible();
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Change to portrait',exact:true}).click();
 await expect(page.getByText('VERSION 02',{exact:true})).toBeVisible({timeout:90000});
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>({width:v.videoWidth,height:v.videoHeight}))).toEqual({width:720,height:1280});
 await page.getByRole('button',{name:'Restore version 1',exact:true}).click();await expect(page.getByText('VERSION 01',{exact:true})).toBeVisible();
 const downloaded=page.waitForEvent('download');await page.getByRole('link',{name:'Download video'}).click();await (await downloaded).saveAs(testInfo.outputPath('render.mp4'));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('images alone become a downloadable video with selected hold times',async({page},testInfo)=>{
 const account=await page.request.post('/api/auth/register',{data:{email:`images-${Date.now()}-${testInfo.project.name}@example.test`,password:'browser-image-fixture-only'}});expect(account.ok()).toBeTruthy();
 await page.goto('/');await page.getByRole('button',{name:'Start a new video'}).click();
 await page.getByLabel('Choose images',{exact:true}).setInputFiles(['photo-red.jpg','photo-green.png','photo-blue.webp'].map(n=>path.resolve('test-data/fixtures',n)));
 for(const [name,seconds]of [['photo-red.jpg','1.5'],['photo-green.png','2'],['photo-blue.webp','2.5']]){const input=page.getByLabel(`Display duration for ${name} in seconds`);await expect(input).toBeVisible();await input.fill(seconds);await input.press('Tab');}
 await expect(page.getByRole('button',{name:'Create my video'})).toBeEnabled();await page.getByRole('button',{name:'Create my video'}).click();
 await expect(page.getByRole('link',{name:'Download video'})).toBeVisible({timeout:90000});
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>Math.round(v.duration*1000))).toBe(6000);
 await page.getByRole('button',{name:'Original first image',exact:true}).click();await expect(page.getByAltText('Original image: photo-red.jpg')).toBeVisible();
 await page.getByRole('button',{name:'Edited video',exact:true}).click();const download=page.waitForEvent('download');await page.getByRole('link',{name:'Download video'}).click();await(await download).saveAs(testInfo.outputPath('images.mp4'));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
