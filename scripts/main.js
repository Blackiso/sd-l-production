const { createApp } = Vue;
const { webFrame, remote, ipcRenderer } = require('electron');
const contextMenu = require('electron-context-menu');


let app = createApp({
    components: {   
        Webview,
        Searchbox,
        Suite,
        Bazarsearch
    },
    data() {
        return {
            isApploading: true,
            isTabLoading: false,
            tabs: [],
            selectedTabId: null,
            showDropMenu: false,
            zoomLevel: 0,
            notificationSound: null,
            showSearchBox: false,
            address: null,
            showAddressBar: false,
            showSuite: false,
            suiteId: null,
            showBazarSearch: false
        }
    },
    mounted() {
        this.createTab('http://stardoll.com');
        this.zoomLevel = 0;

        this.notificationSound = new Audio('./audio/soft_notification.mp3');

        ipcRenderer.on('notification', (event, messages) => {
            this.notificationSound.play();
        });

        ipcRenderer.on('addressBar', (event, messages) => {
            this.showAddressBar = !this.showAddressBar;
        });

        SUTE_SERVICE.subscribe((id) => {
            this.suiteId = id;
            this.showSuite = true;
        });

    },
    methods: {
        createTab(url) {
            if (this.tabs.length >= 3) return;

            let tab = {
                url,
                title: 'Stardoll',
                id: Date.now(),
                isActive: false
            };
            this.tabs.push(tab);
            this.switchTab(tab.id);
        },
        loadingEvent(val) {
            this.isTabLoading = val;
            if (val == false) this.isApploading = false;
        },
        closeWindow(e) {
            remote.BrowserWindow.getFocusedWindow().close();
        },
        openNewTab() {
            this.createTab('http://stardoll.com');
        },
        openNewTabLink(link) {
            this.createTab(link);
        },
        minimizeWindow(e) {
            remote.BrowserWindow.getFocusedWindow().minimize();
        },
        reloadTab() {
            this.getSelectedTabComonent().reload();
        },
        goBack() {
            this.getSelectedTabComonent().back();
        },
        switchTab(id) {
            this.tabs.forEach(tab => {
                if (tab.id !== id) {
                    tab.isActive = false;
                } else {
                    tab.isActive = true;
                    this.selectedTabId = tab.id;
                }
            });
        },
        closeTab(id, e) {
            e.stopPropagation();
            let indexToClose = 0;
            let indexToOpen = 0;

            for (let i = 0; i < this.tabs.length; i++) {
                const t = this.tabs[i];
                if (t.id == id) {
                    indexToClose = i;
                    indexToOpen = i - 1 < 0 ? this.tabs.length - 1 : i - 1;
                }
            }

            if (this.tabs[indexToClose].isActive) this.switchTab(this.tabs[indexToOpen].id);
            this.tabs.splice(indexToClose, 1);

        },
        fullScreen() {
            let currentWindow = remote.getCurrentWindow()
            currentWindow.setFullScreen(!currentWindow.isFullScreen());
            this.showDropMenu = false;
        },
        zoom(option) {
            this.zoomLevel = this.zoomLevel + option;
        },
        getZoomLevel(level) {
            this.zoomLevel = level;
        },
        getSelectedTabComonent() {
            return this.$refs['webview-' + this.selectedTabId][0];
        },
        gotToAddress(e) {
            e.preventDefault();
            this.openNewTabLink(this.address);
            this.address = null;
            this.showAddressBar = false;
        }
    }
});
app.component('User', User);
app.component('Bazaritem', Bazaritem);
app.mount('#app');