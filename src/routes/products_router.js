var express = require('express');
var router = express.Router();
var fs = require('fs-extra');


// Get Product model
var Product = require('../models/product');


// Get Category model
var Category = require('../models/category');


router.get('/', async function (req, res) {
    try {
        const products = await Product.find().exec();
        res.render('all_products', {
            title: 'All products',
            products: products
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

/*
 * GET products by category
 */
router.get('/:category', async function (req, res) {
    try {
        const categorySlug = req.params.category;

        const category = await Category.findOne({ slug: categorySlug }).exec();

        if (!category) {
            return res.status(404).send('Category not found');
        }

        const products = await Product.find({ category: categorySlug }).exec();

        res.render('cat_products', {
            title: category.title,
            products: products
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

/*
 * GET product details
 */
router.get('/:category/:product', async function (req, res) {
    try {
        var galleryImages = null;

        const product = await Product.findOne({ slug: req.params.product }).exec();

        if (!product) {
            console.log('Product not found');
            return res.status(404).send('Product not found');
        }

        var galleryDir = 'src/public/product_images/' + product._id + '/gallery/' ;

        fs.readdir(galleryDir, function (err, files) {
            if (files) {
                galleryImages = files;
                res.render('product', {
                    title: product.title,
                    p: product,
                    galleryImages: galleryImages,
                },console.log(galleryImages));

            } else {
                console.log(err);
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});



module.exports = router;