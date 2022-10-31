let __over = document.querySelector("#controlOverlay");__over && __over.remove();
function __searchUser(id) {
    console.log('Searching user', id);
    fetch('http://bl.stardoll.com/execute-search?id='+id).then(console.log);
}
function __searchBazarItem(data) {
    console.log(data);
}