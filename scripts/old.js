(function () {



    const tabsBody = document.querySelector('.tabs');
    const tabsHead = document.querySelector('.tabs-titles');
    const reload = document.querySelector('#reload');
    const back = document.querySelector('#back');
    const minimize = document.querySelector('#minimize');
    const close = document.querySelector('.close');
    const zoomIn = document.querySelector('#zoom-in');
    const zoomOut = document.querySelector('#zoom-out');
    const settings = document.querySelector('#settings');
    const settingsContainer = document.querySelector('.settings-container');
    const fullScreen = document.querySelector('#full-screen');
    const loader = document.querySelector('.loading-screen');
    const more = document.querySelector('#more');
    const dropMenu = document.querySelector('.drop-menu');
    const pageLoader = document.querySelector('.page-loader');
    const zoomLevelEl = document.querySelector('.zoom-level');
    const closeSettings = document.querySelector('.cl');
    const notificationsToggle = document.querySelector('#notifications-toggle');
    const offlineToggle = document.querySelector('#offline-toggle');
    const languageToggle = document.querySelector('#language-toggle');
    const proxyToggle = document.querySelector('#proxy-toggle');
    const offlineIndicator = document.querySelector('#offline');

    const notificationSound = new Audio('./audio/soft_notification.mp3');

    let currentWebview = null;
    let tabArray = [];
    let tabHeadArray = [];

    let zoomLevel = 0;
    let allowNotifications = window.localStorage.getItem('notifications');

    if (allowNotifications !== null) {
        setNotifications(allowNotifications);
    }

    let offlineMode = window.localStorage.getItem('offline');

    if (offlineMode !== null) {
        setOffline(offlineMode);
    }

    let languageFilter = window.localStorage.getItem('language_filter');

    if (languageFilter !== null) {
        setLanguageFilter(languageFilter);
    }

    let proxy = window.localStorage.getItem('proxy_value');

    if (proxy !== null) {
        setProxy(proxy);
    }


    openNewTab('http://www.stardoll.com/');

    reload.addEventListener('click', (e) => {
        currentWebview.reload();
    });

    back.addEventListener('click', (e) => {
        currentWebview.goBack();
    });

    function displayZoomLevel() {
        zoomLevelEl.innerHTML = (currentWebview.getZoomFactor() * 100).toFixed(0) + '%';
        setTimeout(() => { zoomLevelEl.innerHTML = ''; }, 2000);
    }

    function setZoom(x, reset = null) {
        if (currentWebview) {
            zoomLevel = x ? zoomLevel + 1 : zoomLevel - 1;
            if (reset) zoomLevel = 0;
            currentWebview.setZoomLevel(zoomLevel);
            displayZoomLevel();
        }
    }

    function setNotifications(value) {
        if (typeof value == 'string') value = value === 'true' ? true : false;
        console.log(value);
        notificationsToggle.checked = value;
        window.localStorage.setItem('notifications', value);
    }

    function setLanguageFilter(value) {
        if (typeof value == 'string') value = value === 'true' ? true : false;
        languageToggle.checked = value;
        window.localStorage.setItem('language_filter', value);
        ipcRenderer.send('language_filter', value);
    }

    function setProxy(value) {
        if (typeof value == 'string') value = value === 'true' ? true : false;
        proxyToggle.checked = value;
        window.localStorage.setItem('proxy_value', value);
        [...document.querySelectorAll('.need_proxy')].forEach(item => {
            if (value) {
                item.classList.remove('hide');
            } else {
                item.classList.add('hide');
            }
        });
        ipcRenderer.send('set_proxy', value);
    }

    function setOffline(value) {
        if (typeof value == 'string') value = value === 'true' ? true : false;
        offlineToggle.checked = value;
        window.localStorage.setItem('offline', value);
        ipcRenderer.send('offline', value);
        if (value) {
            offlineIndicator.classList.remove('hide');
        } else {
            offlineIndicator.classList.add('hide');
        }
    }

    function isPageUrl(url) {
        return url !== "";
    }

    function openNewTab(url) {
        let webview = document.createElement('webview');

        webview.setAttribute('plugins', true);
        // webview.setAttribute('allowpopups', true);

        webview.src = url;
        webview.classList.add('webview');
        tabsBody.appendChild(webview);

        setTopTab(webview);
        tabArray.push(webview);

        setTimeout(() => {
            contextMenu({
                window: webview,
                showSearchWithGoogle: true,
                showInspectElement: true,
                prepend: (defaultActions, params, browserWindow) => [{
                    label: 'Open link in new tab',
                    visible: isPageUrl(params.linkURL),
                    click: () => {
                        if (tabArray.length < 4) openNewTab(params.linkURL);
                    }
                }]
            });
        }, 100);

        let title = createTabHead(webview);

        webview.addEventListener('did-finish-load', (e) => {
            title.innerHTML = webview.getTitle();
            webview.executeJavaScript('let __over = document.querySelector("#controlOverlay");__over && __over.remove();');
        });

        webview.addEventListener('did-stop-loading', (e) => {
            loader.classList.add('hide');
            pageLoader.classList.add('hide');
        });

        webview.addEventListener('did-start-loading', (e) => {
            zoomLevel = webview.getZoomLevel();
            pageLoader.classList.remove('hide');
        });

        webview.addEventListener('new-window', async (e) => {
            e.preventDefault();
            openNewTab(e.url);
        });

    }

    function createTabHead(webview) {
        let cont = document.createElement('DIV');
        let img = document.createElement('IMG');
        let span = document.createElement('SPAN');
        let icon = document.createElement('ion-icon');

        cont.classList.add('logo');
        img.src = './images/icon.ico';
        span.innerHTML = 'Stardoll';
        icon.name = 'close-outline';

        cont.appendChild(img);
        cont.appendChild(span);
        cont.appendChild(icon);
        tabsHead.appendChild(cont);

        for (let i = 0; i < tabsHead.children.length; i++) {
            tabsHead.children[i].classList.remove('tab-active');
        }
        cont.classList.add('tab-active');

        cont.onclick = (e) => {
            if (e.target !== icon) {
                setTopTab(webview);
                for (let i = 0; i < tabsHead.children.length; i++) {
                    tabsHead.children[i].classList.remove('tab-active');
                }
                cont.classList.add('tab-active');
            }
        }

        icon.onclick = (e) => {
            webview.remove();
            cont.remove();

            tabArray.splice(tabArray.indexOf(webview), 1);
            tabHeadArray.splice(tabHeadArray.indexOf(cont), 1);

            setTopTab(tabArray[tabArray.length - 1]);
            tabHeadArray[tabHeadArray.length - 1].classList.add('tab-active');
        }

        tabHeadArray.push(cont);

        return span;
    }

    function setTopTab(webview) {
        currentWebview = webview;
        for (let i = 0; i < tabsBody.children.length; i++) {
            tabsBody.children[i].classList.remove('top-tab');
        }
        webview.classList.add('top-tab');
    }

    minimize.addEventListener('click', (e) => {
        remote.BrowserWindow.getFocusedWindow().minimize();
    });

    close.addEventListener('click', (e) => {
        remote.BrowserWindow.getFocusedWindow().close();
    });

    zoomIn.addEventListener('click', (e) => {
        setZoom(true);
    });

    zoomOut.addEventListener('click', (e) => {
        setZoom(false);
    });

    settings.addEventListener('click', (e) => {
        settingsContainer.classList.remove('hide');
        dropMenu.classList.toggle('hide');
    });

    closeSettings.addEventListener('click', (e) => {
        settingsContainer.classList.add('hide');
    });

    fullScreen.addEventListener('click', (e) => {
        let currentWindow = remote.getCurrentWindow()
        currentWindow.setFullScreen(!currentWindow.isFullScreen());
        dropMenu.classList.toggle('hide');
    });

    more.addEventListener('click', (e) => {
        dropMenu.classList.toggle('hide');
    });

    notificationsToggle.addEventListener('change', (e) => {
        setNotifications(notificationsToggle.checked);
    });

    offlineToggle.addEventListener('change', (e) => {
        setOffline(offlineToggle.checked);
    });

    languageToggle.addEventListener('change', (e) => {
        setLanguageFilter(languageToggle.checked);
    });

    proxyToggle.addEventListener('change', (e) => {
        setProxy(proxyToggle.checked);
    });

    ipcRenderer.on('zoomIn', (event, messages) => {
        setZoom(true);
    });

    ipcRenderer.on('zoomOut', (event, messages) => {
        setZoom(false);
    });

    ipcRenderer.on('zoomReset', (event, messages) => {
        setZoom(false, true);
    });

    ipcRenderer.on('notification', (event, messages) => {
        if (notificationsToggle.checked) {
            const myNotification = new Notification('New message from ' + messages.$.from.split(':')[1], {
                title: 'New message from ' + messages.$.from.split(':')[1],
                body: messages.body[0],
                icon: './images/icon.ico'
            });
        }
        notificationSound.play();
    });

})();