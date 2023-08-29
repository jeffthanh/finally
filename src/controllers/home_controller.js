const homeController = {
    getPageHome(req, res){
        res.render('index', {
            title: 'Home'
        });
    }
}





module.exports = {
    homeController
}