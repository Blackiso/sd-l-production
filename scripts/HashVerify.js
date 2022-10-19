const crypto = require('crypto');

exports.HashVerify = class HashVerifyClass {

    constructor(string) {

        let object = JSON.parse(string);
        this._ = object._;
        this._l = object._l;
        this._x = object._x;
        this._xt = object._xt;
        this._h = object._xt.substring(1, 33);
        this.string = string;

    }

    getNewData() {
        this.setLength();
        this.gerenrateHash();
        return this.string;
    }

    setLength() {
        let _loc6_ = this.removeNode(this.string, '_xt', this._xt);
        _loc6_ = this.removeNode(_loc6_, '_l', this._l.toString());
        let l = _loc6_.length;
        this.string = this.string.replace(this._l.toString(), l);

        console.log('length set', l, 'o', this._l);
    }

    gerenrateHash() {
        if (this._xt != "") {
            this._defaultToken = this._xt;
        }
        let seed = this.generateSeed(this._x, this._);
        let _loc6_ = this.removeNode(this.string, '_xt', this._xt);
        let h = crypto.createHash('md5').update(seed + _loc6_).digest('hex');


        console.log('hash set', h, 'replace', this._h, this.string.indexOf(this._h));
        this.string = this.string.replace(this._h, h);
    }

    generateSeed(param1, param2) {
        let _loc3_ = 0;
        if (param1 == 0) {
            param1 = this._defaultToken;
        }
        if (param2 != 0) {
            _loc3_ = (param1 ^ param2) & 4294967295;
        }
        else {
            _loc3_ = param1;
        }
        return _loc3_;
    }

    getObjectString() {
        return JSON.stringify(this.baseObject);
    }

    removeKey(object, key) {
        let o = JSON.parse(JSON.stringify(object));
        delete o[key];
        return o;
    }

    removeNode(param1, param2, param3) {
        var _loc4_;
        if ((_loc4_ = param1).indexOf(",\"" + param2 + "\":") != -1) {
            _loc4_ = _loc4_.replace(",\"" + param2 + "\":", "");
        }
        else {
            _loc4_ = _loc4_.replace("\"" + param2 + "\":", "");
        }
        if (_loc4_.indexOf("\"" + param3 + "\"") != -1) {
            _loc4_ = _loc4_.replace("\"" + param3 + "\"", "");
        }
        else {
            _loc4_ = _loc4_.replace(param3, "");
        }
        return _loc4_;
    }

}