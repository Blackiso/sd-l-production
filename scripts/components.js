function html(string) { return string[0]; }

const User = {
    data: () => {
        return {
            statusClass: null,
            add_url: 'http:127.0.0.1:7000/add?id='
        }
    },
    props: ['user', 'nochat'],
    template: html`
        <div class="user">
            <div class="image">
                <img :src="user.image" alt="">
                <div class="border" :class="statusClass"></div>
                <div class="crown">{{user.level}}</div>
            </div>
            <div class="info">
                <span class="username">{{user.username}}</span>
                <span class="id">{{user.id}}</span>
                <div class="more-info">
                    <div class="location" v-if="user.location">
                        <span :class="user.location.flag" :title="user.location.name"></span>
                        <span class="name">{{user.location.name}}</span>
                    </div>
                    <span class="seperator" v-if="user.location && user.age">|</span>
                    <span class="age" v-if="user.age">{{user.age}}</span>
                </div>
                <div class="time-info" v-if="user.joined && user.last_seen">
                    <span>
                        <ion-icon name="calendar"></ion-icon> {{user.joined}}
                    </span>
                    <span>
                        <ion-icon name="time"></ion-icon> {{user.last_seen}}
                    </span>
                </div>
                <div class="user-price" v-if="user.sellPrice">
                    <ion-icon name="pricetag"></ion-icon> <span>Price {{user.sellPrice}}</span> <div class="currency" :class="getCurrencyClass()"></div>
                </div>
            </div>
            <div class="user-options">
                <ion-icon @click="add" name="person-add" v-if="!user.friend"></ion-icon>
                <ion-icon @click="loadSuite" name="home"></ion-icon>
                <ion-icon v-if="!nochat" @click="sendMessage" name="chatbubbles"></ion-icon>
            </div>
        </div>
    `,
    created: function () {
        this.statusClass = {
            royalty: this.user.status == 'royalty',
            superstar: this.user.status == 'superstar'
        }
    },
    methods: {
        sendMessage() {
            this.$emit('message', this.user);
        },
        add() {
            fetch(this.add_url + this.user.id).then((response) => response.json()).then(data => {
                console.log(data);
            });
        },
        loadSuite() {
            SUTE_SERVICE.trigger(this.user.id);
        },
        getCurrencyClass() {
            let obj = {};
            obj['currency-'+this.user.currencyType] = true;
            return obj;
        }
    }
}

const Webview = {
    data: () => {
        return {
            webviewObject: null
        }
    },
    props: ['data', 'zoom'],
    template: html`
        <webview ref="webview" class="webview" :class="{ 'top-tab': data.isActive }" :src="data.url" plugins allowpopups>
        </webview>
    `,
    watch: {
        zoom: {
            handler(n, o) {
                if (this.webviewObject) this.webviewObject.setZoomLevel(n);
            }
        }
    },
    mounted() {
        this.webviewObject = this.$refs.webview;
        this.setEvents();

        setTimeout(() => {
            contextMenu({
                window: this.webviewObject,
                showSearchWithGoogle: true,
                showInspectElement: true,
                prepend: (defaultActions, params, browserWindow) => [{
                    label: 'Open link in new tab',
                    visible: params.linkURL !== '',
                    click: () => {
                        this.$emit('link', params.linkURL);
                    }
                }]
            });
        }, 1000);
    },
    methods: {
        setEvents() {
            this.webviewObject.addEventListener('did-finish-load', (e) => {
                this.data.title = this.webviewObject.getTitle();
                this.$emit('zoom', this.webviewObject.getZoomLevel());
                this.webviewObject.executeJavaScript('let __over = document.querySelector("#controlOverlay");__over && __over.remove();');
            });

            this.webviewObject.addEventListener('did-stop-loading', (e) => {
                this.$emit('loading', false);
            });

            this.webviewObject.addEventListener('did-start-loading', (e) => {
                this.$emit('loading', true);
            });

            this.webviewObject.addEventListener('new-window', (e) => {
                e.preventDefault();
                this.$emit('link', params.linkURL);
            });
        },
        reload() {
            this.webviewObject.reload();
        },
        back() {
            this.webviewObject.goBack();
        }
    }
}

const Searchbox = {
    data: () => {
        return {
            keyword: null,
            users: [],
            search_url: 'http:127.0.0.1:7000/search?username=',
            messageUser: null,
            message_url: 'http:127.0.0.1:7000/message',
            message: null,
            isCollapsed: false
        }
    },
    props: [],
    template: html`
        <div class="user-search-container" :class="{ collapsed: isCollapsed }">
            <div class="header" @click="isCollapsed = !isCollapsed">
                <ion-icon name="people"></ion-icon> Search People
                <ion-icon @click="close" class="close" name="close-outline"></ion-icon>
            </div>
            <form @submit="search" class="search-bar">
                <input v-model="keyword" type="text" placeholder="Username...">
                <button class="search-icon">
                    <ion-icon name="search"></ion-icon>
                </button>
            </form>
            <div class="search-body">
                <div class="empty" v-if="users.length == 0">
                    <ion-icon name="search"></ion-icon>
                    <p>Search For Users</p>
                </div>
                <User v-for="user in users" :user="user" :key="user.id" @message="(x) => messageUser = x" />
            </div>
            <form @submit="sendMessage" v-if="messageUser" class="message-box">
                <input v-model="message" type="text" placeholder="Message...">
                <button class="message-icon">
                    <ion-icon name="send"></ion-icon>
                </button>
            </form>
        </div>
    `,
    mounted() {

    },
    methods: {
        search(e) {
            e.preventDefault();
            fetch(this.search_url + this.keyword).then((response) => response.json()).then(data => {
                this.user = [];
                this.users = data;
                this.keyword = null;
            });
        },
        sendMessage(e) {
            e.preventDefault();
            fetch(this.message_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: this.message,
                    user: this.messageUser
                })
            }).then(() => {
                this.message = null;
                this.messageUser = null;
            });
        },
        close() {
            this.$emit('close');
        }
    }
}

const Suite = {
    data: () => {
        return {
            currentView: 'suite',
            url: null,
            suiteUrl: "http://127.0.0.1:7000/user/suite?id=",
            bazarUrl: "http://127.0.0.1:7000/user/starbazar?id=",
            bpUrl: "http://127.0.0.1:7000/user/bp?id=",
        }
    },
    props: ['id', 'view'],
    template: html`
        <div class="suite">
            <div class="frame">
                <iframe :src="url" frameborder="0"></iframe>
                <div class="suite-menu">
                    <div @click="switchPage('suite')" :class="{ 'sm-selected': currentView == 'suite' }">
                        <ion-icon name="home"></ion-icon>
                    </div>
                    <div @click="switchPage('bp')" :class="{ 'sm-selected': currentView == 'bp' }">
                        <ion-icon name="diamond"></ion-icon>
                    </div>
                    <div @click="switchPage('bazar')" :class="{ 'sm-selected': currentView == 'bazar' }">
                        <ion-icon name="storefront"></ion-icon>
                    </div>
                </div>
            </div>
        
            <ion-icon @click="$emit('close')" name="close"></ion-icon>
        </div>
    `,
    created() {
        this.switchPage(this.view || 'suite');
    },
    methods: {
        switchPage(v) {
            this.currentView = v;
            this.url = this[this.currentView + 'Url'] + this.id;
        }
    }
}

const Bazarsearch = {
    data: () => {
        return {
            isCollapsed: false,
            brandsUrl: 'http://127.0.0.1:7000/bazar/brands',
            searchUrl: 'http://127.0.0.1:7000/bazar/search',
            brands: [],
            brandsAll: [],
            selectedBrandId: null,
            isSearching: false,
            isLoading: false,
            items: []
        }
    },
    props: [],
    template: html`
        <div class="user-search-container" :class="{ collapsed: isCollapsed }">
            <div class="header" @click="isCollapsed = !isCollapsed">
                <ion-icon name="bag"></ion-icon> Search Starbazar
                <ion-icon @click="close" class="close" name="close-outline"></ion-icon>
            </div>
            <form v-if="!isSearching" class="bazar-search" @submit="search">
                <div class="s-item">
                    <span>
                        <ion-icon name="bookmark"></ion-icon> Item Name
                    </span>
                    <input type="text" placeholder="Name..." name="name">
                </div>
                <div class="s-item">
                    <span>
                        <ion-icon name="storefront"></ion-icon> Brand Name
                    </span>
                    <input type="hidden" :value="selectedBrandId" name="brand">
                    <input @keyup="filter" type="text" placeholder="Brand Name...">
                </div>
                <div class="brands">
                    <div v-for="b in brands" :class="{ 's-brand': b.id == selectedBrandId }" @click="selectedBrandId = b.id"
                        :key="b.id">
                        <div><img :src="b.logo_url"></div>
                        <span>{{ b.name }}</span>
                    </div>
                </div>
                <button>
                    <ion-icon name="search"></ion-icon> Search
                </button>
            </form>
        
            <div v-if="isSearching" class="search-result">
                <div v-if="!isLoading" class="new-search"><span @click="isSearching = false">New Search</span></div>
                <div v-if="isLoading" class="loading-bazar">
                    <div class="lds-ring bazar-loader">
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                    </div>
                </div>
                <Bazaritem v-for="i in items" :data="i"></Bazaritem>
            </div>
        </div>
    `,
    created() {
        this.loadBrands();
    },
    methods: {
        close() {
            this.$emit('close');
        },
        loadBrands() {
            fetch(this.brandsUrl).then((response) => response.json()).then(data => {
                this.brands = data;
                this.brandsAll = data;
            });
        },
        search(e) {
            e.preventDefault();

            let formData = new FormData(e.currentTarget);
            let object = {};
            formData.forEach((value, key) => object[key] = value);

            this.items = [];
            this.isSearching = true;
            this.isLoading = true;

            axios({
                url: this.searchUrl, 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                data: object
            }).then((response) => {
                this.isLoading = false;
                if (response.data.length == 0) this.isSearching = false;
                this.items = response.data;
                this.isCollapsed = false;
            });
        },
        filter(e) {
            this.brands = this.brandsAll.filter(b => b.name.toLowerCase().includes(e.currentTarget.value));
        }
    }
}


const Bazaritem = {
    data: () => {
        return {
            
        }
    },
    props: ['data'],
    template: html`
        <div class="bazar-item">
            <div class="item-details">
                <div class="item-image">
                    <img :src="data.image">
                </div>
                <span>{{ data.name }}</span>
            </div>
            <div class="item-sellers">
                <span><ion-icon name="people"></ion-icon> Sellers</span>
                <User v-for="user in data.sellers" :user="user" :key="user.id" :nochat="true"></User>
            </div>
        </div>
    `,
    created() {
    },
    methods: {

    }
}