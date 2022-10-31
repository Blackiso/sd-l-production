const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const hoxy = require('hoxy');
const fs = require('fs');
const bodyParser = require('body-parser');
const isDev = require('electron-is-dev');
const cors = require('cors');

const { StardollLoader } = require('./scripts/StardollLoader');
const { UsersLoader } = require('./scripts/UsersLoader');
const { StarbazarLoader } = require('./scripts/StarbazarLoader');
const { HashVerify } = require('./scripts/HashVerify');
const { XMLParser } = require('fast-xml-parser');

let OFFLINE_MODE = false;
let LANGUAGE_FILTER = false;

const StardollLoaderObject = StardollLoader.getInstance();
const UsersLoaderObject = new UsersLoader(StardollLoaderObject);
const StarbazarLoaderObject = new StarbazarLoader(StardollLoaderObject, UsersLoaderObject);


const XMLParserObject = new XMLParser({
    ignoreAttributes: false
});

const express = require('express');
const express_app = express();
const http = require('http');
const express_port = 7000;

let win;


app.commandLine.appendSwitch('ppapi-flash-path', getPath('PepperFlashPlayer.dll'));
app.commandLine.appendSwitch('ppapi-flash-version', '32.0.0.293');
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');

app.setAppUserModelId('Stardoll BL');

// SSL/TSL: this is the self signed certificate support
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
});


function getPath(file) {
    return path.join((__dirname.includes('.asar') ? process.resourcesPath : __dirname) + '/' + file);
}

function parseFormData(requestBody) {
    const parsedData = decodeURIComponent(requestBody).split('&');
    const formData = {};
    for (let i = 0; i < parsedData.length; i++) {
        let x = parsedData[i].split('=');
        formData[x[0]] = x[1];
    }
    return formData;
}

function createWindow() {
    let port = 9999;
    let host = 'http://127.0.0.1';
    let address = host + ':' + port;

    let proxy = hoxy.createServer({

        certAuthority: {
            key: fs.readFileSync(getPath('my-private-root-ca.key.pem')),
            cert: fs.readFileSync(getPath('my-private-root-ca.crt.pem'))
        }

    }).listen(port, function () {
        console.log('Proxy is listening on port ' + port + '.');

        win = new BrowserWindow({
            width: 1200,
            minWidth: 1100,
            minHeight: 500,
            height: 800,
            frame: false,
            webPreferences: {
                webviewTag: true,
                nodeIntegration: true,
                plugins: true,
                enableRemoteModule: true,
                spellcheck: true,
                webSecurity: false
            }
        });

        // win.webContents.session.webRequest.onBeforeSendHeaders(
        //     (details, callback) => {
        //         callback({ requestHeaders: { Origin: '*', ...details.requestHeaders } });
        //     },
        // );

        // win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        //     callback({
        //         responseHeaders: {
        //             'Access-Control-Allow-Origin': ['*'],
        //             ...details.responseHeaders,
        //         },
        //     });
        // });

        win.on('closed', () => {
            app.quit();
            process.exit();
        });

        win.loadURL(`file://${__dirname}/main.html`);

        win.webContents.session.setProxy({ proxyRules: address });

        ipcMain.on('set_proxy', (event, x) => {
            win.webContents.session.setProxy({ proxyRules: x ? address : '' });
        });

        if (isDev) {
            win.webContents.openDevTools();
        }

        globalShortcut.register('CommandOrControl+Up', () => {
            win.webContents.send('zoomIn', '');
        });

        globalShortcut.register('CommandOrControl+Down', () => {
            win.webContents.send('zoomOut', '');
        });

        globalShortcut.register('CommandOrControl+0', () => {
            win.webContents.send('zoomReset', '');
        });

        globalShortcut.register('CommandOrControl+5', () => {
            win.webContents.send('addressBar', '');
        });

    });

    //GETTING DATA
    proxy.intercept({
        phase: 'request',
        fullUrl: 'http://www.stardoll.com/c/',
        as: 'string'
    }, (req) => {
        let data = XMLParserObject.parse(req.string);
        StardollLoaderObject.setHeaders(req.headers)
        if (data.body['@_rid']) StardollLoaderObject.setRid(data.body['@_rid']);
        if (data.body['@_sid']) StardollLoaderObject.setSid(data.body['@_sid']);
        StardollLoaderObject.setCurrentUserData().then(() => { });
    });
    ////////////////

    //OFFLINE
    proxy.intercept({
        phase: 'request',
        fullUrl: 'http://www.stardoll.com/c/'
    }, (req) => {
        if (OFFLINE_MODE) {
            req.hostname = '127.0.0.1';
            req.port = 6969;
        }
    });
    ////////////////

    //LANGUAGE FILTER
    proxy.intercept({
        phase: 'request',
        fullUrl: 'http://www.stardoll.com/en/ajax/badwordFilter.php',
        as: 'string'
    }, (req, res, cycle) => {
        cycle.data('badWord', req.string);
    });

    proxy.intercept({
        phase: 'response',
        fullUrl: 'http://www.stardoll.com/en/ajax/badwordFilter.php',
        as: 'string'
    }, (req, res, cycle) => {
        if (!LANGUAGE_FILTER) {
            let reqReceived = cycle.data('badWord');
            let formData = parseFormData(reqReceived);
            res.string = formData.txt.replaceAll('+', ' ');
        }
    });
    /////////////////

    //BLOCK USER
    proxy.intercept({
        phase: 'response',
        fullUrl: 'http://www.stardoll.com/en/com/party-chat/blockUser.php',
        as: 'json'
    }, (req, res, cycle) => {
        res.json = { "status": "OK" };
    });
    ////////////////

    //NOTIFICATION
    proxy.intercept({
        phase: 'response',
        fullUrl: 'http://www.stardoll.com/c/',
        as: 'string'
    }, (req, res, cycle) => {

        let data = XMLParserObject.parse(res.string);

        if (typeof data !== 'undefined' && data !== null && typeof data.body !== 'undefined' && typeof data.body.message !== 'undefined') {
            if (data.body.message['@_type'] && data.body.message['@_type'] == 'chat') {
                if (!win.isFocused()) {
                    win.webContents.send('notification', data.body.message.body);
                }
            }
        }


    });
    ////////////////

    //SEARCH
    proxy.intercept({
        phase: 'request',
        hostname: 'bl.stardoll.com'

    }, (req, res, cycle) => {
        req.hostname = '127.0.0.1';
        req.port = 7000;
    });
    //////////////

    //CHAT FILE
    proxy.intercept({
        phase: 'request',
        fullUrl: 'http://cdn.stardoll.com/flash/chat_hp/Chat_hp.swf'

    }, (req, res, cycle) => {
        console.log('chat');
        req.hostname = '127.0.0.1';
        req.port = 7000;
    });
    //////////////

    //CHAT FILE
    proxy.intercept({
        phase: 'request',
        fullUrl: 'http://cdn.stardoll.com/flash/starBazaar.swf'

    }, (req, res, cycle) => {
        console.log('chat');
        req.hostname = '127.0.0.1';
        req.port = 7000;
    });
    //////////////

    //Suite FILE
    // proxy.intercept({
    //     phase: 'request',
    //     fullUrl: 'http://cdn.stardoll.com/flash/suite/suite.swf'
    // }, (req, res, cycle) => {
    //     req.hostname = '127.0.0.1';
    //     req.port = 7000;
    // });
    ////////////////

    //MESSAGE
    proxy.intercept({
        phase: 'request',
        fullUrl: 'http://www.stardoll.com/c/',
        as: 'string'
    }, (req) => {
        if (StardollLoaderObject.isMessaging()) {
            let message = StardollLoaderObject.getMessage();
            StardollLoaderObject.setIsMessaging(false);
            req.string = message;
        }
    });
    ////////////////

    //STORAGE
    proxy.intercept({
        phase: 'response',
        fullUrl: 'http://www.stardoll.com/en/com/user/getSuite.php',
        as: 'json'
    }, (req, res, cycle) => {
        try {
            res.json.suite.lockStorage = 0;

            let v = new HashVerify(JSON.stringify(res.json));
            let nd = v.getNewData();
            let nj = JSON.parse(nd);

            res.string = nd;

            console.log(nj._xt.substring(1, 33));
        } catch (e) {
            console.log(e);
        }


    });
    //////////////

    //CACHE
    proxy.intercept({
        phase: 'response',
        fullUrl: 'http://www.stardoll.com/en/party-chat/party.php',
        as: 'string'
    }, (req, res, cycle) => {
        res.string = res.string.replace(/swf\?\d+/, 'swf?' + Math.floor(Math.random() * 1000000));
    });
    //////////////

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }

        process.exit();
    });

}

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('offline', (event, x) => {
    OFFLINE_MODE = x;
});

ipcMain.on('language_filter', (event, x) => {
    LANGUAGE_FILTER = x;
});

//EXPRESS

express_app.use(bodyParser.json());

express_app.use(cors({
    origin: '*'
}));

express_app.use(express.static('static'))

express_app.get('/search', async (req, res) => {
    let users = [];

    try {
        users = await UsersLoaderObject.getUserByUsername(req.query.username);

        if (users.length == 0) {
            users = await UsersLoaderObject.searchUsersByUsername(req.query.username);
        }
    } catch (e) { }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(users));
});

express_app.get('/search/id', async (req, res) => {
    let users = [];

    try {
        users = await UsersLoaderObject.getUserById(req.query.id);
    } catch (e) { }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(users));
});

express_app.post('/message', async (req, res) => {
    StardollLoaderObject.sendMessage(req.body.message, req.body.user);
    res.end('');
});

express_app.get('/add', async (req, res) => {
    await StardollLoaderObject.sendFriendRequest(req.query.id);
    res.end('');
});

express_app.get('/execute-search', async (req, res) => {
    win.webContents.send('do-search', req.query.id);
    res.end('');
});

express_app.get('/user/suite', async (req, res) => {
    let HTML = '<object type="application/x-shockwave-flash" id="wardrobeswfobject" name="wardrobeswfobject"data="http://cdn.stardoll.com/flash/suite/suite.swf?13324" width="940" height="510"><param name="wmode" value="window"><param name="menu" value="false"><param name="allowScriptAccess" value="always"><param name="bgcolor" value="#ffffff"><param name="allowFullscreen" value="true"><param name="flashvars" value="mainLoadUrl=http://www.stardoll.com%2Fen%2Fcom%2Fuser%2FgetSuite.php%3Fexclude%3Dhands%252Cfeet%26id%3D::userID::&amp;hipSize=2&amp;chestSize=1&amp;baseUrl=http://cdn.stardoll.com&amp;fonts=arial,arial_latin.swf?5742,Arial;century_gothic,century_gothic_latin.swf?5742,Century Gothic;times_new_roman,times_new_roman_latin.swf?5907,Times New Roman&amp;fontUrl=flexfonts/&amp;customItemUrl=CustomItemClass.swf?13062"></object>';

    HTML = HTML.replace('::userID::', req.query.id);

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(HTML);
});

express_app.get('/user/bp', async (req, res) => {
    let HTML = '<object type="application/x-shockwave-flash" id="medoll" name="medoll" data="http://cdn.stardoll.com/flash/medollEditor.swf?13526" width="940" height="510"><param name="wmode" value="window"><param name="menu" value="false"><param name="allowScriptAccess" value="always"><param name="bgcolor" value="#ffffff"><param name="allowFullscreen" value="true"><param name="flashvars" value="mainLoadUrl=http://www.stardoll.com%2Fen%2Fxml%2FgetMeDollItems.php%3Fexternal%3D0%26id%3D::userID::&amp;hipSize=1&amp;chestSize=1&amp;baseUrl=http://cdn.stardoll.com&amp;fonts=arial,arial_latin.swf?5742,Arial;century_gothic,century_gothic_latin.swf?5742,Century Gothic&amp;flashUrl=flash/&amp;fontUrl=flexfonts/&amp;customItemUrl=CustomItemClass.swf?13062&amp;jewleryClassUrl=http://cdn.stardoll.com/flash/jewelItemClass.swf?8235&amp;jewleryItemPatternBase=http://cdn.stardoll.com/cms/customItems/jewelry/patterns/high/&amp;jewleryItemMaterialBase=http://cdn.stardoll.com/cms/customItems/jewelry/materials/high/&amp;hairClassUrl=http://cdn.stardoll.com/flash/hairItemClass.swf?13062&amp;hairPatternUrl=http://cdn.stardoll.com/cms/customItems/hair/patterns/high/&amp;itemBaseUrl=http://cdn.stardoll.com/cms/flash/medoll3/items/"></object>';

    HTML = HTML.replace('::userID::', req.query.id);

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(HTML);
});

express_app.get('/user/starbazar', async (req, res) => {
    let HTML = '<object type="application/x-shockwave-flash" id="sellItems" name="sellItems" data="http://cdn.stardoll.com/flash/starBazaar.swf?13601" width="940" height="510"><param name="wmode" value="window"><param name="menu" value="false"><param name="allowScriptAccess" value="always"><param name="bgcolor" value="#ffffff"><param name="allowFullscreen" value="true"><param name="flashvars" value="starBazaarXmlUrl=http://www.stardoll.com%2Fen%2Fcom%2Fuser%2FgetBazaar.php%3FstoreType%3D1%26sellerId%3D::userID::%26startMode%3D"></object>';

    HTML = HTML.replace('::userID::', req.query.id);

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(HTML);
});

express_app.get('/starbazar', async (req, res) => {
    let data = [];

    try {
        data = await StarbazarLoaderObject.getBazarItems();
    } catch (e) { }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
});

express_app.get('/bazar/brands', async (req, res) => {
    let data = [];

    try {
        data = await StarbazarLoaderObject.getBazarBrands();
    } catch (e) { }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
});

express_app.post('/bazar/search', async (req, res) => {
    let data = [];
    let trys = 500;

    while (trys > 0) {
        console.log('trying', trys, data.length);
        try {
            let items = await StarbazarLoaderObject.searchBazar(req.body.name, req.body.brand);

            iloop: for (let i = 0; i < items.length; i++) {

                zloop: for (let z = 0; z < data.length; z++) {
                    if (data[z].id == items[i].id) {

                        xloop: for (let x = 0; x < items[i].sellers.length; x++) {
                            if (!data[z].sellers.find(m => m.id == items[i].sellers[x].id)) data[z].sellers.push(items[i].sellers[x]);
                        }

                        continue iloop;
                    }


                }

                data.push(items[i]);

            }
        } catch (e) {
            console.log(e);
        }

        trys--;
    }


    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));



});

express_app.server = http.createServer(express_app);
express_app.server.setTimeout(600000);
express_app.server.listen(express_port, () => {
    console.log(`Express listening on port ${express_port}`);
});


try {
    app.whenReady().then(() => {

        if (!isDev) {
            let updateWin = new BrowserWindow({
                width: 300,
                height: 300,
                resizable: false,
                frame: false,
                webPreferences: {
                    nodeIntegration: true
                }
            });

            updateWin.loadURL(`file://${__dirname}/update.html`);

            // updateWin.webContents.openDevTools();
            autoUpdater.checkForUpdates();

            //UPDATES
            autoUpdater.on('update-available', () => {
                updateWin.webContents.send('update-available', true);
            });

            autoUpdater.on('update-not-available', () => {
                updateWin.hide();
                createWindow();
            });

            autoUpdater.on('update-downloaded', () => {
                autoUpdater.quitAndInstall();
            });
        } else {
            createWindow();
        }

    });
} catch (e) {
    console.log(e);
}