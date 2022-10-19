const { parse } = require('node-html-parser');


exports.UsersLoader = class UsersLoaderClass {

    _loader;

    constructor(loader) {
        this._loader = loader;
    }

    async getUserByUsername(username) {
        try {
            let html = await this._loader.loadUserPageByUsername(username);
            return await this.parseUserData(html);
        }catch(e) {
            return [];
        }
    }

    async getUserById(id) {
        let html = await this._loader.loadUserPageById(id);
        return await this.parseUserData(html);
    }

    async searchUsersByUsername(username) {
        let HTMLPage = await this._loader.loadSearchPage(username);
        let users = [];
        let root = parse(HTMLPage);

        let usersElements = root.querySelector('.resultArea').querySelectorAll('.ua');

        for (let i = 0; i < usersElements.length; i++) {
            const user = usersElements[i];
            let _user = user.querySelector('img').attributes;
            let icon = user.querySelector('.icn');
            let level = user.querySelector('.icn-levelcrown-l').text;
            let location = user.querySelector('.ic-flag');
            let age = user.querySelector('.avatarAge');

            let status = 'basic';

            if (icon.classList.contains('icn-ro-large')) {
                status = 'royalty';
            } else if (icon.classList.contains('icn-ss-large')) {
                status = 'superstar';
            }

            let userId = parseInt(_user.id.replace('ua_', ''));
            let data = {
                username: _user.alt,
                image: _user.src,
                id: userId,
                status: status,
                level: level,
                friend: await this._loader.isFriends(userId)
            };

            if (age) {
                data.age = age.text;
            }

            if (location) {
                data.location = {
                    name: location.attributes.title,
                    flag: location.classList.value.join(' ').trim()
                }
            }

            users.push(data);

        }

        return users;
    }

    async parseUserData(HTML) {
        try {
            let root = parse(HTML);
            let userId = root.querySelector('.subNav > .suite > a').attributes.href.split('=')[1];

            let data = {
                username: root.querySelector('.labelPlate > .uname').text,
                image: root.querySelector('meta[property="og:image"]').attributes.content,
                id: userId,
                status: 'basic',
                level: parseInt(root.querySelector('.labelPlate > .userlevel').text),
                last_seen: root.querySelector('.lastonline').text.replace(/\s+/g, ' ').trim().split(':')[1].trim(),
                joined: root.querySelector('.joined').text.replace(/\s+/g, ' ').trim().split(':')[1].trim(),
                friend: await this._loader.isFriends(userId)
            };

            let icon = root.querySelector('.labelPlate')
            if (icon.classList.contains('roP')) {
                data.status = 'royalty';
            } else if (icon.classList.contains('ssP')) {
                data.status = 'superstar';
            }

            let location = root.querySelector('.list-userinfo > .al > .asl > .ic-flag');
            if (location) {
                data.location = {
                    name: location.attributes.title,
                    flag: location.classList.value.join(' ').trim()
                }
            }

            let age = root.querySelector('.list-userinfo > .al > .asl > .avatarAge');
            if (age) {
                data.age = parseInt(age.text);
            }


            return [data];
        } catch (e) {
            return [];
        }
    }

}