const axios = require('axios');
const { parse } = require('node-html-parser');
const { XMLBuilder } = require('fast-xml-parser');
const qs = require('qs');

exports.StardollLoader = class StardollLoaderClass {

    
    _relationshipUrl = "http://www.stardoll.com/en/ajax/friends/checkRelation.php?uid=:uid&fid=:fid";
    _friendRequestUrl = "http://www.stardoll.com/en/ajax/friends/sendRequest.php";
    
    _bazarItemsUrl = "http://www.stardoll.com/en/com/user/getStarBazaar.php?only=4";
    _bazarBrandsUrl = "http://www.stardoll.com/en/com/user/getStarBazaar.php?storeType=2";
    _bazarSearchUrl = "http://www.stardoll.com/en/com/user/getStarBazaar.php?search&type=fashion&brands=:brand"

    _searchUrl = "http://www.stardoll.com/en/search/?name=:keyword&country=xx";
    _userPageIdUrl = "http://www.stardoll.com/en/user/?id=:id";
    _userPageUsernameUrl = "http://www.stardoll.com/member/:username";

    static instence = null;

    _headers;
    _rid;
    _sid;
    _userid;
    _username;
    _isMessaging = false;
    _messageObject;

    static getInstance() {
        if (!this.instence) this.instence = new StardollLoaderClass();
        return this.instence;
    }

    constructor() {
        this.XMLBuilderObject = new XMLBuilder({
            ignoreAttributes: false
        });
        this.source = axios.CancelToken.source();
        this.cancelToken = this.source.token;
    }

    setHeaders(headers) {
        this._headers = headers;
    }

    setRid(rid) {
        this._rid = parseInt(rid);
    }

    setSid(sid) {
        this._sid = sid;
    }

    getCookies() {
        return this._headers.cookie;
    }

    async loadUserPageById(id) {
        let _url = this._userPageIdUrl.replace(':id', id);
        return (await axios.get(_url)).data;
    }

    async loadUserPageByUsername(username) {
        let _url = this._userPageUsernameUrl.replace(':username', username);
        let rs = await axios.get(_url, {
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status <= 302;
            }
        });
        return await this.loadUserPageById(rs.headers.location.split('=')[1]);
    }

    async loadSearchPage(username) {
        let _url = this._searchUrl.replace(':keyword', username);
        return (await axios.get(_url, this.getHeaders())).data;
    }

    async loadCurrentUserPage() {
        return (await axios.get('http://www.stardoll.com/en/', this.getHeaders())).data;
    }

    async loadBazarItems() {
        return (await axios.get(this._bazarItemsUrl, this.getHeaders())).data;
    }

    async loadBazarBrands() {
        return (await axios.get(this._bazarBrandsUrl, this.getHeaders())).data;
    }

    async loadBazarSearch(id) {
        let _url = this._bazarSearchUrl.replace(':brand', id);
        return (await axios.get(_url, this.getHeaders())).data;
    }

    sendFriendRequest(fid) {
        let h = this.getHeaders();

        h.headers['content-type'] = 'application/x-www-form-urlencoded';

        return axios({
            method: 'POST',
            headers: h.headers,
            data: qs.stringify({
                uid: this._userid,
                fid: fid,
                message: null
            }),
            url: this._friendRequestUrl
        });
    }

    async getRelationship(uid, fid) {
        let _url = this._relationshipUrl.replace(':uid', uid).replace(':fid', fid);
        return (await axios.get(_url, this.getHeaders())).data;
    }

    async isFriends(id) {
        return !(await this.getRelationship(this._userid, id)).can_be_friends;
    }

    async setCurrentUserData() {
        let HTMLPage = await this.loadCurrentUserPage();
        let root = parse(HTMLPage);
        let navbar = root.querySelector('#u-h');
        let avatar = navbar.querySelector('.avatar img');

        if (avatar) {
            this._userid = avatar.attributes.id.replace('ua_', '');
            this._username = avatar.attributes.alt;
        }

    }

    sendMessage(message, user) {
        this.setIsMessaging(true);
        this._messageObject = {
            message,
            user
        }
    }

    getHeaders() {
        return { headers: { cookie: this.getCookies() } };
    }

    getMessage() {
        return this.XMLBuilderObject.build({
            body: {
                message: {
                    body: this._messageObject.message,
                    '@_to': this.getUserServerLocation(this._messageObject.user.id, this._messageObject.user.username),
                    '@_from': this.getUserServerLocation(this._userid, this._username),
                    '@_type': 'chat',
                    '@_xmlns': 'jabber:client'
                },
                '@_rid': this._rid,
                '@_xmlns': 'http://jabber.org/protocol/httpbind',
                '@_sid': this._sid
            }
        });
    }

    getUserServerLocation(id, username) {
        return id + '@www.stardoll.com/2:' + username;
    }

    isMessaging() {
        return this._isMessaging;
    }

    setIsMessaging(val) {
        this._isMessaging = val;
    }

}