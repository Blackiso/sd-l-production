const { parse } = require('node-html-parser');


exports.StarbazarLoader = class StarbazarLoaderClass {

    _loader;

    constructor(loader, usersLoader) {
        this._loader = loader;
        this._usersLoader = usersLoader;
    }

    async getBazarItems() {
        let itemsData = await this._loader.loadBazarItems();
        let items = [];

        itemsData.items.forEach(item => {

            items.push({
                id: parseInt(item.customItemId),
                price: item.sellPrice,
                currency: item.currencyType,
                sellerId: item.sellerId,
                image: this.constructItemUrl(item.customItemId),
                // seller: await this.searchSingleUser
            });

        });

        return items;
    }

    async getBazarBrands() {
        let brands = (await this._loader.loadBazarBrands()).brands.fashion;
        brands.brand = brands.brand.filter(b => {
            if (b.in_quick_search > 0) {
                b.logo_url = 'http://cdn.stardoll.com/cms/i/makeover/common/icons/brandLogos/'+b.id+'.png';
                return true;
            }
            return false;
        });
        return brands.brand;
    }

    async searchBazar(name, brandId) {
        let data = [];
        let result = await this._loader.loadBazarSearch(brandId);

        if (result.items) {


            for (let i = 0; i < result.items.length; i++) {
                const e = result.items[i];

                console.log('checking name', e.name.toLowerCase());

                if (e.name.toLowerCase().indexOf(name.toLowerCase()) > -1) {

                    let seller = (await this._usersLoader.getUserById(e.sellerId))[0];

                    seller.sellPrice = e.sellPrice;
                    seller.currencyType = e.currencyType;

                    let o = {
                        id: e.itemId,
                        image: 'http://cdn.stardoll.com/itemimages/130/0/0/'+e.itemId+'.png',
                        name: e.name,
                        brand: e.brand,
                        originalPrice: e.originalPrice,
                        originalPriceCurrencyType: e.originalPriceCurrencyType,
                        sellers: [seller]
                    }

                    data.push(o);
                }
            }
        }


        return data;
    }

    constructItemUrl(id) {
        let url = "http://cdn.stardoll.com/customitems/130/:x/:y/:z.png";
        return url.replace(':x', id.substring(0, 3)).replace(':y', id.substring(3, 6)).replace(':z', id);
    }

}